import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { ScoutResult } from "@/lib/scout";

interface Props {
  scoutData?: ScoutResult | null;
  onComplete: () => void;
}

export function FinanceScreen({ scoutData, onComplete }: Props) {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    setVisible(0);
    const v = window.setInterval(() => {
      setVisible((n) => {
        if (n >= 4) {
          window.clearInterval(v);
          return n;
        }
        return n + 1;
      });
    }, 220);
    const done = window.setTimeout(onComplete, 7000);
    return () => {
      window.clearInterval(v);
      window.clearTimeout(done);
    };
  }, [onComplete]);

  const alerts = scoutData?.infrastructure_alerts ?? [];
  const funding = scoutData?.funding;
  const techStack = scoutData?.profile?.tech_stack ?? [];
  const scoreNum = scoutData?.score_num ?? 0;
  const readiness = scoutData?.readiness_index ?? 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-24">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-info">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-info" />
          REAL SIGNAL · FROM LIVE SCAN
        </div>
        <div className="font-mono text-[11px] text-muted-foreground">
          source: Firecrawl + public press search
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          show={visible >= 1}
          label="Fit Score"
          value={`${scoreNum}/100`}
          delta={scoutData?.score ?? "—"}
          tone="signal"
        />
        <KpiCard
          show={visible >= 2}
          label="Readiness Index"
          value={`${readiness}`}
          delta="derived from real signal"
          tone="info"
        />
        <KpiCard
          show={visible >= 3}
          label="Public Funding Signal"
          value={funding?.round || funding?.amount ? `${funding.round} ${funding.amount}`.trim() : "None found"}
          delta={funding?.source_url ? "verified via press" : "no public record"}
          tone={funding?.round || funding?.amount ? "signal" : "warn"}
        />
        <KpiCard
          show={visible >= 4}
          label="Tech Stack Detected"
          value={techStack.length ? `${techStack.length} tools` : "None visible"}
          delta={techStack.length ? techStack.slice(0, 3).join(", ") : "not detected in scan"}
          tone={techStack.length ? "signal" : "warn"}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: visible >= 4 ? 1 : 0, y: visible >= 4 ? 0 : 8 }}
        transition={{ duration: 0.5 }}
        className="glass-strong mt-4 rounded-2xl p-5"
      >
        <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          Infrastructure alerts · derived from real scan content
        </div>
        {alerts.length === 0 ? (
          <div className="font-mono text-[12px] text-muted-foreground">
            No infrastructure gaps detected from public content.
          </div>
        ) : (
          <ul className="space-y-2">
            {alerts.map((a, i) => (
              <li
                key={i}
                className={`rounded-lg border px-3 py-2.5 font-mono text-[12px] ${
                  a.level === "critical"
                    ? "border-danger/40 bg-danger/5 text-danger"
                    : a.level === "warning"
                    ? "border-warn/40 bg-warn/5 text-warn"
                    : "border-info/40 bg-info/5 text-info"
                }`}
              >
                {a.text}
              </li>
            ))}
          </ul>
        )}
        {funding?.source_url && (
          <div className="mt-3 font-mono text-[10px] text-muted-foreground">
            Funding source: <a href={funding.source_url} target="_blank" rel="noopener noreferrer" className="underline">{funding.source_title}</a>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function KpiCard({
  show,
  label,
  value,
  delta,
  tone,
}: {
  show: boolean;
  label: string;
  value: string;
  delta: string;
  tone: "signal" | "warn" | "danger" | "info";
}) {
  const toneClass = {
    signal: "text-signal",
    warn: "text-warn",
    danger: "text-danger",
    info: "text-info",
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
      <div className={`mt-2 font-mono text-xl font-bold leading-none ${toneClass}`}>
        {value}
      </div>
      <div className={`mt-1 font-mono text-[11px] ${toneClass} opacity-80`}>{delta}</div>
    </motion.div>
  );
}
