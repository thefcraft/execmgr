# execmgr

`execmgr` is a small execution manager for local apps and scripts. 
Think of it as a **very lightweight process manager** for things you don’t want to daemonize properly yet, but want to keep track of.

No magic. No background services. Just folders, scripts, and a lockfile.

---

## Why this exists

I wanted something that:

* can start / stop local scripts without thinking about PIDs
* remembers what I ran last and how many times
* keeps logs per app automatically
* doesn’t require systemd, Docker, or writing a service file every time
* is predictable and hackable

So this exists.

---

## Quick start (3 minutes)

<details>
  <summary>Click to view</summary>
  
This is the fastest way to see `execmgr` actually do something.

### 1. Build and install

```bash
cargo build --release
cp target/release/execmgr ~/.local/bin/
```

### 2. Create a sample app

```bash
execmgr create demo
```

This creates a directory at `~/.local/state/execmgr/demo/`.

### 3. Edit the start script

Open the generated start script:

```bash
$EDITOR ~/.local/state/execmgr/demo/start.sh
```

Put a simple loop in it:

```sh
#!/bin/sh
while true; do
  echo "demo app running at $(date)"
  sleep 2
done
```

### 4. Run the app

```bash
execmgr run demo
```

The app now runs in the background. `execmgr` uses a file lock to make sure you don't accidentally start it twice.

### 5. Check status

```bash
execmgr status demo
```

### 6. View logs

```bash
execmgr log demo -f
```

### 7. Stop it

To use the `stop.sh` script (write *exit logic* in the `stop.sh`):
```bash
execmgr stop demo
```

To just nuke the process via PID:
```bash
execmgr kill demo
```

</details>

---

## How it works

Each app is just a directory with a few files:

```
execmgr/
└── myapp/
    ├── app.json      # metadata (created time, run count, last pid)
    ├── app.lock      # used by flock to check running
    ├── start.sh      # main entrypoint
    ├── stop.sh       # cleanup script
    └── logs/
        ├── stdout.log
        └── stderr.log
```

When you `run` an app, `execmgr` wraps your `start.sh` in a bash subshell that manages a file lock. If the lock is held, the app is "running." If the process dies, the lock is released automatically by the OS.

---

## Storage

State is stored using XDG conventions:

1. `EXECMGR_HOME` (override)
2. `$XDG_STATE_HOME/execmgr`
3. `$HOME/.local/state/execmgr`
4. `.execmgr` (fallback)

---

## Usage

### Create
```bash
execmgr create <name>
```
Creates the folder and boilerplate `start.sh`/`stop.sh`.

### List & Process Status
```bash
execmgr ls       # list all apps
execmgr ls -l    # detailed list
execmgr ps       # list all running apps
execmgr ps -l    # detailed ps
```

### Management
*   **run / start**: Runs the `start.sh` detached. Logs are **truncated (reset)** on every run.
*   **stop**: Runs the `stop.sh` script. Use this if your app needs a graceful shutdown (like `podman-compose down`).
*   **kill**: Sends a `kill -9` to the last known PID. Use this when your script is stuck.
*   **status**: Full metadata dump for a specific app.

### Logs
```bash
execmgr log <name>             # view stdout
execmgr log <name> --stderr    # view stderr
execmgr log <name> -f          # stdout: tail -f
execmgr log <name> -f --stderr # stderr: tail -f
execmgr log <name> -c          # clear logs
execmgr log <name> -c --stderr # clear only stderr log
execmgr log <name> -c --stdout # clear only stdout log
```

### Maintenance
```bash
execmgr info          # see total apps, running count, and binary paths
execmgr rm <name>     # delete the app folder (refuses if running)
execmgr rm -f <name>  # delete the app folder and skip confirmation (refuses if running)
```

---

## Technical Notes

*   **Locking**: Uses `flock` via a wrapper. This is much more reliable than checking if a PID exists, as PIDs get reused by the OS.
*   **Environment**: `start.sh` and `stop.sh` are executed in their respective app directory.
*   **No Restart Policy**: If your script crashes, it stays dead. This isn't `systemd`. It's a basic manager.
*   **Logs**: `execmgr` redirects stdout/stderr to files. It does **not** rotate logs; they are wiped every time you `run` the app.

---

## License

MIT. 

Do whatever you want with it. 
If it breaks, you get to keep both pieces.