import { useEffect, useState } from "react";
import { X, Trash2, Terminal, AlertTriangle, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { RemoveScrollBar } from "react-remove-scroll-bar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { clearLogs, getLogsStreamUrl } from "@/lib/api";
import { toast } from "sonner";

interface LogViewerProps {
  appName: string;
  onClose: () => void;
}

export const LogViewer = ({ appName, onClose }: LogViewerProps) => {
  const [activeTab, setActiveTab] = useState<"stdout" | "stderr">("stdout");
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setLogs([]);

    const url = getLogsStreamUrl(appName, activeTab);
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      setLoading(false);
      const line = event.data;
      setLogs((prev) => {
        // Keep logs capped at 1000 lines in UI to avoid browser slowdowns
        const newLogs = [...prev, line];
        if (newLogs.length > 1000) {
          return newLogs.slice(newLogs.length - 1000);
        }
        return newLogs;
      });
    };

    eventSource.onerror = (err) => {
      console.error("SSE stream error/closed", err);
      setLoading(false);
    };

    return () => {
      eventSource.close();
    };
  }, [appName, activeTab, refreshKey]);

  const handleClear = async () => {
    try {
      await clearLogs(appName);
      setLogs([]);
      toast.success("Logs cleared");
    } catch (e: any) {
      toast.error("Failed to clear logs", {
        description: e.response?.data?.detail || e.message,
      });
    }
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return <>
    <RemoveScrollBar />
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <Terminal className="h-5 w-5 text-primary" />
            <h2 className="font-mono text-lg font-semibold">
              {appName}
              <span className="text-muted-foreground"> / logs</span>
            </h2>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex items-center gap-1 border-b border-border px-5">
          <button
            onClick={() => setActiveTab("stdout")}
            className={cn(
              "relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
              activeTab === "stdout"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Terminal className="h-4 w-4" />
            stdout
            {activeTab === "stdout" && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute inset-x-0 -bottom-px h-0.5 bg-primary"
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab("stderr")}
            className={cn(
              "relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
              activeTab === "stderr"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <AlertTriangle className="h-4 w-4" />
            stderr
            {activeTab === "stderr" && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute inset-x-0 -bottom-px h-0.5 bg-primary"
              />
            )}
          </button>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRefresh}
              className="text-muted-foreground hover:text-foreground"
              disabled={loading}
            >
              <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", loading && "animate-spin")} />
              Reconnect
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClear}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Clear
            </Button>
          </div>
        </div>

        <div className="h-[400px] overflow-auto bg-background/50 p-5">
          <AnimatePresence mode="wait">
            {logs.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-full items-center justify-center"
              >
                <p className="font-mono text-sm text-muted-foreground">
                  {loading ? "Connecting to log stream..." : "No logs available"}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="logs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-1"
              >
                {logs.map((line, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "font-mono text-sm leading-relaxed",
                      activeTab === "stderr"
                        ? "text-warning"
                        : "text-muted-foreground"
                    )}
                  >
                    <span className="mr-3 select-none text-muted-foreground/40">
                      {String(i + 1).padStart(3, " ")}
                    </span>
                    {line}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  </>;
};
