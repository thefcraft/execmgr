import { motion } from "framer-motion";
import { X, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RemoveScrollBar } from "react-remove-scroll-bar";

interface TerminalOutputProps {
  title: string;
  output: string;
  onClose: () => void;
}

export function TerminalOutput({ title, output, onClose }: TerminalOutputProps) {
  return (
    <>
      <RemoveScrollBar />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/10 backdrop-blur-sm flex items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="max-h-[80vh] w-full max-w-3xl mx-2"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="rounded-lg border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-primary" />
                <span className="font-mono text-sm font-medium">{title}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="h-[300px]">
              <pre className="p-4 font-mono text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                {output}
              </pre>
            </ScrollArea>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}
