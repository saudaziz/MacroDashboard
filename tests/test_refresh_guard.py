import json
import tempfile
import unittest
from pathlib import Path

from src.backend.core.refresh_guard import (
    FAILURE_WINDOW_SECONDS,
    QUOTA_WINDOW_SECONDS,
    RefreshDenied,
    RefreshGuard,
    secrets_from_env,
)

MASTER = "master-code-123"
ACCESS = ["access-code-aaa", "access-code-bbb"]
DAY = 24 * 3600


class Clock:
    def __init__(self):
        self.t = 1_000_000.0

    def __call__(self):
        return self.t


class RefreshGuardTests(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.path = Path(self._tmp.name) / "state.json"
        self.clock = Clock()
        self.secrets = (MASTER, list(ACCESS))
        self.guard = self._make_guard()

    def _make_guard(self):
        return RefreshGuard(self.path, lambda: self.secrets, now=self.clock)

    def assertDenied(self, status, code, fn):
        with self.assertRaises(RefreshDenied) as ctx:
            fn()
        self.assertEqual(ctx.exception.status_code, status)
        self.assertEqual(ctx.exception.code, code)
        return ctx.exception

    def test_fails_closed_when_no_codes_configured(self):
        self.secrets = ("", [])
        self.assertDenied(503, "not_configured", lambda: self.guard.authorize("anything", "ip"))

    def test_short_codes_are_ignored(self):
        master, access = secrets_from_env(lambda k, d: {"REFRESH_MASTER_CODE": "short", "REFRESH_ACCESS_CODES": "tiny, long-enough-code"}.get(k, d))
        self.assertEqual(master, "")
        self.assertEqual(access, ["long-enough-code"])

    def test_missing_or_wrong_code_is_rejected_without_consuming_quota(self):
        self.assertDenied(403, "invalid_code", lambda: self.guard.authorize(None, "ip"))
        self.assertDenied(403, "invalid_code", lambda: self.guard.authorize("wrong", "ip"))
        self.assertEqual(self.guard.quota_status()["used"], 0)

    def test_access_code_allows_two_then_blocks_third(self):
        self.assertEqual(self.guard.authorize(ACCESS[0], "ip"), "access")
        self.assertEqual(self.guard.authorize(ACCESS[1], "other-ip"), "access")  # quota is global
        denied = self.assertDenied(429, "quota_exhausted", lambda: self.guard.authorize(ACCESS[0], "ip"))
        self.assertEqual(denied.retry_at, 1_000_000.0 + QUOTA_WINDOW_SECONDS)

    def test_rolling_window_frees_a_slot(self):
        self.guard.authorize(ACCESS[0], "ip")
        self.clock.t += 2 * DAY
        self.guard.authorize(ACCESS[0], "ip")
        self.assertDenied(429, "quota_exhausted", lambda: self.guard.authorize(ACCESS[0], "ip"))
        self.clock.t += 1 * DAY + 1  # first use is now older than 3 days
        self.assertEqual(self.guard.authorize(ACCESS[0], "ip"), "access")

    def test_master_code_is_unlimited_and_does_not_use_quota(self):
        for _ in range(10):
            self.assertEqual(self.guard.authorize(MASTER, "ip"), "master")
        self.assertEqual(self.guard.quota_status()["used"], 0)

    def test_quota_survives_restart(self):
        self.guard.authorize(ACCESS[0], "ip")
        self.guard.authorize(ACCESS[0], "ip")
        restarted = self._make_guard()
        self.assertDenied(429, "quota_exhausted", lambda: restarted.authorize(ACCESS[0], "ip"))

    def test_lockout_after_repeated_bad_codes_even_for_correct_code(self):
        for _ in range(5):
            self.assertDenied(403, "invalid_code", lambda: self.guard.authorize("nope", "attacker"))
        self.assertDenied(429, "locked_out", lambda: self.guard.authorize(MASTER, "attacker"))
        self.assertEqual(self.guard.authorize(MASTER, "owner-ip"), "master")  # other clients unaffected
        self.clock.t += FAILURE_WINDOW_SECONDS + 1
        self.assertEqual(self.guard.authorize(MASTER, "attacker"), "master")

    def test_corrupt_state_file_fails_closed(self):
        self.path.write_text("{not json", encoding="utf-8")
        self.assertDenied(503, "state_unreadable", lambda: self.guard.authorize(ACCESS[0], "ip"))

    def test_state_file_stores_no_codes_or_raw_ips(self):
        self.assertDenied(403, "invalid_code", lambda: self.guard.authorize("wrong-code-xx", "203.0.113.9"))
        self.guard.authorize(ACCESS[0], "203.0.113.9")
        raw = self.path.read_text(encoding="utf-8")
        for secret in (MASTER, *ACCESS, "wrong-code-xx", "203.0.113.9"):
            self.assertNotIn(secret, raw)
        json.loads(raw)


if __name__ == "__main__":
    unittest.main()
