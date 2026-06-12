import { motion } from "framer-motion";
import type { ScoutResult } from "@/lib/scout";

interface Props {
  company: string;
  scoutData?: ScoutResult | null;
  onContinue: () => void;
}

const WHAT_IS_NOT = [
  { icon: "no", label: "Not an AI SDR", sub: "No spray-and-pray outbound" },
  { icon: "no", label: "Not automation", sub: "No context-free sequences" },
  { icon: "no", label: "Not a CRM", sub: "No data entry, no pipeline management" },
  { icon: "yes", label: "Revenue Intelligence Infrastructure", sub: "Signal layer · memory · autonomous decisions · human control" },
];

export function OverviewScreen({ company, scoutData, onContinue }: Props) {
  const name = scoutData?.profile?.name || company || "your company";
  const pain = scoutData?.profile?.pain || "Pipeline predictability and revenue consistency";
  const signals = scoutData?.profile?.signals || "Growth-stage GTM motion detected";
  const gap = scoutData?.profile?.biggest_gap || "Revenue infrastructure not systemised";
  const salesMotion = scoutData?.profile?.sales_motion || "hybrid";
  const stage = scoutData?.profile?.stage || "growth";
  const axonFit = scoutData?.profile?.axon_fit || 7;
  const humans = scoutData?.metrics?.humans || "4 humans";
  const hours = scoutData?.metrics?.hours || "28h/week";

  const LAYERS = [
    {
      id: "01",
      name: "Signal Scout",
      tag: "ALWAYS ON",
      color: "#c8f060",
      description: "Scans 140+ public data sources for " + name + ". Signal: " + signals.slice(0, 80) + ". Detects intent 11 days before your competitor acts.",
      metrics: ["847 accounts scored/day", "11-day advantage window", "Real-time intent detection"],
    },
    {
      id: "02",
      name: "Persistent Memory",
      tag: "COMPOUNDS OVER TIME",
      color: "#60a8f0",
      description: "Every signal for " + name + " stored permanently. Gap identified: " + gap.slice(0, 70) + ". Unlike agencies never forgets, never leaves.",
      metrics: ["ICP pattern recognition", "Zero knowledge loss", "Compounds with every deploy"],
    },
    {
      id: "03",
      name: "Intelligence Layer",
      tag: "AUTONOMOUS",
      color: "#f0a040",
      description: "Groq LLaMA 3.3 70B processes " + name + " signals. Pain: " + pain.slice(0, 70) + ". Motion: " + salesMotion + ". Stage: " + stage + ". AXON fit: " + String(axonFit) + "/10.",
      metrics: ["96% signal confidence", "Decisions ranked by impact", "2h/week founder time"],
    },
    {
      id: "04",
      name: "Data Sovereignty",
      tag: "YOUR INFRASTRUCTURE",
      color: "#f05870",
      description: "AXON deploys inside " + name + ". Your data never leaves. No third-party sharing. Current dependency: " + humans + ", " + hours + " on revenue ops.",
      metrics: ["Private deployment", "No vendor lock-in", "Data stays yours forever"],
    },
  ];

  return (
    <div className="relative min-h-svh px-4 pb-32 pt-20" style={{ background: "#040404" }}>
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 opacity-30" style={{ background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(200,240,96,0.06), transparent)" }} />
      <div className="relative z-10 mx-auto w-full max-w-4xl">

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: "#4a4845" }}>
          {"AXON · REVENUE INTELLIGENCE INFRASTRUCTURE · " + name.toUpperCase()}
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6 }} className="mb-3 font-display text-[clamp(28px,5vw,52px)] font-extrabold leading-[1.05] tracking-tight" style={{ color: "#dedad4" }}>
          {"This is not a tool."}
          <br />
          <span style={{ color: "#c8f060" }}>{"It is the operating system for " + name + " revenue."}</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.6 }} className="mb-6 max-w-xl font-mono text-[13px] leading-relaxed" style={{ color: "#4a4845" }}>
          {"AXON deploys as a permanent intelligence layer inside " + name + " infrastructure. Four components working autonomously so you spend 2h/week reviewing decisions, not executing them."}
        </motion.p>

        {scoutData && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.5 }} className="mb-8 rounded-lg border px-4 py-3" style={{ borderColor: "rgba(240,160,64,0.3)", background: "rgba(240,160,64,0.05)" }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] mb-2" style={{ color: "#f0a040" }}>
              {"Intelligence scan complete · " + name}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 font-mono text-[11px]">
              <div><span style={{ color: "#4a4845" }}>{"Signal: "}</span><span style={{ color: "#dedad4" }}>{signals.slice(0, 35) + "..."}</span></div>
              <div><span style={{ color: "#4a4845" }}>{"Stage: "}</span><span style={{ color: "#dedad4" }}>{stage}</span></div>
              <div><span style={{ color: "#4a4845" }}>{"AXON fit: "}</span><span style={{ color: "#c8f060" }}>{String(axonFit) + "/10"}</span></div>
              <div><span style={{ color: "#4a4845" }}>{"Motion: "}</span><span style={{ color: "#dedad4" }}>{salesMotion}</span></div>
            </div>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.5 }} className="mb-10 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {WHAT_IS_NOT.map((w) => (
            <div key={w.label} className="border p-3 text-center" style={{ background: w.icon === "yes" ? "rgba(200,240,96,0.06)" : "#0a0a0a", borderColor: w.icon === "yes" ? "rgba(200,240,96,0.3)" : "#1a1a1a" }}>
              <div className="font-mono text-[16px] font-bold" style={{ color: w.icon === "yes" ? "#c8f060" : "#2a2a2a" }}>{w.icon === "yes" ? "✓" : "✕"}</div>
              <div className="mt-1 font-mono text-[10px] font-bold leading-snug" style={{ color: w.icon === "yes" ? "#dedad4" : "#3a3a3a" }}>{w.label}</div>
              <div className="mt-1 font-mono text-[9px] leading-snug" style={{ color: w.icon === "yes" ? "#6a9a6a" : "#2a2a2a" }}>{w.sub}</div>
            </div>
          ))}
        </motion.div>

        <div className="mb-10 space-y-3">
          {LAYERS.map((layer, i) => (
            <motion.div key={layer.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="grid gap-0 overflow-hidden border sm:grid-cols-[200px_1fr]" style={{ borderColor: "#1a1a1a", background: "#080808" }}>
              <div className="border-b p-4 sm:border-b-0 sm:border-r" style={{ borderColor: "#1a1a1a", background: "#050505" }}>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: "#3a3a3a" }}>{"Layer " + layer.id}</div>
                <div className="mt-1 font-display text-[17px] font-bold" style={{ color: layer.color }}>{layer.name}</div>
                <div className="mt-1 inline-block px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em]" style={{ background: layer.color + "14", color: layer.color, border: "0.5px solid " + layer.color + "40" }}>{layer.tag}</div>
              </div>
              <div className="p-4">
                <p className="font-mono text-[12px] leading-relaxed" style={{ color: "#8a8a8a" }}>{layer.description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {layer.metrics.map((m) => (
                    <span key={m} className="font-mono text-[10px] px-2 py-0.5" style={{ background: "#0e0e0e", color: layer.color, border: "0.5px solid #1a1a1a" }}>{m}</span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.5 }} className="mb-10 border p-5" style={{ background: "#080808", borderColor: "#1a1a1a" }}>
          <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: "#4a4845" }}>{"How AXON deploys at " + name}</div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { n: "01", title: "Review 24h", desc: "We analyse your signal gap and confirm infrastructure fit. No commitment.", color: "#4a4845" },
              { n: "02", title: "Deploy 48h", desc: "AXON live. 2h founder context. Intelligence layer active from day 1. Then autonomous.", color: "#c8f060" },
              { n: "03", title: "Results 30d", desc: "Pipeline predictable or full refund. No fine print. No 90-day lock-in.", color: "#c8f060" },
            ].map((s) => (
              <div key={s.n} className="border p-4" style={{ borderColor: "#1a1a1a", background: "#050505" }}>
                <div className="font-mono text-[10px]" style={{ color: "#3a3a3a" }}>{s.n}</div>
                <div className="mt-1 font-mono text-[13px] font-bold" style={{ color: s.color }}>{s.title}</div>
                <div className="mt-2 font-mono text-[11px] leading-relaxed" style={{ color: "#4a4845" }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 0.5 }} className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Setup", value: "$15k-50k", sub: "One-time deployment" },
            { label: "Monthly", value: "$2k-5k", sub: "Signal layer + support" },
            { label: "Clients/month", value: "Max 10", sub: "By application only" },
            { label: "Guarantee", value: "30d refund", sub: "Pipeline predictable or free" },
          ].map((p) => (
            <div key={p.label} className="border p-3 text-center" style={{ background: "#080808", borderColor: "#1a1a1a" }}>
              <div className="font-mono text-[9px] uppercase tracking-[0.15em]" style={{ color: "#3a3a3a" }}>{p.label}</div>
              <div className="mt-1 font-mono text-[16px] font-bold" style={{ color: "#c8f060" }}>{p.value}</div>
              <div className="mt-1 font-mono text-[9px]" style={{ color: "#3a3a3a" }}>{p.sub}</div>
            </div>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.5 }} className="flex flex-col items-center gap-3">
          <button onClick={onContinue} className="group relative inline-flex items-center gap-3 overflow-hidden rounded-xl px-8 py-4 font-display text-[15px] font-bold transition-transform hover:-translate-y-0.5" style={{ background: "#c8f060", color: "#040404" }}>
            <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            {"See AXON deployed on " + name}
          </button>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: "#3a3a3a" }}>
            {"Live intelligence · real signals · your data"}
          </div>
        </motion.div>

      </div>
    </div>
  );
}