mod app;
mod cli;
mod utils;

use std::fs::{OpenOptions, create_dir_all, read_dir, remove_dir_all};
use std::io;
use std::io::Write;
use std::os::unix::fs::PermissionsExt;
use std::path::PathBuf;

use chrono::Utc;
use clap::Parser;

use crate::app::{App, LastRunInfo};
use crate::cli::Commands;
use crate::utils::{
    attach_log, check_running, kill_pid, log_paths, resolve_base_dir, run_attached, spawn_detached,
};

fn create_app(basedir: &PathBuf, name: &str) -> Result<(), String> {
    let path = basedir.join(name);
    if path.exists() {
        return Err(format!("app '{}' already exists.", name));
    }
    create_dir_all(&path).map_err(|_| format!("failed to create path: {:?}", path))?;
    let files = ["start.sh", "stop.sh"];
    for file in files {
        let filepath = path.join(file);
        let mut f = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&filepath)
            .map_err(|_| format!("failed to create file: {:?}", filepath))?;
        writeln!(
            f,
            "#!/bin/sh\nset -e\nexec echo 'hello from {}'",
            name.replace("'", "`")
        )
        .map_err(|_| format!("failed to create file: {:?}", filepath))?;

        // chmod +x (755)
        let mut perms = f
            .metadata()
            .map_err(|_| format!("failed to get metadata: {:?}", filepath))?
            .permissions();

        perms.set_mode(0o755);

        std::fs::set_permissions(&filepath, perms)
            .map_err(|_| format!("failed to set permissions: {:?}", filepath))?;
    }
    let app = App {
        name: name.to_string(),
        created_at: Utc::now().to_rfc3339(),
        last_run: None,
        num_runs: 0,
    };
    let app_json =
        serde_json::to_string_pretty(&app).expect("Something went wrong while dumping app json.");
    let filepath = path.join("app.json");
    let mut f = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&filepath)
        .map_err(|_| format!("failed to create file: {:?}", filepath))?;
    write!(f, "{}", app_json).map_err(|_| format!("failed to create file: {:?}", filepath))?;

    println!("created app '{}'", name);
    println!("path: {:?}", path);
    println!("start script: start.sh");

    Ok(())
}

fn run_app(basedir: &PathBuf, name: &str) -> Result<(), String> {
    let path = basedir.join(name);
    if !path.exists() {
        return Err(format!("app '{}' not exists.", name));
    }
    let script = path.join("start.sh");
    if !script.exists() {
        return Err(format!("'{:?}'  not found for '{}'.", script, name));
    }

    let json_path = path.join("app.json");
    let mut app: App = serde_json::from_str(
        &std::fs::read_to_string(&json_path)
            .map_err(|_| format!("unable to read {:?}", json_path))?,
    )
    .map_err(|_| format!("data is corrupted in {:?}", json_path))?;

    if check_running(&path) {
        return Err(format!(
            "app '{}' is already running (pid: {})",
            name,
            app.last_run
                .map(|last_run| last_run.pid.to_string())
                .unwrap_or("None".into())
        ));
    }

    let child = spawn_detached(&script, &path)?;
    let last_run = LastRunInfo {
        time: Utc::now().to_rfc3339(),
        pid: child,
    };
    println!("started '{}'", name);
    println!("pid: {}", last_run.pid);
    println!(
        "started at: {}",
        last_run
            .time
            .get(..19)
            .unwrap_or(&last_run.time)
            .replace('T', " ")
    );
    app.last_run = Some(last_run);
    app.num_runs = app.num_runs + 1;

    std::fs::write(
        &json_path,
        serde_json::to_string_pretty(&app)
            .map_err(|_| "Something went wrong while dumping app json.")?,
    )
    .map_err(|_| format!("Something went wrong while writing to {:?}.", json_path))?;

    Ok(())
}
fn status_app(basedir: &PathBuf, name: &str) -> Result<(), String> {
    let path = basedir.join(name);

    if !path.exists() {
        return Err(format!("app '{}' not exists.", name));
    }

    let json_path = path.join("app.json");
    let app: App = serde_json::from_str(
        &std::fs::read_to_string(&json_path)
            .map_err(|e| format!("unable to read {:?}: {}", json_path, e))?,
    )
    .map_err(|e| format!("data is corrupted in {:?}: {}", json_path, e))?;

    let running = check_running(&path);

    println!("name        : {}", app.name);
    println!("path        : {}", path.display());
    println!(
        "created     : {}",
        app.created_at
            .get(..19)
            .unwrap_or(&app.created_at)
            .replace('T', " ")
    );
    println!("runs        : {}", app.num_runs);

    match &app.last_run {
        Some(last) => {
            println!(
                "last run    : {}",
                last.time.get(..19).unwrap_or(&last.time).replace('T', " ")
            );
            println!("last pid    : {}", last.pid);
        }
        None => {
            println!("last run    : -");
            println!("last pid    : -");
        }
    }

    println!("running     : {}", if running { "yes" } else { "no" });

    let log_dir = path.join("logs");
    if log_dir.exists() {
        println!("logs        : {}", log_dir.display());
        println!("  stdout    : {}", log_dir.join("stdout.log").display());
        println!("  stderr    : {}", log_dir.join("stderr.log").display());
    } else {
        println!("logs        : -");
    }

    Ok(())
}
fn show_info(basedir: &PathBuf) -> Result<(), String> {
    println!("execmgr info");
    println!("-------------");

    println!("base dir    : {}", basedir.display());

    let mut total = 0usize;
    let mut running = 0usize;

    if basedir.exists() {
        for entry in
            std::fs::read_dir(basedir).map_err(|e| format!("unable to read base dir: {}", e))?
        {
            let entry = entry.map_err(|e| format!("error reading entry: {}", e))?;
            if !entry.file_type().map_err(|e| e.to_string())?.is_dir() {
                continue;
            }

            total += 1;

            if check_running(&entry.path()) {
                running += 1;
            }
        }
    }

    println!("apps        : {}", total);
    println!("running     : {}", running);

    // binary info (best-effort)
    if let Ok(exe) = std::env::current_exe() {
        println!("binary      : {}", exe.display());
    } else {
        println!("binary      : -");
    }

    println!("rust        : {}", env!("CARGO_PKG_NAME"));
    println!("version     : {}", env!("CARGO_PKG_VERSION"));

    Ok(())
}
fn stop_app(basedir: &PathBuf, name: &str, force: bool) -> Result<(), String> {
    let path = basedir.join(name);
    if !path.exists() {
        return Err(format!("app '{}' not exists.", name));
    }
    let script = path.join("stop.sh");
    if !script.exists() {
        return Err(format!("'{:?}'  not found for '{}'.", script, name));
    }

    if !force && !check_running(&path) {
        return Err(format!("app '{}' is not running", name));
    }

    println!("stopped '{}'", name);
    let status = run_attached(&script)?;

    if !status.success() {
        return Err(format!("stop.sh failed for app '{}'", name));
    }
    println!("exit: {}", status);
    Ok(())
}
fn kill_app(basedir: &PathBuf, name: &str) -> Result<(), String> {
    let path = basedir.join(name);
    if !path.exists() {
        return Err(format!("app '{}' not exists.", name));
    }
    if !check_running(&path) {
        return Err(format!("app '{}' is not running", name));
    }

    let json_path = path.join("app.json");
    let app: App = serde_json::from_str(
        &std::fs::read_to_string(&json_path)
            .map_err(|_| format!("unable to read {:?}", json_path))?,
    )
    .map_err(|_| format!("data is corrupted in {:?}", json_path))?;

    let last_run = if let Some(last_run) = app.last_run {
        last_run
    } else {
        return Err(format!(
            "no pidfile found for '{}'; cannot force kill safely",
            name
        ));
    };

    println!("force killing '{}' (pid {})", name, last_run.pid);

    let status = kill_pid(last_run.pid)?;

    if !status.success() {
        return Err(format!("kill -9 failed for pid {}", last_run.pid));
    }
    println!("exit: {}", status);

    Ok(())
}
fn delete_app(basedir: &PathBuf, name: &str) -> Result<(), String> {
    let path = basedir.join(name);
    if !path.exists() {
        return Err(format!("app '{}' not exists.", name));
    }
    if check_running(&path) {
        return Err(format!("can't delete, app '{}' is running", name));
    }
    remove_dir_all(path).expect("unable to delete");
    println!("deleted '{}'", name);
    Ok(())
}
fn list_app(basedir: &PathBuf, long: bool, full: bool) -> Result<(), String> {
    if long {
        println!(
            "{:<20} {:<20} {:<25} {:<6} {:<8} {:<25} {}",
            "NAME", "PATH", "CREATED", "RUNS", "PID", "LAST_RUN", "RUNNING"
        );
    }

    if !basedir.exists() {
        return Ok(());
    }
    for entry in read_dir(basedir).map_err(|_| "unable to read dir")? {
        let entry = entry.map_err(|_| "error while reading entry")?;
        let entry_type = entry
            .file_type()
            .map_err(|_| "error while reading entry type")?;
        if !entry_type.is_dir() {
            eprintln!("Unknow app: {}", entry.path().display());
            continue;
        }

        if long {
            let path = entry.path();
            let json_path = path.join("app.json");
            let name = entry
                .file_name()
                .to_str()
                .expect("bug: unknown encoding")
                .to_owned();
            let app: App = serde_json::from_str(
                &std::fs::read_to_string(&json_path)
                    .map_err(|_| format!("unable to read {:?}", json_path))?,
            )
            .map_err(|_| format!("data is corrupted in {:?}", json_path))?;

            let is_running = check_running(&path);
            if full {
                println!(
                    "{:<20} {:<20} {:<25} {:<6} {:<8} {:<25} {}",
                    name,
                    path.display(),
                    app.created_at
                        .get(..19)
                        .unwrap_or(&app.created_at)
                        .replace('T', " "),
                    app.num_runs,
                    app.last_run
                        .as_ref()
                        .map(|l| l.pid.to_string())
                        .unwrap_or_else(|| "-".into()),
                    app.last_run
                        .map(|last_run| last_run
                            .time
                            .get(..19)
                            .unwrap_or(&last_run.time)
                            .replace('T', " "))
                        .unwrap_or_else(|| "-".into()),
                    if is_running { "yes" } else { "no" }
                );
            } else {
                println!(
                    "{:<20.20} {:<20.20} {:<25.25} {:<6} {:<8} {:<25.25} {}",
                    name,
                    path.display(),
                    app.created_at
                        .get(..19)
                        .unwrap_or(&app.created_at)
                        .replace('T', " "),
                    app.num_runs,
                    app.last_run
                        .as_ref()
                        .map(|l| l.pid.to_string())
                        .unwrap_or_else(|| "-".into()),
                    app.last_run
                        .map(|last_run| last_run
                            .time
                            .get(..19)
                            .unwrap_or(&last_run.time)
                            .replace('T', " "))
                        .unwrap_or_else(|| "-".into()),
                    if is_running { "yes" } else { "no" }
                );
            }
        } else {
            println!("{}", entry.file_name().display());
        }
    }
    Ok(())
}
fn list_process(basedir: &PathBuf, long: bool, full: bool) -> Result<(), String> {
    if long {
        println!(
            "{:<20} {:<20} {:<25} {:<6} {:<8}",
            "NAME", "PATH", "CREATED", "RUNS", "PID"
        );
    }
    if !basedir.exists() {
        return Ok(());
    }

    for entry in read_dir(basedir).map_err(|_| "unable to read dir")? {
        let entry = entry.map_err(|_| "error while reading entry")?;
        let entry_type = entry
            .file_type()
            .map_err(|_| "error while reading entry type")?;
        if !entry_type.is_dir() {
            eprintln!("Unknow app: {}", entry.path().display());
            continue;
        }

        let name = entry
            .file_name()
            .to_str()
            .expect("bug: unknown encoding")
            .to_owned();
        let path = entry.path();
        if !check_running(&path){
            continue;
        }
        if long {
            let json_path = path.join("app.json");
            let app: App = serde_json::from_str(
                &std::fs::read_to_string(&json_path)
                    .map_err(|_| format!("unable to read {:?}", json_path))?,
            )
            .map_err(|_| format!("data is corrupted in {:?}", json_path))?;
            if full {
                println!(
                    "{:<20} {:<20} {:<25} {:<6} {:<8}",
                    name,
                    path.display(),
                    app.created_at
                        .get(..19)
                        .unwrap_or(&app.created_at)
                        .replace('T', " "),
                    app.num_runs,
                    app.last_run
                        .as_ref()
                        .map(|l| l.pid.to_string())
                        .unwrap_or_else(|| "-".into()),
                );
            } else {
                println!(
                    "{:<20.20} {:<20.20} {:<25.25} {:<6} {:<8}",
                    name,
                    path.display(),
                    app.created_at
                        .get(..19)
                        .unwrap_or(&app.created_at)
                        .replace('T', " "),
                    app.num_runs,
                    app.last_run
                        .as_ref()
                        .map(|l| l.pid.to_string())
                        .unwrap_or_else(|| "-".into()),
                );
            }
        } else {
            println!("{}", name);
        }
    }

    Ok(())
}
fn clear_logs(basedir: &PathBuf, name: &str, stderr: bool, stdout: bool) -> Result<(), String> {
    let path = basedir.join(name);
    if !path.exists() {
        return Err(format!("app '{}' not exists.", name));
    }
    let logs = log_paths(&path)?;
    if stdout {
        if logs.stdout.exists() {
            std::fs::write(&logs.stdout, "")
                .map_err(|e| format!("failed to clear {:?}: {}", logs.stdout, e))?;
        }
        println!("stdout logs cleared for '{}'", name);
    }
    if stderr {
        if logs.stderr.exists() {
            std::fs::write(&logs.stderr, "")
                .map_err(|e| format!("failed to clear {:?}: {}", logs.stderr, e))?;
        }
        println!("stderr logs cleared for '{}'", name);
    }

    Ok(())
}
fn show_logs(basedir: &PathBuf, name: &str, stderr: bool, follow: bool) -> Result<(), String> {
    let path = basedir.join(name);
    if !path.exists() {
        return Err(format!("app '{}' not exists.", name));
    }

    let logs = log_paths(&path)?;
    let log_file = if stderr { logs.stderr } else { logs.stdout };
    if !log_file.exists() {
        return Err("no logs found (app may not have been run yet)".into());
    }

    if follow {
        let status = attach_log(&log_file)?;
        println!("exit: {}", status);
    } else {
        let content =
            std::fs::read_to_string(&log_file).map_err(|e| format!("failed to read log: {}", e))?;
        print!("{}", content);
    }
    Ok(())
}
fn main() {
    let cli = cli::Cli::try_parse().unwrap_or_else(|e| {
        e.print().expect("Unable to print error");
        std::process::exit(1);
    });

    let basedir = resolve_base_dir();

    let result = match cli.command {
        Commands::Info => show_info(&basedir),
        Commands::Create { name } => create_app(&basedir, &name),
        Commands::Status { name } => status_app(&basedir, &name),
        Commands::Run { name } => run_app(&basedir, &name),
        Commands::Stop { name, force } => stop_app(&basedir, &name, force),
        Commands::Kill { name } => kill_app(&basedir, &name),
        Commands::List { long, full } => list_app(&basedir, long, full),
        Commands::Ps { long, full } => list_process(&basedir, long, full),
        Commands::Log {
            name,
            clear,
            stderr,
            stdout,
            follow,
        } => {
            if clear {
                if !stderr && !stdout {
                    clear_logs(&basedir, &name, true, true)
                } else {
                    clear_logs(&basedir, &name, stderr, stdout)
                }
            } else {
                show_logs(&basedir, &name, stderr, follow)
            }
        }
        Commands::Delete { name, force } => {
            if !force {
                eprint!("Delete app '{}'? [y/N] ", name);
                io::stderr().flush().ok();

                let mut input = String::new();
                io::stdin().read_line(&mut input).ok();
                if !matches!(input.trim(), "y" | "Y") {
                    Err("delete aborted".to_string())
                } else {
                    delete_app(&basedir, &name)
                }
            } else {
                delete_app(&basedir, &name)
            }
        }
    };
    if let Err(e) = result {
        eprintln!("Error: {}", e);
        std::process::exit(1);
    }
}
