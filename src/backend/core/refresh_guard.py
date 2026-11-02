"""Server-side gate for token-spending dashboard refreshes.

Codes come only from the environment (never the repo). With no codes configured the gate
fails closed. State (quota + failed attempts) is persisted outside the repo so it survives restarts.
"""
import hashlib
import hmac
import json
import os
import threading
import time
from pathlib import Path
from typing import Callable, Optional

QUOTA_LIMIT = 2
QUOTA_WINDOW_SECONDS = 3 * 24 * 3600
MAX_FAILED_ATTEMPTS = 5
FAILURE_WINDOW_SECONDS = 15 * 60
MIN_CODE_LENGTH = 8


class RefreshDenied(Exception):
    def __init__(self, status_code: int, code: str, message: str, retry_at: Optional[float] = None):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.retry_at = retry_at

    def to_detail(self) -> dict:
        return {"code": self.code, "message": self.message, "retry_at": self.retry_at}


def _digest(value: str) -> bytes:
    return hashlib.sha256(value.encode("utf-8")).digest()


def _matches(candidate: str, secrets: list[str]) -> bool:
    candidate_digest = _digest(candidate)
    matched = False
    for secret in secrets:  # no early exit: constant work regardless of which code matches
        matched |= hmac.compare_digest(candidate_digest, _digest(secret))
    return matched


def _client_key(client_id: str) -> str:
    return hashlib.sha256(client_id.encode("utf-8")).hexdigest()[:16]


def secrets_from_env(get_env: Callable[[str, str], str]) -> tuple[str, list[str]]:
    master = get_env("REFRESH_MASTER_CODE", "").strip()
    access = [c.strip() for c in get_env("REFRESH_ACCESS_CODES", "").split(",") if c.strip()]
    master = master if len(master) >= MIN_CODE_LENGTH else ""
    access = [c for c in access if len(c) >= MIN_CODE_LENGTH]
    return master, access


class RefreshGuard:
    def __init__(
        self,
        state_path: Path,
        get_secrets: Callable[[], tuple[str, list[str]]],
        now: Callable[[], float] = time.time,
    ):
        self._path = Path(state_path)
        self._get_secrets = get_secrets
        self._now = now
        self._lock = threading.Lock()

    def _load(self) -> dict:
        if not self._path.exists():
            return {"refreshes": [], "failures": {}}
        try:
            state = json.loads(self._path.read_text(encoding="utf-8"))
            return {"refreshes": list(state["refreshes"]), "failures": dict(state["failures"])}
        except (ValueError, KeyError, TypeError, OSError) as exc:
            # A damaged state file must never reset the quota: refuse until the owner fixes it.
            raise RefreshDenied(503, "state_unreadable", "Refresh quota state is unreadable.") from exc

    def _save(self, state: dict) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self._path.with_suffix(".tmp")
        tmp.write_text(json.dumps(state), encoding="utf-8")
        os.replace(tmp, self._path)

    def _prune(self, state: dict, now: float) -> None:
        state["refreshes"] = [t for t in state["refreshes"] if now - t < QUOTA_WINDOW_SECONDS]
        state["failures"] = {
            k: [t for t in v if now - t < FAILURE_WINDOW_SECONDS] for k, v in state["failures"].items()
        }
        state["failures"] = {k: v for k, v in state["failures"].items() if v}

    def authorize(self, code: Optional[str], client_id: str) -> str:
        """Returns 'master' or 'access' and records the refresh; raises RefreshDenied otherwise."""
        master, access = self._get_secrets()
        if not master and not access:
            raise RefreshDenied(503, "not_configured", "Refresh is disabled: add REFRESH_MASTER_CODE or REFRESH_ACCESS_CODES (8+ characters) to the server environment or .env, then restart the backend.")

        with self._lock:
            now = self._now()
            state = self._load()
            self._prune(state, now)
            key = _client_key(client_id)
            failures = state["failures"].get(key, [])

            if len(failures) >= MAX_FAILED_ATTEMPTS:
                retry_at = failures[-MAX_FAILED_ATTEMPTS] + FAILURE_WINDOW_SECONDS
                raise RefreshDenied(429, "locked_out", "Too many incorrect codes. Try again later.", retry_at)

            candidate = (code or "").strip()
            is_master = bool(master) and bool(candidate) and _matches(candidate, [master])
            is_access = bool(access) and bool(candidate) and _matches(candidate, access)

            if not (is_master or is_access):
                state["failures"][key] = failures + [now]
                self._save(state)
                raise RefreshDenied(403, "invalid_code", "Invalid refresh code.")

            state["failures"].pop(key, None)
            if is_master:
                self._save(state)
                return "master"

            if len(state["refreshes"]) >= QUOTA_LIMIT:
                retry_at = min(state["refreshes"]) + QUOTA_WINDOW_SECONDS
                raise RefreshDenied(
                    429, "quota_exhausted", f"Refresh limit reached ({QUOTA_LIMIT} per 3 days).", retry_at
                )
            state["refreshes"].append(now)
            self._save(state)
            return "access"

    def quota_status(self) -> dict:
        with self._lock:
            now = self._now()
            try:
                state = self._load()
            except RefreshDenied:
                return {"limit": QUOTA_LIMIT, "used": QUOTA_LIMIT, "resets_at": None}
            self._prune(state, now)
            used = len(state["refreshes"])
            resets_at = min(state["refreshes"]) + QUOTA_WINDOW_SECONDS if used else None  # when the oldest use frees up
            return {"limit": QUOTA_LIMIT, "used": used, "resets_at": resets_at}
