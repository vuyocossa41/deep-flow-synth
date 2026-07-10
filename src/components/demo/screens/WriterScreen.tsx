import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { ScoutResult } from "@/lib/scout";

interface Props {
  scoutData?: ScoutResult | null;
  onComplete: () => void;
}

export function WriterScreen({ scoutData, onComplete }: Props) {
  const message = scoutData?.message ?? "";
  const [typed, setTyped] = useState("");
  const [done, setDone] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(message);
  const [approved, setApproved] = useState(false);
  const [showButtons, setShowButtons] = useState(false);

  const signals = scoutData?.profile?.signals ?? "";
  const hiringRoles = scoutData?.profile?.hiring_roles ?? [];
  const angle = scoutData?.profile?.angle ?? "";
  const icp = scoutData?.profile?.icp ?? "";
  const funding = scoutData?.funding;
  const scoreNum = scoutData?.score_num ?? 0;
  const score = scoutData?.score ?? "—";
  const readiness = scoutData?.readiness_index ?? 0;
  const structuralSignal = scoutData?.structural_signal ?? "";

  const tags = [
    funding?.round || funding?.amount
      ? `${[funding.round, funding.amount].filter(Boolean).join(" ")} detected`
      : null,
    hiringRoles.length ? `Hiring ${hiringRoles[0]}` : null,
    signals ? `Signal: ${signals}` : null,
    icp ? `ICP: ${icp}` : null,
  ].filter((t): t is string => Boolean(t));

  useEffect(() => {
    let i = 0;
    setTyped("");
    setDone(false);
    setApproved(false);
    setEditing(false);
    setShowButtons(false);
    setEditValue(message);

    if (!message) {
      setDone(true);
      return;
    }

    const typeInt = window.setInterval(() => {
      i++;
      setTyped(message.slice(0, i));
      if (i >= message.length) {
        window.clearInterval(typeInt);
        setDone(true);
        window.setTimeout(() => setShowButtons(true), 900);
      }
    }, 22);

    return () => window.clearInterval(typeInt);
  }, [message]);

  const wordCount = (typed.trim().match(/\S+/g) || []).length;

  const approve = () => {
    setApproved(true);
    window.setTimeout(onComplete, 900);
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-24">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-signal">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-signal" />
          REAL SIGNAL · MESSAGE FROM LIVE SCAN
        </div>
        <div className="font-mono text-[11px] text-muted-foreground">
          source: Groq (LLaMA 3.3 70B)
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Intelligence */}
        <div className="glass-strong rounded-2xl p-5">
          <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            Scout intelligence
          </div>
          {tags.length ? (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1.5 rounded-md border border-signal/20 bg-signal-soft px-2.5 py-1 font-mono text-[11px] text-signal"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-signal" />
                  {s}
                </span>
              ))}
            </div>
          ) : (
            <div className="font-mono text-[11px] text-muted-foreground">
              No explicit hiring/funding signal found on the scanned pages.
            </div>
          )}

          <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-border/60 pt-4 font-mono text-[11px]">
            <Metric label="Fit Score" value={`${scoreNum}/100`} good />
            <Metric label="Signal" value={score} good={score === "HOT"} warn={score === "COLD"} />
            <Metric label="Readiness" value={`${readiness}`} warn />
          </dl>

          <div className="mt-5 rounded-lg border border-border/60 bg-panel/50 p-3">
            <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-mind">
              Reasoning trace
            </div>
            <ul className="space-y-1 font-mono text-[11.5px] text-foreground/80">
              {structuralSignal && (
                <li className="flex gap-2">
                  <span className="text-mind">›</span>
                  {structuralSignal}
                </li>
              )}
              {angle && (
                <li className="flex gap-2">
                  <span className="text-mind">›</span>
                  {angle}
                </li>
              )}
              {!structuralSignal && !angle && (
                <li className="text-muted-foreground">No further reasoning available from this scan.</li>
              )}
            </ul>
          </div>
        </div>

        {/* Message */}
        <div className="glass-strong relative rounded-2xl p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              Generated message · {wordCount} words
            </div>
            {editing && (
              <button
                onClick={() => setEditing(false)}
                className="font-mono text-[10px] text-muted-foreground hover:text-foreground"
              >
                done editing
              </button>
            )}
          </div>

          {editing ? (
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="min-h-[180px] w-full resize-none rounded-lg border border-signal/40 bg-panel/60 p-3 font-display text-[15px] leading-relaxed text-foreground outline-none focus:ring-signal"
            />
          ) : (
            <div className="min-h-[180px] whitespace-pre-wrap font-display text-[15px] leading-relaxed text-foreground">
              {(editing ? editValue : typed) || (message ? "\u00A0" : "No message generated — scan returned no usable signal.")}
              {!done && !editing && (
                <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-caret bg-signal align-middle" />
              )}
            </div>
          )}

          <div className="mt-3 text-right font-mono text-[11px] text-muted-foreground">
            {done ? "Generated from real scan content" : "generating…"}
          </div>

          {done && showButtons && !approved && message && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mt-4 flex gap-2"
            >
              <motion.button
                onClick={approve}
                animate={{ boxShadow: ["0 0 0px rgba(200,240,96,0)", "0 0 20px rgba(200,240,96,0.4)", "0 0 0px rgba(200,240,96,0)"] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="flex-1 rounded-lg bg-signal px-5 py-3 font-display text-sm font-bold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5"
              >
                ✓ Approve & Send
              </motion.button>
              <button
                onClick={() => setEditing((e) => !e)}
                className="rounded-lg border border-border bg-panel/60 px-5 py-3 font-display text-sm text-foreground/80 transition-colors hover:border-foreground/40 hover:text-foreground"
              >
                ✎ {editing ? "Preview" : "Edit"}
              </button>
            </motion.div>
          )}

          {approved && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex items-center justify-center rounded-2xl bg-background/70 backdrop-blur-sm"
            >
              <div className="text-center">
                <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-signal text-2xl text-primary-foreground shadow-glow">
                  ✓
                </div>
                <div className="font-mono text-xs uppercase tracking-[0.15em] text-signal">
                  Sent · queued in inbox
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  good,
  warn,
}: {
  label: string;
  value: string;
  good?: boolean;
  warn?: boolean;
}) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`mt-0.5 font-bold ${good ? "text-signal" : warn ? "text-warn" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
