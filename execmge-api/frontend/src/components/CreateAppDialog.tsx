import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Terminal } from "lucide-react";
import { RemoveScrollBar } from "react-remove-scroll-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


interface CreateAppDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}

export const CreateAppDialog = ({ open, onClose, onCreate }: CreateAppDialogProps) => {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      setError("App name is required");
      return;
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedName)) {
      setError("Only letters, numbers, dashes and underscores allowed");
      return;
    }
    
    onCreate(trimmedName);
    setName("");
    setError("");
    onClose();
  };

  const handleClose = () => {
    setName("");
    setError("");
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <RemoveScrollBar />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/10 backdrop-blur-sm flex items-center justify-center"
            onClick={handleClose}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md mx-2 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="rounded-xl border border-border bg-card p-6 shadow-2xl">
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Terminal className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">Create New App</h2>
                      <p className="text-xs text-muted-foreground">
                        execmgr create &lt;name&gt;
                      </p>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={handleClose}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="app-name">App Name</Label>
                      <Input
                        id="app-name"
                        placeholder="my-app"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          setError("");
                        }}
                        className="font-mono"
                        autoFocus
                      />
                      {error && (
                        <p className="text-xs text-destructive">{error}</p>
                      )}
                    </div>

                    <div className="rounded-lg bg-secondary/30 p-3 font-mono text-xs text-muted-foreground">
                      <p>This will create:</p>
                      <p className="mt-1 text-foreground">
                        ~/.local/state/execmgr/{name || "<name>"}/
                      </p>
                      <p className="mt-1">├── app.json</p>
                      <p>├── start.sh</p>
                      <p>├── stop.sh</p>
                      <p>└── logs/</p>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClose}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1">
                      <Plus className="mr-2 h-4 w-4" />
                      Create
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
