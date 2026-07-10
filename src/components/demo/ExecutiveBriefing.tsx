import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState } from "react";
import type { ScoutResult } from "@/lib/scout";

interface Props {
  scoutData?: ScoutResult | null;
}

/**
 * A persistent thin "command-center" strip showing only real signal
 * derived from the actual backend scan — no fabricated KPIs.
 */
export function ExecutiveBriefing({ scoutData }: Props) {
  const fit = scoutData?.score_num ?? null;
  const readiness = scoutData?.readiness_index ?? null;
  const techCount = scoutData?.profile?.tech_stack?.length ?? 0;
  const alertCount = scoutData?.infrastructure_alerts?.length ?? 0;
  const fundingFound = Boolean(scoutData?.funding?.round || scoutData?.funding?.amount);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-12 z-30 mx-auto hidden max-w-[1200px] px-4 md:block">
      <div className="glass flex items-stretch divide-x divide-border/40 rounded-lg px-1 py-1 font-mono text-[10px] uppercase tracking-[0.12em]">
        <Cell label="Fit score" value={fit != null ? `${fit}/100` : "—"} tone="text-signal" trail="from real scan" />
        <Cell label="Readiness" value={readiness != null ? `${readiness}` : "—"} tone="text-info" trail="derived" />
        <Cell label="Signal" value={scoutData?.score ?? "—"} tone="text-foreground" trail="real classification" />
        <Cell label="Tech detected" value={`${techCount}`} tone="text-mind" trail="pattern-matched" />
        <Cell label="Alerts" value={`${alertCount}`} tone="text-warn" trail="grounded in content" />
        <Cell label="Funding" value={fundingFound ? "found" : "none"} tone={fundingFound ? "text-signal" : "text-muted-foreground"} trail="public press" />
      </div>
    </div>
  );
}

function Cell({
  label,
  value,
  tone,
  trail,
}: {
  label: string;
  value: string;
  tone: string;
  trail: string;
}) {
  const num = parseFloat(value.replace(/[^\d.]/g, ""));
  const isNumeric = Number.isFinite(num) && /^\d/.test(value);
  const mv = useMotionValue(0);
  const [shown, setShown] = useState(value);

  const formatted = useTransform(mv, (v) => {
    if (!isNumeric) return value;
    return `${Math.round(v).toLocaleString()}${value.replace(/^[\d.]+/, "")}`;
  });

  useEffect(() => {
    if (!isNumeric) {
      setShown(value);
      return;
    }
    const controls = animate(mv, num, { duration: 1.2, ease: [0.22, 1, 0.36, 1] });
    const unsub = formatted.on("change", (v) => setShown(v));
    return () => {
      controls.stop();
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [num, value, isNumeric]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-1 flex-col gap-0.5 px-3 py-1.5"
    >
      <div className="text-[9px] text-muted-foreground/70">{label}</div>
      <div className={`text-[12px] font-bold ${tone}`}>{shown}</div>
      <div className="text-[8px] tracking-normal text-muted-foreground/60">{trail}</div>
    </motion.div>
  );
}
