import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { DemoData } from "@/lib/demo-data";
import { OrchestrationGraph } from "../OrchestrationGraph";

interface Props {
  data: DemoData;
  onComplete: () => void;
}

/**
 * Screen 2: "Building Company Intelligence Layer"
 * Cinematic boot sequence — the system wakes up around the company name.
 */
export function IntelligenceScreen({ data, onComplete }: Props) {
  const steps = [
    { label: "indexing public footprint", agent: "signal" },
    { label: "mapping ICP signature", agent: "icp" },
    { label: "analysing market category", agent: "market" },
    { label: "scanning competitor topology", agent: "market" },
    { label: "modelling positioning vector", agent: "strategy" },
    { label: "estimating pricing band", agent: "revenue" },
    { label: "warming campaign orchestrator", agent: "campaign" },
    { label: "compiling intelligence layer", agent: "strategy" },
  ];

  const [done, setDone] = useState<boolean[]>(() => steps.map(() => false));
  const [activeIdx, setActiveIdx] = useState(0);
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    const timers: number[] = [];
    steps.forEach((_, i) => {
      timers.push(
        window.setTimeout(() => setActiveIdx(i), i * 380),
      );
      timers.push(
        window.setTimeout(
          () =>
            setDone((prev) => {
              const next = [...prev];
              next[i] = true;
              return next;
            }),
          i * 380 + 360,
        ),
      );
    });
    const r = window.setTimeout(() => setReveal(true), steps.length * 380 + 200);
    const f = window.setTimeout(onComplete, steps.length * 380 + 3600);
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.clearTimeout(r);
      window.clearTimeout(f);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const activeAgent = steps[activeIdx]?.agent ?? "signal";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-28">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-mind">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-mind" />
          CORE OS · BOOT SEQUENCE
        </div>
        <div className="font-mono text-[11px] text-muted-foreground">
          target: <span className="text-foreground">{data.company}</span> · region:{" "}
          <span className="text-foreground">global</span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.05fr]">
        {/* Left: boot log */}
        <div className="glass-strong rounded-2xl p-5">
          <div className="mb-4 font-display text-lg font-bold leading-tight">
            Building Company Intelligence Layer
            <span className="ml-1 animate-caret text-signal">_</span>
          </div>

          <ul className="space-y-1.5 font-mono text-[12px]">
            {steps.map((s, i) => {
              const isDone = done[i];
              const isActive = activeIdx === i && !isDone;
              return (
                <motion.li
                  key={s.label}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{
                    opacity: i <= activeIdx || isDone ? 1 : 0.25,
                    x: 0,
                  }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-2.5"
                >
                  <span
                    className={`grid h-4 w-4 place-items-center rounded-sm border text-[9px] ${
                      isDone
                        ? "border-signal/60 bg-signal-soft text-signal"
                        : isActive
                          ? "animate-pulse-dot border-mind/60 text-mind"
                          : "border-border/60 text-muted-foreground/50"
                    }`}
                  >
                    {isDone ? "✓" : isActive ? "•" : ""}
                  </span>
                  <span
                    className={`uppercase tracking-[0.08em] text-[10px] ${
                      isDone
                        ? "text-foreground/80"
                        : isActive
                          ? "text-mind"
                          : "text-muted-foreground/60"
                    }`}
                  >
                    {s.label}
                  </span>
                  {isDone && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="ml-auto font-mono text-[9px] text-signal/70"
                    >
                      ok
                    </motion.span>
                  )}
                </motion.li>
              );
            })}
          </ul>

          <div className="mt-5 border-t border-border/40 pt-4 text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground/60">
            Orchestration topology
          </div>
          <OrchestrationGraph active={activeAgent} height={180} />
        </div>

        {/* Right: intelligence reveal */}
        <div className="glass-strong relative overflow-hidden rounded-2xl p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              Intelligence layer · {data.company}
            </div>
            <div className="font-mono text-[10px] text-signal/80">
              {reveal ? "compiled · 1.7s" : "compiling…"}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: reveal ? 1 : 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-3"
          >
            <IntelRow label="Category" value={data.intel.category} />
            <IntelRow label="Positioning" value={data.intel.positioning} />
            <IntelRow
              label="ICP"
              value={data.intel.icpDescriptor}
              meta={`signature ${data.icpScore}/100`}
            />
            <IntelRow
              label="Pricing"
              value={`${data.intel.pricingTier} · ${data.intel.pricingNote}`}
            />

            <div>
              <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground/70">
                Competitor map
              </div>
              <div className="flex flex-wrap gap-1.5">
                {data.intel.competitors.map((c, i) => (
                  <motion.span
                    key={c}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.08 }}
                    className="rounded border border-border/60 bg-panel/60 px-2 py-0.5 font-mono text-[10px] text-foreground/80"
                  >
                    {c}
                  </motion.span>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground/70">
                Reasoning · why this matters
              </div>
              <ul className="space-y-1 font-mono text-[11px] text-foreground/85">
                {data.intel.differentiators.map((r, i) => (
                  <motion.li
                    key={r}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    className="flex gap-2"
                  >
                    <span className="text-mind">›</span>
                    {r}
                  </motion.li>
                ))}
              </ul>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-2 rounded-md border border-signal/30 bg-signal-soft px-3 py-2 font-mono text-[11px] text-signal"
            >
              ▸ Layer live · {6} agents now reasoning on {data.company}
            </motion.div>
          </motion.div>

          {/* shimmering sweep while compiling */}
          {!reveal && (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
              style={{
                background:
                  "linear-gradient(90deg, transparent, oklch(0.85 0.22 152 / 0.06), transparent)",
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function IntelRow({
  label,
  value,
  meta,
}: {
  label: string;
  value: string;
  meta?: string;
}) {
  return (
    <div className="border-b border-border/30 pb-2 last:border-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground/70">
          {label}
        </span>
        {meta && (
          <span className="font-mono text-[9px] text-signal/80">{meta}</span>
        )}
      </div>
      <div className="mt-0.5 font-display text-[13px] leading-snug text-foreground/90">
        {value}
      </div>
    </div>
  );
}
