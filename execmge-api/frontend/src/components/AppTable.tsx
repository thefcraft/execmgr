import { Play, Square, Skull, FileText, ChevronRight, FileCode, FolderOpen, MoreVertical, Pencil, Trash2 } from "lucide-react";
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

interface AppTableProps {
  apps: AppInfo[];
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

export const AppTable = ({
  apps,
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
}: AppTableProps) => {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Name
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Status
              </th>
              <th className="hidden px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground md:table-cell">
                PID
              </th>
              <th className="hidden px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground lg:table-cell">
                Runs
              </th>
              <th className="hidden px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground md:table-cell">
                Uptime
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {apps.map((app, index) => (
              <motion.tr
                key={app.name}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onSelect(app.name)}
                className={cn(
                  "group cursor-pointer transition-colors hover:bg-secondary/30",
                  app.running && "bg-success/5"
                )}
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-medium text-foreground">
                      {app.name}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </td>
                <td className="px-5 py-4">
                  <StatusBadge running={app.running} size="sm" />
                </td>
                <td className="hidden px-5 py-4 md:table-cell">
                  <span className="font-mono text-sm text-muted-foreground">
                    {app.pid ?? "—"}
                  </span>
                </td>
                <td className="hidden px-5 py-4 lg:table-cell">
                  <span className="font-mono text-sm text-muted-foreground">
                    {app.runs}
                  </span>
                </td>
                <td className="hidden px-5 py-4 md:table-cell">
                  <span className="font-mono text-sm text-muted-foreground">
                    {formatUptime(app.uptime)}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div
                    className="flex items-center justify-end gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {!app.running ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onRun(app.name)}
                        className="h-8 w-8 p-0 text-success hover:bg-success/10 hover:text-success"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onStop(app.name)}
                          className="h-8 w-8 p-0 hover:bg-secondary"
                        >
                          <Square className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onKill(app.name)}
                          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Skull className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onViewLogs(app.name)}
                      className="h-8 w-8 p-0 hover:bg-secondary"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 hover:bg-secondary"
                        >
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
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
