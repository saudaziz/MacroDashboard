import asyncio
import json
import logging
import traceback
import os
from pathlib import Path
from dotenv import load_dotenv

try:
    from backend.logging_config import configure_logging
except ImportError:
    from logging_config import configure_logging

configure_logging()
logger = logging.getLogger("Main")

# Robust environment loading
def load_env_robust():
    paths = [
        Path(".env"),                     # CWD
        Path("backend") / ".env",          # Subdir
        Path("..") / ".env"                # Parent (if in backend/)
    ]
    for p in paths:
        if p.exists():
            load_dotenv(p)
            logger.info(f"Loaded environment from: {p.absolute()}")
            return True
    return False

load_env_robust()

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="MacroDashboard API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

try:
    from backend.agent import (
        generate_macro_dashboard_async,
        stream_macro_dashboard,
        _load_latest_dashboard,
    )
    from backend.models import MacroDashboardResponse
    from backend.providers import (
        list_supported_providers,
        normalize_provider_name,
        get_default_provider_name,
    )
except ImportError:
    from agent import (
        generate_macro_dashboard_async,
        stream_macro_dashboard,
        _load_latest_dashboard,
    )
    from models import MacroDashboardResponse
    from providers import list_supported_providers, normalize_provider_name, get_default_provider_name

# Track the currently active stream task for cancellation requests
current_stream_task: asyncio.Task | None = None
current_stream_lock = asyncio.Lock()

# Enable CORS for frontend interaction
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DashboardRequest(BaseModel):
    provider: str = get_default_provider_name()
    skip_cache: bool = False

class ResumeRequest(BaseModel):
    decision: str

@app.post("/api/resume-workflow")
async def resume_dashboard_workflow(request: ResumeRequest):
    logger.info(f"POST /api/resume-workflow received. Decision: {request.decision}")
    try:
        from backend.agent import resume_workflow
    except ImportError:
        from agent import resume_workflow
    
    await resume_workflow(request.decision)
    return {"status": "resumed"}

@app.get("/api/status")
def get_status():
    return {"status": "ok", "message": "MacroDashboard API is running"}

@app.get("/api/providers")
def get_providers():
    return list_supported_providers()

@app.post("/api/cancel-dashboard")
async def cancel_dashboard():
    global current_stream_task
    logger.info("Cancellation requested.")
    async with current_stream_lock:
        if current_stream_task is None or current_stream_task.done():
            logger.warning("No active task to cancel.")
            raise HTTPException(status_code=404, detail="No active request to cancel.")
        current_stream_task.cancel()
        current_stream_task = None
    logger.info("Task cancelled successfully.")
    return {"status": "cancelled"}

@app.post("/api/generate-dashboard", response_model=MacroDashboardResponse)
@limiter.limit("5/minute")
async def create_dashboard(request: Request, dashboard_request: DashboardRequest):
    logger.info(f"POST /api/generate-dashboard received. Provider: {dashboard_request.provider}, Skip Cache: {dashboard_request.skip_cache}")
    
    # --- Agentic Shell Integration ---
    from agentic_shell.routers.dashboard_router import route_dashboard_request
    from agentic_shell.state.dashboard_state import DashboardState
    
    # 1. Initialize State
    state = DashboardState(provider=dashboard_request.provider)
    state = state.transition("START")
    
    # 2. Route via Shell (Pure Logic + Adapter)
    # Note: route_dashboard_request currently calls the synchronous generate_dashboard_adapter
    # We should ensure it's compatible or use an async version if available.
    # For now, we'll call the router which manages the orchestration.
    result = route_dashboard_request(
        provider_name=dashboard_request.provider, 
        skip_cache=dashboard_request.skip_cache
    )
    
    if result["success"]:
        state = state.transition("SUCCESS", payload={"data": result["data"]})
        logger.info("Dashboard generated successfully via Agentic Shell.")
        return result["data"]
    else:
        state = state.transition("FAILURE", payload={"error": result["error"]})
        logger.error(f"Agentic Shell failed: {result['error']}")
        raise HTTPException(status_code=500, detail=result["message"])
    # ---------------------------------

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
async def stream_dashboard(dashboard_request: DashboardRequest, request: Request):
    logger.info(f"POST /api/stream-dashboard received. Provider: {dashboard_request.provider}, Skip Cache: {dashboard_request.skip_cache}")
    async def event_generator():
        global current_stream_task
        current_task = asyncio.current_task()
        async with current_stream_lock:
            current_stream_task = current_task

        try:
            provider_name = normalize_provider_name(dashboard_request.provider)
            async for chunk in stream_macro_dashboard(provider_name, skip_cache=dashboard_request.skip_cache):
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
                if current_stream_task is current_task:
                    current_stream_task = None
            logger.info("Streaming generator finished.")
            return
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting Uvicorn server on port 8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
