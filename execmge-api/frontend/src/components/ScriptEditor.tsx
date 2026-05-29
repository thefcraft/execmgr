import { useState } from "react";
import { RemoveScrollBar } from "react-remove-scroll-bar";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, FileCode, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface ScriptEditorProps {
  appName: string;
  startScript: string;
  stopScript: string;
  onClose: () => void;
  onSave: (startScript: string, stopScript: string) => void;
}

export const ScriptEditor = ({
  appName,
  startScript: initialStart,
  stopScript: initialStop,
  onClose,
  onSave,
}: ScriptEditorProps) => {
  const [startScript, setStartScript] = useState(initialStart);
  const [stopScript, setStopScript] = useState(initialStop);
  const [activeTab, setActiveTab] = useState<"start" | "stop">("start");

  const handleSave = () => {
    onSave(startScript, stopScript);
    toast.success("Scripts saved", {
      description: `Updated start.sh and stop.sh for ${appName}`,
    });
    onClose();
  };

  const handleReset = () => {
    setStartScript(initialStart);
    setStopScript(initialStop);
    toast.info("Scripts reset to original");
  };

  const hasChanges = startScript !== initialStart || stopScript !== initialStop;
  return <>
    <RemoveScrollBar />
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/10 backdrop-blur-sm flex items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="h-[80vh] w-full max-w-3xl mx-2"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex h-full flex-col rounded-xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <FileCode className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold">
                    Edit Scripts · <span className="font-mono">{appName}</span>
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Modify start.sh and stop.sh
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasChanges && (
                  <Button size="sm" variant="ghost" onClick={handleReset}>
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    Reset
                  </Button>
                )}
                <Button size="icon" variant="ghost" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as "start" | "stop")}
              className="flex flex-1 flex-col overflow-hidden"
            >
              <div className="border-b border-border px-6">
                <TabsList className="h-10 bg-transparent p-0">
                  <TabsTrigger
                    value="start"
                    className="relative rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 font-mono text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  >
                    start.sh
                    {startScript !== initialStart && (
                      <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-warning" />
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="stop"
                    className="relative rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 font-mono text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  >
                    stop.sh
                    {stopScript !== initialStop && (
                      <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-warning" />
                    )}
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="start" className="mt-0 flex-1 overflow-hidden">
                <textarea
                  value={startScript}
                  onChange={(e) => setStartScript(e.target.value)}
                  className="h-full w-full resize-none bg-background p-4 font-mono text-sm leading-relaxed text-foreground focus:outline-none"
                  spellCheck={false}
                />
              </TabsContent>
              <TabsContent value="stop" className="mt-0 flex-1 overflow-hidden">
                <textarea
                  value={stopScript}
                  onChange={(e) => setStopScript(e.target.value)}
                  className="h-full w-full resize-none bg-background p-4 font-mono text-sm leading-relaxed text-foreground focus:outline-none"
                  spellCheck={false}
                />
              </TabsContent>
            </Tabs>

            <div className="flex items-center justify-between border-t border-border px-6 py-4">
              <p className="text-xs text-muted-foreground">
                Scripts are executed in the app directory
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={!hasChanges}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  </>;
};
