from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from datetime import datetime, timezone
from pathlib import Path
import json
import shutil
import subprocess
import os
import asyncio

from src.utils import (
    resolve_base_dir,
    check_running,
    spawn_detached,
    run_stop_script,
    kill_pid,
    since_running,
)

router = APIRouter()


class AppInfo(BaseModel):
    name: str
    path: str
    pid: int | None
    runs: int
    uptime: int | None
    created: datetime
    lastRun: datetime | None
    running: bool


class CreateAppRequest(BaseModel):
    name: str


class RenameAppRequest(BaseModel):
    newName: str


class SaveScriptsRequest(BaseModel):
    startScript: str
    stopScript: str


class ScriptsResponse(BaseModel):
    startScript: str
    stopScript: str


class LogsResponse(BaseModel):
    stdout: list[str]
    stderr: list[str]


class StopAppResponse(BaseModel):
    exit_code: int
    stdout: str
    stderr: str


DEFAULT_START_SCRIPT = """#!/bin/sh
# Start script for the app
# This script is executed when you run: execmgr run <app>

echo "Starting app at $(date)"

# Add your start commands here
# Example: podman-compose up
# Example: node server.js
# Example: python app.py

# Keep the script running (example loop)
while true; do
  echo "App running at $(date)"
  sleep 60
done
"""

DEFAULT_STOP_SCRIPT = """#!/bin/sh
# Stop script for the app
# This script is executed when you run: execmgr stop <app>

echo "Stopping app at $(date)"

# Add your cleanup commands here
# Example: podman-compose down
# Example: kill child processes
# Example: cleanup temp files

echo "App stopped"
"""


def get_app_dir(name: str) -> Path:
    basedir = resolve_base_dir()
    # Normalize name to prevent directory traversal
    safe_name = os.path.basename(name)
    return basedir / safe_name


@router.get("/apps-info", response_model=list[AppInfo])
async def apps_info() -> list[AppInfo]:
    basedir = resolve_base_dir()
    if not basedir.exists():
        return []

    apps = []
    for entry in basedir.iterdir():
        if not entry.is_dir() or entry.name.startswith("."):
            continue

        json_path = entry / "app.json"
        if not json_path.exists():
            continue

        try:
            with open(json_path, "r") as f:
                data = json.load(f)

            running = check_running(entry)

            created_str = data.get("created_at")
            last_run = data.get("last_run")

            pid = None
            last_run_time = None
            uptime = None

            if last_run:
                pid = last_run.get("pid")
                last_run_time_str = last_run.get("time")
                if last_run_time_str:
                    try:
                        last_run_time = datetime.fromisoformat(last_run_time_str)
                    except Exception:
                        pass

                if running and last_run_time_str:
                    uptime = since_running(last_run_time_str)

            try:
                created = datetime.fromisoformat(created_str) if created_str else datetime.now(timezone.utc)
            except Exception:
                created = datetime.now(timezone.utc)

            apps.append(
                AppInfo(
                    name=data.get("name", entry.name),
                    path=str(entry),
                    pid=pid if running else None,
                    runs=data.get("num_runs", 0),
                    uptime=uptime,
                    created=created,
                    lastRun=last_run_time,
                    running=running,
                )
            )
        except Exception as e:
            # Log error and continue so we don't crash the entire list
            print(f"Error loading app '{entry.name}': {e}")
            continue

    apps.sort(key=lambda a: a.name)
    return apps


@router.post("/create-app", response_model=AppInfo)
async def create_app(payload: CreateAppRequest) -> AppInfo:
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="App name cannot be empty")

    app_dir = get_app_dir(name)
    if app_dir.exists():
        raise HTTPException(status_code=400, detail=f"App '{name}' already exists.")

    try:
        app_dir.mkdir(parents=True, exist_ok=True)

        # Create default start.sh and stop.sh scripts
        scripts = {
            "start.sh": DEFAULT_START_SCRIPT,
            "stop.sh": DEFAULT_STOP_SCRIPT,
        }

        for filename, content in scripts.items():
            filepath = app_dir / filename
            with open(filepath, "w") as f:
                f.write(content)
            # Make executable chmod +x (755)
            filepath.chmod(0o755)

        # Create initial app.json
        created_time = datetime.now(timezone.utc).isoformat()
        app_data = {
            "name": name,
            "created_at": created_time,
            "last_run": None,
            "num_runs": 0,
        }

        with open(app_dir / "app.json", "w") as f:
            json.dump(app_data, f, indent=4)

        return AppInfo(
            name=name,
            path=str(app_dir),
            pid=None,
            runs=0,
            uptime=None,
            created=datetime.fromisoformat(created_time),
            lastRun=None,
            running=False,
        )
    except Exception as e:
        if app_dir.exists():
            shutil.rmtree(app_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=f"Failed to create app: {e}")


@router.post("/apps/{name}/run")
async def run_app_endpoint(name: str):
    app_dir = get_app_dir(name)
    if not app_dir.exists():
        raise HTTPException(status_code=404, detail=f"App '{name}' not found.")

    script = app_dir / "start.sh"
    if not script.exists():
        raise HTTPException(status_code=400, detail=f"start.sh not found for '{name}'.")

    # Read current app.json
    json_path = app_dir / "app.json"
    try:
        with open(json_path, "r") as f:
            app_data = json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read app configuration: {e}")

    # Check if already running
    if check_running(app_dir):
        last_run = app_data.get("last_run") or {}
        pid = last_run.get("pid", "Unknown")
        raise HTTPException(status_code=400, detail=f"App '{name}' is already running (pid: {pid})")

    # Spawn process
    try:
        pid = spawn_detached(script, app_dir)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start app: {e}")

    # Update app.json
    run_time = datetime.now(timezone.utc).isoformat()
    app_data["last_run"] = {"time": run_time, "pid": pid}
    app_data["num_runs"] = app_data.get("num_runs", 0) + 1

    try:
        with open(json_path, "w") as f:
            json.dump(app_data, f, indent=4)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update app run info: {e}")

    return {"message": f"Started '{name}'", "pid": pid, "started_at": run_time}


@router.post("/apps/{name}/stop", response_model=StopAppResponse)
async def stop_app_endpoint(name: str, force: bool = False) -> StopAppResponse:
    app_dir = get_app_dir(name)
    if not app_dir.exists():
        raise HTTPException(status_code=404, detail=f"App '{name}' not found.")

    script = app_dir / "stop.sh"
    if not script.exists():
        raise HTTPException(status_code=400, detail=f"stop.sh not found for '{name}'.")

    is_running = check_running(app_dir)
    if not force and not is_running:
        raise HTTPException(status_code=400, detail=f"App '{name}' is not running")

    # Run stop script
    exit_code, stdout, stderr = run_stop_script(script, app_dir)

    if exit_code != 0:
        # Stop script failed
        raise HTTPException(
            status_code=500,
            detail=f"stop.sh exited with code {exit_code}.\nStdout: {stdout}\nStderr: {stderr}",
        )

    return StopAppResponse(exit_code=exit_code, stdout=stdout, stderr=stderr)


@router.post("/apps/{name}/kill")
async def kill_app_endpoint(name: str):
    app_dir = get_app_dir(name)
    if not app_dir.exists():
        raise HTTPException(status_code=404, detail=f"App '{name}' not found.")

    if not check_running(app_dir):
        raise HTTPException(status_code=400, detail=f"App '{name}' is not running")

    # Read current app.json to get pid
    json_path = app_dir / "app.json"
    try:
        with open(json_path, "r") as f:
            app_data = json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read app configuration: {e}")

    last_run = app_data.get("last_run")
    if not last_run or "pid" not in last_run:
        raise HTTPException(
            status_code=400, detail=f"No pid found for '{name}'; cannot kill process."
        )

    pid = last_run["pid"]
    try:
        killed = kill_pid(pid)
        if not killed:
            return {"message": f"Process {pid} was already terminated."}
        return {"message": f"Force killed '{name}' (pid {pid})"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to kill process: {e}")


@router.delete("/apps/{name}")
async def delete_app_endpoint(name: str):
    app_dir = get_app_dir(name)
    if not app_dir.exists():
        raise HTTPException(status_code=404, detail=f"App '{name}' not found.")

    if check_running(app_dir):
        raise HTTPException(status_code=400, detail=f"Cannot delete running app '{name}'. Stop it first.")

    try:
        shutil.rmtree(app_dir)
        return {"message": f"Deleted app '{name}'"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete app: {e}")


@router.post("/apps/{name}/rename")
async def rename_app_endpoint(name: str, payload: RenameAppRequest):
    new_name = payload.newName.strip()
    if not new_name:
        raise HTTPException(status_code=400, detail="New name cannot be empty")

    app_dir = get_app_dir(name)
    if not app_dir.exists():
        raise HTTPException(status_code=404, detail=f"App '{name}' not found.")

    new_app_dir = get_app_dir(new_name)
    if new_app_dir.exists():
        raise HTTPException(
            status_code=400, detail=f"An app named '{new_name}' already exists."
        )

    if check_running(app_dir):
        raise HTTPException(
            status_code=400, detail=f"Cannot rename running app '{name}'. Stop it first."
        )

    try:
        # Rename directory
        os.rename(app_dir, new_app_dir)

        # Update name inside app.json
        json_path = new_app_dir / "app.json"
        if json_path.exists():
            with open(json_path, "r") as f:
                app_data = json.load(f)

            app_data["name"] = new_name

            with open(json_path, "w") as f:
                json.dump(app_data, f, indent=4)

        return {"message": f"Renamed app '{name}' to '{new_name}'"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to rename app: {e}")


@router.get("/apps/{name}/scripts", response_model=ScriptsResponse)
async def get_scripts(name: str) -> ScriptsResponse:
    app_dir = get_app_dir(name)
    if not app_dir.exists():
        raise HTTPException(status_code=404, detail=f"App '{name}' not found.")

    start_path = app_dir / "start.sh"
    stop_path = app_dir / "stop.sh"

    start_content = ""
    if start_path.exists():
        with open(start_path, "r") as f:
            start_content = f.read()

    stop_content = ""
    if stop_path.exists():
        with open(stop_path, "r") as f:
            stop_content = f.read()

    return ScriptsResponse(startScript=start_content, stopScript=stop_content)


@router.put("/apps/{name}/scripts")
async def save_scripts(name: str, payload: SaveScriptsRequest):
    app_dir = get_app_dir(name)
    if not app_dir.exists():
        raise HTTPException(status_code=404, detail=f"App '{name}' not found.")

    try:
        start_path = app_dir / "start.sh"
        stop_path = app_dir / "stop.sh"

        with open(start_path, "w") as f:
            f.write(payload.startScript)
        start_path.chmod(0o755)

        with open(stop_path, "w") as f:
            f.write(payload.stopScript)
        stop_path.chmod(0o755)

        return {"message": f"Scripts saved for '{name}'"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save scripts: {e}")


async def log_stream_generator(log_path: Path):
    # Wait for log file to exist or timeout
    for _ in range(10):
        if log_path.exists():
            break
        await asyncio.sleep(0.5)

    if not log_path.exists():
        yield "data: [Log file not found. App may not have run yet.]\n\n"
        return

    try:
        with open(log_path, "r") as f:
            # Send last 500 lines to start
            lines = f.readlines()
            for line in lines[-500:]:
                yield f"data: {line.rstrip('\r\n')}\n\n"
            
            # Seek to end
            f.seek(0, 2)
            
            while True:
                line = f.readline()
                if not line:
                    await asyncio.sleep(0.2)
                    continue
                yield f"data: {line.rstrip('\r\n')}\n\n"
    except asyncio.CancelledError:
        pass
    except Exception as e:
        yield f"data: [Log streaming error: {e}]\n\n"


@router.get("/apps/{name}/logs/stream")
async def stream_logs_endpoint(name: str, type: str = "stdout"):
    if type not in ("stdout", "stderr"):
        raise HTTPException(status_code=400, detail="Invalid log type. Must be 'stdout' or 'stderr'.")

    app_dir = get_app_dir(name)
    if not app_dir.exists():
        raise HTTPException(status_code=404, detail=f"App '{name}' not found.")

    log_file = app_dir / "logs" / f"{type}.log"
    return StreamingResponse(log_stream_generator(log_file), media_type="text/event-stream")


@router.get("/apps/{name}/logs", response_model=LogsResponse)
async def get_logs(name: str) -> LogsResponse:
    app_dir = get_app_dir(name)
    if not app_dir.exists():
        raise HTTPException(status_code=404, detail=f"App '{name}' not found.")

    stdout_path = app_dir / "logs" / "stdout.log"
    stderr_path = app_dir / "logs" / "stderr.log"

    stdout_lines = []
    if stdout_path.exists():
        with open(stdout_path, "r") as f:
            stdout_lines = [line.rstrip("\r\n") for line in f.readlines()]

    stderr_lines = []
    if stderr_path.exists():
        with open(stderr_path, "r") as f:
            stderr_lines = [line.rstrip("\r\n") for line in f.readlines()]

    return LogsResponse(stdout=stdout_lines, stderr=stderr_lines)


@router.post("/apps/{name}/logs/clear")
async def clear_logs_endpoint(name: str):
    app_dir = get_app_dir(name)
    if not app_dir.exists():
        raise HTTPException(status_code=404, detail=f"App '{name}' not found.")

    stdout_path = app_dir / "logs" / "stdout.log"
    stderr_path = app_dir / "logs" / "stderr.log"

    try:
        if stdout_path.exists():
            with open(stdout_path, "w") as f:
                f.write("")
        if stderr_path.exists():
            with open(stderr_path, "w") as f:
                f.write("")
        return {"message": f"Logs cleared for '{name}'"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear logs: {e}")


@router.post("/apps/{name}/open")
async def open_folder_endpoint(name: str):
    app_dir = get_app_dir(name)
    if not app_dir.exists():
        raise HTTPException(status_code=404, detail=f"App '{name}' not found.")

    # Try to open using standard xdg-open on Linux
    try:
        # Check if running in a GUI session, otherwise this will fail
        # We start detached using subprocess.Popen so the API does not block
        subprocess.Popen(["xdg-open", str(app_dir)])
        return {"message": f"Opening folder: {app_dir}"}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to open folder (is xdg-open installed?): {e}"
        )


@router.get("/events")
async def events_stream():
    from src.routers.info import get_system_info

    async def event_generator():
        while True:
            try:
                apps = await apps_info()
                sys_info = await get_system_info()
                
                apps_data = [
                    app.model_dump() if hasattr(app, "model_dump") else app.dict()
                    for app in apps
                ]
                sys_data = (
                    sys_info.model_dump()
                    if hasattr(sys_info, "model_dump")
                    else sys_info.dict()
                )

                payload = {
                    "apps": apps_data,
                    "system": sys_data
                }
                
                yield f"data: {json.dumps(payload, default=str)}\n\n"
            except asyncio.CancelledError:
                break
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
                
            await asyncio.sleep(2.0)
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")