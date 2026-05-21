import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { generateDemoData } from "@/lib/demo-data";
import { MouseLight } from "./MouseLight";
import { DecisionScreen } from "./screens/DecisionScreen";
import { FinanceScreen } from "./screens/FinanceScreen";
import { InputScreen } from "./screens/InputScreen";
import { NumbersScreen } from "./screens/NumbersScreen";
import { ScoutScreen } from "./screens/ScoutScreen";
import { WriterScreen } from "./screens/WriterScreen";

const labels = ["INTAKE", "SALES · SCOUT", "SALES · WRITER", "FINANCE", "DECISION", "PAYOFF"];

export function DemoShell() {
  const [screen, setScreen] = useState(1);
  const [company, setCompany] = useState("");
  const data = useMemo(() => generateDemoData(company || "Acme"), [company]);

  const go = useCallback((n: number) => {
    setScreen(Math.max(1, Math.min(6, n)));
  }, []);

  const restart = useCallback(() => {
    setCompany("");
    setScreen(1);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") restart();
      if ((e.key === "ArrowRight" || e.key === " ") && screen > 1 && screen < 6) {
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

  const screens = [
    <InputScreen
      key="1"
      onSubmit={(c) => {
        setCompany(c);
        go(2);
      }}
    />,
    <ScoutScreen key="2" data={data} onComplete={() => go(3)} />,
    <WriterScreen key="3" data={data} onComplete={() => go(4)} />,
    <FinanceScreen key="4" data={data} onComplete={() => go(5)} />,
    <DecisionScreen key="5" data={data} onComplete={() => go(6)} />,
    <NumbersScreen key="6" data={data} onRestart={restart} />,
  ];

  return (
    <div className="relative min-h-svh">
      <MouseLight />

      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between px-5 py-4">
        <button
          onClick={restart}
          className="font-display text-[15px] font-bold tracking-tight"
        >
          Founder<span className="text-signal">OS</span>
        </button>
        <div className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:block">
          {labels[screen - 1]}
          {company && screen > 1 && (
            <span className="ml-2 text-foreground/70">· {company}</span>
          )}
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {String(screen).padStart(2, "0")} / 06
        </div>
      </header>

      {/* Progress */}
      <div className="fixed inset-x-0 top-0 z-50 h-[2px] bg-border/40">
        <motion.div
          className="h-full"
          style={{
            background:
              "linear-gradient(90deg, oklch(0.85 0.22 152), oklch(0.72 0.16 250))",
          }}
          animate={{ width: `${((screen - 1) / 5) * 100}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      {/* Screens with cinematic crossfade + slight scale */}
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

      {/* Hint */}
      {screen > 1 && screen < 6 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
          ← → to navigate · ESC to restart
        </div>
      )}

      {/* Step dots */}
      <div className="fixed bottom-4 left-1/2 z-40 hidden -translate-x-1/2 items-center gap-1.5 sm:flex">
        {[1, 2, 3, 4, 5, 6].map((n) => (
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
