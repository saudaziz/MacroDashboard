from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from agent import generate_macro_dashboard, stream_macro_dashboard
from models import MacroDashboardResponse
from typing import List, AsyncGenerator
import json

app = FastAPI(title="MacroDashboard API")

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

@app.post("/api/generate-dashboard", response_model=MacroDashboardResponse)
async def create_dashboard(request: DashboardRequest):
    try:
        response = generate_macro_dashboard(request.provider)
        return response
    except Exception as e:
        print(f"Error generating dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/stream-dashboard")
async def stream_dashboard(request: DashboardRequest):
    async def event_generator():
        try:
            async for chunk in stream_macro_dashboard(request.provider):
                yield f"data: {chunk}\n\n"
        except Exception as e:
            print(f"Streaming error: {str(e)}")
            yield f"data: {json.dumps({'status': 'error', 'message': str(e)})}\n\n"
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
