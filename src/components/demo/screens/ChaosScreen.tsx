import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface Props {
  onActivate: (company: string) => void;
  onSubmit?: (company: string) => void;
}

interface Incident {
  id: number;
  tone: "danger" | "warn";
  text: string;
}

const BANNER_TEXT =
  "78% of founders with revenue as priority #1\nhave no system to execute it.\nThe problem is not lack of SDR.\nIt is absence of a revenue operating system.";

const STREAM: Omit<Incident, "id">[] = [
  { tone: "danger", text: "Agency invoice: $9,600. Qualified signals delivered: 6. Cost per signal: $4,800." },
  { tone: "danger", text: "CAC increased 66% YoY. GTM team has no systemic explanation." },
  { tone: "danger", text: "6 deals lost to competitor who acted on intent signal first. No early warning system in use." },
  { tone: "warn",   text: "Founder spent 40h this week on revenue operations. Qualified meetings generated: 0." },
  { tone: "danger", text: "SDR fully loaded cost: $130k/yr + 9-month ramp. Pipeline coverage: 31% of target." },
  { tone: "warn",   text: "Sales reps spending 28% of time actually selling. 72% in admin, meetings, manual research." },
  { tone: "danger", text: "AI SDR tools deployed 6 months ago. Response rates collapsed to 0.4%. Clients left." },
  { tone: "warn",   text: "Opportunity window: 11 days before competitor acts. No detection system in place." },
];

const METRICS = [
  {
    title: "REVENUE INSTABILITY",
    value: "€0",
    label: "predictable pipeline this month",
    sub: "Growth depends on manual outbound and agencies — creating unstable revenue every 30 days",
    width: 8,
  },
  {
    title: "OPERATIONAL DEPENDENCY",
    value: "3 humans",
    label: "required to generate 1 qualified meeting",
    sub: "SDR + agency + founder time. Remove any one — pipeline collapses.",
    width: 19,
  },
  {
    title: "FOUNDER TIME LOST",
    value: "40h/week",
    label: "spent on revenue operations",
    sub: "Time that should go to product, vision, and strategic decisions.",
    width: 31,
  },
] as const;

const TYPEWRITER_MS = 2400;
const METRICS_DELAY_MS = 2000;
const STREAM_DELAY_MS = 3000;
const COST_TARGET = 254_000;
const COST_DURATION_MS = 4000;

// O que acontece depois de submeter — sequência de 3 passos visíveis
const DEPLOY_STEPS = [
  "Scanning public signal footprint...",
  "Mapping revenue infrastructure gaps...",
  "Intelligence layer ready in 47 seconds.",
];

export function ChaosScreen({ onActivate, onSubmit }: Props) {
  const fire = onActivate ?? onSubmit ?? (() => {});
  const [value, setValue] = useState("");
  const [bannerText, setBannerText] = useState("");
  const [showMetrics, setShowMetrics] = useState(false);
  const [showStream, setShowStream] = useState(false);
  const [costDisplay, setCostDisplay] = useState(0);
  const [items, setItems] = useState<Incident[]>([]);
  const [deployStep, setDeployStep] = useState<number | null>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const counter = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const prefersReduced = useReducedMotion();

  // Typewriter banner
  useEffect(() => {
    const total = BANNER_TEXT.length;
    const step = TYPEWRITER_MS / total;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setBannerText(BANNER_TEXT.slice(0, i));
      if (i >= total) window.clearInterval(id);
    }, step);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setShowMetrics(true), METRICS_DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setShowStream(true), STREAM_DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  // Cost counter
  useEffect(() => {
    if (!showMetrics) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / COST_DURATION_MS);
      const eased = 1 - (1 - t) ** 3;
      setCostDisplay(Math.round(COST_TARGET * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [showMetrics]);

  // Incident stream
  useEffect(() => {
    if (!showStream) return;
    setItems(STREAM.slice(0, 2).map((s) => ({ id: counter.current++, ...s })));
    const i = window.setInterval(() => {
      setItems((prev) => {
        const next = [
          ...prev,
          { id: counter.current++, ...STREAM[counter.current % STREAM.length] },
        ];
        return next.slice(-5);
      });
    }, 2200);
    return () => window.clearInterval(i);
  }, [showStream]);

  useEffect(() => {
    if (!showStream) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 800);
    return () => window.clearTimeout(t);
  }, [showStream]);

  const submit = (v: string) => {
    const t = v.trim();
    if (!t) return;
    // Mostra sequência de deploy antes de activar
    setDeployStep(0);
    let step = 0;
    const iv = window.setInterval(() => {
      step += 1;
      if (step >= DEPLOY_STEPS.length) {
        window.clearInterval(iv);
        fire(t);
      } else {
        setDeployStep(step);
      }
    }, 600);
  };

  return (
    <div
      className="relative min-h-svh overflow-hidden px-4 pb-40 pt-14"
      style={{ background: "#040404" }}
    >
      {/* Red ambient */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{ background: "rgba(255,40,40,0.05)" }}
      />
      {/* Scanlines */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, #000 0px, #000 1px, transparent 1px, transparent 3px)",
        }}
      />

      {/* Cost counter — top right */}
      {showMetrics && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="fixed right-4 top-12 z-20 text-right"
        >
          <div className="font-mono text-[9px] uppercase tracking-[0.18em]" style={{ color: "#4a4845" }}>
            estimated annual cost of current setup
          </div>
          <div className="font-mono text-[22px] font-bold tabular-nums" style={{ color: "#f05870" }}>
            ${costDisplay.toLocaleString("en-US")}
            {costDisplay >= COST_TARGET * 0.95 && (
              <span className="ml-1 text-[14px] font-normal" style={{ color: "#4a4845" }}>/yr</span>
            )}
          </div>
          {costDisplay >= COST_TARGET * 0.95 && (
            <div className="font-mono text-[10px]" style={{ color: "#4a4845" }}>
              SDRs + agency + stack + founder hours
            </div>
          )}
        </motion.div>
      )}

      <div className="relative z-10 mx-auto w-full max-w-6xl">

        {/* AXON label */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="mb-6 font-mono text-[10px] uppercase tracking-[0.3em]"
          style={{ color: "#4a4845" }}
        >
          AXON · REVENUE INTELLIGENCE INFRASTRUCTURE · MARKET DIAGNOSIS 2026
        </motion.div>

        {/* Opening banner — typewriter */}
        <div
          className="mb-8 w-full border-b pb-6 font-mono text-[clamp(13px,2vw,16px)] leading-relaxed whitespace-pre-wrap"
          style={{ borderColor: "#1a1a1a", color: "#dedad4" }}
        >
          {bannerText}
          {bannerText.length < BANNER_TEXT.length && (
            <span className="ml-0.5 animate-caret">_</span>
          )}
        </div>

        {/* Stats row */}
        {showMetrics && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            {[
              { value: "$262",    label: "cost per lead · human SDR" },
              { value: "28%",     label: "of sales rep time actually selling" },
              { value: "$130k",   label: "fully loaded cost · 1 SDR/yr" },
              { value: "11 days", label: "avg opportunity window before competitor acts" },
            ].map((s) => (
              <div key={s.label} className="border p-3" style={{ background: "#0e0e0e", borderColor: "#1a1a1a" }}>
                <div className="font-mono text-[20px] font-bold tabular-nums" style={{ color: "#f05870" }}>
                  {s.value}
                </div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em]" style={{ color: "#4a4845" }}>
                  {s.label}
                </div>
              </div>
            ))}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.22em]"
          style={{ color: "#f05870" }}
        >
          <span className="relative inline-flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full" style={{ background: "rgba(240,88,112,0.6)" }} />
            <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: "#f05870" }} />
          </span>
          your current reality
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
          <div className="space-y-4">
            <AnimatePresence>
              {showMetrics && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  className="grid grid-cols-1 gap-3 sm:grid-cols-3"
                >
                  {METRICS.map((m) => (
                    <BrokenMetric
                      key={m.title}
                      title={m.title}
                      value={m.value}
                      label={m.label}
                      sub={m.sub}
                      width={m.width}
                      reduced={!!prefersReduced}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {showMetrics && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.55 }}
              >
                <h1
                  className="pt-2 font-display text-[clamp(22px,3.5vw,36px)] font-extrabold leading-[1.1] tracking-tight"
                  style={{ color: "#dedad4" }}
                >
                  AI SDRs failed. Human SDRs don't scale.<br />
                  <span style={{ color: "#f05870" }}>Revenue infrastructure is the only answer.</span>
                </h1>
                <p className="mt-3 max-w-xl font-mono text-[12px] leading-relaxed" style={{ color: "#4a4845" }}>
                  11x.ai raised $74M from a16z and lost 70–80% of clients in months.
                  Autonomous AI SDR = spam without context, timing, or memory.
                  The winner is intelligence infrastructure with human control.
                </p>
                <p className="mt-2 max-w-xl font-mono text-[12px] leading-relaxed" style={{ color: "#4a4845" }}>
                  AXON is not an AI SDR. AXON is Revenue Intelligence Infrastructure —
                  the operating system that turns revenue from a human operation
                  into autonomous infrastructure.
                </p>
              </motion.div>
            )}
          </div>

          {/* Alert stream */}
          <AnimatePresence>
            {showStream && (
              <motion.div
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden border"
                style={{ background: "#0e0e0e", borderColor: "#1a1a1a" }}
              >
                <div
                  className="flex items-center justify-between border-b px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em]"
                  style={{ borderColor: "#1a1a1a", color: "#4a4845" }}
                >
                  <span>infrastructure failure alerts</span>
                  <span className="flex items-center gap-1.5" style={{ color: "#f05870" }}>
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "#f05870" }} />
                    live
                  </span>
                </div>
                <ul className="flex h-[300px] flex-col justify-end gap-2 px-4 py-3 font-mono text-[11px]">
                  <AnimatePresence initial={false}>
                    {items.map((n) => (
                      <motion.li
                        key={n.id}
                        layout
                        initial={{ opacity: 0, x: 24, height: 0 }}
                        animate={{ opacity: 1, x: 0, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        className="flex items-start gap-2"
                      >
                        <span className="shrink-0" aria-hidden>
                          {n.tone === "danger" ? "🔴" : "🟡"}
                        </span>
                        <span style={{ color: n.tone === "danger" ? "rgba(240,88,112,0.9)" : "rgba(240,160,64,0.9)" }}>
                          {n.text}
                        </span>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── INPUT FIELD — redesenhado ── */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: showStream ? 1 : 0, y: showStream ? 0 : 18 }}
        transition={{ duration: 0.6 }}
        className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-2xl px-4 pb-6"
      >
        {/* Contexto — o que vai acontecer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-3 rounded-lg border px-4 py-3"
          style={{ background: "rgba(200,240,96,0.04)", borderColor: "rgba(200,240,96,0.15)" }}
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 font-mono text-[16px]" style={{ color: "#c8f060" }}>⚡</span>
            <div>
              <div className="font-mono text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#c8f060" }}>
                Deploy intelligence on your company
              </div>
              <div className="mt-1 font-mono text-[11px] leading-relaxed" style={{ color: "#6a6860" }}>
                AXON scans your signal footprint in 47 seconds —
                hiring intent · funding triggers · competitor moves · churn risk.
                No integration required.
              </div>
            </div>
          </div>
        </motion.div>

        {/* Input form */}
        <form onSubmit={(e) => { e.preventDefault(); submit(value); }}>
          <motion.div
            animate={
              inputFocused
                ? { borderColor: "rgba(200,240,96,0.6)", boxShadow: "0 0 0 1px rgba(200,240,96,0.2)" }
                : { borderColor: "#2a2a2a", boxShadow: "none" }
            }
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 border px-3 py-2.5"
            style={{ background: "#0e0e0e" }}
          >
            <span className="font-mono text-sm" style={{ color: "#c8f060" }}>▸</span>
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder="yourdomain.com or company name..."
              autoComplete="off"
              spellCheck={false}
              className="flex-1 bg-transparent font-mono text-[13px] outline-none placeholder:text-[#2a2a2a]"
              style={{ color: "#dedad4" }}
            />
            <button
              type="submit"
              disabled={!value.trim() || deployStep !== null}
              className="shrink-0 px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] transition-all disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: "#c8f060", color: "#040404" }}
            >
              {deployStep !== null ? "DEPLOYING..." : "DEPLOY INTELLIGENCE →"}
            </button>
          </motion.div>

          {/* Deploy steps — feedback imediato */}
          <AnimatePresence>
            {deployStep !== null && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-2 space-y-1 px-1">
                  {DEPLOY_STEPS.map((step, i) => (
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: i <= deployStep ? 1 : 0.2, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-2 font-mono text-[11px]"
                      style={{ color: i <= deployStep ? "#c8f060" : "#2a2a2a" }}
                    >
                      <span>{i < deployStep ? "✓" : i === deployStep ? "›" : "·"}</span>
                      {step}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer tags */}
          {deployStep === null && (
            <div className="mt-2 flex items-center justify-between font-mono text-[10px]" style={{ color: "#2a2a2a" }}>
              <span>Not an AI SDR · Not automation · Revenue Intelligence Infrastructure</span>
              <span style={{ color: "#3a3a3a" }}>No integration required</span>
            </div>
          )}
        </form>
      </motion.div>
    </div>
  );
}

function BrokenMetric({
  title, value, label, sub, width, reduced,
}: {
  title: string; value: string; label: string; sub: string; width: number; reduced: boolean;
}) {
  return (
    <motion.div
      animate={reduced ? {} : { borderColor: ["#f05870", "rgba(240,88,112,0.4)", "#f05870"] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      className="border p-3"
      style={{ background: "#0e0e0e", borderColor: "#f05870" }}
    >
      <div className="font-mono text-[8px] uppercase tracking-[0.2em]" style={{ color: "#f05870" }}>
        {title}
      </div>
      <div className="mt-1 font-display text-[24px] font-extrabold leading-none" style={{ color: "#dedad4" }}>
        {value}
      </div>
      <div className="mt-1 font-mono text-[10px] leading-snug" style={{ color: "#dedad4" }}>
        {label}
      </div>
      <p className="mt-2 text-[10px] leading-relaxed" style={{ color: "#4a4845" }}>
        {sub}
      </p>
      <div className="mt-2 h-[2px] w-full" style={{ background: "#1a1a1a" }}>
        <div className="h-full" style={{ width: `${width}%`, background: "#f05870" }} />
      </div>
    </motion.div>
  );
}