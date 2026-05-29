import { X, Play, Square, Skull, FileText, Folder, Clock, Calendar, Hash, RotateCcw, FileCode, FolderOpen, Pencil, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import { RemoveScrollBar } from "react-remove-scroll-bar";
import { AppInfo } from "@/lib/api";

interface AppDetailPanelProps {
  app: AppInfo;
  onClose: () => void;
  onRun: (name: string) => void;
  onStop: (name: string) => void;
  onForceStop: (name: string) => void;
  onKill: (name: string) => void;
  onViewLogs: (name: string) => void;
  onEditScripts: (name: string) => void;
  onOpenFolder: (name: string) => void;
  onRename: (name: string) => void;
  onDelete: (name: string) => void;
}

const formatUptime = (seconds: number | null): string => {
  if (!seconds) return "—";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
};

const formatDate = (date: string | null): string => {
  if (!date) return "—";
  return date;
};

export const AppDetailPanel = ({
  app,
  onClose,
  onRun,
  onStop,
  onForceStop,
  onKill,
  onViewLogs,
  onEditScripts,
  onOpenFolder,
  onRename,
  onDelete,
}: AppDetailPanelProps) => {
  const details = [
    { label: "path", value: app.path, icon: Folder },
    { label: "created", value: formatDate(app.created), icon: Calendar },
    { label: "runs", value: app.runs.toString(), icon: RotateCcw },
    { label: "last run", value: formatDate(app.lastRun), icon: Clock },
    { label: "last pid", value: app.pid?.toString() ?? "—", icon: Hash },
    { label: "uptime", value: formatUptime(app.uptime), icon: Clock },
  ];

  return <>
    <RemoveScrollBar />
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed right-0 top-0 z-40 h-full w-full max-w-md border-l border-border bg-card shadow-2xl"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <div>
            <h2 className="font-mono text-xl font-semibold">{app.name}</h2>
            <StatusBadge running={app.running} />
          </div>
          <Button size="icon" variant="ghost" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-4">
            {details.map((detail) => (
              <div
                key={detail.label}
                className="flex items-start gap-3 rounded-lg bg-secondary/30 px-4 py-3"
              >
                <detail.icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">{detail.label}</p>
                  <p className="mt-0.5 break-all font-mono text-sm text-foreground">
                    {detail.value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <h3 className="mb-3 text-sm font-medium text-muted-foreground">
              Log Paths
            </h3>
            <div className="space-y-2 rounded-lg border border-border bg-background/50 p-4">
              <p className="font-mono text-xs text-muted-foreground">
                <span className="text-foreground">stdout:</span>{" "}
                {app.path}/logs/stdout.log
              </p>
              <p className="font-mono text-xs text-muted-foreground">
                <span className="text-foreground">stderr:</span>{" "}
                {app.path}/logs/stderr.log
              </p>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="mb-3 text-sm font-medium text-muted-foreground">
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEditScripts(app.name)}
              >
                <FileCode className="mr-2 h-4 w-4" />
                Edit Scripts
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenFolder(app.name)}
              >
                <FolderOpen className="mr-2 h-4 w-4" />
                Open Folder
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRename(app.name)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Rename
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(app.name)}
                className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        </div>

        <div className="border-t border-border p-6">
          <div className="flex gap-2">
            {!app.running ? (
              <Button
                onClick={() => onRun(app.name)}
                className="flex-1 bg-success text-success-foreground hover:bg-success/90"
              >
                <Play className="mr-2 h-4 w-4" />
                Run
              </Button>
            ) : (
              <>
                <Button
                  variant="secondary"
                  onClick={() => onStop(app.name)}
                  className="flex-1"
                >
                  <Square className="mr-2 h-4 w-4" />
                  Stop
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => onKill(app.name)}
                >
                  <Skull className="mr-2 h-4 w-4" />
                  Kill
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => onViewLogs(app.name)}>
              <FileText className="mr-2 h-4 w-4" />
              Logs
            </Button>
          </div>
          {!app.running && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onForceStop(app.name)}
              className="mt-3 w-full text-muted-foreground hover:text-foreground"
            >
              <Square className="mr-2 h-3.5 w-3.5" />
              Force run stop.sh
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  </>;
};
