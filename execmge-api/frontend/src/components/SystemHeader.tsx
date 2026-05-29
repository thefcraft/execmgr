import { Box, Activity, HardDrive, Package } from "lucide-react";
import { motion } from "framer-motion";
import { ThemeToggle } from "./ThemeToggle";
import { ApiState, SystemInfo } from "@/lib/api";


export const SystemHeader = ({ state }: {
  state: ApiState<SystemInfo, any>
}) => {
  if (!state.data) {
    if (state.loading) {
      return (
        <header className="border-b border-border bg-card/50 backdrop-blur-sm">
          <div className="container mx-auto px-6 py-5">
            <p className="text-sm text-muted-foreground">Loading system info...</p>
          </div>
        </header>
      );
    }
    else if (state.error) {
      return (
        <header className="border-b border-border bg-card/50 backdrop-blur-sm">
          <div className="container mx-auto px-6 py-5">
            <p className="text-sm text-red-500">
              Failed to load system information
            </p>
          </div>
        </header>
      );
    } else {
      return null;
    }
  }
  let info = state.data;

  const stats = [
    { label: "Total Apps", value: info.apps, icon: Package },
    { label: "Running", value: info.running, icon: Activity },
    { label: "Version", value: `v${info.version}`, icon: Box },
  ];

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-b border-border bg-card/50 backdrop-blur-sm"
    >
      <div className="container mx-auto px-6 py-5">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
              <HardDrive className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                exec<span className="text-primary">mgr</span>
              </h1>
              <p className="font-mono text-xs text-muted-foreground">
                {info.baseDir}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex gap-4">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 rounded-lg bg-secondary/50 px-4 py-2.5"
                >
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="font-mono text-lg font-medium text-foreground">
                      {stat.value}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="h-8 w-px bg-border" />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </motion.header>
  );
};
