import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

interface Signal {
  id: number;
  text: string;
  kind: "ok" | "info" | "warn";
}

const POOL: Omit<Signal, "id">[] = [
  { text: "Series A detected · infra spend +38%", kind: "ok" },
  { text: "Hiring velocity rising · 4 GTM roles", kind: "ok" },
  { text: "Outbound stack identified · Apollo + Clay", kind: "info" },
  { text: "Intent confidence climbing · 87%", kind: "ok" },
  { text: "Competitor launched AI mode", kind: "warn" },
  { text: "ICP match: 8 new accounts queued", kind: "info" },
  { text: "Champion changed roles at Northwind", kind: "warn" },
  { text: "Pipeline gap −$32k vs forecast", kind: "warn" },
  { text: "CRM migration signal detected", kind: "info" },
  { text: "Revenue Optimizer rebalanced 12 sequences", kind: "ok" },
  { text: "Market Analyst flagged category shift", kind: "info" },
  { text: "Strategy Engine confidence 94%", kind: "ok" },
  { text: "Campaign Orchestrator: 3 sequences live", kind: "info" },
  { text: "Memory write · 1,284 signals indexed", kind: "info" },
];

/**
 * Bottom-right vertical ticker of streaming intelligence signals.
 * Always-on once the demo has started. Hidden on small screens.
 */
export function SignalFeed() {
  const [items, setItems] = useState<Signal[]>([]);
  const [nextId, setNextId] = useState(0);

  useEffect(() => {
    let id = 0;
    const seed = POOL.slice(0, 4).map((s) => ({ ...s, id: id++ }));
    setItems(seed);
    setNextId(id);
    const t = window.setInterval(() => {
      setItems((prev) => {
        const pick = POOL[Math.floor(Math.random() * POOL.length)];
        const next: Signal = { ...pick, id: id++ };
        const out = [next, ...prev].slice(0, 5);
        return out;
      });
      setNextId(id);
    }, 2400);
    return () => window.clearInterval(t);
  }, []);

  return (
    <aside
      aria-hidden
      className="pointer-events-none fixed bottom-12 right-3 z-30 hidden w-[240px] flex-col gap-1.5 lg:flex"
    >
      <div className="flex items-center justify-between px-1 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/60">
        <span>Signal feed</span>
        <span className="flex items-center gap-1.5 text-signal/80">
          <span className="h-1 w-1 animate-pulse-dot rounded-full bg-signal" />
          live · {nextId.toString().padStart(4, "0")}
        </span>
      </div>
      <AnimatePresence initial={false}>
        {items.map((s) => {
          const color =
            s.kind === "ok"
              ? "text-signal border-signal/30"
              : s.kind === "warn"
                ? "text-warn border-warn/30"
                : "text-info border-info/30";
          const glyph = s.kind === "warn" ? "⚠" : "+";
          return (
            <motion.div
              key={s.id}
              layout
              initial={{ opacity: 0, x: 16, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 16, scale: 0.98 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className={`flex items-start gap-1.5 rounded border ${color} bg-surface/70 px-2 py-1.5 font-mono text-[10px] leading-snug backdrop-blur`}
            >
              <span className="mt-px text-[11px] leading-none opacity-80">{glyph}</span>
              <span className="text-foreground/85">{s.text}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </aside>
  );
}
