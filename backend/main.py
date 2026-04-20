import asyncio
import json
import logging
import traceback
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("Main")

# Load environment variables before any other local imports
load_dotenv()

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
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

app = FastAPI(title="MacroDashboard API")

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
async def create_dashboard(request: DashboardRequest):
    logger.info(f"POST /api/generate-dashboard received. Provider: {request.provider}, Skip Cache: {request.skip_cache}")
    try:
        provider_name = normalize_provider_name(request.provider)
        response = await generate_macro_dashboard_async(provider_name, skip_cache=request.skip_cache)
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
async def stream_dashboard(request: DashboardRequest, http_request: Request):
    logger.info(f"POST /api/stream-dashboard received. Provider: {request.provider}, Skip Cache: {request.skip_cache}")
    async def event_generator():
        global current_stream_task
        current_task = asyncio.current_task()
        async with current_stream_lock:
            current_stream_task = current_task

        try:
            provider_name = normalize_provider_name(request.provider)
            async for chunk in stream_macro_dashboard(provider_name, skip_cache=request.skip_cache):
                if await http_request.is_disconnected():
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
