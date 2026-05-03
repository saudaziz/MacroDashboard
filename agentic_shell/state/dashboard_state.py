from typing import Optional, Any, Dict
from datetime import datetime

class DashboardState:
    def __init__(self, 
                 provider: str, 
                 status: str = "INITIAL", 
                 data: Optional[Dict[str, Any]] = None,
                 error: Optional[str] = None,
                 version: int = 0):
        self.provider = provider
        self.status = status
        self.data = data
        self.error = error
        self.version = version
        self.timestamp = datetime.now()

    def transition(self, event: str, payload: Optional[Dict[str, Any]] = None) -> 'DashboardState':
        """
        Pure state transition. Returns a new immutable state object.
        """
        new_status = self.status
        new_data = self.data
        new_error = self.error
        
        if event == "START":
            new_status = "PENDING"
        elif event == "SUCCESS":
            new_status = "COMPLETED"
            new_data = payload.get("data") if payload else None
        elif event == "FAILURE":
            new_status = "FAILED"
            new_error = payload.get("error") if payload else "Unknown error"
            
        return DashboardState(
            provider=self.provider,
            status=new_status,
            data=new_data,
            error=new_error,
            version=self.version + 1
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "provider": self.provider,
            "status": self.status,
            "data": self.data,
            "error": self.error,
            "version": self.version,
            "timestamp": self.timestamp.isoformat()
        }
