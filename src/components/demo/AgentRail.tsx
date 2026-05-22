import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export type AgentState = "idle" | "processing" | "streaming" | "ready";

export interface Agent {
  id: string;
  name: string;
  short: string;
  hue: number; // for color
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
}

/**
 * Persistent left rail listing all AI agents and their live state.
 * Hidden on mobile. Pure visual ambient — non-interactive.
 */
export function AgentRail({ activeIds = [] }: Props) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const i = window.setInterval(() => setTick((t) => t + 1), 900);
    return () => window.clearInterval(i);
  }, []);

  return (
    <aside
      aria-hidden
      className="pointer-events-none fixed left-3 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-1.5 lg:flex"
    >
      <div className="mb-1 px-2 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/60">
        Agents · 06
      </div>
      {AGENTS.map((a, idx) => {
        const active = activeIds.includes(a.id);
        // give every agent micro-life: occasional flicker
        const flicker = (tick + idx * 3) % 7 === 0;
        const state: AgentState = active
          ? "processing"
          : flicker
            ? "streaming"
            : "idle";
        return <AgentChip key={a.id} agent={a} state={state} />;
      })}
    </aside>
  );
}

function AgentChip({ agent, state }: { agent: Agent; state: AgentState }) {
  const color = `oklch(0.85 0.18 ${agent.hue})`;
  const isActive = state === "processing";
  return (
    <div
      className="group flex items-center gap-2 rounded-md border border-border/40 bg-surface/60 px-2 py-1.5 backdrop-blur"
      style={{
        boxShadow: isActive ? `0 0 18px -4px ${color}` : undefined,
        borderColor: isActive ? color : undefined,
      }}
    >
      <span className="relative inline-flex h-1.5 w-1.5">
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
  );
}
