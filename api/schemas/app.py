from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class AppCreateRequest(BaseModel):
    name: str = Field(..., description="Name of the app to create")
    start_script_content: Optional[str] = Field(None, description="Optional content for start.sh")
    stop_script_content: Optional[str] = Field(None, description="Optional content for stop.sh")

class AppMetadata(BaseModel):
    created_time: datetime = Field(..., description="When the app was created")
    run_count: int = Field(..., description="Number of times the app has been run")
    last_pid: Optional[int] = Field(None, description="Last known PID of the app")

class AppStatusResponse(BaseModel):
    name: str = Field(..., description="Name of the app")
    is_running: bool = Field(..., description="Whether the app is currently running (based on flock)")
    metadata: AppMetadata = Field(..., description="Metadata from app.json")

class AppListResponse(BaseModel):
    apps: List[AppStatusResponse]

class LogType(str, Enum):
    stdout = "stdout"
    stderr = "stderr"

class AppLogResponse(BaseModel):
    name: str = Field(..., description="Name of the app")
    log_type: LogType = Field(..., description="Type of log: stdout or stderr")
    content: str = Field(..., description="The log file content")

class SystemInfoResponse(BaseModel):
    total_apps: int = Field(..., description="Total number of apps registered")
    running_apps: int = Field(..., description="Number of apps currently running")
    binary_paths: List[str] = Field(..., description="Paths to execmgr binaries")

class ErrorResponse(BaseModel):
    detail: str = Field(..., description="Error message detail")
