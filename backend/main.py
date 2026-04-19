import asyncio
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
try:
    from backend.agent import generate_macro_dashboard, stream_macro_dashboard, _load_latest_dashboard
    from backend.models import MacroDashboardResponse
except ImportError:
    from agent import generate_macro_dashboard, stream_macro_dashboard, _load_latest_dashboard
    from models import MacroDashboardResponse
from typing import List, AsyncGenerator

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
    provider: str

@app.get("/api/status")
def get_status():
    return {"status": "ok", "message": "MacroDashboard API is running"}

@app.get("/api/providers")
def get_providers():
    return ["Gemini", "Claude", "Ollama"]

@app.post("/api/cancel-dashboard")
async def cancel_dashboard():
    global current_stream_task
    async with current_stream_lock:
        if current_stream_task is None or current_stream_task.done():
            raise HTTPException(status_code=404, detail="No active request to cancel.")
        current_stream_task.cancel()
        current_stream_task = None
    return {"status": "cancelled"}

@app.post("/api/generate-dashboard", response_model=MacroDashboardResponse)
async def create_dashboard(request: DashboardRequest):
    try:
        response = generate_macro_dashboard(request.provider)
        return response
    except Exception as e:
        print(f"Error generating dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/latest-dashboard")
def latest_dashboard():
    latest = _load_latest_dashboard()
    if not latest:
        raise HTTPException(status_code=404, detail="No saved dashboard available.")
    return latest

@app.post("/api/stream-dashboard")
async def stream_dashboard(request: DashboardRequest):
    async def event_generator():
        global current_stream_task
        current_task = asyncio.current_task()
        async with current_stream_lock:
            current_stream_task = current_task

        try:
            async for chunk in stream_macro_dashboard(request.provider):
                yield f"data: {chunk}\n\n"
        except asyncio.CancelledError:
            print("Streaming canceled by user.")
        except Exception as e:
            print(f"Streaming error: {str(e)}")
            yield f"data: {json.dumps({'status': 'error', 'message': str(e)})}\n\n"
        finally:
            async with current_stream_lock:
                if current_stream_task is current_task:
                    current_stream_task = None
            return
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
