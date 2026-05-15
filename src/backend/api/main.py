import asyncio
import json
import logging
import traceback
import os
try:
    from src.backend.api.logging_config import configure_logging
    from src.backend.core.env_loader import get_env_variable
except ImportError:
    from api.logging_config import configure_logging
    from core.env_loader import get_env_variable

configure_logging()
logger = logging.getLogger("Main")

from fastapi import FastAPI, HTTPException, Request
from fastapi.security import APIKeyHeader
from fastapi import Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="MacroDashboard API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

try:
    from src.backend.agents.agent import (
        generate_macro_dashboard_async,
        stream_macro_dashboard,
        _load_latest_dashboard,
    )
    from src.backend.core.models import MacroDashboardResponse
    from src.backend.api.providers import (
        list_supported_providers,
        normalize_provider_name,
        get_default_provider_name,
    )
except ImportError:
    from agents.agent import (
        generate_macro_dashboard_async,
        stream_macro_dashboard,
        _load_latest_dashboard,
    )
    from core.models import MacroDashboardResponse
    from api.providers import (
        list_supported_providers,
        normalize_provider_name,
        get_default_provider_name,
    )
# Track active stream tasks by run_id for cancellation requests
active_stream_tasks: dict[str, asyncio.Task] = {}
run_owners: dict[str, str] = {}
current_stream_lock = asyncio.Lock()

def _parse_csv_env(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]

def _parse_bool_env(value: str) -> bool:
    return value.strip().lower() in {"1", "true", "yes", "on"}

allowed_origins = _parse_csv_env(
    get_env_variable("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
)
allowed_methods = _parse_csv_env(get_env_variable("CORS_ALLOWED_METHODS", "GET,POST,OPTIONS"))
allowed_headers = _parse_csv_env(get_env_variable("CORS_ALLOWED_HEADERS", "Content-Type,Authorization,X-API-Key"))
allow_credentials = _parse_bool_env(get_env_variable("CORS_ALLOW_CREDENTIALS", "false"))

# Enable CORS with explicit allowlist for frontend interaction
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=allow_credentials,
    allow_methods=allowed_methods,
    allow_headers=allowed_headers,
)

auth_header = APIKeyHeader(name="X-API-Key", auto_error=False)

def _is_local_request(request: Request) -> bool:
    host = request.client.host if request.client else ""
    return host in {"127.0.0.1", "::1", "localhost"}


def require_api_key(request: Request, api_key: str | None = Depends(auth_header)):
    expected_api_key = get_env_variable("OPENROUTER_API_KEY", "").strip()
    if not expected_api_key:
        raise HTTPException(status_code=503, detail="API auth key is not configured. Set OPENROUTER_API_KEY.")
    allow_local_without_key = _parse_bool_env(get_env_variable("DEV_TRUST_LOCALHOST_AUTH", "true"))
    if allow_local_without_key and _is_local_request(request) and (not api_key or not api_key.strip()):
        return True
    if not api_key or api_key != expected_api_key:
        raise HTTPException(status_code=401, detail="Invalid or missing API key.")
    return True

class DashboardRequest(BaseModel):
    provider: str = get_default_provider_name()
    skip_cache: bool = False
    run_id: str = Field(min_length=1)
    session_id: str = Field(min_length=1)

class ResumeRequest(BaseModel):
    decision: str
    run_id: str = Field(min_length=1)
    session_id: str = Field(min_length=1)

class CancelRequest(BaseModel):
    run_id: str = Field(min_length=1)
    session_id: str = Field(min_length=1)

@app.post("/api/resume-workflow")
async def resume_dashboard_workflow(request: ResumeRequest, _: bool = Depends(require_api_key)):
    logger.info(f"POST /api/resume-workflow received. Decision: {request.decision}")
    try:
        from src.backend.agents.agent import resume_workflow
    except ImportError:
        from agent import resume_workflow
    
    owner = run_owners.get(request.run_id)
    if owner is None:
        raise HTTPException(status_code=404, detail="Run not found.")
    if owner != request.session_id:
        raise HTTPException(status_code=403, detail="Run ownership mismatch.")
    try:
        await resume_workflow(request.run_id, request.decision)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    return {"status": "resumed"}

@app.get("/api/status")
def get_status():
    has_openrouter_key = bool(get_env_variable("OPENROUTER_API_KEY", "").strip())
    return {
        "status": "ok",
        "message": "MacroDashboard API is running",
        "auth": {
            "provider_key": "OPENROUTER_API_KEY",
            "configured": has_openrouter_key,
            "dev_trust_localhost_auth": _parse_bool_env(get_env_variable("DEV_TRUST_LOCALHOST_AUTH", "true")),
        },
        "debug": {
            "expose_debug_fields": _parse_bool_env(get_env_variable("EXPOSE_DEBUG_FIELDS", "false")),
        },
    }

@app.get("/api/providers")
def get_providers():
    return list_supported_providers()

@app.post("/api/cancel-dashboard")
async def cancel_dashboard(cancel_request: CancelRequest, _: bool = Depends(require_api_key)):
    logger.info("Cancellation requested for run_id=%s.", cancel_request.run_id)
    async with current_stream_lock:
        owner = run_owners.get(cancel_request.run_id)
        if owner is None:
            raise HTTPException(status_code=404, detail="Run not found.")
        if owner != cancel_request.session_id:
            raise HTTPException(status_code=403, detail="Run ownership mismatch.")
        task = active_stream_tasks.get(cancel_request.run_id)
        if task is None or task.done():
            logger.warning("No active task to cancel.")
            raise HTTPException(status_code=404, detail="No active request to cancel.")
        task.cancel()
        active_stream_tasks.pop(cancel_request.run_id, None)
        run_owners.pop(cancel_request.run_id, None)
    logger.info("Task cancelled successfully.")
    return {"status": "cancelled", "run_id": cancel_request.run_id}

@app.post("/api/generate-dashboard", response_model=MacroDashboardResponse)
@limiter.limit("5/minute")
async def create_dashboard(request: Request, dashboard_request: DashboardRequest, _: bool = Depends(require_api_key)):
    logger.info(f"POST /api/generate-dashboard received. Provider: {dashboard_request.provider}, Skip Cache: {dashboard_request.skip_cache}")
    try:
        provider_name = normalize_provider_name(dashboard_request.provider)
        # Enforce cache usage for Demo mode
        skip_cache = dashboard_request.skip_cache
        if provider_name == "Demo":
            skip_cache = False
            
        response = await generate_macro_dashboard_async(provider_name, skip_cache=skip_cache, run_id=dashboard_request.run_id)
        logger.info("Dashboard generated successfully (non-streaming).")
        return response
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating dashboard: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/latest-dashboard")
def latest_dashboard():
    logger.info("GET /api/latest-dashboard received.")
    latest = _load_latest_dashboard()
    if not latest:
        logger.warning("No latest dashboard found in cache.")
        raise HTTPException(status_code=404, detail="No saved dashboard available.")
    return latest

@app.post("/api/stream-dashboard")
@limiter.limit("5/minute")
async def stream_dashboard(dashboard_request: DashboardRequest, request: Request, _: bool = Depends(require_api_key)):
    logger.info(f"POST /api/stream-dashboard received. Provider: {dashboard_request.provider}, Skip Cache: {dashboard_request.skip_cache}")
    async def event_generator():
        current_task = asyncio.current_task()
        async with current_stream_lock:
            active_stream_tasks[dashboard_request.run_id] = current_task
            run_owners[dashboard_request.run_id] = dashboard_request.session_id

        try:
            provider_name = normalize_provider_name(dashboard_request.provider)
            async for chunk in stream_macro_dashboard(
                provider_name,
                skip_cache=dashboard_request.skip_cache,
                run_id=dashboard_request.run_id,
            ):
                if await request.is_disconnected():
                    logger.info("Client disconnected from stream.")
                    break
                yield f"data: {chunk}\n\n"
        except ValueError as e:
            yield f"data: {json.dumps({'status': 'error', 'message': str(e)})}\n\n"
        except asyncio.CancelledError:
            logger.info("Streaming task was cancelled.")
        except Exception as e:
            logger.error(f"Streaming error occurred: {str(e)}")
            logger.error(traceback.format_exc())
            yield f"data: {json.dumps({'status': 'error', 'message': str(e)})}\n\n"
        finally:
            async with current_stream_lock:
                if active_stream_tasks.get(dashboard_request.run_id) is current_task:
                    active_stream_tasks.pop(dashboard_request.run_id, None)
                    run_owners.pop(dashboard_request.run_id, None)
            logger.info("Streaming generator finished.")
            return
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting Uvicorn server on port 8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
