import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface Props {
  company: string;
  onComplete: () => void;
}

interface BootLine {
  t: number;
  text: string;
  tone?: "ok" | "danger" | "info" | "ctx";
  subtitle?: string;
}

// Compressed to ~1800ms. Removed "neural bus stable" and "war room handover" lines.
const bootLines: BootLine[] = [
  { t: 80, text: "▸ kill switch · agency contracts paused", tone: "danger" },
  { t: 240, text: "▸ ingesting context: ", tone: "ctx" },
  {
    t: 460,
    text: "✓ SIGNAL HUNTER online",
    tone: "ok",
    subtitle: "scanning 847k companies for intent signals...",
  },
  {
    t: 620,
    text: "✓ ICP INTELLIGENCE online",
    tone: "ok",
    subtitle: "building psychographic profiles...",
  },
  {
    t: 780,
    text: "✓ MARKET ANALYST online",
    tone: "ok",
    subtitle: "mapping competitor movements...",
  },
  {
    t: 940,
    text: "✓ CAMPAIGN ORCHESTRATOR online",
    tone: "ok",
    subtitle: "loading founder voice + ICP context...",
  },
  {
    t: 1100,
    text: "✓ REVENUE OPTIMIZER online",
    tone: "ok",
    subtitle: "calculating pipeline scenarios...",
  },
  {
    t: 1260,
    text: "✓ STRATEGY ENGINE online",
    tone: "ok",
    subtitle: "war room ready",
  },
];

/**
 * Full-screen "shatter then wake" transition between Chaos and Intelligence.
 * Runs ~1800ms then calls onComplete.
 */
export function ActivationOverlay({ company, onComplete }: Props) {
  const [shown, setShown] = useState<number>(0);

  useEffect(() => {
    const timers: number[] = [];
    bootLines.forEach((_, i) => {
      timers.push(window.setTimeout(() => setShown(i + 1), bootLines[i].t));
    });
    const done = window.setTimeout(onComplete, 1800);
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.clearTimeout(done);
    };
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[60] overflow-hidden"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="absolute inset-0"
        initial={{
          background:
            "radial-gradient(circle at 50% 88%, oklch(0.13 0.02 240) 0%, oklch(0.18 0.12 25 / 0.7) 60%)",
        }}
        animate={{
          background: [
            "radial-gradient(circle at 50% 88%, oklch(0.13 0.02 240) 0%, oklch(0.18 0.12 25 / 0.7) 60%)",
            "radial-gradient(circle at 50% 50%, oklch(0.13 0.02 240) 30%, oklch(0.18 0.12 25 / 0.3) 80%)",
            "radial-gradient(circle at 50% 50%, oklch(0.13 0.02 240) 60%, oklch(0.85 0.22 152 / 0.15) 100%)",
            "radial-gradient(circle at 50% 50%, oklch(0.13 0.02 240) 100%, transparent 100%)",
          ],
        }}
        transition={{ duration: 1.7, times: [0, 0.25, 0.6, 1] }}
      />

      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border"
          style={{
            borderColor:
              i % 2 === 0
                ? "oklch(0.85 0.22 152 / 0.5)"
                : "oklch(0.72 0.16 250 / 0.4)",
          }}
          initial={{ width: 20, height: 20, opacity: 0 }}
          animate={{
            width: [20, 1800],
            height: [20, 1800],
            opacity: [0, 0.7, 0],
          }}
          transition={{
            duration: 1.5,
            delay: 0.04 + i * 0.12,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
      ))}

      <motion.div
        aria-hidden
        className="absolute inset-y-0 w-px"
        style={{
          background:
            "linear-gradient(180deg, transparent, oklch(0.85 0.22 152), transparent)",
          boxShadow: "0 0 40px oklch(0.85 0.22 152 / 0.8)",
        }}
        initial={{ left: "0%" }}
        animate={{ left: "100%" }}
        transition={{ duration: 1.0, ease: [0.6, 0, 0.4, 1] }}
      />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-signal"
        >
          system · activation
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 6, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="font-display text-[clamp(22px,3vw,32px)] font-bold tracking-tight"
        >
          Bringing <span className="text-gradient-signal">{company}</span> online
        </motion.div>

        <div className="mt-7 w-full max-w-md space-y-1 font-mono text-[11px]">
          {bootLines.slice(0, shown).map((l, i) => {
            const color =
              l.tone === "ok"
                ? "text-signal"
                : l.tone === "danger"
                  ? "text-danger/80 line-through"
                  : l.tone === "info"
                    ? "text-info"
                    : "text-foreground/70";
            const subColor =
              l.tone === "ok"
                ? "text-signal"
                : l.tone === "info"
                  ? "text-info"
                  : "text-foreground";
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className={color}>
                  {l.text}
                  {l.tone === "ctx" && (
                    <span className="text-foreground">{company}</span>
                  )}
                </div>
                {l.subtitle && (
                  <div
                    className={`pl-3 text-[9px] ${subColor}`}
                    style={{ opacity: 0.55 }}
                  >
                    {l.subtitle}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
