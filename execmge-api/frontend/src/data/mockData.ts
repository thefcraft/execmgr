export interface App {
  name: string;
  path: string;
  created: string;
  runs: number;
  pid: number | null;
  lastRun: string | null;
  running: boolean;
  uptime: number | null;
  startScript: string;
  stopScript: string;
}

const defaultStartScript = `#!/bin/sh
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
`;

const defaultStopScript = `#!/bin/sh
# Stop script for the app
# This script is executed when you run: execmgr stop <app>

echo "Stopping app at $(date)"

# Add your cleanup commands here
# Example: podman-compose down
# Example: kill child processes
# Example: cleanup temp files

echo "App stopped"
`;

export const mockApps: App[] = [
  {
    name: "faved",
    path: "/home/user/.local/state/execmgr/faved",
    created: "2026-01-13 19:55:39",
    runs: 7,
    pid: 22447,
    lastRun: "2026-01-15 23:28:27",
    running: true,
    uptime: 18341,
    startScript: `#!/bin/sh
cd /home/user/projects/faved
podman-compose up`,
    stopScript: `#!/bin/sh
cd /home/user/projects/faved
podman-compose down`,
  },
  {
    name: "vpn",
    path: "/home/user/.local/state/execmgr/vpn",
    created: "2026-01-13 19:55:33",
    runs: 3,
    pid: 4343,
    lastRun: "2026-01-14 18:42:13",
    running: false,
    uptime: null,
    startScript: `#!/bin/sh
openvpn --config /etc/openvpn/client.conf`,
    stopScript: `#!/bin/sh
killall openvpn`,
  },
  {
    name: "api-server",
    path: "/home/user/.local/state/execmgr/api-server",
    created: "2026-01-10 14:22:10",
    runs: 12,
    pid: 8821,
    lastRun: "2026-01-15 08:00:00",
    running: true,
    uptime: 55800,
    startScript: `#!/bin/sh
cd /home/user/api-server
npm run start`,
    stopScript: defaultStopScript,
  },
  {
    name: "redis-cache",
    path: "/home/user/.local/state/execmgr/redis-cache",
    created: "2026-01-08 09:15:00",
    runs: 5,
    pid: null,
    lastRun: "2026-01-12 16:30:00",
    running: false,
    uptime: null,
    startScript: `#!/bin/sh
redis-server /etc/redis/redis.conf`,
    stopScript: `#!/bin/sh
redis-cli shutdown`,
  },
  {
    name: "backup-job",
    path: "/home/user/.local/state/execmgr/backup-job",
    created: "2026-01-05 22:00:00",
    runs: 28,
    pid: 15632,
    lastRun: "2026-01-15 03:00:00",
    running: true,
    uptime: 73800,
    startScript: `#!/bin/sh
rsync -avz /home/user/data /backup/`,
    stopScript: defaultStopScript,
  },
];

export const getDefaultScripts = () => ({
  startScript: defaultStartScript,
  stopScript: defaultStopScript,
});

export const mockLogs: Record<string, { stdout: string[]; stderr: string[] }> = {
  faved: {
    stdout: [
      "[2026-01-15 23:28:27] Starting faved service...",
      "[2026-01-15 23:28:28] Initializing podman-compose...",
      "[2026-01-15 23:28:30] Container started successfully",
      "[2026-01-15 23:28:31] Apache HTTP Server started",
      "[2026-01-15 23:30:00] Request: GET /api/health - 200 OK",
      "[2026-01-15 23:35:12] Request: POST /api/data - 201 Created",
      "[2026-01-15 23:40:45] Request: GET /api/users - 200 OK",
    ],
    stderr: [
      "podman-compose version: 1.0.6",
      "using podman version: 4.9.3",
      "** excluding:  set()",
      "[Thu Jan 15 17:58:29.417792 2026] [core:notice] [pid 1:tid 1] AH00094: Command line: 'apache2 -D FOREGROUND'",
    ],
  },
  vpn: {
    stdout: [
      "[2026-01-14 18:42:13] VPN connection established",
      "[2026-01-14 18:42:14] Route table updated",
      "[2026-01-14 19:00:00] Connection stable - 1000 packets transmitted",
    ],
    stderr: [],
  },
  "api-server": {
    stdout: [
      "[2026-01-15 08:00:00] API Server starting on port 3000",
      "[2026-01-15 08:00:01] Database connected",
      "[2026-01-15 08:00:02] Routes initialized",
      "[2026-01-15 08:00:02] Server ready to accept connections",
    ],
    stderr: [
      "[WARN] Deprecated API endpoint called: /v1/legacy",
    ],
  },
  "redis-cache": {
    stdout: [
      "[2026-01-12 16:30:00] Redis shutting down gracefully",
      "[2026-01-12 16:30:01] Saving RDB snapshot",
      "[2026-01-12 16:30:02] Shutdown complete",
    ],
    stderr: [],
  },
  "backup-job": {
    stdout: [
      "[2026-01-15 03:00:00] Backup job started",
      "[2026-01-15 03:05:00] Collected 2.3GB of data",
      "[2026-01-15 03:15:00] Compression complete",
      "[2026-01-15 03:20:00] Upload to remote storage started",
      "[2026-01-15 03:45:00] Backup completed successfully",
    ],
    stderr: [],
  },
};

export const generateStopOutput = (appName: string): string => {
  const outputs: Record<string, string> = {
    faved: `stopped 'faved'
podman-compose version: 1.0.6
['podman', '--version', '']
using podman version: 4.9.3
** excluding:  set()
podman stop -t 10 faved_php_bookmark
faved_php_bookmark
exit code: 0
podman rm faved_php_bookmark
faved_php_bookmark
exit code: 0
exit: exit status: 0`,
    vpn: `stopped 'vpn'
Terminating OpenVPN process...
Connection closed.
exit: exit status: 0`,
    "api-server": `stopped 'api-server'
Sending SIGTERM to node process...
Server shutting down gracefully.
exit: exit status: 0`,
    "redis-cache": `stopped 'redis-cache'
Sending SHUTDOWN to Redis...
Redis is now ready to exit, bye bye...
exit: exit status: 0`,
    "backup-job": `stopped 'backup-job'
Stopping rsync process...
Backup job terminated.
exit: exit status: 0`,
  };
  return outputs[appName] || `stopped '${appName}'\nexit: exit status: 0`;
};
