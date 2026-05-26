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
  const bodyRef = useRef<HTMLDivElement>(null);

  const lines: Line[] = [
    { text: `$ ruflo run scout --company "${data.company}" --model kimi-k2.6`, cls: "cmd", delay: 0 },
    { text: `→ Initializing Scout Agent (memory: ${data.industry} corpus)`, cls: "dim", delay: 320 },
    { text: `→ Searching funding news (last 7d)…`, cls: "dim", delay: 720 },
    { text: `→ Scanning LinkedIn CEO activity…`, cls: "dim", delay: 1200 },
    { text: `→ Checking job postings: ${data.hiringRole}…`, cls: "dim", delay: 1680 },
    { text: `→ Analyzing competitor landscape…`, cls: "dim", delay: 2160 },
    { text: "", cls: "dim", delay: 2400 },
    { text: `✓  SIGNAL · ${data.fundingRound} ${data.fundingAmount} — ${data.fundingDays}d ago`, cls: "ok", delay: 2600 },
    { text: `✓  SIGNAL · Hiring ${data.hiringRole}`, cls: "ok", delay: 3000 },
    { text: `✓  SIGNAL · CEO posted "${data.ceoQuote}" — yesterday`, cls: "ok", delay: 3400 },
    { text: `⚠  COMPETITOR · ${data.competitorMoves[0]}`, cls: "warn", delay: 3800 },
    { text: "", cls: "dim", delay: 4000 },
    { text: `  ────────────────────────────────────────────────`, cls: "sep", delay: 4100 },
    { text: `  ${data.company.toUpperCase().padEnd(22)} ICP: ${data.icpScore}/100`, cls: "ok", delay: 4220 },
    { text: `  Buy Signal: ${data.buySignal}  ·  Priority: ${data.priority}`, cls: "ok", delay: 4340 },
    { text: `  ────────────────────────────────────────────────`, cls: "sep", delay: 4460 },
    { text: "", cls: "dim", delay: 4500 },
    { text: `→ Analysis complete. Cost: $0.004  ·  Time: 58s`, cls: "dim", delay: 4700 },
    { text: `→ Passing to Writer Agent…`, cls: "warn", delay: 5100 },
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
    const handover = window.setTimeout(() => setActive("writer"), 5100);
    const finish = window.setTimeout(onComplete, 6200);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(handover);
      clearTimeout(finish);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-24">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Badge color="signal" label="ACQUISITION · SIGNAL INFRASTRUCTURE" />
        <div className="font-mono text-[11px] text-muted-foreground">
          target: <span className="text-foreground">{data.company}</span> · ICP{" "}
          <span className="text-signal">{data.icpScore}/100</span>
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
              scout_agent — {data.company.toLowerCase()}
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
        </div>

        {/* Side: orchestration + reasoning */}
        <div className="space-y-4">
          <div className="glass rounded-2xl p-4">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              Orchestration
            </div>
            <OrchestrationGraph active={active} height={140} />
          </div>
          <div className="glass rounded-2xl p-4">
            <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-mind" />
              Reasoning
            </div>
            <ul className="space-y-1.5 font-mono text-[11.5px] text-foreground/85">
              {data.reasoning.map((r, i) =>
                i < Math.min(visible - 6, data.reasoning.length) ? (
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
