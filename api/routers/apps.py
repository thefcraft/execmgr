from fastapi import APIRouter, HTTPException, Depends, Path, Query
from typing import List

from api.schemas.app import (
    AppCreateRequest,
    AppStatusResponse,
    AppListResponse,
    AppLogResponse,
    LogType,
    ErrorResponse
)

router = APIRouter(
    prefix="/apps",
    tags=["Apps"],
    responses={404: {"model": ErrorResponse, "description": "App not found"}}
)

@router.post("/", response_model=AppStatusResponse, status_code=201)
async def create_app(app: AppCreateRequest) -> AppStatusResponse:
    """
    Creates the folder and boilerplate start.sh/stop.sh for a new app.
    Equivalent to `execmgr create <name>`.
    """
    ...

@router.get("/", response_model=AppListResponse)
async def list_apps(
    detailed: bool = Query(False, description="Include detailed status like `execmgr ls -l`")
) -> AppListResponse:
    """
    Lists all apps.
    Equivalent to `execmgr ls` or `execmgr ls -l`.
    """
    ...

@router.get("/running", response_model=AppListResponse)
async def list_running_apps(
    detailed: bool = Query(False, description="Include detailed status like `execmgr ps -l`")
) -> AppListResponse:
    """
    Lists all currently running apps.
    Equivalent to `execmgr ps` or `execmgr ps -l`.
    """
    ...

@router.get("/{name}", response_model=AppStatusResponse)
async def get_app_status(
    name: str = Path(..., description="The name of the app")
) -> AppStatusResponse:
    """
    Full metadata dump for a specific app.
    Equivalent to `execmgr status <name>`.
    """
    ...

@router.post("/{name}/start", response_model=AppStatusResponse)
async def start_app(
    name: str = Path(..., description="The name of the app to start")
) -> AppStatusResponse:
    """
    Runs the start.sh detached. Logs are truncated (reset) on every run.
    Equivalent to `execmgr run <name>`.
    """
    ...

@router.post("/{name}/stop", response_model=AppStatusResponse)
async def stop_app(
    name: str = Path(..., description="The name of the app to stop")
) -> AppStatusResponse:
    """
    Runs the stop.sh script. Use this if your app needs a graceful shutdown.
    Equivalent to `execmgr stop <name>`.
    """
    ...

@router.post("/{name}/kill", response_model=AppStatusResponse)
async def kill_app(
    name: str = Path(..., description="The name of the app to kill")
) -> AppStatusResponse:
    """
    Sends a kill -9 to the last known PID. Use this when your script is stuck.
    Equivalent to `execmgr kill <name>`.
    """
    ...

@router.delete("/{name}", status_code=204)
async def delete_app(
    name: str = Path(..., description="The name of the app to delete"),
    force: bool = Query(False, description="Skip confirmation. Refuses if running.")
):
    """
    Deletes the app folder.
    Equivalent to `execmgr rm <name>` or `execmgr rm -f <name>`.
    """
    ...

@router.get("/{name}/logs", response_model=AppLogResponse)
async def read_logs(
    name: str = Path(..., description="The name of the app"),
    log_type: LogType = Query(LogType.stdout, description="Type of log: stdout or stderr")
) -> AppLogResponse:
    """
    View stdout or stderr logs.
    Equivalent to `execmgr log <name>` or `execmgr log <name> --stderr`.
    """
    ...

@router.delete("/{name}/logs", status_code=204)
async def clear_logs(
    name: str = Path(..., description="The name of the app"),
    log_type: LogType = Query(None, description="Type of log to clear. If None, clears both.")
):
    """
    Clears the logs for the app.
    Equivalent to `execmgr log <name> -c`, `execmgr log <name> -c --stderr`, or `execmgr log <name> -c --stdout`.
    """
    ...
