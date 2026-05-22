import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

export type AgentState = "idle" | "processing" | "streaming" | "ready";

export interface Agent {
  id: string;
  name: string;
  short: string;
  hue: number;
}

export const AGENTS: Agent[] = [
  { id: "signal", name: "Signal Hunter", short: "SIG", hue: 152 },
  { id: "icp", name: "ICP Intelligence", short: "ICP", hue: 152 },
  { id: "market", name: "Market Analyst", short: "MKT", hue: 250 },
  { id: "campaign", name: "Campaign Orchestrator", short: "CMP", hue: 250 },
  { id: "revenue", name: "Revenue Optimizer", short: "REV", hue: 295 },
  { id: "strategy", name: "Strategy Engine", short: "STR", hue: 295 },
];

interface Props {
  activeIds?: string[];
  tasks?: Record<string, string>;
}

/**
 * Left rail listing all AI agents and their live state.
 * Mounts with a staggered, left-to-right reveal each time the screen changes.
 * Interactive on desktop — hovering an agent reveals its current task.
 */
export function AgentRail({ activeIds = [], tasks = {} }: Props) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const i = window.setInterval(() => setTick((t) => t + 1), 900);
    return () => window.clearInterval(i);
  }, []);

  return (
    <aside className="fixed left-3 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-1.5 lg:flex">
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-1 px-2 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/60"
      >
        Agents · 06
      </motion.div>
      {AGENTS.map((a, idx) => {
        const active = activeIds.includes(a.id);
        const flicker = (tick + idx * 3) % 7 === 0;
        const state: AgentState = active
          ? "processing"
          : flicker
            ? "streaming"
            : "idle";
        return (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, x: -16, filter: "blur(4px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            transition={{
              duration: 0.45,
              delay: 0.05 + idx * 0.08,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <AgentChip agent={a} state={state} task={tasks[a.id]} />
          </motion.div>
        );
      })}
      {/* Connecting line down the rail */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-[10px] top-7 w-px"
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "calc(100% - 32px)", opacity: 0.4 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        style={{
          background:
            "linear-gradient(180deg, transparent, oklch(0.85 0.22 152 / 0.5), oklch(0.72 0.16 250 / 0.4), transparent)",
        }}
      />
    </aside>
  );
}

function AgentChip({
  agent,
  state,
  task,
}: {
  agent: Agent;
  state: AgentState;
  task?: string;
}) {
  const color = `oklch(0.85 0.18 ${agent.hue})`;
  const isActive = state === "processing";
  return (
    <div
      className="group relative flex items-start gap-2 rounded-md border border-border/40 bg-surface/60 px-2 py-1.5 backdrop-blur transition-colors hover:bg-surface/80"
      style={{
        boxShadow: isActive ? `0 0 18px -4px ${color}` : undefined,
        borderColor: isActive ? color : undefined,
      }}
    >
      <span className="relative mt-[3px] inline-flex h-1.5 w-1.5 shrink-0">
        <motion.span
          className="absolute inline-flex h-full w-full rounded-full"
          style={{ background: color }}
          animate={
            isActive
              ? { opacity: [1, 0.3, 1], scale: [1, 1.6, 1] }
              : state === "streaming"
                ? { opacity: [0.5, 1, 0.5] }
                : { opacity: 0.4 }
          }
          transition={{ duration: isActive ? 1.2 : 1.8, repeat: Infinity }}
        />
      </span>
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span
            className="font-mono text-[9px] tracking-[0.12em]"
            style={{ color: isActive ? color : "oklch(0.62 0.03 250)" }}
          >
            {agent.short}
          </span>
          <span className="hidden font-mono text-[10px] text-foreground/70 group-hover:inline">
            {agent.name}
          </span>
        </div>
        <AnimatePresence>
          {isActive && task && (
            <motion.div
              key={task}
              initial={{ opacity: 0, height: 0, y: -2 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden font-mono text-[10px] leading-tight text-foreground/60"
            >
              <span className="text-signal/70">›</span> {task}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
