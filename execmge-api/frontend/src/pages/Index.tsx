import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutGrid, List, Plus, RefreshCw, AlertTriangle, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { Button } from "@/components/ui/button";
import { SystemHeader } from "@/components/SystemHeader";
import { AppCard } from "@/components/AppCard";
import { AppTable } from "@/components/AppTable";
import { AppDetailPanel } from "@/components/AppDetailPanel";
import { LogViewer } from "@/components/LogViewer";
import { CreateAppDialog } from "@/components/CreateAppDialog";
import { ScriptEditor } from "@/components/ScriptEditor";
import { TerminalOutput } from "@/components/TerminalOutput";
import {
  ApiState,
  AppInfo,
  SystemInfo,
  createApp,
  runApp,
  stopApp,
  killApp,
  deleteApp,
  renameApp,
  fetchScripts,
  saveScripts,
  openFolder,
  getEventsStreamUrl,
} from "@/lib/api";

type ViewMode = "grid" | "table";

const Index = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedApp, setSelectedApp] = useState<AppInfo | null>(null);
  const [viewingLogs, setViewingLogs] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingScripts, setEditingScripts] = useState<{ name: string; startScript: string; stopScript: string } | null>(null);
  const [terminalOutput, setTerminalOutput] = useState<{ title: string; output: string } | null>(null);
  const [killConfirm, setKillConfirm] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [renameDialog, setRenameDialog] = useState<{ name: string; newName: string } | null>(null);

  const [systemInfo, setSystemInfo] = useState<ApiState<SystemInfo, any>>({ loading: true });
  const [appsInfo, setAppsInfo] = useState<ApiState<AppInfo[], any>>({ loading: true });
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  // Consume unified real-time SSE stream for applications and system information
  useEffect(() => {
    setSystemInfo((prev) => ({ ...prev, loading: !prev.data }));
    setAppsInfo((prev) => ({ ...prev, loading: !prev.data }));

    const url = getEventsStreamUrl();
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.error) {
          console.error("Server event error:", payload.error);
          return;
        }

        const { apps, system } = payload;
        setAppsInfo({ loading: false, data: apps });
        setSystemInfo({ loading: false, data: system });

        // Keep the selectedApp sidebar panel info updated dynamically
        if (selectedApp) {
          const fresh = apps.find((a: AppInfo) => a.name === selectedApp.name);
          if (fresh) setSelectedApp(fresh);
        }
      } catch (e) {
        console.error("Failed to parse SSE payload", e);
      }
    };

    eventSource.onerror = (err) => {
      console.error("Events stream connection error/closed", err);
      // Wait a moment and let it reconnect, but clear loading state so UI doesn't freeze
      setAppsInfo((prev) => ({ ...prev, loading: false, error: err }));
      setSystemInfo((prev) => ({ ...prev, loading: false, error: err }));
    };

    return () => {
      eventSource.close();
    };
  }, [selectedApp?.name, refreshKey]);

  const handleCreateApp = async (name: string) => {
    try {
      await createApp(name);
      toast.success(`Created ${name}`, {
        description: "App directory and default scripts created",
      });
      triggerRefresh();
    } catch (e: any) {
      toast.error("Failed to create app", {
        description: e.response?.data?.detail || e.message,
      });
    }
  };

  const handleRun = async (name: string) => {
    try {
      await runApp(name);
      toast.success(`Started ${name}`, {
        description: "App is now running",
      });
      triggerRefresh();
    } catch (e: any) {
      toast.error("Failed to start app", {
        description: e.response?.data?.detail || e.message,
      });
    }
  };

  const handleStop = async (name: string, force?: boolean) => {
    try {
      const res = await stopApp(name, !!force);
      setTerminalOutput({
        title: `execmgr stop ${name}${force ? " --force" : ""}`,
        output: `exit status: ${res.exit_code}\n\nSTDOUT:\n${res.stdout}\n\nSTDERR:\n${res.stderr}`,
      });
      toast.info(`Stopped ${name}`, {
        description: force ? "Force executed stop.sh" : "Used stop.sh script",
      });
      triggerRefresh();
    } catch (e: any) {
      toast.error("Failed to stop app", {
        description: e.response?.data?.detail || e.message,
      });
    }
  };

  const handleForceStop = (name: string) => {
    handleStop(name, true);
  };

  const handleKillRequest = (name: string) => {
    setKillConfirm(name);
  };

  const handleKillConfirm = async () => {
    if (!killConfirm) return;
    const name = killConfirm;
    try {
      await killApp(name);
      toast.warning(`Killed ${name}`, {
        description: "Sent SIGKILL to process",
      });
      setKillConfirm(null);
      triggerRefresh();
    } catch (e: any) {
      toast.error("Failed to kill app", {
        description: e.response?.data?.detail || e.message,
      });
      setKillConfirm(null);
    }
  };

  const handleViewLogs = (name: string) => {
    setViewingLogs(name);
  };

  const handleEditScripts = async (name: string) => {
    try {
      const scripts = await fetchScripts(name);
      setEditingScripts({ name, ...scripts });
    } catch (e: any) {
      toast.error("Failed to load scripts", {
        description: e.response?.data?.detail || e.message,
      });
    }
  };

  const handleSaveScripts = async (startScript: string, stopScript: string) => {
    if (!editingScripts) return;
    const { name } = editingScripts;
    try {
      await saveScripts(name, startScript, stopScript);
      toast.success("Scripts saved", {
        description: `Updated start.sh and stop.sh for ${name}`,
      });
      setEditingScripts(null);
    } catch (e: any) {
      toast.error("Failed to save scripts", {
        description: e.response?.data?.detail || e.message,
      });
    }
  };

  const handleOpenFolder = async (name: string) => {
    try {
      await openFolder(name);
      toast.info("Opened folder", {
        description: `Local folder opened for ${name}`,
      });
    } catch (e: any) {
      toast.error("Failed to open folder", {
        description: e.response?.data?.detail || e.message,
      });
    }
  };

  const handleSelecteRequest = (name: string) => {
    const app = appsInfo.data?.find((a) => a.name === name);
    if (app) {
      setSelectedApp(app);
    }
  };

  const handleRenameRequest = (name: string) => {
    setRenameDialog({ name, newName: name });
  };

  const handleRenameConfirm = async () => {
    if (!renameDialog || !renameDialog.newName.trim()) return;
    const { name, newName } = renameDialog;

    if (newName === name) {
      setRenameDialog(null);
      return;
    }

    try {
      await renameApp(name, newName);
      toast.success(`Renamed to ${newName}`, {
        description: `${name} → ${newName}`,
      });
      setRenameDialog(null);
      triggerRefresh();
    } catch (e: any) {
      toast.error("Failed to rename app", {
        description: e.response?.data?.detail || e.message,
      });
    }
  };

  const handleDeleteRequest = (name: string) => {
    setDeleteConfirm(name);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    const name = deleteConfirm;

    try {
      await deleteApp(name);
      toast.success(`Deleted ${name}`, {
        description: "App directory removed",
      });

      if (selectedApp?.name === name) {
        setSelectedApp(null);
      }
      setDeleteConfirm(null);
      triggerRefresh();
    } catch (e: any) {
      toast.error("Failed to delete app", {
        description: e.response?.data?.detail || e.message,
      });
      setDeleteConfirm(null);
    }
  };

  const handleRefresh = () => {
    triggerRefresh();
    toast.info("Refreshed event stream");
  };

  return (
    <div className="min-h-screen bg-background">
      <SystemHeader state={systemInfo} />

      <main className="container mx-auto px-6 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Applications</h2>
            <p className="text-sm text-muted-foreground">
              Manage your local apps and services
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="border-border"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => setCreateDialogOpen(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create App
            </Button>
            <div className="ml-2 flex rounded-lg border border-border bg-secondary/30 p-0.5">
              <button
                onClick={() => setViewMode("grid")}
                className={`rounded-md p-2 transition-colors ${viewMode === "grid"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`rounded-md p-2 transition-colors ${viewMode === "table"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {appsInfo.loading && (
          <div className="col-span-full flex items-center justify-center py-10 text-muted-foreground">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Loading applications...
          </div>
        )}

        {appsInfo.error && (
          <div className="col-span-full flex items-center justify-center py-10 text-red-500">
            Failed to load applications
          </div>
        )}

        {appsInfo.data &&
          <AnimatePresence mode="wait">
            {viewMode === "grid" ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                {
                  appsInfo.data.map((app, index) => (
                    <AppCard
                      key={app.name}
                      app={app}
                      index={index}
                      onRun={handleRun}
                      onStop={handleStop}
                      onForceStop={handleForceStop}
                      onKill={handleKillRequest}
                      onViewLogs={handleViewLogs}
                      onEditScripts={handleEditScripts}
                      onOpenFolder={handleOpenFolder}
                      onRename={handleRenameRequest}
                      onDelete={handleDeleteRequest}
                      onSelect={handleSelecteRequest}
                    />
                  ))
                }
              </motion.div>
            ) : (
              <motion.div
                key="table"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <AppTable
                  apps={appsInfo.data}
                  onRun={handleRun}
                  onStop={handleStop}
                  onForceStop={handleForceStop}
                  onKill={handleKillRequest}
                  onViewLogs={handleViewLogs}
                  onEditScripts={handleEditScripts}
                  onOpenFolder={handleOpenFolder}
                  onRename={handleRenameRequest}
                  onDelete={handleDeleteRequest}
                  onSelect={handleSelecteRequest}
                />
              </motion.div>
            )}
          </AnimatePresence>
        }
      </main>

      <AnimatePresence>
        {selectedApp && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 bg-background/60 backdrop-blur-sm"
              onClick={() => setSelectedApp(null)}
            />
            <AppDetailPanel
              app={selectedApp}
              onClose={() => setSelectedApp(null)}
              onRun={handleRun}
              onStop={handleStop}
              onForceStop={handleForceStop}
              onKill={handleKillRequest}
              onViewLogs={handleViewLogs}
              onEditScripts={handleEditScripts}
              onOpenFolder={handleOpenFolder}
              onRename={handleRenameRequest}
              onDelete={handleDeleteRequest}
            />
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingLogs && (
          <LogViewer
            appName={viewingLogs}
            onClose={() => setViewingLogs(null)}
          />
        )}
      </AnimatePresence>

      <CreateAppDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreate={handleCreateApp}
      />

      <AnimatePresence>
        {editingScripts && (
          <ScriptEditor
            appName={editingScripts.name}
            startScript={editingScripts.startScript}
            stopScript={editingScripts.stopScript}
            onClose={() => setEditingScripts(null)}
            onSave={handleSaveScripts}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {terminalOutput && (
          <TerminalOutput
            title={terminalOutput.title}
            output={terminalOutput.output}
            onClose={() => setTerminalOutput(null)}
          />
        )}
      </AnimatePresence>

      <AlertDialog open={!!killConfirm} onOpenChange={(open) => !open && setKillConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Kill Process
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will send SIGKILL to <span className="font-mono font-semibold text-foreground">{killConfirm}</span>.
              The process will be terminated immediately without cleanup.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleKillConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Kill Process
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!renameDialog} onOpenChange={(open) => !open && setRenameDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Rename Project
            </AlertDialogTitle>
            <AlertDialogDescription>
              Enter a new name for <span className="font-mono font-semibold text-foreground">{renameDialog?.name}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={renameDialog?.newName ?? ""}
            onChange={(e) => setRenameDialog((prev) => prev ? { ...prev, newName: e.target.value } : null)}
            placeholder="New project name"
            className="font-mono"
            onKeyDown={(e) => e.key === "Enter" && handleRenameConfirm()}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRenameConfirm}>
              Rename
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Project
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-mono font-semibold text-foreground">{deleteConfirm}</span>?
              This will remove the app directory and all its contents. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
