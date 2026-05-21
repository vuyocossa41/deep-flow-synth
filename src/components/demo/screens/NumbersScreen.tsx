import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
} from "recharts";
import type { DemoData } from "@/lib/demo-data";

interface Props {
  data: DemoData;
  onRestart: () => void;
}

export function NumbersScreen({ data, onRestart }: Props) {
  const [step, setStep] = useState(0);
  const counter = useMotionValue(0);
  const rounded = useTransform(counter, (v) => `$${Math.round(v).toLocaleString()}`);
  const [displayed, setDisplayed] = useState("$0");

  useEffect(() => {
    const unsub = rounded.on("change", (v) => setDisplayed(v));
    return () => unsub();
  }, [rounded]);

  useEffect(() => {
    setStep(0);
    const seq = [320, 700, 1100, 1500, 1900, 2300, 2700, 3100, 3500];
    const timers = seq.map((d, i) => window.setTimeout(() => setStep(i + 1), d));
    const counterTimer = window.setTimeout(() => {
      animate(counter, data.annualSaving, {
        duration: 1.8,
        ease: [0.22, 1, 0.36, 1],
      });
    }, 3800);
    return () => {
      timers.forEach(clearTimeout);
      window.clearTimeout(counterTimer);
    };
  }, [counter, data.annualSaving]);

  const lines: { type: "p" | "big" | "sep" | "good" | "bad"; text?: string }[] = [
    { type: "p", text: "This morning, on autopilot:" },
    { type: "big", text: `${50 + (data.icpScore % 30)} companies analysed.` },
    { type: "p", text: `${data.churnClients.length} churn risks identified.` },
    { type: "big", text: `Your time: 4 minutes.` },
    { type: "good", text: `Infrastructure cost: $0.15` },
    { type: "sep" },
    { type: "bad", text: `An SDR costs $92,000/year.` },
    { type: "p", text: `And books ${data.meetingsBookedPerWeek} meetings/week.` },
    { type: "sep" },
  ];

  const recoveredPipeline = data.churnClients.reduce((a, c) => a + c.mrr, 0) * 12;
  const flatTrend = data.mrrTrend.slice(0, 12).map((v) => ({ v }));
  const liftTrend = data.mrrTrend.map((v, i) => ({ v: v + (i / data.mrrTrend.length) * v * 0.7 }));

  return (
    <div className="relative mx-auto flex min-h-svh max-w-2xl flex-col items-center justify-center px-4 py-24 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/3 mx-auto h-[520px] max-w-3xl rounded-full opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse, oklch(0.85 0.22 152 / 0.22), oklch(0.72 0.16 250 / 0.1) 50%, transparent 70%)",
        }}
      />

      <div className="relative w-full space-y-5">
        {lines.map((l, i) => {
          const show = step > i;
          if (l.type === "sep")
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: show ? 1 : 0, scaleX: show ? 1 : 0 }}
                transition={{ duration: 0.5 }}
                className="mx-auto h-px w-12 bg-border"
              />
            );
          const styles = {
            p: "text-[13px] sm:text-[15px] text-muted-foreground",
            big: "text-[18px] sm:text-[22px] font-bold text-foreground",
            good: "text-[14px] sm:text-[16px] text-signal font-mono",
            bad: "text-[16px] sm:text-[20px] font-bold text-danger",
          }[l.type];
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: show ? 1 : 0, y: show ? 0 : 12 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className={`font-mono ${styles}`}
            >
              {l.text}
            </motion.div>
          );
        })}

        {/* THE PAYOFF */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: step >= 9 ? 1 : 0, scale: step >= 9 ? 1 : 0.9 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative pt-2"
        >
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            with FounderOS · annual saving
          </div>
          <motion.div className="text-gradient-signal font-mono text-[clamp(48px,12vw,96px)] font-extrabold leading-none tracking-tight">
            {displayed}
          </motion.div>

          {/* Live forecast: flat vs lifted */}
          <div className="mt-8 grid grid-cols-2 gap-3 text-left">
            <div className="glass rounded-xl p-3">
              <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                Without · MRR flat
              </div>
              <div className="font-mono text-sm font-bold text-muted-foreground">
                ${data.mrr.toLocaleString()}
              </div>
              <div className="h-12">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={flatTrend}>
                    <defs>
                      <linearGradient id="gFlat" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="oklch(0.62 0.03 250)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="oklch(0.62 0.03 250)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="v"
                      stroke="oklch(0.62 0.03 250)"
                      strokeWidth={1.4}
                      fill="url(#gFlat)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="glass-strong rounded-xl p-3 ring-signal">
              <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-signal">
                With · MRR forecast
              </div>
              <div className="font-mono text-sm font-bold text-signal">
                ${Math.round(data.mrr * 1.7).toLocaleString()}
              </div>
              <div className="h-12">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={liftTrend}>
                    <defs>
                      <linearGradient id="gLift" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="oklch(0.85 0.22 152)" stopOpacity={0.55} />
                        <stop offset="100%" stopColor="oklch(0.85 0.22 152)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="v"
                      stroke="oklch(0.85 0.22 152)"
                      strokeWidth={1.8}
                      fill="url(#gLift)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="mt-3 font-mono text-[11px] text-muted-foreground">
            + ${recoveredPipeline.toLocaleString()} pipeline recovered ·{" "}
            <span className="text-signal">{data.icpScore}% confidence</span>
          </div>

          <div className="mt-10 flex flex-col items-center gap-3">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
              }}
              className="group relative inline-flex items-center gap-3 overflow-hidden rounded-xl bg-signal px-7 py-4 font-display text-base font-bold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5"
            >
              <span
                aria-hidden
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full"
              />
              Book 22-min demo on your real data
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </a>
            <button
              onClick={onRestart}
              className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground"
            >
              ← run again with another company
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
