import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import type { ScoutResult } from "@/lib/scout";

interface Props {
  company: string;
  scoutData?: ScoutResult | null;
  onRestart: () => void;
}

export function NumbersScreen({ company, scoutData, onRestart }: Props) {
  const [step, setStep] = useState(0);
  const [sdrs, setSdrs] = useState(1);
  const [agencyK, setAgencyK] = useState(3);
  const [calcVisible, setCalcVisible] = useState(false);

  const sdrCost = sdrs * 130000;
  const agencyCost = agencyK * 1000 * 12;
  const toolCost = 26000;
  const founderCost = 156000;
  const totalWithout = sdrCost + agencyCost + toolCost + founderCost;
  const axonCost = 25000 + 3000 * 12;
  const saving = totalWithout - axonCost;
  const roi = (saving / axonCost).toFixed(1);

  const counter = useMotionValue(0);
  const rounded = useTransform(counter, (v) => `$${Math.round(v).toLocaleString()}`);
  const [displayed, setDisplayed] = useState("$0");

  useEffect(() => {
    const unsub = rounded.on("change", (v) => setDisplayed(v));
    return () => unsub();
  }, [rounded]);

  useEffect(() => {
    setStep(0);
    setCalcVisible(false);
    const seq = [300, 650, 1000, 1350, 1700, 2050, 2400, 2750, 3100, 3450, 3800, 4100];
    const timers = seq.map((d, i) => window.setTimeout(() => setStep(i + 1), d));
    const counterTimer = window.setTimeout(() => {
      animate(counter, saving, { duration: 1.8, ease: [0.22, 1, 0.36, 1] });
    }, 4600);
    const calcTimer = window.setTimeout(() => setCalcVisible(true), 5600);
    return () => {
      timers.forEach(clearTimeout);
      window.clearTimeout(counterTimer);
      window.clearTimeout(calcTimer);
    };
  }, [counter, saving]);

  const lines: {
    type: "p" | "big" | "sep" | "good" | "bad" | "amber" | "label" | "delta";
    text?: string;
  }[] = [
    { type: "label", text: "Right now, your company is spending:" },
    { type: "bad",   text: `$130,000/yr → SDR team (ramp, turnover, management overhead)` },
    { type: "bad",   text: `$48,000/yr → Agency retainer (no memory, no signals, no context)` },
    { type: "bad",   text: `$26,000/yr → Tool stack (Apollo, Clay, Salesloft, extras)` },
    { type: "sep" },
    { type: "big",   text: `$204,000/yr to grow slowly and unpredictably.` },
    { type: "delta", text: `AXON: $36k–60k/yr · You save $144k–168k annually · ROI 3.6×` },
    { type: "sep" },
    { type: "amber", text: `Or: deploy AXON revenue infrastructure.` },
    { type: "good",  text: `Pipeline predictable. Founder strategic. Data sovereign. System permanent.` },
    { type: "sep" },
    { type: "p",     text: `The question is not whether you can afford AXON.` },
    { type: "amber", text: `It's whether you can afford another year without it.` },
  ];

  const flatTrend: { v: number }[] = [];
  const liftTrend: { v: number }[] = [];

  return (
    <div className="relative mx-auto flex min-h-svh max-w-2xl flex-col items-center justify-center px-4 py-24 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/3 mx-auto h-[520px] max-w-3xl rounded-full opacity-50 blur-3xl"
        style={{ background: "radial-gradient(ellipse, oklch(0.85 0.22 152 / 0.22), oklch(0.72 0.16 250 / 0.1) 50%, transparent 70%)" }}
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-8 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
      >
        AXON · REVENUE INFRASTRUCTURE · ECONOMIC EQUATION
      </motion.div>

      <div className="relative w-full space-y-4">
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
            p:     "text-[13px] sm:text-[14px] text-muted-foreground",
            big:   "text-[18px] sm:text-[22px] font-bold text-foreground",
            good:  "text-[13px] sm:text-[14px] text-signal font-mono",
            bad:   "text-[14px] sm:text-[16px] font-mono text-left",
            amber: "text-[16px] sm:text-[20px] font-bold",
            label: "text-[13px] sm:text-[15px] text-muted-foreground font-mono uppercase tracking-[0.15em]",
            delta: "text-[13px] sm:text-[15px] font-mono font-bold px-4 py-2 rounded-lg",
          }[l.type];

          const color =
            l.type === "bad"   ? "rgba(240,88,112,0.9)"
            : l.type === "amber" ? "#f0a040"
            : l.type === "delta" ? "#c8f060"
            : undefined;

          const bg = l.type === "delta"
            ? "rgba(200,240,96,0.06)"
            : undefined;

          const border = l.type === "delta"
            ? "1px solid rgba(200,240,96,0.2)"
            : undefined;

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: show ? 1 : 0, y: show ? 0 : 12 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className={`font-mono ${styles}`}
              style={{ color, background: bg, border }}
            >
              {l.text}
            </motion.div>
          );
        })}

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: step >= lines.length ? 1 : 0, scale: step >= lines.length ? 1 : 0.9 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative pt-4"
        >
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            AXON · estimated annual infrastructure saving
          </div>
          <motion.div className="text-gradient-signal font-mono text-[clamp(48px,12vw,96px)] font-extrabold leading-none tracking-tight">
            {displayed}
          </motion.div>
          <div className="mt-2 font-mono text-[12px]" style={{ color: "#4a6268" }}>
            3.6× ROI · Year 1 · Pipeline predictable or full refund
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 text-left">
            <div className="glass rounded-xl p-3">
              <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                Without infrastructure · illustrative
              </div>
              <div className="font-mono text-sm font-bold text-muted-foreground">
                Flat, unpredictable pipeline
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
                    <Area type="monotone" dataKey="v" stroke="oklch(0.62 0.03 250)" strokeWidth={1.4} fill="url(#gFlat)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="glass-strong rounded-xl p-3 ring-signal">
              <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-signal">
                With AXON · illustrative
              </div>
              <div className="font-mono text-sm font-bold text-signal">
                Compounding, signal-driven pipeline
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
                    <Area type="monotone" dataKey="v" stroke="oklch(0.85 0.22 152)" strokeWidth={1.8} fill="url(#gLift)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="mt-3 font-mono text-[11px] text-muted-foreground">
            Illustrative example, not derived from {company || "your"} actual financials ·{" "}
            {scoutData?.score_num != null && (
              <span className="text-signal">{scoutData.score_num}% real fit score</span>
            )}
          </div>

          {/* ROI Calculator */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: calcVisible ? 1 : 0, y: calcVisible ? 0 : 20 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 rounded-xl border text-left"
            style={{ borderColor: "#1a2a1a", background: "#080e08" }}
          >
            <div className="border-b px-5 py-3" style={{ borderColor: "#1a2a1a" }}>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-signal">
                ⚡ Calculate your ROI — use your real numbers
              </div>
              <div className="mt-0.5 font-mono text-[11px]" style={{ color: "#4a6268" }}>
                Adjust the sliders · see what AXON saves your company
              </div>
            </div>

            <div className="px-5 py-4 space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-mono text-[11px] uppercase tracking-[0.12em]" style={{ color: "#8a9a8a" }}>
                    SDRs / sales reps
                  </label>
                  <span className="font-mono text-[13px] font-bold text-signal">{sdrs}</span>
                </div>
                <input
                  type="range" min={0} max={5} step={1} value={sdrs}
                  onChange={(e) => setSdrs(Number(e.target.value))}
                  className="w-full accent-signal h-1 rounded-full cursor-pointer"
                  style={{ background: `linear-gradient(to right, oklch(0.85 0.22 152) ${sdrs / 5 * 100}%, #1a2a1a ${sdrs / 5 * 100}%)` }}
                />
                <div className="flex justify-between font-mono text-[9px] mt-1" style={{ color: "#3a4a3a" }}>
                  <span>0</span><span>5</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-mono text-[11px] uppercase tracking-[0.12em]" style={{ color: "#8a9a8a" }}>
                    Agency retainer / month
                  </label>
                  <span className="font-mono text-[13px] font-bold text-signal">${agencyK}k</span>
                </div>
                <input
                  type="range" min={0} max={10} step={1} value={agencyK}
                  onChange={(e) => setAgencyK(Number(e.target.value))}
                  className="w-full accent-signal h-1 rounded-full cursor-pointer"
                  style={{ background: `linear-gradient(to right, oklch(0.85 0.22 152) ${agencyK / 10 * 100}%, #1a2a1a ${agencyK / 10 * 100}%)` }}
                />
                <div className="flex justify-between font-mono text-[9px] mt-1" style={{ color: "#3a4a3a" }}>
                  <span>$0</span><span>$10k</span>
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-2" style={{ borderColor: "#1a2a1a", background: "#050a05" }}>
                <div className="font-mono text-[10px] uppercase tracking-[0.15em] mb-3" style={{ color: "#4a6268" }}>
                  Your current annual cost
                </div>
                {[
                  { label: `${sdrs} SDR${sdrs !== 1 ? "s" : ""} fully loaded`, value: sdrCost, show: sdrs > 0 },
                  { label: `Agency $${agencyK}k/mo × 12`, value: agencyCost, show: agencyK > 0 },
                  { label: "Tool stack (Apollo, Clay, etc)", value: toolCost, show: true },
                  { label: "Founder time (15h/wk × $200/h)", value: founderCost, show: true },
                ].filter(r => r.show).map((row) => (
                  <div key={row.label} className="flex items-center justify-between font-mono text-[11px]">
                    <span style={{ color: "#6a7a6a" }}>{row.label}</span>
                    <span style={{ color: "rgba(240,88,112,0.8)" }}>${row.value.toLocaleString()}</span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2" style={{ borderColor: "#1a2a1a" }}>
                  <div className="flex items-center justify-between font-mono text-[13px] font-bold">
                    <span style={{ color: "#8a9a8a" }}>Total wasted/yr</span>
                    <span style={{ color: "#f05870" }}>${totalWithout.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3 text-center" style={{ borderColor: "#2a1a1a", background: "#0a0505" }}>
                  <div className="font-mono text-[9px] uppercase tracking-[0.12em] mb-1" style={{ color: "#6a3a3a" }}>
                    Without AXON
                  </div>
                  <div className="font-mono text-[20px] font-bold" style={{ color: "#f05870" }}>
                    ${totalWithout.toLocaleString()}
                  </div>
                  <div className="font-mono text-[9px] mt-1" style={{ color: "#4a2a2a" }}>
                    /yr · unpredictable growth
                  </div>
                </div>
                <div className="rounded-lg border p-3 text-center" style={{ borderColor: "#1a2a1a", background: "#050a05" }}>
                  <div className="font-mono text-[9px] uppercase tracking-[0.12em] mb-1 text-signal">
                    With AXON
                  </div>
                  <div className="font-mono text-[20px] font-bold text-signal">
                    ${axonCost.toLocaleString()}
                  </div>
                  <div className="font-mono text-[9px] mt-1" style={{ color: "#2a4a2a" }}>
                    /yr · infrastructure permanent
                  </div>
                </div>
              </div>

              <div className="rounded-lg p-4 text-center" style={{ background: "rgba(200,240,96,0.04)", border: "1px solid rgba(200,240,96,0.2)" }}>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] mb-1" style={{ color: "#8a9a6a" }}>
                  Your ROI · Year 1
                </div>
                <div className="font-mono text-[40px] font-extrabold" style={{ color: "#c8f060" }}>
                  {roi}×
                </div>
                <div className="font-mono text-[11px] mt-1" style={{ color: "#6a7a5a" }}>
                  You save ${saving > 0 ? saving.toLocaleString() : "0"} in year 1 alone
                </div>
                {saving > 0 && (
                  <div className="mt-2 font-mono text-[10px]" style={{ color: "#4a5a4a" }}>
                    AXON pays for itself in {Math.ceil(axonCost / (saving / 12))} months
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Deployment model */}
          <div className="mt-6 border p-4 text-left" style={{ borderColor: "#1a1a1a", background: "#0a0a0a" }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] mb-3" style={{ color: "#4a6268" }}>
              AXON · deployment model
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Setup fee", value: "$15k–50k", sub: "One-time infrastructure deployment" },
                { label: "Monthly retainer", value: "$2k–5k", sub: "Signal intelligence + memory + support" },
                { label: "Your data", value: "Stays yours", sub: "Private infra · no third-party sharing" },
                { label: "Max clients/month", value: "10", sub: "Not marketing · operational reality" },
              ].map((item) => (
                <div key={item.label} className="border p-3" style={{ borderColor: "#1a1a1a" }}>
                  <div className="font-mono text-[9px] uppercase tracking-[0.15em]" style={{ color: "#4a6268" }}>
                    {item.label}
                  </div>
                  <div className="mt-1 font-mono text-[16px] font-bold text-signal">{item.value}</div>
                  <div className="mt-1 font-mono text-[10px]" style={{ color: "#4a6268" }}>{item.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Scarcity + CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: calcVisible ? 1 : 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-6"
          >
            <div className="mb-4 rounded-lg border px-4 py-3 flex items-center justify-between" style={{ borderColor: "rgba(200,240,96,0.2)", background: "rgba(200,240,96,0.03)" }}>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[13px]" style={{ color: "#c8f060" }}>⚡</span>
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: "#c8f060" }}>
                  3 deployment slots remaining this month
                </span>
              </div>
              <span className="font-mono text-[10px]" style={{ color: "#4a6268" }}>
                max 10/month · by application only
              </span>
            </div>

            <a href="https://tally.so/r/kdkXGd" target="_blank" rel="noopener noreferrer" className="group relative inline-flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-signal px-7 py-4 font-display text-base font-bold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5">
              <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              Apply for Infrastructure Deployment
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </a>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                { stat: "48h", label: "Deploy time" },
                { stat: "90d", label: "Results or refund" },
                { stat: "3.6×", label: "Avg ROI year 1" },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border px-2 py-2" style={{ borderColor: "#1a1a1a" }}>
                  <div className="font-mono text-[14px] font-bold text-signal">{s.stat}</div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.1em]" style={{ color: "#4a6268" }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.15em] text-center" style={{ color: "#4a6268" }}>
              Not an AI SDR · Revenue Intelligence Infrastructure · Max 10 deployments/month
            </div>

            <button onClick={onRestart} className="mt-4 w-full font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors">
              ← run again with another company
            </button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
