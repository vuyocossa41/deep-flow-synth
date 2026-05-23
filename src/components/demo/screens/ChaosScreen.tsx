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

const STREAM: Omit<Incident, "id">[] = [
  { tone: "danger", text: "Agency delivered 3 leads this month. Target was 40." },
  { tone: "danger", text: "SDR resigned. €80k pipeline at risk." },
  { tone: "warn", text: "Email sequence blocked by spam. 340 undelivered." },
  { tone: "warn", text: "Growth meeting: 2hrs to reach same conclusion as last week." },
  { tone: "danger", text: "CAC increased 34% vs last month. No clear reason." },
  { tone: "warn", text: "MQLs are up but sales says they're junk. Again." },
  { tone: "danger", text: "Cold call conversion: 0.4%. Down from 1.1% last quarter." },
  { tone: "danger", text: "Board asks: 'What's our CAC payback?' — no one knows." },
];

export function ChaosScreen({ onActivate, onSubmit }: Props) {
  const fire = onActivate ?? onSubmit ?? (() => {});
  const [value, setValue] = useState("");
  const [items, setItems] = useState<Incident[]>([]);
  const counter = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const prefersReduced = useReducedMotion();

  // Auto-scroll incident stream — new item every 2000ms, keep max 5
  useEffect(() => {
    // seed with first 3
    setItems(
      STREAM.slice(0, 3).map((s) => ({
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
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => inputRef.current?.focus(), 1200);
    return () => window.clearTimeout(t);
  }, []);

  const submit = (v: string) => {
    const t = v.trim();
    if (!t) return;
    fire(t);
  };

  return (
    <div
      className="relative min-h-svh overflow-hidden px-4 pb-40 pt-24"
      style={{ background: "#040404" }}
    >
      {/* Red wash + scanlines */}
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

      <div className="relative z-10 mx-auto w-full max-w-6xl">
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
          {/* LEFT 60% */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <BrokenMetric
                label="CAC"
                value="€847"
                delta="↑34%"
                width={22}
                reduced={!!prefersReduced}
              />
              <BrokenMetric
                label="Pipeline"
                value="€12.400"
                delta="↓41% vs target"
                width={31}
                reduced={!!prefersReduced}
              />
              <BrokenMetric
                label="Reply rate"
                value="2.1%"
                delta="↓0.8%"
                width={12}
                reduced={!!prefersReduced}
              />
            </div>

            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.55 }}
              className="pt-2 font-display text-[clamp(26px,4vw,40px)] font-extrabold leading-[1.05] tracking-tight"
              style={{ color: "#dedad4" }}
            >
              You're running revenue{" "}
              <span style={{ color: "#f05870" }}>on duct tape.</span>
            </motion.h1>
            <p
              className="max-w-xl text-[13px] leading-relaxed"
              style={{ color: "#4a4845" }}
            >
              Six tools. Three contractors. An agency that ghosts. A spreadsheet
              pretending to be a system.
            </p>
          </div>

          {/* RIGHT 40% — incident stream */}
          <div
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
              <span>incident feed</span>
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
                    <span
                      className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{
                        background: n.tone === "danger" ? "#f05870" : "#f0a040",
                      }}
                    />
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
          </div>
        </div>
      </div>

      {/* BOTTOM CENTER — input + Activate AXON */}
      <motion.form
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6 }}
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
          what's your biggest growth problem right now?
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
            placeholder="e.g. acme.com — or describe your situation"
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
            Activate AXON →
          </button>
        </div>
      </motion.form>
    </div>
  );
}

function BrokenMetric({
  label,
  value,
  delta,
  width,
  reduced,
}: {
  label: string;
  value: string;
  delta: string;
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
        className="font-mono text-[9px] uppercase tracking-[0.2em]"
        style={{ color: "#4a4845" }}
      >
        {label}
      </div>
      <div
        className="mt-1 font-display text-[24px] font-extrabold leading-none"
        style={{ color: "#dedad4" }}
      >
        {value}
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <span
          className="inline-block px-1.5 py-0.5 font-mono text-[9px] font-bold"
          style={{ background: "rgba(240,88,112,0.15)", color: "#f05870" }}
        >
          {delta}
        </span>
      </div>
      <div className="mt-2 h-[2px] w-full" style={{ background: "#1a1a1a" }}>
        <div
          className="h-full"
          style={{ width: `${width}%`, background: "#f05870" }}
        />
      </div>
    </motion.div>
  );
}
