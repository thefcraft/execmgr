from fastapi import APIRouter
from pydantic import BaseModel
from pathlib import Path
import sys

from src.utils import resolve_base_dir, check_running

router = APIRouter()


class SystemInfo(BaseModel):
    baseDir: str
    apps: int
    running: int
    binary: str
    rustCrate: str
    version: str


@router.get("/system-info", response_model=SystemInfo)
async def get_system_info() -> SystemInfo:
    basedir = resolve_base_dir()
    
    total_apps = 0
    running_apps = 0
    
    if basedir.exists():
        for entry in basedir.iterdir():
            if entry.is_dir() and not entry.name.startswith("."):
                # Check if it's an app by looking for app.json
                if (entry / "app.json").exists():
                    total_apps += 1
                    if check_running(entry):
                        running_apps += 1

    # Resolve python binary path or fallback
    python_bin = sys.executable
    
    return SystemInfo(
        baseDir=str(basedir),
        apps=total_apps,
        running=running_apps,
        binary=python_bin,
        rustCrate="execmgr",
        version="0.3.0",
    )
