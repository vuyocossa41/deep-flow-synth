import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { generateDemoData } from "@/lib/demo-data";
import { runScout, type ScoutResult } from "@/lib/scout";
import { ActivationOverlay } from "./ActivationOverlay";
import { AgentRail } from "./AgentRail";
import { ExecutiveBriefing } from "./ExecutiveBriefing";
import { MouseLight } from "./MouseLight";
import { SignalFeed } from "./SignalFeed";
import { SystemActivityLayer } from "./SystemActivityLayer";
import { ChaosScreen } from "./screens/ChaosScreen";
import { DecisionScreen } from "./screens/DecisionScreen";
import { FinanceScreen } from "./screens/FinanceScreen";
import { IntelligenceScreen } from "./screens/IntelligenceScreen";
import { NumbersScreen } from "./screens/NumbersScreen";
import { ScoutScreen } from "./screens/ScoutScreen";
import { WriterScreen } from "./screens/WriterScreen";

const labels = [
  "CURRENT REALITY",
  "CORE · INTELLIGENCE LAYER",
  "SALES · SIGNAL HUNTER",
  "SALES · CAMPAIGN ORCHESTRATOR",
  "REVENUE OPTIMIZER",
  "STRATEGY ENGINE",
  "PAYOFF",
];

// agent activation per screen — drives the agent rail + ambient state
const ACTIVE_AGENTS: Record<number, string[]> = {
  1: [],
  2: ["signal", "icp", "market", "strategy"],
  3: ["signal", "icp"],
  4: ["campaign", "signal"],
  5: ["revenue", "market"],
  6: ["strategy", "revenue", "campaign"],
  7: ["strategy"],
};

// Live "what each agent is doing right now" per screen
const AGENT_TASKS: Record<number, Record<string, string>> = {
  2: {
    signal: "indexing public footprint",
    icp: "mapping ICP signature",
    market: "scanning category topology",
    strategy: "compiling intelligence layer",
  },
  3: {
    signal: "querying funding news · 7d",
    icp: "scoring fit · 847 accounts",
  },
  4: {
    campaign: "drafting opener variants",
    signal: "checking trigger freshness",
  },
  5: {
    revenue: "modelling MRR cohorts",
    market: "benchmarking ACV band",
  },
  6: {
    strategy: "ranking next-best moves",
    revenue: "simulating CAC payback",
    campaign: "sequencing send waves",
  },
  7: {
    strategy: "logging payoff to memory",
  },
};

const TOTAL = 7;

export function DemoShell() {
  const [screen, setScreen] = useState(1);
  const [company, setCompany] = useState("");
  const [activating, setActivating] = useState(false);
  const [scoutData, setScoutData] = useState<ScoutResult | null>(null);
  const [isLoadingScout, setIsLoadingScout] = useState(false);
  const data = useMemo(() => generateDemoData(company || "Acme"), [company]);

  const go = useCallback((n: number) => {
    setScreen(Math.max(1, Math.min(TOTAL, n)));
  }, []);

  const restart = useCallback(() => {
    setCompany("");
    setActivating(false);
    setScoutData(null);
    setIsLoadingScout(false);
    setScreen(1);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") restart();
      if ((e.key === "ArrowRight" || e.key === " ") && screen > 1 && screen < TOTAL) {
        e.preventDefault();
        go(screen + 1);
      }
      if (e.key === "ArrowLeft" && screen > 1) {
        e.preventDefault();
        go(screen - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, go, restart]);

  const handleActivate = useCallback((c: string) => {
    setCompany(c);
    setActivating(true);
    // Fire scout API in parallel with the activation overlay
    setIsLoadingScout(true);
    setScoutData(null);
    runScout(c)
      .then((res) => setScoutData(res))
      .catch(() => setScoutData(null))
      .finally(() => setIsLoadingScout(false));
  }, []);

  const finishActivation = useCallback(() => {
    setActivating(false);
    setScreen(2);
  }, []);

  const screens = [
    <ChaosScreen key="1" onActivate={handleActivate} />,
    <IntelligenceScreen
      key="2"
      company={company}
      isLoading={isLoadingScout}
      scoutData={scoutData}
      onContinue={() => go(3)}
    />,
    <ScoutScreen key="3" data={data} onComplete={() => go(4)} />,
    <WriterScreen key="4" data={data} onComplete={() => go(5)} />,
    <FinanceScreen key="5" data={data} onComplete={() => go(6)} />,
    <DecisionScreen key="6" data={data} onComplete={() => go(7)} />,
    <NumbersScreen key="7" data={data} onRestart={restart} />,
  ];

  const showOps = screen > 1 && screen < TOTAL && !activating;
  const showAmbient = screen > 1; // hide cosmic noise behind chaos screen

  return (
    <div className="relative min-h-svh">
      {/* AMBIENT INFRASTRUCTURE LAYERS — kept off during chaos so the red tint stays dominant */}
      {showAmbient && <SystemActivityLayer />}
      <MouseLight />

      {/* Persistent intelligence chrome (only during the flow) */}
      {showOps && (
        <AgentRail
          activeIds={ACTIVE_AGENTS[screen] ?? []}
          tasks={AGENT_TASKS[screen] ?? {}}
        />
      )}
      {showOps && <SignalFeed />}
      {showOps && screen > 2 && <ExecutiveBriefing data={data} />}

      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between px-5 py-4">
        <button
          onClick={restart}
          className="flex items-center gap-2 font-display text-[15px] font-bold tracking-tight"
        >
          <span className="relative inline-flex h-2 w-2">
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full ${screen === 1 ? "bg-danger/70" : "bg-signal/70"}`}
            />
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${screen === 1 ? "bg-danger" : "bg-signal"}`}
            />
          </span>
          Founder<span className={screen === 1 ? "text-danger" : "text-signal"}>OS</span>
        </button>
        <div className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:block">
          {labels[screen - 1]}
          {company && screen > 1 && (
            <span className="ml-2 text-foreground/70">· {company}</span>
          )}
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {String(screen).padStart(2, "0")} / {String(TOTAL).padStart(2, "0")}
        </div>
      </header>

      {/* Progress */}
      <div className="fixed inset-x-0 top-0 z-50 h-[2px] bg-border/40">
        <motion.div
          className="h-full"
          style={{
            background:
              screen === 1
                ? "linear-gradient(90deg, oklch(0.7 0.22 25), oklch(0.82 0.18 75))"
                : "linear-gradient(90deg, oklch(0.85 0.22 152), oklch(0.72 0.16 250))",
          }}
          animate={{ width: `${((screen - 1) / (TOTAL - 1)) * 100}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      {/* Screens */}
      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          initial={{ opacity: 0, scale: 0.985, filter: "blur(8px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 1.015, filter: "blur(8px)" }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10"
        >
          {screens[screen - 1]}
        </motion.div>
      </AnimatePresence>

      {/* Activation transition overlay (between chaos and intelligence) */}
      <AnimatePresence>
        {activating && (
          <ActivationOverlay company={company} onComplete={finishActivation} />
        )}
      </AnimatePresence>

      {/* Hint */}
      {screen > 1 && screen < TOTAL && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
          ← → to navigate · ESC to restart
        </div>
      )}

      {/* Step dots */}
      <div className="fixed bottom-4 left-1/2 z-40 hidden -translate-x-1/2 items-center gap-1.5 sm:flex">
        {Array.from({ length: TOTAL }, (_, idx) => idx + 1).map((n) => (
          <button
            key={n}
            onClick={() => company && go(n)}
            disabled={!company && n > 1}
            className={`h-1.5 rounded-full transition-all ${
              n === screen
                ? "w-6 bg-signal"
                : n < screen
                  ? "w-1.5 bg-foreground/40 hover:bg-foreground/60"
                  : "w-1.5 bg-border"
            }`}
            aria-label={`Step ${n}`}
          />
        ))}
      </div>
    </div>
  );
}
