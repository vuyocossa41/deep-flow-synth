import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { DemoData } from "@/lib/demo-data";

interface Props {
  data: DemoData;
  onComplete: () => void;
}

export function WriterScreen({ data, onComplete }: Props) {
  const [typed, setTyped] = useState("");
  const [cost, setCost] = useState(0);
  const [done, setDone] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.message);
  const [approved, setApproved] = useState(false);
  const [showPause, setShowPause] = useState(false);
  const [showButtons, setShowButtons] = useState(false);

  useEffect(() => {
    let i = 0;
    setTyped("");
    setDone(false);
    setApproved(false);
    setEditing(false);
    setShowPause(false);
    setShowButtons(false);
    setEditValue(data.message);
    setCost(0);

    const typeInt = window.setInterval(() => {
      i++;
      setTyped(data.message.slice(0, i));
      if (i >= data.message.length) {
        window.clearInterval(typeInt);
        setDone(true);
        // Fix 2 — pausa dramática 3s antes de mostrar botões
        window.setTimeout(() => setShowPause(true), 400);
        window.setTimeout(() => setShowButtons(true), 3400);
      }
    }, 22);

    const costInt = window.setInterval(() => {
      setCost((c) => {
        const next = c + 0.00025;
        if (next >= 0.003) {
          window.clearInterval(costInt);
          return 0.003;
        }
        return next;
      });
    }, 70);

    return () => {
      window.clearInterval(typeInt);
      window.clearInterval(costInt);
    };
  }, [data]);

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
          GTM · INTERVENTION ORCHESTRATOR
        </div>
        <div className="font-mono text-[11px] text-muted-foreground">
          model: gpt-class · temp 0.4
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Intelligence */}
        <div className="glass-strong rounded-2xl p-5">
          <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            Scout intelligence
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              `${data.fundingRound} detected`,
              `Hiring ${data.hiringRole}`,
              `CEO: ${data.ceoQuote}`,
              `Industry: ${data.industry}`,
            ].map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1.5 rounded-md border border-signal/20 bg-signal-soft px-2.5 py-1 font-mono text-[11px] text-signal"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-signal" />
                {s}
              </span>
            ))}
          </div>

          <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-border/60 pt-4 font-mono text-[11px]">
            <Metric label="ICP" value={`${data.icpScore}/100`} good />
            <Metric label="Buy Signal" value={data.buySignal} good />
            <Metric label="Priority" value={data.priority} warn />
          </dl>

          <div className="mt-5 rounded-lg border border-border/60 bg-panel/50 p-3">
            <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-mind">
              Reasoning trace
            </div>
            <ul className="space-y-1 font-mono text-[11.5px] text-foreground/80">
              {data.reasoning.slice(0, 4).map((r) => (
                <li key={r} className="flex gap-2">
                  <span className="text-mind">›</span>
                  {r}
                </li>
              ))}
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
              {(editing ? editValue : typed) || "\u00A0"}
              {!done && !editing && (
                <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-caret bg-signal align-middle" />
              )}
            </div>
          )}

          {/* Cost line */}
          <div className="mt-3 text-right font-mono text-[11px] text-muted-foreground">
            {done
              ? `Cost: $${cost.toFixed(4)} · Human score: 94% · Tone: warm-direct`
              : `Cost: $${cost.toFixed(4)} · generating…`}
          </div>

          {/* Fix 2 — pausa dramática: comparação SDR vs AXON */}
          {showPause && !approved && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="mt-4 rounded-lg border px-4 py-3"
              style={{ borderColor: "rgba(240,160,64,0.3)", background: "rgba(240,160,64,0.05)" }}
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] mb-2" style={{ color: "#f0a040" }}>
                ◆ infrastructure vs headcount
              </div>
              <div className="grid grid-cols-2 gap-3 font-mono text-[11px]">
                <div>
                  <div style={{ color: "#4a4845" }}>Human SDR to do this:</div>
                  <div className="mt-1 font-bold" style={{ color: "rgba(240,88,112,0.9)" }}>4 days · $400 cost</div>
                  <div style={{ color: "#4a4845" }}>research + write + send</div>
                </div>
                <div>
                  <div style={{ color: "#4a4845" }}>AXON to do this:</div>
                  <div className="mt-1 font-bold text-signal">2s · $0.003 cost</div>
                  <div style={{ color: "#4a4845" }}>signal → message → sent</div>
                </div>
              </div>
              <div className="mt-2 font-mono text-[10px]" style={{ color: "#4a4845" }}>
                At scale: 847 accounts × $400 SDR cost = <span style={{ color: "rgba(240,88,112,0.9)" }}>$338,800</span> vs AXON: <span className="text-signal">$2.54</span>
              </div>
            </motion.div>
          )}

          {/* Botões — aparecem após pausa de 3s */}
          {done && showButtons && !approved && (
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