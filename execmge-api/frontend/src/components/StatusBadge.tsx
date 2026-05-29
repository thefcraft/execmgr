import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  running: boolean;
  size?: "sm" | "md" | "lg";
}

export const StatusBadge = ({ running, size = "md" }: StatusBadgeProps) => {
  const sizeClasses = {
    sm: "h-2 w-2",
    md: "h-2.5 w-2.5",
    lg: "h-3 w-3",
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div
          className={cn(
            "rounded-full",
            sizeClasses[size],
            running ? "bg-success" : "bg-muted-foreground/50"
          )}
        />
        {running && (
          <motion.div
            className={cn(
              "absolute inset-0 rounded-full bg-success",
              sizeClasses[size]
            )}
            animate={{
              scale: [1, 1.8, 1],
              opacity: [0.7, 0, 0.7],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}
      </div>
      <span
        className={cn(
          "font-mono text-xs uppercase tracking-wider",
          running ? "text-success" : "text-muted-foreground"
        )}
      >
        {running ? "running" : "stopped"}
      </span>
    </div>
  );
};
