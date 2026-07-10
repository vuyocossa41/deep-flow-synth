import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { runScout, type ScoutResult } from "@/lib/scout";
import { ActivationOverlay } from "./ActivationOverlay";
import { AgentRail } from "./AgentRail";
import { ExecutiveBriefing } from "./ExecutiveBriefing";
import { MouseLight } from "./MouseLight";
import { QualificationGate, type GateData } from "./QualificationGate";
import { SystemActivityLayer } from "./SystemActivityLayer";
import { ChaosScreen } from "./screens/ChaosScreen";
import { DecisionScreen } from "./screens/DecisionScreen";
import { FinanceScreen } from "./screens/FinanceScreen";
import { IntelligenceScreen } from "./screens/IntelligenceScreen";
import { NumbersScreen } from "./screens/NumbersScreen";
import { OverviewScreen } from "./screens/OverviewScreen";
import { ScoutScreen } from "./screens/ScoutScreen";
import { WriterScreen } from "./screens/WriterScreen";

const labels = [
  "REVENUE INFRASTRUCTURE · DIAGNOSIS",
  "INFRASTRUCTURE · OVERVIEW",
  "SIGNAL INTELLIGENCE · ANALYSIS",
  "SIGNAL SCOUT · LIVE DETECTION",
  "CAMPAIGN ORCHESTRATION · AUTONOMOUS",
  "REVENUE OPTIMIZER · ACTIVE",
  "STRATEGY ENGINE · FOUNDER MODE",
  "INFRASTRUCTURE · DEPLOYED",
];

const SCREEN_SUBTITLES = [
  null,
  "See the 4 infrastructure layers",
  "See what AXON found about your company",
  "Real signals being processed now",
  "AI drafting outreach from real signals",
  "Real signal · financial view",
  "Decisions ranked by real signal",
  "Your infrastructure is ready to deploy",
];

const ACTIVE_AGENTS: Record<number, string[]> = {
  1: [],
  2: [],
  3: ["signal", "icp", "market", "strategy"],
  4: ["signal", "icp"],
  5: ["campaign", "signal"],
  6: ["revenue", "market"],
  7: ["strategy", "revenue", "campaign"],
  8: ["strategy"],
};

const AGENT_TASKS: Record<number, Record<string, string>> = {
  3: {
    signal: "scanning scraped page content",
    icp: "matching ICP from real profile",
    market: "checking public press for funding",
    strategy: "compiling real signal summary",
  },
  4: {
    signal: "searching public funding news",
    icp: "scoring fit from real profile",
  },
  5: {
    campaign: "drafting message from real signal",
    signal: "checking signal freshness",
  },
  6: {
    revenue: "reading real infrastructure alerts",
    market: "reading detected tech stack",
  },
  7: {
    strategy: "ranking real alerts by severity",
    revenue: "reviewing real fit score",
    campaign: "preparing outreach draft",
  },
  8: {
    strategy: "session complete",
  },
};

const TOTAL = 8;

type DemoPhase = "chaos" | "gate" | "demo";

export function DemoShell() {
  const [phase, setPhase] = useState<DemoPhase>("chaos");
  const [screen, setScreen] = useState(1);
  const [company, setCompany] = useState("");
  const [gateData, setGateData] = useState<GateData | null>(null);
  const [activating, setActivating] = useState(false);
  const [scoutData, setScoutData] = useState<ScoutResult | null>(null);
  const [isLoadingScout, setIsLoadingScout] = useState(false);

  const [scoutError, setScoutError] = useState<string | null>(null);

  const go = useCallback((n: number) => {
    setScreen(Math.max(1, Math.min(TOTAL, n)));
  }, []);

  const restart = useCallback(() => {
    setCompany("");
    setPhase("chaos");
    setScreen(1);
    setGateData(null);
    setActivating(false);
    setScoutData(null);
    setIsLoadingScout(false);
    setScoutError(null);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") restart();
      if (phase !== "demo") return;
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
  }, [screen, go, restart, phase]);

  const handleActivate = useCallback((c: string) => {
    setCompany(c);
    setPhase("gate");
  }, []);

  const handleQualified = useCallback((gd: GateData) => {
    setGateData(gd);
    setActivating(true);
    setIsLoadingScout(true);
    setScoutData(null);
    setScoutError(null);
    runScout(company)
      .then((res) => setScoutData(res))
      .catch((err) => setScoutError(err instanceof Error ? err.message : "Scan failed"))
      .finally(() => setIsLoadingScout(false));
  }, [company]);

  const handleWaitlist = useCallback(() => {
    restart();
  }, [restart]);

  const finishActivation = useCallback(() => {
    setActivating(false);
    setPhase("demo");
    setScreen(2);
  }, []);

  const screens = [
    <ChaosScreen key="1" onActivate={handleActivate} />,
    <OverviewScreen key="2" company={company} scoutData={scoutData} onContinue={() => go(3)} />,
    <IntelligenceScreen
      key="3"
      company={company}
      isLoading={isLoadingScout}
      scoutData={scoutData}
      error={scoutError}
      onContinue={() => go(4)}
    />,
    <ScoutScreen
      key="4"
      company={company}
      scoutData={scoutData}
      isLoading={isLoadingScout}
      error={scoutError}
      onComplete={() => go(5)}
    />,
    <WriterScreen key="5" scoutData={scoutData} onComplete={() => go(6)} />,
    <FinanceScreen key="6" scoutData={scoutData} onComplete={() => go(7)} />,
    <DecisionScreen key="7" scoutData={scoutData} onComplete={() => go(8)} />,
    <NumbersScreen key="8" company={company} scoutData={scoutData} onRestart={restart} />,
  ];

  const showOps = phase === "demo" && screen > 2 && screen < TOTAL;
  const showAmbient = phase === "demo";
  const showNav = phase === "demo" && screen > 1 && screen < TOTAL;

  return (
    <div className="relative min-h-svh">
      {showAmbient && <SystemActivityLayer />}
      <MouseLight />

      {showOps && (
        <AgentRail
          activeIds={ACTIVE_AGENTS[screen] ?? []}
          tasks={AGENT_TASKS[screen] ?? {}}
        />
      )}
      {showOps && screen > 3 && <ExecutiveBriefing scoutData={scoutData} />}

      <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between px-5 py-4">
        <button onClick={restart} className="flex items-center gap-2 font-display text-[15px] font-bold tracking-tight">
          <span className="relative inline-flex h-2 w-2">
            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${phase === "chaos" ? "bg-danger/70" : "bg-signal/70"}`} />
            <span className={`relative inline-flex h-2 w-2 rounded-full ${phase === "chaos" ? "bg-danger" : "bg-signal"}`} />
          </span>
          AXON<span className={phase === "chaos" ? "text-danger" : "text-signal"}>·OS</span>
        </button>

        {phase === "demo" && (
          <div className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:block">
            {labels[screen - 1]}
            {company && <span className="ml-2 text-foreground/70">· {company}</span>}
          </div>
        )}

        {phase === "gate" && (
          <div className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:block">
            AXON · INTELLIGENCE GATE · {company.toUpperCase()}
          </div>
        )}

        {phase === "demo" && (
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {String(screen).padStart(2, "0")} / {String(TOTAL).padStart(2, "0")}
          </div>
        )}
      </header>

      {phase === "demo" && (
        <div className="fixed inset-x-0 top-0 z-50 h-[2px] bg-border/40">
          <motion.div
            className="h-full"
            style={{
              background: screen === 1
                ? "linear-gradient(90deg, oklch(0.7 0.22 25), oklch(0.82 0.18 75))"
                : "linear-gradient(90deg, oklch(0.85 0.22 152), oklch(0.72 0.16 250))",
            }}
            animate={{ width: `${((screen - 1) / (TOTAL - 1)) * 100}%` }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      )}

      <AnimatePresence mode="wait">
        {phase === "chaos" && (
          <motion.div key="chaos" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.015, filter: "blur(8px)" }} transition={{ duration: 0.5 }} className="relative z-10">
            <ChaosScreen onActivate={handleActivate} />
          </motion.div>
        )}

        {phase === "gate" && !activating && (
          <motion.div key="gate" initial={{ opacity: 0, scale: 0.985, filter: "blur(8px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} exit={{ opacity: 0, scale: 1.015, filter: "blur(8px)" }} transition={{ duration: 0.5 }} className="relative z-10">
            <QualificationGate domain={company} onQualified={handleQualified} onWaitlist={handleWaitlist} />
          </motion.div>
        )}

        {phase === "demo" && (
          <motion.div key={screen} initial={{ opacity: 0, scale: 0.985, filter: "blur(8px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} exit={{ opacity: 0, scale: 1.015, filter: "blur(8px)" }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="relative z-10">
            {screens[screen - 1]}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activating && (
          <ActivationOverlay company={company} onComplete={finishActivation} />
        )}
      </AnimatePresence>

      {showNav && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between border-t border-border/30 bg-background/80 px-6 py-3 backdrop-blur-md">
          <button onClick={() => go(screen - 1)} className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground">
            ← {labels[screen - 2] ?? "Back"}
          </button>

          <div className="flex items-center gap-1.5">
            {Array.from({ length: TOTAL }, (_, idx) => idx + 1).map((n) => (
              <button key={n} onClick={() => go(n)} className={`h-1.5 rounded-full transition-all ${n === screen ? "w-6 bg-signal" : n < screen ? "w-1.5 bg-foreground/40 hover:bg-foreground/60" : "w-1.5 bg-border"}`} aria-label={`Step ${n}`} />
            ))}
          </div>

          <button onClick={() => go(screen + 1)} className="flex items-center gap-2 rounded-lg border border-signal/40 bg-signal/10 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-signal transition-all hover:bg-signal/20 hover:border-signal/70">
            {SCREEN_SUBTITLES[screen] ?? labels[screen] ?? "Next"}
            <span className="text-[13px]">→</span>
          </button>
        </motion.div>
      )}

      {phase === "chaos" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3, duration: 1 }} className="pointer-events-none fixed inset-x-0 bottom-6 z-40 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/40">
          Enter your domain to deploy intelligence
        </motion.div>
      )}
    </div>
  );
}
