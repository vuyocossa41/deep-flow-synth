import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { DemoData } from "@/lib/demo-data";
import type { ScoutResult } from "@/lib/scout";
import { OrchestrationGraph } from "../OrchestrationGraph";

interface Props {
  data: DemoData;
  scoutData?: import("@/lib/scout").ScoutResult | null;
  onComplete: () => void;
}

type Urgency = "urgent" | "today" | "week";
interface Decision {
  num: string;
  urgency: Urgency;
  title: string;
  detail: string;
  action: string;
  reasoning: string[];
}

export function DecisionScreen({ data, scoutData, onComplete }: Props) {
  const churn = data.churnClients[0];
  const decisions: Decision[] = [
    {
      num: "01",
      urgency: "urgent",
      title: `${churn?.name ?? "TechCorp"} — ${churn?.risk ?? 87}% churn probability`,
      detail: "Signal detected. Retention briefing compiled. One action pending.",
      action: "Review signal →",
      reasoning: [
        `Trigger: ${churn?.reason ?? "zero logins · 14 days"}`,
        `Revenue exposure: $${churn?.mrr ?? 1800}/mo · annualised $${((churn?.mrr ?? 1800) * 12).toLocaleString()}`,
        `Confidence: ${churn?.risk ?? 87}% · model: retention-v3`,
        `Without intervention: churn likely within 9 days`,
      ],
    },
    {
      num: "02",
      urgency: "today",
      title: `Pipeline $${(40 + (data.icpScore % 12)).toFixed(0)}k below target — ${3 + (data.icpScore % 4)} signals identified`,
      detail: "AXON surfaced acquisition signals invisible to your CRM.",
      action: "View intelligence →",
      reasoning: [
        `Top signal: ${data.company} · ICP score ${data.icpScore}/100`,
        `Buying trigger: ${data.hiringRole} · expansion phase`,
        `Recent event: ${data.fundingRound} ${data.fundingAmount}`,
        `Recommended action: personalised outreach · template ready`,
      ],
    },
    {
      num: "03",
      urgency: "week",
      title: `${data.upsellCount} accounts above expansion threshold`,
      detail: "Revenue signal: usage patterns indicate upsell readiness.",
      action: "View proposals →",
      reasoning: [
        `Average expansion: $${(800 + (data.icpScore % 7) * 50).toFixed(0)}/mo per account`,
        `Seat utilisation avg: 84% · ceiling approached`,
        `Predicted close rate: 62% · proposals drafted`,
        `Total pipeline at risk if ignored: $${((800 + (data.icpScore % 7) * 50) * data.upsellCount).toLocaleString()}/mo`,
      ],
    },
  ];

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
  }, [data]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-24">

      {/* ── CTA TALLY — VISÍVEL DESDE O SEGUNDO 0 ── */}
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
            This is what your pipeline looks like after AXON deploys.{" "}
            <span style={{ color: "#dedad4" }}>Ready to run this on your real data?</span>
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

      {/* Header */}
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
        Revenue signals processed · decisions ranked by impact · founder time protected
      </div>

      <div className="glass mb-4 rounded-2xl p-4">
        <OrchestrationGraph active="decision" height={130} />
      </div>

      {/* Decision cards */}
      <ul className="space-y-2">
        {decisions.map((d, idx) => {
          const show = idx < visible;
          const isOpen = open === d.num;
          const tone =
            d.urgency === "urgent"
              ? { border: "border-l-danger", text: "text-danger" }
              : d.urgency === "today"
                ? { border: "border-l-warn", text: "text-warn" }
                : { border: "border-l-info", text: "text-info" };

          const label =
            d.urgency === "urgent"
              ? "⚠ CRITICAL SIGNAL"
              : d.urgency === "today"
                ? "TODAY"
                : "THIS WEEK";

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
                    <span className="text-muted-foreground"> — {d.detail}</span>
                  </div>
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
                          {d.reasoning.map((r) => (
                            <li key={r} className="flex gap-2">
                              <span className="text-mind">›</span>
                              {r}
                            </li>
                          ))}
                        </ul>
                        <div className="mt-3 font-mono text-[10px] text-muted-foreground/50 tracking-wide">
                          AXON processed 140+ data points to surface this decision
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button className="rounded-md bg-signal px-4 py-2 font-display text-sm font-bold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5">
                          ✓ Approve
                        </button>
                        <button className="rounded-md border border-border bg-panel/60 px-4 py-2 font-display text-sm text-foreground/80 hover:border-foreground/40 hover:text-foreground">
                          Snooze 1d
                        </button>
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

      {/* Footer CTA — aparece depois dos cards */}
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
            Palantir-grade signal intelligence · built for founders running $500k–$5M ARR
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

