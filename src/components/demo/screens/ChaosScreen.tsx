import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface Props {
  onSubmit: (company: string) => void;
}

const notifications = [
  { time: "09:14", text: "Agency delivered 3 leads this month. Target was 40.", tone: "danger" },
  { time: "10:02", text: "SDR #2 resigned. €80k pipeline at risk.", tone: "danger" },
  { time: "10:47", text: "Email sequence flagged as spam. 340 emails undelivered.", tone: "warn" },
  { time: "11:30", text: "Weekly growth meeting: 2 hours, same conclusion as last week.", tone: "warn" },
  { time: "12:08", text: "HubSpot sync failed. 1.2k contacts out of date.", tone: "danger" },
  { time: "13:21", text: "Investor update due in 3 days. No new pipeline to report.", tone: "danger" },
  { time: "14:05", text: "Cold call conversion: 0.4%. Down from 1.1% last quarter.", tone: "danger" },
  { time: "15:44", text: "Marketing report contradicts sales report. Again.", tone: "warn" },
  { time: "16:12", text: "Board asks: 'What's our CAC payback?' — no one knows.", tone: "danger" },
];

const slack = [
  { who: "Marc · CEO", color: "text-warn", msg: "where are we on the Q pipeline??" },
  { who: "Sara · Head of Sales", color: "text-foreground/70", msg: "agency hasn't replied in 4 days" },
  { who: "Tom · SDR", color: "text-foreground/70", msg: "the tool stack is fighting me again" },
  { who: "Marc · CEO", color: "text-warn", msg: "we need a number by Friday" },
  { who: "Lina · Marketing", color: "text-foreground/70", msg: "MQLs are up but sales says they're junk" },
  { who: "Sara · Head of Sales", color: "text-foreground/70", msg: "they ARE junk" },
  { who: "Marc · CEO", color: "text-danger", msg: "this can't keep happening" },
];

export function ChaosScreen({ onSubmit }: Props) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => inputRef.current?.focus(), 1800);
    return () => window.clearTimeout(t);
  }, []);

  const submit = (v: string) => {
    const t = v.trim();
    if (!t) return;
    onSubmit(t);
  };

  return (
    <div className="relative min-h-svh overflow-hidden px-4 pb-32 pt-24">
      {/* Red tint overlay + vignette */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, transparent 30%, oklch(0.18 0.12 25 / 0.55) 90%), radial-gradient(800px 500px at 20% 10%, oklch(0.7 0.22 25 / 0.18), transparent 60%), radial-gradient(700px 400px at 90% 90%, oklch(0.82 0.18 75 / 0.12), transparent 60%)",
        }}
      />
      {/* Subtle CRT scanline */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, oklch(0 0 0) 0px, oklch(0 0 0) 1px, transparent 1px, transparent 3px)",
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6 flex items-center justify-between"
        >
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-danger">
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger/70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-danger" />
            </span>
            Your current reality
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Q4 · week 11 · status: <span className="text-danger">degrading</span>
          </div>
        </motion.div>

        <h1 className="mb-1 font-display text-[clamp(28px,4.5vw,42px)] font-extrabold leading-tight tracking-tight text-foreground/90">
          You're running revenue <span className="text-danger">on duct tape.</span>
        </h1>
        <p className="mb-8 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
          Six tools. Three contractors. An agency that ghosts. A spreadsheet pretending to be a system.
          Below is your last 24 hours.
        </p>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          {/* LEFT — Broken metrics + Slack chaos */}
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <BrokenMetric
                label="CAC"
                value="€847"
                delta="↑ 34%"
                hint="vs 60d"
                pulse
              />
              <BrokenMetric
                label="Pipeline"
                value="€12.4k"
                delta="↓ 41%"
                hint="vs target"
              />
              <BrokenMetric
                label="Reply rate"
                value="2.1%"
                delta="↓ 0.8%"
                hint="last sequence"
              />
            </div>

            <div className="rounded-xl border border-danger/25 bg-surface/70 p-4 backdrop-blur">
              <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                <span>#growth-emergency</span>
                <span className="text-danger">12 unread</span>
              </div>
              <ul className="space-y-1.5 font-mono text-[11px]">
                {slack.map((m, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.18 }}
                    className="flex gap-2"
                  >
                    <span className={`shrink-0 ${m.color}`}>{m.who}:</span>
                    <span className="text-foreground/70">{m.msg}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>

          {/* RIGHT — Auto-scrolling notification stream */}
          <div className="rounded-xl border border-danger/25 bg-surface/70 p-0 backdrop-blur">
            <div className="flex items-center justify-between border-b border-danger/20 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              <span>Incident feed</span>
              <span className="flex items-center gap-1.5 text-danger">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-danger" />
                live
              </span>
            </div>
            <div
              className="relative h-[340px] overflow-hidden px-4"
              style={{
                maskImage:
                  "linear-gradient(180deg, transparent 0, black 12%, black 88%, transparent 100%)",
              }}
            >
              <motion.ul
                className="space-y-2 py-4 font-mono text-[11px]"
                animate={{ y: [0, -280] }}
                transition={{
                  duration: 16,
                  repeat: Infinity,
                  ease: "linear",
                }}
              >
                {[...notifications, ...notifications].map((n, i) => (
                  <li
                    key={i}
                    className="flex gap-2 border-l-2 pl-2"
                    style={{
                      borderColor:
                        n.tone === "danger"
                          ? "oklch(0.7 0.22 25 / 0.7)"
                          : "oklch(0.82 0.18 75 / 0.7)",
                    }}
                  >
                    <span className="text-muted-foreground/60">{n.time}</span>
                    <span
                      className={
                        n.tone === "danger"
                          ? "text-danger/90"
                          : "text-warn/90"
                      }
                    >
                      {n.text}
                    </span>
                  </li>
                ))}
              </motion.ul>
            </div>
          </div>
        </div>
      </div>

      {/* INPUT at bottom center */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4, duration: 0.7 }}
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
        className="fixed inset-x-0 bottom-10 z-20 mx-auto flex w-full max-w-xl items-center gap-3 rounded-xl border border-signal/40 bg-background/85 px-5 py-4 backdrop-blur-xl"
        style={{
          boxShadow:
            "0 0 0 1px oklch(0.85 0.22 152 / 0.15), 0 0 40px -6px oklch(0.85 0.22 152 / 0.35), 0 20px 60px -10px oklch(0 0 0 / 0.6)",
        }}
      >
        <motion.span
          className="font-mono text-sm text-signal"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        >
          ▸
        </motion.span>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Describe your ideal customer and growth goal..."
          autoComplete="off"
          spellCheck={false}
          className="flex-1 bg-transparent font-mono text-[14px] text-foreground caret-signal outline-none placeholder:text-muted-foreground/60"
        />
        <span className="rounded-md border border-border px-2 py-1 font-mono text-[10px] text-muted-foreground">
          ↵ Activate
        </span>
      </motion.form>
    </div>
  );
}

function BrokenMetric({
  label,
  value,
  delta,
  hint,
  pulse,
}: {
  label: string;
  value: string;
  delta: string;
  hint: string;
  pulse?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-xl border border-danger/30 bg-surface/70 p-3 backdrop-blur"
      style={{
        boxShadow: pulse
          ? "inset 0 0 30px -8px oklch(0.7 0.22 25 / 0.35)"
          : undefined,
      }}
    >
      {pulse && (
        <motion.div
          aria-hidden
          className="absolute inset-0"
          animate={{ opacity: [0.0, 0.18, 0.0] }}
          transition={{ duration: 2.2, repeat: Infinity }}
          style={{ background: "oklch(0.7 0.22 25 / 1)" }}
        />
      )}
      <div className="relative">
        <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground/80">
          {label}
        </div>
        <div className="mt-1 font-display text-[22px] font-bold leading-none text-danger">
          {value}
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="font-mono text-[10px] text-danger/90">{delta}</span>
          <span className="font-mono text-[9px] text-muted-foreground/70">
            {hint}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
