use chrono::{DateTime, Local};
use fs2::FileExt;
use std::{
    fs::{OpenOptions, create_dir_all},
    path::PathBuf,
    process::{self, ExitStatus},
};
pub struct LogPath {
    pub stdout: PathBuf,
    pub stderr: PathBuf,
}
pub fn log_paths(app_dir: &PathBuf) -> Result<LogPath, String> {
    let log_dir = app_dir.join("logs");
    create_dir_all(&log_dir)
        .map_err(|e| format!("failed to create log dir {:?}: {}", log_dir, e))?;
    Ok(LogPath {
        stdout: log_dir.join("stdout.log"),
        stderr: log_dir.join("stderr.log"),
    })
}

pub fn since_running(started_at: &str) -> Option<i64> {
    let start: DateTime<Local> = match started_at.parse() {
        Ok(t) => t,
        Err(_) => return None,
    };

    let now = Local::now();
    let dur = now - start;

    Some(dur.num_seconds())
}

/// Returns true if the app lock is currently held by another process
pub fn is_lock_held(app_dir: &PathBuf) -> Result<bool, String> {
    let lock_path = app_dir.join("app.lock");

    if !lock_path.exists() {
        return Ok(false);
    }

    let file = OpenOptions::new()
        .read(true)
        .write(true)
        .open(&lock_path)
        .map_err(|e| format!("failed to open lockfile {:?}: {}", lock_path, e))?;

    // acquire exclusive lock
    match file.try_lock_exclusive() {
        Ok(()) => Ok(false),
        Err(_) => Ok(true),
    } // drop lock
}

pub fn spawn_detached(script: &PathBuf, app_dir: &PathBuf) -> Result<u32, String> {
    let logs = log_paths(app_dir)?;

    let stdout = OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(true)
        .open(logs.stdout)
        .map_err(|e| format!("failed to open stdout log: {}", e))?;

    let stderr = OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(true)
        .open(logs.stderr)
        .map_err(|e| format!("failed to open stderr log: {}", e))?;

    let lockfile = app_dir.join("app.lock");

    let cmd = format!(
        r#"
        set -e
        exec 9>"{lock}"
        if ! flock -n 9; then
            echo "app already running" >&2
            exit 1
        fi
        exec "{script}"
        "#,
        lock = lockfile.display(),
        script = script.display(),
    );

    let child = process::Command::new("bash")
        .arg("-c")
        .arg(cmd)
        .stdin(process::Stdio::null())
        .stdout(process::Stdio::from(stdout))
        .stderr(process::Stdio::from(stderr))
        .spawn()
        .map_err(|e| format!("failed to spawn bash wrapper: {}", e))?;

    Ok(child.id())
}

pub fn attach_log(log_file: &PathBuf) -> Result<ExitStatus, String> {
    process::Command::new("tail")
        .args(["-f", log_file.to_str().unwrap()])
        .status()
        .map_err(|e| format!("failed to follow log: {}", e))
}

pub fn run_attached(script: &PathBuf) -> Result<process::ExitStatus, String> {
    let status = process::Command::new(script)
        .stdin(process::Stdio::inherit())
        .stdout(process::Stdio::inherit())
        .stderr(process::Stdio::inherit())
        .status()
        .map_err(|e| format!("failed to run: {e}"))?;

    Ok(status)
}

pub fn kill_pid(pid: u32) -> Result<process::ExitStatus, String> {
    // SIGKILL = -9 (cannot be ignored)
    let status = std::process::Command::new("kill")
        .arg("-9")
        .arg(pid.to_string())
        .status()
        .map_err(|e| format!("failed to run kill -9: {}", e))?;
    Ok(status)
}

pub fn check_running(app_dir: &PathBuf) -> bool {
    is_lock_held(app_dir).expect("Error:")
}

pub fn resolve_base_dir() -> PathBuf {
    if let Ok(p) = std::env::var("EXECMGR_HOME") {
        return PathBuf::from(p);
    }

    if let Ok(xdg) = std::env::var("XDG_STATE_HOME") {
        return PathBuf::from(xdg).join("execmgr");
    }

    // ~/.local/state/execmgr
    if let Ok(home) = std::env::var("HOME") {
        return PathBuf::from(home).join(".local/state/execmgr");
    }

    // Absolute last resort
    PathBuf::from(".execmgr")
}
