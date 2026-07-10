import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { ScoutResult } from "@/lib/scout";
import { OrchestrationGraph } from "../OrchestrationGraph";

interface Props {
  company: string;
  scoutData?: ScoutResult | null;
  isLoading?: boolean;
  error?: string | null;
  onComplete: () => void;
}

type Cls = "cmd" | "dim" | "ok" | "warn" | "sep" | "info";
interface Line {
  text: string;
  cls: Cls;
}

const colorFor: Record<Cls, string> = {
  cmd: "text-info",
  dim: "text-muted-foreground",
  ok: "text-signal",
  warn: "text-warn",
  sep: "text-border",
  info: "text-foreground",
};

export function ScoutScreen({ company, scoutData, isLoading, error, onComplete }: Props) {
  const [visible, setVisible] = useState<number>(0);
  const bodyRef = useRef<HTMLDivElement>(null);

  const progressLines: Line[] = [
    { text: `$ axon run signal-scout --target "${company}" --depth full`, cls: "cmd" },
    { text: `→ Scraping homepage + priority subpages (careers/about/pricing)…`, cls: "dim" },
    { text: `→ Analyzing content with Groq (LLaMA 3.3 70B)…`, cls: "dim" },
    { text: `→ Detecting real tech stack from page content…`, cls: "dim" },
    { text: `→ Searching public press for funding signal…`, cls: "dim" },
  ];

  const resultLines: Line[] = scoutData
    ? [
        { text: "", cls: "dim" },
        {
          text: scoutData.profile.signals
            ? `✓  SIGNAL · ${scoutData.profile.signals.slice(0, 90)}`
            : `·  No hiring/growth signal found on scanned pages`,
          cls: scoutData.profile.signals ? "ok" : "dim",
        },
        {
          text:
            scoutData.funding?.round || scoutData.funding?.amount
              ? `✓  SIGNAL · ${[scoutData.funding.round, scoutData.funding.amount].filter(Boolean).join(" ")} (public press)`
              : `·  No public funding record found`,
          cls: scoutData.funding?.round || scoutData.funding?.amount ? "ok" : "dim",
        },
        {
          text: scoutData.profile.tech_stack?.length
            ? `✓  TECH STACK · ${scoutData.profile.tech_stack.join(", ")}`
            : `·  No known vendor scripts detected`,
          cls: scoutData.profile.tech_stack?.length ? "ok" : "dim",
        },
        { text: "", cls: "dim" },
        { text: `  ────────────────────────────────────────────────`, cls: "sep" },
        { text: `  ${company.toUpperCase().padEnd(22)} FIT: ${scoutData.score_num}/100`, cls: "ok" },
        { text: `  Signal: ${scoutData.score}  ·  Readiness: ${scoutData.readiness_index}`, cls: "ok" },
        { text: `  ────────────────────────────────────────────────`, cls: "sep" },
        { text: "", cls: "dim" },
        { text: `→ Real scan complete — no fabricated figures.`, cls: "dim" },
      ]
    : error
      ? [
          { text: "", cls: "dim" },
          { text: `✗  SCAN FAILED · ${error}`, cls: "warn" },
        ]
      : [];

  const lines = [...progressLines, ...resultLines];

  useEffect(() => {
    setVisible(0);
    const step = window.setInterval(() => {
      setVisible((v) => {
        const next = Math.min(v + 1, lines.length);
        requestAnimationFrame(() => {
          if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
        });
        return next;
      });
    }, 220);
    return () => window.clearInterval(step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoutData, error, company]);

  useEffect(() => {
    if (!isLoading && (scoutData || error) && visible >= lines.length) {
      const t = window.setTimeout(onComplete, 1600);
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, lines.length, isLoading, scoutData, error]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-24">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Badge color="signal" label="AXON · SIGNAL INTELLIGENCE LAYER · LIVE" />
        <div className="font-mono text-[11px] text-muted-foreground">
          target: <span className="text-foreground">{company}</span>
          {scoutData && (
            <>
              {" "}· FIT <span className="text-signal">{scoutData.score_num}/100</span>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="glass-strong rounded-2xl">
          <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.62_0.18_25)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.78_0.16_75)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.78_0.18_152)]" />
            <span className="ml-2 font-mono text-[11px] text-muted-foreground">
              axon.signal_scout — {company.toLowerCase()}
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
            {isLoading && visible >= progressLines.length && !scoutData && !error && (
              <div className="font-mono text-[12px] text-muted-foreground">
                → waiting for real backend response…
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass rounded-2xl p-4">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              Agent Orchestration
            </div>
            <OrchestrationGraph active={scoutData ? "writer" : "scout"} height={140} />
          </div>
          <div className="glass rounded-2xl p-4">
            <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-mind" />
              Real Signal Summary
            </div>
            {scoutData ? (
              <ul className="space-y-1.5 font-mono text-[11.5px] text-foreground/85">
                {scoutData.structural_signal && (
                  <li className="flex gap-2">
                    <span className="text-signal">›</span>
                    <span>{scoutData.structural_signal}</span>
                  </li>
                )}
                {scoutData.profile.biggest_gap && (
                  <li className="flex gap-2">
                    <span className="text-signal">›</span>
                    <span>{scoutData.profile.biggest_gap}</span>
                  </li>
                )}
                {!scoutData.structural_signal && !scoutData.profile.biggest_gap && (
                  <li className="text-muted-foreground">No further detail available from this scan.</li>
                )}
              </ul>
            ) : (
              <div className="font-mono text-[11px] text-muted-foreground">
                {error ? "Scan failed — see terminal." : "Waiting for real scan to complete…"}
              </div>
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
