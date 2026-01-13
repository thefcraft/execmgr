# execmgr

`execmgr` is a small execution manager for local apps / scripts.
Think of it as a **very lightweight process manager** for things you don’t want to daemonize properly yet.

No magic. No background services. Just folders, scripts, and metadata.

---

## Why this exists

I wanted something that:

* can start / stop local scripts
* remembers what I ran last
* keeps logs per app
* doesn’t require systemd, Docker, or rewriting everything
* is predictable and hackable

So this exists.

---

## Quick start (3 minutes)

<details>
  <summary>Click to view</summary>
  
This is the fastest way to see `execmgr` actually do something useful.

### 1. Build and install

```bash
cargo build --release
cp target/release/execmgr ~/.local/bin/
```

Make sure it’s in your `PATH`:

```bash
which execmgr
```

---

### 2. Create a sample app

```bash
execmgr create demo
```

This creates a directory like:

```
~/.local/state/execmgr/demo/
```

---

### 3. Edit the start script

Open the generated start script:

```bash
$EDITOR ~/.local/state/execmgr/demo/start_<hash>.sh
```

Put something simple in it, for example:

```sh
#!/bin/sh
while true; do
  echo "demo app running at $(date)"
  sleep 2
done
```

---

### 4. Run the app

```bash
execmgr run demo
```

The app now runs in the background.

---

### 5. Check status

```bash
execmgr status demo
```

You should see:

* whether it’s running
* pid
* last run time
* log paths

---

### 6. View logs

```bash
execmgr log demo
```

Or follow them live:

```bash
execmgr log demo -f
```

---

### 7. Stop it

force kill it:

```bash
execmgr kill demo
```

stop will not work because stop.sh file is empty

```bash
execmgr stop demo
```

---

### 8. Clean up

```bash
execmgr rm demo
```

That’s it.
If this worked, you understand 90% of `execmgr`.

---

### Notes for quick-start users

* Logs are **reset on every run**
* Everything lives in one directory per app
* You can inspect or edit files manually at any time
* If something breaks, you can always just `rm -rf` the app directory

Nothing is hidden.

</details>

---

## How it works (high level)

Each app is just a directory with a few files:

```
execmgr/
└── myapp/
    ├── app.json          # metadata (created time, runs, last pid)
    ├── start_<hash>.sh   # start script
    ├── stop.sh           # stop script (optional but recommended)
    └── logs/
        ├── stdout.log
        └── stderr.log
```

`execmgr` doesn’t care *what* your app is.
If it can be started by a shell script, it works.

---

## Base directory (important)

State is stored using XDG conventions:

Resolution order:

1. `EXECMGR_HOME` (explicit override)
2. `$XDG_STATE_HOME/execmgr`
3. `$HOME/.local/state/execmgr`
4. `.execmgr` (last fallback)

You can check or override it like this:

```bash
export EXECMGR_HOME=/tmp/execmgr-test
```

---

## Installation

For now, build it yourself:

```bash
cargo build --release
```

Put the binary somewhere in your `PATH`, for example:

```bash
cp target/release/execmgr ~/.local/bin/
```

---

## Usage

### Create an app

```bash
execmgr create myapp
```

This creates the folder and scripts.
Edit the start script:

```bash
$EDITOR ~/.local/state/execmgr/myapp/start_<hash>.sh
```

---

### Run an app

```bash
execmgr run myapp
```

* runs the start script detached
* updates metadata
* logs go to `execmgr/myapp/logs/stdout.log` and `execmgr/myapp/logs/stderr.log`

---

### Stop an app via stop script

```bash
execmgr stop myapp
```

execute `stop.sh`.

### Kill an app

```bash
execmgr kill myapp
```

execmgr falls back to killing the stored PID.

---

### List apps

```bash
execmgr list
execmgr ls
execmgr ls -l
```

Shows all apps.

---

### List running apps

```bash
execmgr ps
execmgr ps -l
```

Shows only apps that look like they are currently running.

---

### Check app status

```bash
execmgr status myapp
# name        : myapp
# path        : $HOME/.local/state/execmgr/myapp
# created     : 2026-01-13 14:36:42
# runs        : 3
# last run    : 2026-01-13 15:20:58
# last pid    : 355995
# running     : no
# logs        : $HOME/.local/state/execmgr/myapp/logs
#   stdout    : $HOME/.local/state/execmgr/myapp/logs/stdout.log
#   stderr    : $HOME/.local/state/execmgr/myapp/logs/stderr.log
```

Shows app status

---

### Check info

```bash
execmgr info
execmgr about
# execmgr info
# -------------
# base dir    : $HOME/.local/state/execmgr
# apps        : 3
# running     : 0
# binary      : $HOME/local-development/execmgr/bin/execmgr
# rust        : execmgr
# version     : 0.1.0
```

---

### Logs

Show stdout logs (default):

```bash
execmgr log myapp
```

Show stderr logs:

```bash
execmgr log myapp --stderr
```

Follow logs:

```bash
execmgr log myapp -f
execmgr log myapp -f --stderr
```

Clear logs:

```bash
execmgr log myapp -c            # clear both
execmgr log myapp -c --stdout   # clear stdout only
execmgr log myapp -c --stderr   # clear stderr only
```

Logs are **reset on every run**, not appended.

---

### Delete an app

```bash
execmgr delete myapp
execmgr rm myapp
execmgr rm myapp -f
```

Refuses to delete if the app is running.

---

## What this is NOT

* Not a full daemon manager
* Not production-grade 😥

This is for **local development**, **personal services**, and **things you want control over**.

If you need reliability guarantees, use `systemd`.
If you need simpler solution, use `execmgr`

---

## Notes

* Process detection is best-effort (`ps`-based).
* No restart policies (yet).
* Logs are per-app, last-run only.
* Everything is intentionally simple and inspectable.

---

## License

Do whatever you want with it.
If it breaks, you get to keep both pieces.