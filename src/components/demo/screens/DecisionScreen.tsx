import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { ScoutResult } from "@/lib/scout";
import { OrchestrationGraph } from "../OrchestrationGraph";

interface Props {
  scoutData?: ScoutResult | null;
  onComplete: () => void;
}

type Urgency = "urgent" | "today" | "week" | "none";
interface Decision {
  num: string;
  urgency: Urgency;
  title: string;
  detail: string;
  action: string;
  reasoning: string[];
}

export function DecisionScreen({ scoutData, onComplete }: Props) {
  const alerts = scoutData?.infrastructure_alerts ?? [];
  const growthIndicators = scoutData?.profile?.growth_indicators ?? [];
  const structuralSignal = scoutData?.structural_signal ?? "";

  const decisions: Decision[] = alerts.map((a, i) => ({
    num: String(i + 1).padStart(2, "0"),
    urgency: a.level === "critical" ? "urgent" : a.level === "warning" ? "today" : "week",
    title: a.text,
    detail: "Derived from real scan content — Firecrawl + Groq analysis.",
    action: "View detail →",
    reasoning: [
      structuralSignal ? `Structural pattern: ${structuralSignal}` : "",
      ...growthIndicators.slice(0, 2).map((g) => `Growth signal: ${g}`),
      `Fit score: ${scoutData?.score_num ?? 0}/100 · ${scoutData?.score ?? "—"}`,
    ].filter(Boolean),
  }));

  if (decisions.length === 0) {
    decisions.push({
      num: "01",
      urgency: "none",
      title: "No infrastructure gaps detected from public content",
      detail: "The scan didn't find hiring, funding, or growth signals on the pages checked.",
      action: "—",
      reasoning: ["This reflects available public content, not company performance."],
    });
  }

  const [visible, setVisible] = useState(0);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    setVisible(0);
    setOpen(null);
    const i = window.setInterval(() => {
      setVisible((n) => {
        if (n >= decisions.length) {
          window.clearInterval(i);
          return n;
        }
        return n + 1;
      });
    }, 280);
    const done = window.setTimeout(onComplete, 7000);
    return () => {
      window.clearInterval(i);
      window.clearTimeout(done);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoutData]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-24">

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-5 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
        style={{ background: "rgba(200,240,96,0.04)", borderColor: "rgba(200,240,96,0.25)" }}
      >
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: "#c8f060" }}>
            ⚡ 3 deployment slots remaining this month
          </div>
          <div className="mt-1 font-mono text-[12px]" style={{ color: "#4a6268" }}>
            This is real signal from your domain.{" "}
            <span style={{ color: "#dedad4" }}>Ready to run this on your full pipeline?</span>
          </div>
        </div>
          <a
          href="https://tally.so/r/kdkXGd"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 whitespace-nowrap px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition-all hover:opacity-90"
          style={{ background: "#c8f060", color: "#040404" }}
        >
          Apply for deployment →
        </a>
      </motion.div>

      <div className="mb-1 flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-mind">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-mind" />
          AXON · SIGNAL INTELLIGENCE LAYER
        </div>
        <div className="font-mono text-[11px] text-muted-foreground">
          Scout · Writer · Finance · orchestrated
        </div>
      </div>

      <div className="mb-4 font-mono text-[10px] text-muted-foreground/60 tracking-wide">
        Alerts derived only from real scan content — no fabricated figures
      </div>

      <div className="glass mb-4 rounded-2xl p-4">
        <OrchestrationGraph active="decision" height={130} />
      </div>

      <ul className="space-y-2">
        {decisions.map((d, idx) => {
          const show = idx < visible;
          const isOpen = open === d.num;
          const tone =
            d.urgency === "urgent"
              ? { border: "border-l-danger", text: "text-danger" }
              : d.urgency === "today"
                ? { border: "border-l-warn", text: "text-warn" }
                : d.urgency === "week"
                  ? { border: "border-l-info", text: "text-info" }
                  : { border: "border-l-border", text: "text-muted-foreground" };

          const label =
            d.urgency === "urgent"
              ? "⚠ CRITICAL SIGNAL"
              : d.urgency === "today"
                ? "TODAY"
                : d.urgency === "week"
                  ? "THIS WEEK"
                  : "NO SIGNAL";

          return (
            <motion.li
              key={d.num}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: show ? 1 : 0, y: show ? 0 : 14 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className={`glass-strong overflow-hidden rounded-xl border-l-2 ${tone.border}`}
            >
              <button
                onClick={() => setOpen(isOpen ? null : d.num)}
                className="grid w-full grid-cols-[48px_1fr_auto] items-center text-left transition-colors hover:bg-foreground/[0.02]"
              >
                <div className="self-stretch border-r border-border/40 bg-panel/40 px-2 py-4 text-center font-mono text-xs font-bold text-muted-foreground">
                  {d.num}
                </div>
                <div className="px-4 py-3.5">
                  <div className={`mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] ${tone.text}`}>
                    {label}
                  </div>
                  <div className="font-display text-[15px] leading-snug">
                    <span className="font-semibold">{d.title}</span>
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">{d.detail}</div>
                </div>
                <div className="px-4 font-mono text-[11px] text-signal whitespace-nowrap">
                  {isOpen ? "▾ collapse" : d.action}
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28 }}
                    className="overflow-hidden border-t border-border/40"
                  >
                    <div className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_auto]">
                      <div>
                        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-mind">
                          Signal breakdown · why AXON flagged this
                        </div>
                        <ul className="space-y-1 font-mono text-[11.5px] text-foreground/85">
                          {d.reasoning.length ? d.reasoning.map((r) => (
                            <li key={r} className="flex gap-2">
                              <span className="text-mind">›</span>
                              {r}
                            </li>
                          )) : (
                            <li className="text-muted-foreground">No further detail available.</li>
                          )}
                        </ul>
                        <div className="mt-3 font-mono text-[10px] text-muted-foreground/50 tracking-wide">
                          Based on real content from the scanned pages — no fabricated metrics
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                          <a
                          href="https://tally.so/r/kdkXGd"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-md border border-mind/30 bg-mind/5 px-4 py-2 font-display text-xs text-mind hover:bg-mind/10 text-center transition-colors"
                        >
                          Want this for your pipeline?
                        </a>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.li>
          );
        })}
      </ul>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: visible >= decisions.length ? 1 : 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="mt-6 flex items-center justify-between rounded-xl border border-border/40 bg-panel/30 px-5 py-4"
      >
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-mind mb-1">
            AXON · Revenue Intelligence Infrastructure
          </div>
          <div className="font-mono text-[11px] text-muted-foreground">
            Built for founders running $500k–$5M ARR
          </div>
        </div>
          <a
          href="https://tally.so/r/kdkXGd"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-signal px-5 py-2.5 font-display text-sm font-bold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5 whitespace-nowrap"
        >
          Apply for access →
        </a>
      </motion.div>
    </div>
  );
}
