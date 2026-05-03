from typing import Any, Optional, TypedDict

class Result(TypedDict, total=False):
    success: bool
    data: Optional[Any]
    error: Optional[str]
    message: Optional[str]
    confidence: float
    recoverable: bool
