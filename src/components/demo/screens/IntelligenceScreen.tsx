import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { ScoutResult } from "@/lib/scout";

interface Props {
  company: string;
  isLoading: boolean;
  scoutData: ScoutResult | null;
  onContinue?: () => void;
  /** Back-compat fallback; new flow uses { company, isLoading, scoutData } */
  data?: { company: string };
  onComplete?: () => void;
}

const TERMINAL_LINES = (company: string) => [
  `[FIRECRAWL] Reading ${company}...`,
  `[GROQ] Analysing content and signals...`,
  `[SCOUT] Calculating purchase propensity...`,
  `[WRITER] Generating personalised message...`,
];

export function IntelligenceScreen({
  company,
  isLoading,
  scoutData,
  onContinue,
  data,
  onComplete,
}: Props) {
  const co = company || data?.company || "Acme";
  const lines = TERMINAL_LINES(co);
  const [shown, setShown] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setShown(0);
    if (!isLoading) return;
    const timers: number[] = [];
    lines.forEach((_, i) => {
      timers.push(window.setTimeout(() => setShown((s) => Math.max(s, i + 1)), i * 300));
    });
    // loop until data arrives
    const loop = window.setInterval(() => {
      setShown((s) => (s >= lines.length ? lines.length : s));
    }, 300);
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.clearInterval(loop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, co]);

  return (
    <div ref={topRef} className="mx-auto w-full max-w-5xl px-4 pb-32 pt-28">
      <AnimatePresence mode="wait">
        {isLoading || !scoutData ? (
          <TerminalLoader key="loading" lines={lines.slice(0, shown)} />
        ) : (
          <Results
            key="results"
            company={co}
            scout={scoutData}
            onContinue={
              onContinue ??
              onComplete ??
              (() => topRef.current?.scrollIntoView({ behavior: "smooth" }))
            }
            scrollTop={() =>
              topRef.current?.scrollIntoView({ behavior: "smooth" })
            }
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────────────────────── terminal loader ───────────────────────── */

function TerminalLoader({ lines }: { lines: string[] }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="mx-auto max-w-xl border p-5 font-mono text-[12px]"
      style={{ background: "#0e0e0e", borderColor: "#1a1a1a" }}
    >
      <div
        className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em]"
        style={{ color: "#4a4845" }}
      >
        axon · live reasoning
      </div>
      <ul className="space-y-1.5">
        {lines.map((l, i) => (
          <motion.li
            key={l}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
            style={{ color: i === lines.length - 1 ? "#c8f060" : "#dedad4" }}
          >
            {l}
            {i === lines.length - 1 && (
              <span className="ml-1 animate-caret">_</span>
            )}
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}

/* ───────────────────────── results ───────────────────────── */

function Section({
  index,
  label,
  children,
}: {
  index: number;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {label && (
        <div
          className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em]"
          style={{ color: "#4a4845" }}
        >
          {label}
        </div>
      )}
      {children}
    </motion.section>
  );
}

function Results({
  company,
  scout,
  onContinue,
  scrollTop,
}: {
  company: string;
  scout: ScoutResult;
  onContinue: () => void;
  scrollTop: () => void;
}) {
  const [spend, setSpend] = useState(5000);
  const [copied, setCopied] = useState(false);
  const [showCalendly, setShowCalendly] = useState(false);

  const axonPrice = 1499;
  const savings = Math.max(0, spend - axonPrice);
  const annual = savings * 12;

  const scoreColor =
    scout.score === "HOT" ? "#c8f060" : scout.score === "WARM" ? "#f0a040" : "#4a4845";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(scout.message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* noop */
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-7"
    >
      {/* Section 1 — Company analysed */}
      <Section index={0} label="company analysed">
        <div
          className="border p-4"
          style={{ background: "#0e0e0e", borderColor: "#1a1a1a" }}
        >
          <div className="flex flex-wrap items-baseline gap-3">
            <div
              className="font-display text-[22px] font-extrabold tracking-tight"
              style={{ color: "#dedad4" }}
            >
              {scout.profile.name}
            </div>
            <span
              className="px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em]"
              style={{ background: "#1a1a1a", color: "#dedad4" }}
            >
              {scout.profile.stage}
            </span>
          </div>
          <div className="mt-1 text-[13px]" style={{ color: "#dedad4" }}>
            {scout.profile.product}
          </div>
          <div
            className="mt-2 font-mono text-[11px]"
            style={{ color: "#4a4845" }}
          >
            ICP · <span style={{ color: "#dedad4" }}>{scout.profile.icp}</span>
          </div>
        </div>
      </Section>

      {/* Section 2 — Signal detected */}
      <Section index={1} label="signal detected">
        <div
          className="border-l-2 p-4"
          style={{
            background: "rgba(240,160,64,0.06)",
            borderColor: "#f0a040",
          }}
        >
          <div
            className="font-mono text-[10px] uppercase tracking-[0.18em]"
            style={{ color: "#f0a040" }}
          >
            ◆ live trigger
          </div>
          <div className="mt-1 text-[14px]" style={{ color: "#dedad4" }}>
            {scout.profile.signals ||
              "No public signals — timing analysis in progress"}
          </div>
          {scout.profile.angle && (
            <div
              className="mt-2 font-mono text-[11px]"
              style={{ color: "#4a4845" }}
            >
              ▸ {scout.profile.angle}
            </div>
          )}
        </div>
      </Section>

      {/* Section 3 — Impossible moment */}
      <Section index={2} label="impossible moment">
        <div
          className="border-l-2 p-5"
          style={{
            background: "rgba(200,240,96,0.06)",
            borderColor: "#c8f060",
          }}
        >
          <div
            className="font-display text-[20px] font-bold leading-snug"
            style={{ color: "#dedad4" }}
          >
            Companies with this profile close{" "}
            <span style={{ color: "#c8f060" }}>3.2× faster</span> when contacted now.
          </div>
          <div className="mt-3 flex items-center gap-3">
            <span
              className="px-2 py-1 font-mono text-[11px] font-bold"
              style={{
                background: scoreColor,
                color: scout.score === "COLD" ? "#dedad4" : "#040404",
              }}
            >
              {scout.score}
            </span>
            <span
              className="font-mono text-[13px]"
              style={{ color: "#dedad4" }}
            >
              {scout.score_num}% purchase propensity
            </span>
          </div>
        </div>
      </Section>

      {/* Section 4 — Message generated */}
      <Section index={3} label="message generated">
        <div
          className="relative border p-4"
          style={{ background: "#0e0e0e", borderColor: "#1a1a1a" }}
        >
          <button
            onClick={copy}
            className="absolute right-3 top-3 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-opacity hover:opacity-80"
            style={{
              background: "#1a1a1a",
              color: copied ? "#c8f060" : "#dedad4",
            }}
          >
            {copied ? "copied ✓" : "copy"}
          </button>
          <pre
            className="whitespace-pre-wrap pr-16 font-mono text-[12px] leading-relaxed"
            style={{ color: "#dedad4" }}
          >
            {scout.message}
          </pre>
        </div>
      </Section>

      {/* Section 5 — ROI widget */}
      <Section index={4} label="your roi">
        <div
          className="border p-5"
          style={{ background: "#0e0e0e", borderColor: "#1a1a1a" }}
        >
          <div
            className="font-mono text-[11px]"
            style={{ color: "#4a4845" }}
          >
            What you're currently spending:
          </div>
          <div
            className="mt-1 font-display text-[28px] font-extrabold"
            style={{ color: "#dedad4" }}
          >
            €{spend.toLocaleString("en-US")}{" "}
            <span
              className="font-mono text-[11px] font-normal"
              style={{ color: "#4a4845" }}
            >
              /month · agency + SDR cost
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={20000}
            step={250}
            value={spend}
            onChange={(e) => setSpend(Number(e.target.value))}
            className="mt-4 w-full accent-[#c8f060]"
            style={{ accentColor: "#c8f060" }}
          />
          <div className="mt-4 border-t pt-4" style={{ borderColor: "#1a1a1a" }}>
            <div className="text-[14px]" style={{ color: "#dedad4" }}>
              AXON replaces this for{" "}
              <span style={{ color: "#c8f060" }}>
                €{axonPrice.toLocaleString("en-US")}/month
              </span>{" "}
              — saving you{" "}
              <span style={{ color: "#c8f060" }}>
                €{savings.toLocaleString("en-US")}/month
              </span>
            </div>
            <div
              className="mt-1 font-mono text-[12px]"
              style={{ color: "#5ff0c0" }}
            >
              That's €{annual.toLocaleString("en-US")} saved per year
            </div>
          </div>
        </div>
      </Section>

      {/* Section 6 — Social proof */}
      <Section index={5} label="founders running on axon">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { name: "Retool", line: "47 meetings in 30 days. Zero SDRs." },
            {
              name: "Linear",
              line: "CAC reduced 81%. Agency cancelled month 2.",
            },
            {
              name: "Cal.com",
              line: "Pipeline up 340%. 1 founder, no growth hire.",
            },
          ].map((c) => (
            <div
              key={c.name}
              className="border p-4"
              style={{ background: "#0e0e0e", borderColor: "#1a1a1a" }}
            >
              <div
                className="font-display text-[15px] font-bold"
                style={{ color: "#c8f060" }}
              >
                {c.name}
              </div>
              <div
                className="mt-1 text-[12px] leading-snug"
                style={{ color: "#dedad4" }}
              >
                {c.line}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Section 7 — CTA */}
      <Section index={6}>
        <div
          className="border p-6 text-center"
          style={{
            background: "#0e0e0e",
            borderColor: "#1a1a1a",
          }}
        >
          <div
            className="font-display text-[24px] font-extrabold tracking-tight"
            style={{ color: "#dedad4" }}
          >
            Want your system live in 48h?
          </div>
          <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              onClick={() => setShowCalendly(true)}
              className="px-5 py-2.5 font-mono text-[12px] font-bold uppercase tracking-[0.16em] transition-opacity hover:opacity-90"
              style={{ background: "#c8f060", color: "#040404" }}
            >
              Book onboarding →
            </button>
            <button
              onClick={scrollTop}
              className="border px-5 py-2.5 font-mono text-[12px] uppercase tracking-[0.16em] transition-colors hover:bg-white/5"
              style={{ borderColor: "#1a1a1a", color: "#dedad4" }}
            >
              See how it works first
            </button>
          </div>
          <div
            className="mt-4 font-mono text-[11px]"
            style={{ color: "#4a4845" }}
          >
            Zero risk · 30-day money back · Setup in 48h · {company}
          </div>

          <AnimatePresence>
            {showCalendly && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 overflow-hidden border"
                style={{ borderColor: "#1a1a1a" }}
              >
                <iframe
                  title="Book onboarding"
                  src="https://calendly.com/d/placeholder"
                  className="h-[640px] w-full"
                  style={{ background: "#fff" }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {onContinue !== scrollTop && (
            <button
              onClick={onContinue}
              className="mt-6 font-mono text-[10px] uppercase tracking-[0.2em] underline-offset-4 hover:underline"
              style={{ color: "#4a4845" }}
            >
              continue the demo →
            </button>
          )}
        </div>
      </Section>
    </motion.div>
  );
}
