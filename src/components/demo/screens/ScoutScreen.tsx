import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { DemoData } from "@/lib/demo-data";
import { OrchestrationGraph } from "../OrchestrationGraph";

interface Props {
  data: DemoData;
  onComplete: () => void;
}

type Cls = "cmd" | "dim" | "ok" | "warn" | "sep" | "info";
interface Line {
  text: string;
  cls: Cls;
  delay: number;
}

const colorFor: Record<Cls, string> = {
  cmd: "text-info",
  dim: "text-muted-foreground",
  ok: "text-signal",
  warn: "text-warn",
  sep: "text-border",
  info: "text-foreground",
};

export function ScoutScreen({ data, onComplete }: Props) {
  const [visible, setVisible] = useState<number>(0);
  const [active, setActive] = useState("scout");
  const [showAmber, setShowAmber] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const lines: Line[] = [
    { text: `$ axon run signal-scout --target "${data.company}" --depth full --memory on`, cls: "cmd", delay: 0 },
    { text: `→ Initializing Signal Intelligence Layer (corpus: ${data.industry})`, cls: "dim", delay: 320 },
    { text: `→ Searching funding events (last 7d)…`, cls: "dim", delay: 720 },
    { text: `→ Scanning LinkedIn CEO activity…`, cls: "dim", delay: 1200 },
    { text: `→ Checking job postings: ${data.hiringRole}…`, cls: "dim", delay: 1680 },
    { text: `→ Analyzing competitor landscape…`, cls: "dim", delay: 2160 },
    { text: `→ Mapping technology stack changes…`, cls: "dim", delay: 2640 },
    { text: `→ Detecting intent signals…`, cls: "dim", delay: 3000 },
    { text: "", cls: "dim", delay: 3200 },
    { text: `✓  SIGNAL · ${data.fundingRound} ${data.fundingAmount} — ${data.fundingDays}d ago`, cls: "ok", delay: 3400 },
    { text: `✓  SIGNAL · Hiring ${data.hiringRole}`, cls: "ok", delay: 3800 },
    { text: `✓  SIGNAL · CEO posted "${data.ceoQuote}" — yesterday`, cls: "ok", delay: 4200 },
    { text: `✓  SIGNAL · Intent detected — 3 visits to competitor pricing page`, cls: "ok", delay: 4600 },
    { text: `⚠  COMPETITOR · ${data.competitorMoves[0]}`, cls: "warn", delay: 5000 },
    { text: "", cls: "dim", delay: 5200 },
    { text: `  ────────────────────────────────────────────────`, cls: "sep", delay: 5300 },
    { text: `  ${data.company.toUpperCase().padEnd(22)} ICP: ${data.icpScore}/100`, cls: "ok", delay: 5420 },
    { text: `  Buy Signal: ${data.buySignal}  ·  Priority: ${data.priority}`, cls: "ok", delay: 5540 },
    { text: `  Urgency Window: 11 days before confidence decay`, cls: "warn", delay: 5660 },
    { text: `  ────────────────────────────────────────────────`, cls: "sep", delay: 5780 },
    { text: "", cls: "dim", delay: 5820 },
    { text: `→ Analysis complete. Cost: $0.004  ·  Time: 58s`, cls: "dim", delay: 6000 },
    { text: `→ Passing to Intelligence Reasoning Engine…`, cls: "warn", delay: 6400 },
  ];

  useEffect(() => {
    const timers = lines.map((l, i) =>
      window.setTimeout(() => {
        setVisible((v) => Math.max(v, i + 1));
        requestAnimationFrame(() => {
          if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
        });
      }, l.delay),
    );

    // Dramatic pause — 3s after terminal completes before amber text
    const amberDelay = window.setTimeout(() => setShowAmber(true), 6400 + 3000);
    const handover = window.setTimeout(() => setActive("writer"), 6400);
    const finish = window.setTimeout(onComplete, 6400 + 3000 + 1200);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(handover);
      clearTimeout(finish);
      clearTimeout(amberDelay);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-24">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Badge color="signal" label="AXON · SIGNAL INTELLIGENCE LAYER · LIVE" />
        <div className="font-mono text-[11px] text-muted-foreground">
          target: <span className="text-foreground">{data.company}</span> · ICP{" "}
          <span className="text-signal">{data.icpScore}/100</span> · cost: $0.004
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Terminal */}
        <div className="glass-strong rounded-2xl">
          <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.62_0.18_25)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.78_0.16_75)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.78_0.18_152)]" />
            <span className="ml-2 font-mono text-[11px] text-muted-foreground">
              axon.signal_scout — {data.company.toLowerCase()}
            </span>
          </div>
          <div
            ref={bodyRef}
            className="scrollbar-thin max-h-[420px] min-h-[320px] overflow-y-auto p-5 font-mono text-[13px] leading-[1.85]"
          >
            {lines.slice(0, visible).map((l, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25 }}
                className={`whitespace-pre ${colorFor[l.cls]}`}
              >
                {l.text || "\u00A0"}
              </motion.div>
            ))}
          </div>

          {/* Amber text — dramatic pause then reveal */}
          {showAmber && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
              className="border-t px-5 py-4"
              style={{ borderColor: "rgba(240,160,64,0.2)", background: "rgba(240,160,64,0.04)" }}
            >
              <div className="font-mono text-[12px]" style={{ color: "#f0a040" }}>
                ⚡ This signal analysis would have taken 4 days and $400 with a human SDR.
              </div>
              <div className="mt-1 font-mono text-[11px]" style={{ color: "#4a4845" }}>
                The AXON intelligence layer did it in 58 seconds for $0.004.
                Cost per signal: $0.004 vs $4,800 with an agency.
              </div>
            </motion.div>
          )}
        </div>

        {/* Side: orchestration + reasoning */}
        <div className="space-y-4">
          <div className="glass rounded-2xl p-4">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              Agent Orchestration
            </div>
            <OrchestrationGraph active={active} height={140} />
          </div>
          <div className="glass rounded-2xl p-4">
            <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-mind" />
              Reasoning Engine
            </div>
            <ul className="space-y-1.5 font-mono text-[11.5px] text-foreground/85">
              {data.reasoning.map((r, i) =>
                i < Math.min(visible - 8, data.reasoning.length) ? (
                  <motion.li
                    key={r}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex gap-2"
                  >
                    <span className="text-signal">›</span>
                    <span>{r}</span>
                  </motion.li>
                ) : null,
              )}
            </ul>
            {visible > lines.length - 4 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3 rounded-md border border-signal/30 bg-signal-soft px-2.5 py-2 font-mono text-[11px] text-signal"
              >
                ▸ {data.conclusion}
              </motion.div>
            )}

            {/* Urgency decay bar */}
            {visible > lines.length - 6 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3"
              >
                <div className="font-mono text-[9px] uppercase tracking-[0.14em] mb-1" style={{ color: "#4a4845" }}>
                  signal confidence decay · 11-day window
                </div>
                <div className="h-[3px] w-full rounded-full overflow-hidden" style={{ background: "#1a1a1a" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: "30%",
                      background: "linear-gradient(to right, #c8f060, #f0a040, #f05870)",
                    }}
                  />
                </div>
                <div className="mt-1 font-mono text-[9px]" style={{ color: "#4a4845" }}>
                  -8%/day after day 11 · deploy within 48h
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Badge({ color, label }: { color: "signal" | "info" | "mind"; label: string }) {
  const colorMap = {
    signal: "text-signal",
    info: "text-info",
    mind: "text-mind",
  } as const;
  return (
    <div className={`inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] ${colorMap[color]}`}>
      <span className={`h-1.5 w-1.5 animate-pulse-dot rounded-full bg-current`} />
      {label}
    </div>
  );
}