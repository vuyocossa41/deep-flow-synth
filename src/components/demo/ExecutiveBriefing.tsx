import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState } from "react";
import type { DemoData } from "@/lib/demo-data";

interface Props {
  data: DemoData;
}

/**
 * A persistent thin "command-center" strip with the executive-level KPIs.
 * Designed to be tucked under the header on flow screens.
 */
export function ExecutiveBriefing({ data }: Props) {
  const pipeline = 40000 + (data.icpScore % 12) * 1000;
  const cacDelta = 18 + (data.icpScore % 22);
  const meetings = 6 + (data.icpScore % 8);
  const momentum = 60 + (data.icpScore % 35);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-12 z-30 mx-auto hidden max-w-[1200px] px-4 md:block">
      <div className="glass flex items-stretch divide-x divide-border/40 rounded-lg px-1 py-1 font-mono text-[10px] uppercase tracking-[0.12em]">
        <Cell label="Pipeline gen." value={`$${pipeline.toLocaleString()}`} tone="text-signal" trail="+24% w/w" />
        <Cell label="CAC ↓" value={`-${cacDelta}%`} tone="text-signal" trail="last 30d" />
        <Cell label="Meetings" value={`${meetings}/wk`} tone="text-foreground" trail="auto-booked" />
        <Cell label="Signal conf." value={`${data.icpScore}%`} tone="text-info" trail="rising" />
        <Cell label="Market momentum" value={`${momentum}`} tone="text-mind" trail="strong" />
        <Cell label="Opportunities" value={`${3 + (data.icpScore % 5)}`} tone="text-warn" trail="ready" />
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
  // count-up for numeric values that start with $ or end with %
  const num = parseFloat(value.replace(/[^\d.]/g, ""));
  const mv = useMotionValue(0);
  const [shown, setShown] = useState(value);
  const prefix = value.startsWith("$") ? "$" : "";
  const suffix = value.endsWith("%")
    ? "%"
    : value.endsWith("/wk")
      ? "/wk"
      : "";

  const formatted = useTransform(mv, (v) => {
    if (!Number.isFinite(num)) return value;
    const n = Math.round(v);
    return `${prefix}${n.toLocaleString()}${suffix}`;
  });

  useEffect(() => {
    if (!Number.isFinite(num)) {
      setShown(value);
      return;
    }
    const controls = animate(mv, num, { duration: 1.2, ease: [0.22, 1, 0.36, 1] });
    const unsub = formatted.on("change", (v) => setShown(v));
    return () => {
      controls.stop();
      unsub();
    };
  }, [num, value, mv, formatted]);

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
