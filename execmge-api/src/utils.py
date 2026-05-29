import os
import signal
import subprocess
import fcntl
from pathlib import Path
from datetime import datetime, timezone
from typing import Tuple, Optional

def resolve_base_dir() -> Path:
    """Resolves the base directory for execmgr apps matching the Rust logic."""
    if execmgr_home := os.getenv("EXECMGR_HOME"):
        return Path(execmgr_home)
    
    if xdg_state_home := os.getenv("XDG_STATE_HOME"):
        return Path(xdg_state_home) / "execmgr"
    
    if home := os.getenv("HOME"):
        return Path(home) / ".local/state/execmgr"
    
    # Absolute last resort
    return Path(".execmgr").resolve()


def check_running(app_dir: Path) -> bool:
    """Returns True if the app lock is currently held by another process."""
    lock_path = app_dir / "app.lock"
    if not lock_path.exists():
        return False
    
    try:
        # Open in read mode
        f = open(lock_path, "r")
        try:
            # Attempt to acquire exclusive non-blocking lock.
            # If this succeeds, it means no other process holds the lock.
            fcntl.flock(f.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            # Release lock immediately
            fcntl.flock(f.fileno(), fcntl.LOCK_UN)
            f.close()
            return False
        except OSError:
            # Lock is held, process is running
            f.close()
            return True
    except FileNotFoundError:
        return False
    except Exception:
        return False


def spawn_detached(script: Path, app_dir: Path) -> int:
    """Spawns the start script wrapped in a bash flock wrapper, matching Rust behavior."""
    log_dir = app_dir / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    
    stdout_log = log_dir / "stdout.log"
    stderr_log = log_dir / "stderr.log"
    lockfile = app_dir / "app.lock"

    # Truncate existing log files on start
    stdout_f = open(stdout_log, "w")
    stderr_f = open(stderr_log, "w")

    # Command matching the Rust flock logic
    cmd = f"""
    set -e
    exec 9>"{lockfile}"
    if ! flock -n 9; then
        echo "app already running" >&2
        exit 1
    fi
    exec "{script}"
    """

    # Spawn process in new session so it continues after API exits
    proc = subprocess.Popen(
        ["bash", "-c", cmd],
        stdin=subprocess.DEVNULL,
        stdout=stdout_f,
        stderr=stderr_f,
        cwd=app_dir,
        start_new_session=True
    )

    # Close file descriptors in the parent
    stdout_f.close()
    stderr_f.close()

    return proc.pid


def run_stop_script(script: Path, app_dir: Path) -> Tuple[int, str, str]:
    """Runs stop.sh and captures its return code, stdout, and stderr."""
    try:
        proc = subprocess.run(
            [str(script)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=app_dir,
            timeout=30  # 30-second timeout
        )
        return proc.returncode, proc.stdout, proc.stderr
    except subprocess.TimeoutExpired as e:
        return -1, e.stdout or "", (e.stderr or "") + "\n[Timeout expired after 30 seconds]"
    except Exception as e:
        return -1, "", str(e)


def kill_pid(pid: int) -> bool:
    """Sends SIGKILL to the process group of the specified PID."""
    try:
        os.killpg(pid, signal.SIGKILL)
        return True
    except Exception:
        try:
            os.kill(pid, signal.SIGKILL)
            return True
        except ProcessLookupError:
            return False  # Already dead
        except Exception as e:
            raise RuntimeError(f"failed to kill pid {pid}: {e}")


def since_running(started_at_str: str) -> Optional[int]:
    """Calculates the uptime in seconds since the RFC3339 started_at timestamp."""
    try:
        start = datetime.fromisoformat(started_at_str)
        # Handle offset-naive or offset-aware datetimes
        now = datetime.now(start.tzinfo)
        dur = now - start
        return int(dur.total_seconds())
    except Exception:
        return None
