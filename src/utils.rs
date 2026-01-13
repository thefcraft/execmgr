use sha2::{Digest, Sha256};
use std::{
    fs::{OpenOptions, create_dir_all},
    path::PathBuf,
    process,
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

    let child = process::Command::new(script)
        .stdin(process::Stdio::null())
        .stdout(process::Stdio::from(stdout))
        .stderr(process::Stdio::from(stderr))
        .spawn()
        .map_err(|e| format!("failed to spawn: {e}"))?;

    Ok(child.id())
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

pub fn sha256_hex(input: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    let result = hasher.finalize();
    format!("{:x}", result)
}

pub fn check_running(needle: &str) -> bool {
    let output = process::Command::new("ps")
        .args(["-f"])
        .output()
        .expect("unable to run command ps");

    let stdout = String::from_utf8_lossy(&output.stdout);

    stdout.lines().any(|line| line.contains(needle))
}

pub fn get_running_stdout() -> Vec<String> {
    let output = process::Command::new("ps")
        .args(["-f"])
        .output()
        .expect("unable to run command ps");
    let stdout = String::from_utf8_lossy(&output.stdout);

    stdout.lines().map(|line| line.to_owned()).collect()
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
