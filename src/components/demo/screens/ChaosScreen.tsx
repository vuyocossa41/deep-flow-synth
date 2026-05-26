import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface Props {
  onActivate: (company: string) => void;
  /** Backwards compat with previous prop name */
  onSubmit?: (company: string) => void;
}

interface Incident {
  id: number;
  tone: "danger" | "warn";
  text: string;
}

const BANNER_TEXT =
  "Right now, your revenue depends on 3 humans, 1 agency, and hope.\nRemove any one of them — pipeline collapses.";

const STREAM: Omit<Incident, "id">[] = [
  {
    tone: "danger",
    text: "Pipeline unpredictability is forcing reactive selling for the 4th month in a row.",
  },
  {
    tone: "danger",
    text: "Agency invoice: $4,200. Qualified acquisition signals delivered: 2. Cost per signal: $2,100.",
  },
  {
    tone: "danger",
    text: "SDR pipeline coverage: 34% of target. Board meeting in 6 days.",
  },
  {
    tone: "warn",
    text: "Founder spent 4.5h this week on strategic intervention that generated 0 responses.",
  },
  {
    tone: "danger",
    text: "CAC increased 41% YoY. Growth team has no explanation.",
  },
  {
    tone: "warn",
    text: "3 deals lost to competitor who moved faster. No early warning system in place.",
  },
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
    value: "23h/week",
    label: "spent on revenue operations",
    sub: "Time that should go to product, vision, and growth strategy.",
    width: 31,
  },
] as const;

const TYPEWRITER_MS = 2000;
const METRICS_DELAY_MS = 2000;
const STREAM_DELAY_MS = 3000;
const COST_TARGET = 142_000;
const COST_DURATION_MS = 4000;

export function ChaosScreen({ onActivate, onSubmit }: Props) {
  const fire = onActivate ?? onSubmit ?? (() => {});
  const [value, setValue] = useState("");
  const [bannerText, setBannerText] = useState("");
  const [showMetrics, setShowMetrics] = useState(false);
  const [showStream, setShowStream] = useState(false);
  const [costDisplay, setCostDisplay] = useState(0);
  const [items, setItems] = useState<Incident[]>([]);
  const counter = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const prefersReduced = useReducedMotion();

  // Typewriter banner — always runs (no skip)
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

  // Cost counter — starts when metrics appear
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

  // Incident stream — starts 3s after mount
  useEffect(() => {
    if (!showStream) return;
    setItems(
      STREAM.slice(0, 2).map((s) => ({
        id: counter.current++,
        ...s,
      })),
    );
    const i = window.setInterval(() => {
      setItems((prev) => {
        const next = [
          ...prev,
          { id: counter.current++, ...STREAM[counter.current % STREAM.length] },
        ];
        return next.slice(-5);
      });
    }, 2000);
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
    fire(t);
  };

  return (
    <div
      className="relative min-h-svh overflow-hidden px-4 pb-40 pt-14"
      style={{ background: "#040404" }}
    >
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{ background: "rgba(255,40,40,0.05)" }}
      />
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
          <div
            className="font-mono text-[9px] uppercase tracking-[0.18em]"
            style={{ color: "#4a4845" }}
          >
            estimated annual cost of current setup
          </div>
          <div
            className="font-mono text-[22px] font-bold tabular-nums"
            style={{ color: "#f05870" }}
          >
            €{costDisplay.toLocaleString("en-US")}
            {costDisplay >= COST_TARGET * 0.95 && (
              <span className="ml-1 text-[14px] font-normal" style={{ color: "#4a4845" }}>
                (~$155k)
              </span>
            )}
          </div>
        </motion.div>
      )}

      <div className="relative z-10 mx-auto w-full max-w-6xl">
        {/* Opening banner — typewriter */}
        <div
          className="mb-8 w-full border-b pb-6 font-mono text-[clamp(13px,2vw,15px)] leading-relaxed whitespace-pre-wrap"
          style={{ borderColor: "#1a1a1a", color: "#dedad4" }}
        >
          {bannerText}
          {bannerText.length < BANNER_TEXT.length && (
            <span className="ml-0.5 animate-caret">_</span>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.22em]"
          style={{ color: "#f05870" }}
        >
          <span className="relative inline-flex h-2 w-2">
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full"
              style={{ background: "rgba(240,88,112,0.6)" }}
            />
            <span
              className="relative inline-flex h-2 w-2 rounded-full"
              style={{ background: "#f05870" }}
            />
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
                  className="pt-2 font-display text-[clamp(26px,4vw,40px)] font-extrabold leading-[1.05] tracking-tight"
                  style={{ color: "#dedad4" }}
                >
                  Every month without a system is a month your competitor gains ground.
                </h1>
                <p
                  className="max-w-xl text-[13px] leading-relaxed"
                  style={{ color: "#4a4845" }}
                >
                  US and UK founders are running revenue on headcount, agencies, and hope.
                  AXON replaces that with autonomous growth infrastructure.
                </p>
              </motion.div>
            )}
          </div>

          <AnimatePresence>
            {showStream && (
              <motion.div
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden border"
                style={{
                  background: "#0e0e0e",
                  borderColor: "#1a1a1a",
                }}
              >
                <div
                  className="flex items-center justify-between border-b px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em]"
                  style={{ borderColor: "#1a1a1a", color: "#4a4845" }}
                >
                  <span>infrastructure alerts</span>
                  <span className="flex items-center gap-1.5" style={{ color: "#f05870" }}>
                    <span
                      className="h-1.5 w-1.5 animate-pulse rounded-full"
                      style={{ background: "#f05870" }}
                    />
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
                        <span
                          style={{
                            color:
                              n.tone === "danger"
                                ? "rgba(240,88,112,0.9)"
                                : "rgba(240,160,64,0.9)",
                          }}
                        >
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

      <motion.form
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: showStream ? 1 : 0, y: showStream ? 0 : 18 }}
        transition={{ duration: 0.6 }}
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
        className="fixed inset-x-0 bottom-10 z-20 mx-auto w-full max-w-2xl px-4"
      >
        <div
          className="mb-2 text-center font-mono text-[11px] uppercase tracking-[0.22em]"
          style={{ color: "#4a4845" }}
        >
          diagnose your pipeline infrastructure
        </div>
        <div
          className="flex items-center gap-2 border px-3 py-2.5"
          style={{
            background: "#0e0e0e",
            borderColor: "#1a1a1a",
          }}
        >
          <span className="font-mono text-sm" style={{ color: "#c8f060" }}>
            ▸
          </span>
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Enter your company domain..."
            autoComplete="off"
            spellCheck={false}
            className="flex-1 bg-transparent font-mono text-[13px] outline-none"
            style={{ color: "#dedad4" }}
          />
          <button
            type="submit"
            disabled={!value.trim()}
            className="shrink-0 px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
            style={{ background: "#c8f060", color: "#040404" }}
          >
            DIAGNOSE MY PIPELINE →
          </button>
        </div>
      </motion.form>
    </div>
  );
}

function BrokenMetric({
  title,
  value,
  label,
  sub,
  width,
  reduced,
}: {
  title: string;
  value: string;
  label: string;
  sub: string;
  width: number;
  reduced: boolean;
}) {
  return (
    <motion.div
      animate={
        reduced
          ? {}
          : { borderColor: ["#f05870", "rgba(240,88,112,0.4)", "#f05870"] }
      }
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      className="border p-3"
      style={{
        background: "#0e0e0e",
        borderColor: "#f05870",
      }}
    >
      <div
        className="font-mono text-[8px] uppercase tracking-[0.2em]"
        style={{ color: "#f05870" }}
      >
        {title}
      </div>
      <div
        className="mt-1 font-display text-[24px] font-extrabold leading-none"
        style={{ color: "#dedad4" }}
      >
        {value}
      </div>
      <div
        className="mt-1 font-mono text-[10px] leading-snug"
        style={{ color: "#dedad4" }}
      >
        {label}
      </div>
      <p className="mt-2 text-[10px] leading-relaxed" style={{ color: "#4a4845" }}>
        {sub}
      </p>
      <div className="mt-2 h-[2px] w-full" style={{ background: "#1a1a1a" }}>
        <div
          className="h-full"
          style={{ width: `${width}%`, background: "#f05870" }}
        />
      </div>
    </motion.div>
  );
}
