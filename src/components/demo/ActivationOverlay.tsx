import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface Props {
  company: string;
  onComplete: () => void;
}

const bootLines = [
  { t: 120, text: "▸ kill switch · agency contracts paused", tone: "danger" },
  { t: 380, text: "▸ ingesting context: " },
  { t: 720, text: "✓ SIGNAL HUNTER online", tone: "ok" },
  { t: 900, text: "✓ ICP INTELLIGENCE online", tone: "ok" },
  { t: 1080, text: "✓ MARKET ANALYST online", tone: "ok" },
  { t: 1260, text: "✓ CAMPAIGN ORCHESTRATOR online", tone: "ok" },
  { t: 1440, text: "✓ REVENUE OPTIMIZER online", tone: "ok" },
  { t: 1620, text: "✓ STRATEGY ENGINE online", tone: "ok" },
  { t: 1900, text: "▸ neural bus stable · 6/6 agents reasoning", tone: "info" },
  { t: 2200, text: "▸ war room handover complete", tone: "info" },
];

/**
 * Full-screen "shatter then wake" transition between Chaos and Intelligence.
 * Runs ~2.6s, then calls onComplete.
 */
export function ActivationOverlay({ company, onComplete }: Props) {
  const [shown, setShown] = useState<number>(0);

  useEffect(() => {
    const timers: number[] = [];
    bootLines.forEach((_, i) => {
      timers.push(window.setTimeout(() => setShown(i + 1), bootLines[i].t));
    });
    const done = window.setTimeout(onComplete, 2600);
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
      {/* Radial wipe — from center outward, switching tint from red to green */}
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
        transition={{ duration: 2.4, times: [0, 0.25, 0.6, 1] }}
      />

      {/* Shatter rings */}
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border"
          style={{
            borderColor: i % 2 === 0 ? "oklch(0.85 0.22 152 / 0.5)" : "oklch(0.72 0.16 250 / 0.4)",
          }}
          initial={{ width: 20, height: 20, opacity: 0 }}
          animate={{
            width: [20, 1800],
            height: [20, 1800],
            opacity: [0, 0.7, 0],
          }}
          transition={{
            duration: 2,
            delay: 0.05 + i * 0.18,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
      ))}

      {/* Vertical scan beam */}
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
        transition={{ duration: 1.3, ease: [0.6, 0, 0.4, 1] }}
      />

      {/* Center status block */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-signal"
        >
          system · activation
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 6, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: 0.25, duration: 0.6 }}
          className="font-display text-[clamp(22px,3vw,32px)] font-bold tracking-tight"
        >
          Bringing <span className="text-gradient-signal">{company}</span> online
        </motion.div>

        <div className="mt-8 w-full max-w-md space-y-1 font-mono text-[11px]">
          {bootLines.slice(0, shown).map((l, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              className={
                l.tone === "ok"
                  ? "text-signal"
                  : l.tone === "danger"
                    ? "text-danger/80 line-through"
                    : l.tone === "info"
                      ? "text-info"
                      : "text-foreground/70"
              }
            >
              {l.text}
              {l.text.endsWith(": ") && (
                <span className="text-foreground">{company}</span>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
