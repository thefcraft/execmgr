import { Play, Square, Skull, FileText, Clock, Hash, Calendar, FileCode, FolderOpen, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { AppInfo } from "@/lib/api";

interface AppCardProps {
  app: AppInfo;
  index: number;
  onRun: (name: string) => void;
  onStop: (name: string) => void;
  onForceStop: (name: string) => void;
  onKill: (name: string) => void;
  onViewLogs: (name: string) => void;
  onEditScripts: (name: string) => void;
  onOpenFolder: (name: string) => void;
  onRename: (name: string) => void;
  onDelete: (name: string) => void;
  onSelect: (name: string) => void;
}

const formatUptime = (seconds: number | null): string => {
  if (!seconds) return "—";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

const formatDate = (date: string | null): string => {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const AppCard = ({
  app,
  index,
  onRun,
  onStop,
  onForceStop,
  onKill,
  onViewLogs,
  onEditScripts,
  onOpenFolder,
  onRename,
  onDelete,
  onSelect,
}: AppCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:border-primary/30 hover:bg-card/80",
        app.running && "ring-1 ring-success/20"
      )}
    >
      {app.running && (
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-success to-transparent" />
      )}

      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between" onClick={() => onSelect(app.name)}>
          <div>
            <h3 className="font-mono text-lg font-semibold text-foreground">
              {app.name}
            </h3>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground truncate max-w-[200px]">
              {app.path}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge running={app.running} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onEditScripts(app.name)}>
                  <FileCode className="mr-2 h-4 w-4" />
                  Edit Scripts
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onOpenFolder(app.name)}>
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Open Folder
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onRename(app.name)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Rename Project
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onForceStop(app.name)}>
                  <Square className="mr-2 h-4 w-4" />
                  Force Stop
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(app.name)} className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3" onClick={() => onSelect(app.name)}>
          <div className="flex items-center gap-2 text-sm">
            <Hash className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">PID:</span>
            <span className="font-mono text-foreground">
              {app.pid ?? "—"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Uptime:</span>
            <span className="font-mono text-foreground">
              {formatUptime(app.uptime)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Play className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Runs:</span>
            <span className="font-mono text-foreground">{app.runs}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Last:</span>
            <span className="font-mono text-xs text-foreground">
              {formatDate(app.lastRun)}
            </span>
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-border">
          {!app.running ? (
            <Button
              size="sm"
              onClick={() => onRun(app.name)}
              className="flex-1 bg-success/10 text-success hover:bg-success/20 border border-success/20"
            >
              <Play className="mr-1.5 h-3.5 w-3.5" />
              Run
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onStop(app.name)}
                className="flex-1"
              >
                <Square className="mr-1.5 h-3.5 w-3.5" />
                Stop
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onKill(app.name)}
                className="bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20"
              >
                <Skull className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => onViewLogs(app.name)}
            className="border-border hover:bg-secondary"
          >
            <FileText className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
