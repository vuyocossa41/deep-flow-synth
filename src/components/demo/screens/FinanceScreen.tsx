import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DemoData } from "@/lib/demo-data";
import { Sparkline } from "../Sparkline";

import type { ScoutResult } from "@/lib/scout";

interface Props {
  data: DemoData;
  scoutData?: import("@/lib/scout").ScoutResult | null;
  onComplete: () => void;
}

export function FinanceScreen({ data, scoutData, onComplete }: Props) {
  const [mrr, setMrr] = useState(0);
  const [visible, setVisible] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setMrr(0);
    setVisible(0);
    setExpanded(null);
    const step = Math.max(800, Math.round(data.mrr / 40));
    const i = window.setInterval(() => {
      setMrr((v) => {
        const next = v + step;
        if (next >= data.mrr) {
          window.clearInterval(i);
          return data.mrr;
        }
        return next;
      });
    }, 28);
    const v = window.setInterval(() => {
      setVisible((n) => {
        if (n >= 4) {
          window.clearInterval(v);
          return n;
        }
        return n + 1;
      });
    }, 220);
    const done = window.setTimeout(onComplete, 8500);
    return () => {
      window.clearInterval(i);
      window.clearInterval(v);
      window.clearTimeout(done);
    };
  }, [data, onComplete]);

  const chartData = data.mrrTrend.map((v, i) => ({ i, mrr: v, pipe: data.pipelineTrend[i] }));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-24">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-info">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-info" />
          FINANCE OS · REAL-TIME
        </div>
        <div className="font-mono text-[11px] text-muted-foreground">
          last sync: 2s ago · streaming
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          show={visible >= 1}
          label="MRR"
          value={`$${mrr.toLocaleString()}`}
          delta={`↑ ${data.mrrDelta}% this week`}
          tone="signal"
          trend={data.mrrTrend}
        />
        <KpiCard
          show={visible >= 2}
          label="Runway"
          value={`${data.runwayMonths} mo`}
          delta="monitor closely"
          tone="warn"
          trend={data.cashTrend}
        />
        <KpiCard
          show={visible >= 3}
          label="Churn Risk"
          value={`${data.churnClients.length} clients`}
          delta="87%+ probability"
          tone="danger"
          pulse
        />
        <KpiCard
          show={visible >= 4}
          label="Investor Report"
          value="Ready"
          delta="auto-generated"
          tone="signal"
        />
      </div>

      {/* Main chart + churn drill-down */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: visible >= 4 ? 1 : 0, y: visible >= 4 ? 0 : 8 }}
          transition={{ duration: 0.5 }}
          className="glass-strong rounded-2xl p-5"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              MRR vs Pipeline · 24w
            </div>
            <div className="flex gap-4 font-mono text-[10px]">
              <span className="flex items-center gap-1.5 text-signal">
                <span className="h-2 w-2 rounded-full bg-signal" /> MRR
              </span>
              <span className="flex items-center gap-1.5 text-info">
                <span className="h-2 w-2 rounded-full bg-info" /> Pipeline
              </span>
            </div>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gMrr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.85 0.22 152)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.85 0.22 152)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gPipe" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.72 0.16 250)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="oklch(0.72 0.16 250)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="i" hide />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.19 0.025 248)",
                    border: "1px solid oklch(0.28 0.03 250 / 0.6)",
                    borderRadius: 8,
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                  }}
                  cursor={{ stroke: "oklch(0.85 0.22 152 / 0.4)", strokeWidth: 1 }}
                />
                <Area
                  type="monotone"
                  dataKey="mrr"
                  stroke="oklch(0.85 0.22 152)"
                  strokeWidth={1.6}
                  fill="url(#gMrr)"
                />
                <Area
                  type="monotone"
                  dataKey="pipe"
                  stroke="oklch(0.72 0.16 250)"
                  strokeWidth={1.6}
                  fill="url(#gPipe)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: visible >= 3 ? 1 : 0, y: visible >= 3 ? 0 : 8 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass-strong rounded-2xl p-5"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              Churn risk · drill-down
            </div>
            <span className="font-mono text-[10px] text-danger">
              ${data.churnClients.reduce((a, c) => a + c.mrr, 0).toLocaleString()}/mo at risk
            </span>
          </div>
          <ul className="space-y-1.5">
            {data.churnClients.map((c) => {
              const open = expanded === c.name;
              return (
                <li
                  key={c.name}
                  className={`rounded-lg border bg-panel/40 transition-colors ${open ? "border-danger/60" : "border-border/60 hover:border-border"}`}
                >
                  <button
                    onClick={() => setExpanded(open ? null : c.name)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="h-2 w-2 rounded-full bg-danger" />
                      <span className="font-display text-sm font-semibold">{c.name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        ${c.mrr}/mo
                      </span>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-danger">
                      {c.risk}%
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-2 border-t border-border/40 px-3 py-2.5 font-mono text-[11px]">
                          <div className="text-muted-foreground">
                            cause: <span className="text-foreground/90">{c.reason}</span>
                          </div>
                          <div className="text-muted-foreground">
                            action: <span className="text-signal">retention email drafted</span>
                          </div>
                          <button className="rounded-md border border-signal/40 bg-signal-soft px-2 py-1 text-signal hover:bg-signal hover:text-primary-foreground">
                            send retention email →
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </motion.div>
      </div>
    </div>
  );
}

function KpiCard({
  show,
  label,
  value,
  delta,
  tone,
  trend,
  pulse,
}: {
  show: boolean;
  label: string;
  value: string;
  delta: string;
  tone: "signal" | "warn" | "danger" | "info";
  trend?: number[];
  pulse?: boolean;
}) {
  const toneClass = {
    signal: "text-signal",
    warn: "text-warn",
    danger: "text-danger",
    info: "text-info",
  }[tone];
  const color = {
    signal: "oklch(0.85 0.22 152)",
    warn: "oklch(0.82 0.18 75)",
    danger: "oklch(0.7 0.22 25)",
    info: "oklch(0.72 0.16 250)",
  }[tone];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: show ? 1 : 0, y: show ? 0 : 10 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="glass-strong relative overflow-hidden rounded-xl p-4"
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-2 font-mono text-2xl font-bold leading-none ${toneClass} ${pulse ? "animate-pulse-dot" : ""}`}
      >
        {value}
      </div>
      <div className={`mt-1 font-mono text-[11px] ${toneClass} opacity-80`}>{delta}</div>
      {trend && (
        <div className="mt-3 -mb-1 -mr-1">
          <Sparkline data={trend} color={color} width={140} height={32} />
        </div>
      )}
    </motion.div>
  );
}

