import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { DemoData } from "@/lib/demo-data";
import { OrchestrationGraph } from "../OrchestrationGraph";

interface Props {
  data: DemoData;
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

export function DecisionScreen({ data, onComplete }: Props) {
  const churn = data.churnClients[0];
  const decisions: Decision[] = [
    {
      num: "01",
      urgency: "urgent",
      title: `${churn?.name ?? "TechCorp"} ${churn?.risk ?? 87}% churn risk`,
      detail: "Retention email drafted and ready to send.",
      action: "1 click to send →",
      reasoning: [
        `${churn?.reason ?? "no logins last 14d"}`,
        `MRR exposure: $${churn?.mrr ?? 1800}/mo`,
        `Confidence: ${churn?.risk ?? 87}% · model: retention-v3`,
      ],
    },
    {
      num: "02",
      urgency: "today",
      title: `Pipeline $${(40 + (data.icpScore % 12)).toFixed(0)}k short this month`,
      detail: `${3 + (data.icpScore % 4)} warm leads identified · outbound drafted.`,
      action: "Review & approve →",
      reasoning: [
        `Top match: ${data.company} (ICP ${data.icpScore}/100)`,
        `Hiring signal: ${data.hiringRole}`,
        `Recent: ${data.fundingRound} ${data.fundingAmount}`,
      ],
    },
    {
      num: "03",
      urgency: "week",
      title: `${data.upsellCount} clients ready for upsell`,
      detail: "Proposals auto-generated, waiting for review.",
      action: "View proposals →",
      reasoning: [
        `Average uplift: $${(800 + (data.icpScore % 7) * 50).toFixed(0)}/mo per account`,
        `Avg seat utilisation > 84%`,
        `Predicted close rate: 62%`,
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
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-mind">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-mind" />
          DECISION OS · TODAY'S PRIORITIES
        </div>
        <div className="font-mono text-[11px] text-muted-foreground">
          orchestrated across Scout · Writer · Finance
        </div>
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
                : { border: "border-l-info", text: "text-info" };
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
                  <div
                    className={`mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] ${tone.text}`}
                  >
                    {d.urgency === "urgent"
                      ? "URGENT — RIGHT NOW"
                      : d.urgency === "today"
                        ? "TODAY"
                        : "THIS WEEK"}
                  </div>
                  <div className="font-display text-[15px] leading-snug">
                    <span className="font-semibold">{d.title}</span>
                    <span className="text-muted-foreground"> — {d.detail}</span>
                  </div>
                </div>
                <div className="px-4 font-mono text-[11px] text-signal">
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
                          Why this decision
                        </div>
                        <ul className="space-y-1 font-mono text-[11.5px] text-foreground/85">
                          {d.reasoning.map((r) => (
                            <li key={r} className="flex gap-2">
                              <span className="text-mind">›</span>
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button className="rounded-md bg-signal px-4 py-2 font-display text-sm font-bold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5">
                          ✓ Approve
                        </button>
                        <button className="rounded-md border border-border bg-panel/60 px-4 py-2 font-display text-sm text-foreground/80 hover:border-foreground/40 hover:text-foreground">
                          Snooze 1d
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
