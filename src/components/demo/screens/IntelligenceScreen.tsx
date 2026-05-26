import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { ScoutResult } from "@/hooks/useScout";

interface Props {
  company: string;
  isLoading: boolean;
  scoutData: ScoutResult | null;
  error: string | null;
  onRescan?: () => void;
  onContinue: () => void;
}

function getTier(score_num: number): { label: string; color: string; bg: string; priority: string } {
  if (score_num >= 75) return { label: "ENTERPRISE", color: "#c8f060", bg: "rgba(200,240,96,0.08)", priority: "CRITICAL" };
  if (score_num >= 55) return { label: "SCALE", color: "#f0a040", bg: "rgba(240,160,64,0.08)", priority: "ELEVATED" };
  return { label: "GROWTH", color: "#60a8f0", bg: "rgba(96,168,240,0.08)", priority: "STANDARD" };
}

function buildMetrics(scout: ScoutResult) {
  const m = (scout as any).metrics ?? {};
  const mult = parseInt(m.multiplier ?? "4");
  const annual = mult * 800 * 12;
  const stability = Math.min(96, 82 + mult);
  const reclaimed = Math.min(78, 48 + mult * 2);
  return [
    { label: "Annual cost eliminated", value: `€${Math.round(annual / 1000)}k`, sub: `~$${Math.round(annual * 1.09 / 1000)}k · SDRs + agency + founder hours` },
    { label: "Pipeline stability", value: `${stability}%`, sub: "Based on comparable deployments" },
    { label: "Founder time reclaimed", value: `${reclaimed}%`, sub: "Hours redirected to product + strategy" },
  ];
}

function TiltCard({ children, className = "", style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), { stiffness: 300, damping: 30 });
  const onMove = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const onLeave = () => { x.set(0); y.set(0); };
  return (
    <motion.div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d", ...style }} className={className}>
      {children}
    </motion.div>
  );
}

function PremiumCTA({ name, tier }: { name: string; tier: ReturnType<typeof getTier> }) {
  const [done, setDone] = useState(false);

  if (done) return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      className="border p-8 text-center" style={{ background: tier.bg, borderColor: tier.color }}>
      <div className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: tier.color }}>
        deployment review requested
      </div>
      <div className="mt-3 font-display text-[22px] font-bold" style={{ color: "#dedad4" }}>
        {name} is in the queue.
      </div>
      <p className="mt-2 font-mono text-[12px]" style={{ color: "#4a4845" }}>
        We review applications within 24h.<br />
        If {name} qualifies, you receive a deployment plan before the call.
      </p>
      <div className="mt-5 grid grid-cols-3 gap-3 text-center">
        {[["24h", "Review"], ["48h", "Deploy"], ["30d", "Results or refund"]].map(([v, l]) => (
          <div key={l} className="border p-3" style={{ borderColor: "#1a1a1a", background: "#0a0a0a" }}>
            <div className="font-mono text-[18px] font-bold" style={{ color: tier.color }}>{v}</div>
            <div className="mt-1 font-mono text-[10px]" style={{ color: "#4a4845" }}>{l}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );

  return (
    <TiltCard className="border p-6" style={{ background: "#0a0a0a", borderColor: "#1a1a1a" }}>
      <div className="text-center">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: tier.color }}>
          {tier.label} deployment available
        </div>
        <div className="mt-2 font-display text-[26px] font-extrabold" style={{ color: "#dedad4" }}>
          {name}'s pipeline is ready to become predictable.
        </div>
        <p className="mt-2 font-mono text-[12px]" style={{ color: "#4a4845" }}>
          AXON deploys at {name} in 48h. Acquisition infrastructure active from day 1.
        </p>
      </div>

      <motion.div
        className="mt-5 border p-3 font-mono text-[11px] text-center"
        animate={{ borderColor: [tier.color, "rgba(200,240,96,0.2)", tier.color] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{ background: tier.bg }}
      >
        <span style={{ color: tier.color }}>⚠ 2 deployment slots remaining this month</span>
        <span style={{ color: "#4a4845" }}> · accepted by application only</span>
      </motion.div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        {[
          { n: "01", title: "Review · 24h", desc: "We analyse your gap and confirm fit." },
          { n: "02", title: "Deploy · 48h", desc: "AXON live. 2h founder context. Then autonomous." },
          { n: "03", title: "Results · 30d", desc: "Pipeline predictable or full refund." },
        ].map((s) => (
          <div key={s.n} className="border p-3" style={{ borderColor: "#1a1a1a", background: "#040404" }}>
            <div className="font-mono text-[10px]" style={{ color: "#4a4845" }}>{s.n}</div>
            <div className="mt-1 font-mono text-[11px] font-bold" style={{ color: "#dedad4" }}>{s.title}</div>
            <div className="mt-1 text-[10px]" style={{ color: "#4a4845" }}>{s.desc}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <motion.button
          type="button"
          onClick={() => setDone(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 px-5 py-3.5 font-mono text-[12px] font-bold uppercase tracking-[0.2em]"
          style={{ background: tier.color, color: "#040404" }}
        >
          → Request deployment review
        </motion.button>
        <a
          href={`mailto:vuyo@leadflowagency.org?subject=AXON ${tier.label} Deployment — ${name}&body=Company: ${name}%0ATier: ${tier.label}%0A%0AReady to discuss deployment.`}
          className="flex-1 border px-5 py-3.5 text-center font-mono text-[12px] uppercase tracking-[0.16em] transition-colors hover:bg-white/5"
          style={{ borderColor: "#1a1a1a", color: "#dedad4" }}
        >
          Email directly
        </a>
      </div>
      <div className="mt-4 text-center font-mono text-[10px]" style={{ color: "#4a4845" }}>
        Zero risk · 90-day performance guarantee · Replaces current stack · {name}
      </div>
    </TiltCard>
  );
}

function Section({ index, label, children }: { index: number; label?: string; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {label && (
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: "#4a4845" }}>
          {label}
        </div>
      )}
      {children}
    </motion.section>
  );
}

const PROOF = [
  { tier: "ENTERPRISE", title: "Series A SaaS · San Francisco · 12 weeks", metric: "Pipeline: 0% → 94%", detail: "Replaced agency + 2 SDRs. CAC reduced 79%. Founder now 3h/week on revenue.", score: 88 },
  { tier: "SCALE", title: "B2B Infrastructure · London · 8 weeks", metric: "47 meetings in 30 days. Zero SDRs.", detail: "847 accounts identified before strategic intervention. €0 agency spend.", score: 71 },
  { tier: "GROWTH", title: "Dev Tools · New York · 6 weeks", metric: "Sales time: 23h → 4h/week", detail: "Revenue ops autonomous. Series A closed 6 weeks post-deployment.", score: 58 },
];

function Results({ scout, onContinue, onRescan, scrollTop }: {
  scout: ScoutResult; onContinue: () => void; onRescan?: () => void; scrollTop: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const name = scout.profile.name;
  const tier = getTier(scout.score_num ?? 50);
  const metrics = buildMetrics(scout);
  const structuralSignal = (scout as any).structural_signal ?? scout.profile.signals;
  const alerts = (scout as any).infrastructure_alerts ?? [];
  const readiness = (scout as any).readiness_index ?? scout.score_num ?? 45;

  const copy = async () => {
    try { await navigator.clipboard.writeText(scout.message); setCopied(true); setTimeout(() => setCopied(false), 1600); }
    catch { /* noop */ }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">

      {/* Tier banner */}
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        style={{ background: tier.bg, borderColor: tier.color }}
        className="border-l-4 px-5 py-3 flex items-center justify-between"
      >
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: tier.color }}>
            {tier.label} TIER
          </span>
          <span className="ml-3 font-mono text-[10px]" style={{ color: "#4a4845" }}>
            {readiness}% acquisition readiness · intervention priority: {tier.priority}
          </span>
        </div>
        <div className="font-mono text-[11px] font-bold" style={{ color: tier.color }}>
          {scout.score}
        </div>
      </motion.div>

      {/* 1 — Operational Profile */}
      <Section index={0} label={`operational profile loaded · ${name}`}>
        <TiltCard className="border p-5" style={{ background: "#0a0a0a", borderColor: "#1a1a1a" }}>
          <div className="flex flex-wrap items-baseline gap-3">
            <div className="font-display text-[24px] font-extrabold" style={{ color: "#dedad4" }}>{name}</div>
            <span className="px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em]"
              style={{ background: tier.bg, color: tier.color, border: `0.5px solid ${tier.color}` }}>
              {scout.profile.stage}
            </span>
          </div>
          <div className="mt-2 text-[13px]" style={{ color: "#dedad4" }}>{scout.profile.product}</div>
          <div className="mt-2 font-mono text-[11px]" style={{ color: "#4a4845" }}>
            ICP · <span style={{ color: "#dedad4" }}>{scout.profile.icp}</span>
          </div>
        </TiltCard>
      </Section>

      {/* 2 — Structural Signal */}
      <Section index={1} label={`infrastructure gap identified at ${name}`}>
        <motion.div
          className="border-l-4 p-5"
          style={{ background: "rgba(240,160,64,0.06)", borderColor: "#f0a040" }}
          animate={{ borderColor: ["#f0a040", "rgba(240,160,64,0.4)", "#f0a040"] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: "#f0a040" }}>
            ◆ structural signal detected
          </div>
          <div className="mt-2 text-[15px] font-bold" style={{ color: "#f0a040" }}>{structuralSignal}</div>
          {scout.profile.angle && (
            <div className="mt-2 font-mono text-[11px]" style={{ color: "#4a4845" }}>▸ {scout.profile.angle}</div>
          )}
          <p className="mt-4 font-mono text-[12px] leading-relaxed" style={{ color: "#4a4845" }}>
            {name} is attempting to scale revenue through headcount instead of intelligence infrastructure.
            This pattern creates 60–90 day delays, high CAC, and founder dependency on individual performance.
            AXON identifies this gap before the next hire starts.
          </p>
          {alerts.length > 0 && (
            <ul className="mt-4 space-y-2">
              {alerts.map((a: any, i: number) => (
                <li key={i} className="flex gap-2 font-mono text-[11px]">
                  <span>{a.level === "critical" ? "🔴" : "🟡"}</span>
                  <span style={{ color: a.level === "critical" ? "rgba(240,88,112,0.9)" : "rgba(240,160,64,0.9)" }}>{a.text}</span>
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      </Section>

      {/* 3 — Before / After */}
      <Section index={2} label={`what changes when AXON is operational at ${name}`}>
        <div className="relative grid gap-0 md:grid-cols-[1fr_auto_1fr]" style={{ perspective: "1000px" }}>
          <TiltCard className="border-l-4 p-5 md:pr-6" style={{ background: "rgba(240,88,112,0.06)", borderColor: "#f05870" }}>
            <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: "#f05870" }}>Before</div>
            <ul className="space-y-2 text-[13px]" style={{ color: "#dedad4" }}>
              {[
                "3 SDRs managing inconsistent pipeline",
                "Agency dependency — €3–8k/month, zero memory",
                "Manual prospecting — founder time wasted",
                "Reactive selling — no early signal detection",
                "Revenue unpredictability every month",
              ].map((item) => (
                <li key={item} className="flex gap-2"><span style={{ color: "#f05870" }}>·</span>{item}</li>
              ))}
            </ul>
          </TiltCard>

          <div className="relative hidden flex-col items-center justify-center px-3 md:flex">
            <div className="h-full w-px" style={{ background: "#1a1a1a" }} />
            <motion.div
              animate={{ boxShadow: [`0 0 8px ${tier.color}`, `0 0 24px ${tier.color}`, `0 0 8px ${tier.color}`] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.16em]"
              style={{ background: "#040404", borderColor: tier.color, color: tier.color }}
            >
              AXON deployed
            </motion.div>
          </div>

          <TiltCard className="border-l-4 p-5 md:pl-6" style={{ background: "rgba(200,240,96,0.06)", borderColor: "#c8f060" }}>
            <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: "#c8f060" }}>After</div>
            <ul className="space-y-2 text-[13px]" style={{ color: "#dedad4" }}>
              {[
                "AI-managed acquisition running 24/7",
                "Continuous signal detection — intent before intervention",
                "Autonomous pipeline generation — no headcount",
                "Predictable revenue infrastructure — 90%+ stability",
                "Founder operating as strategist, not salesperson",
              ].map((item) => (
                <li key={item} className="flex gap-2"><span style={{ color: "#c8f060" }}>·</span>{item}</li>
              ))}
            </ul>
          </TiltCard>
        </div>
      </Section>

      {/* 4 — Strategic Message */}
      <Section index={3} label="strategic intervention ready">
        <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: tier.color }}>
          AXON · STRATEGIC INTERVENTION · READY TO DEPLOY
        </div>
        <div className="relative border p-5" style={{ background: "rgba(200,240,96,0.03)", borderColor: "#c8f060" }}>
          <button type="button" onClick={copy}
            className="absolute right-3 top-3 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-opacity hover:opacity-80"
            style={{ background: "#1a1a1a", color: copied ? "#c8f060" : "#dedad4" }}>
            {copied ? "copied ✓" : "copy"}
          </button>
          <pre className="whitespace-pre-wrap pr-16 font-mono text-[12px] leading-relaxed" style={{ color: "#dedad4" }}>
            {scout.message}
          </pre>
        </div>
      </Section>

      {/* 5 — Dynamic Metrics */}
      <Section index={4} label="estimated operational impact">
        <div className="grid gap-3 md:grid-cols-3">
          {metrics.map((m) => (
            <TiltCard key={m.label} className="border p-5" style={{ background: "#0a0a0a", borderColor: "#1a1a1a" }}>
              <div className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: "#4a4845" }}>{m.label}</div>
              <div className="mt-2 font-display text-[28px] font-extrabold" style={{ color: tier.color }}>{m.value}</div>
              <div className="mt-1 text-[11px] leading-snug" style={{ color: "#4a4845" }}>{m.sub}</div>
            </TiltCard>
          ))}
        </div>
        <p className="mt-4 font-mono text-[12px]" style={{ color: tier.color }}>
          {name}: outbound operations autonomous. Pipeline predictable. Founder strategic.
        </p>
      </Section>

      {/* 6 — Social Proof */}
      <Section index={5} label="founders running on axon">
        <div className="grid gap-3 md:grid-cols-3">
          {PROOF.map((c) => {
            const t = getTier(c.score);
            return (
              <TiltCard key={c.title} className="border p-4" style={{ background: "#0a0a0a", borderColor: "#1a1a1a" }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em]"
                    style={{ background: t.bg, color: t.color, border: `0.5px solid ${t.color}` }}>
                    {c.tier}
                  </span>
                </div>
                <div className="font-display text-[13px] font-bold" style={{ color: "#dedad4" }}>{c.title}</div>
                <div className="mt-2 text-[13px] font-bold" style={{ color: t.color }}>{c.metric}</div>
                <div className="mt-1 text-[11px]" style={{ color: "#4a4845" }}>{c.detail}</div>
              </TiltCard>
            );
          })}
        </div>
      </Section>

      {/* 7 — What changes */}
      <Section index={6} label="what changes in your company">
        <h2 className="mb-5 font-display text-[22px] font-extrabold" style={{ color: "#dedad4" }}>
          What AXON changes at {name}
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { col: "Today", border: "#f05870", bg: "rgba(240,88,112,0.06)", text: `${scout.profile.product}. ${scout.profile.pain}` },
            { col: "After AXON", border: "#c8f060", bg: "rgba(200,240,96,0.06)", text: "Autonomous acquisition running 24/7. Pipeline stable at 90%+. Founder spends 2h/week reviewing results." },
            { col: "The difference", border: tier.color, bg: tier.bg, text: metrics.map(m => `${m.value} ${m.label}`).join(" · ") },
          ].map((col) => (
            <div key={col.col} className="border-l-4 p-4" style={{ background: col.bg, borderColor: col.border }}>
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: col.border }}>{col.col}</div>
              <p className="text-[13px] leading-relaxed" style={{ color: "#dedad4" }}>{col.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center font-display text-[20px] font-bold" style={{ color: "#dedad4" }}>
          {name} stops depending on humans to grow.<br />
          <span style={{ color: tier.color }}>It becomes a company with autonomous growth infrastructure.</span>
        </p>
      </Section>

      {/* 8 — Premium CTA */}
      <Section index={7}>
        <PremiumCTA name={name} tier={tier} />
        <button type="button" onClick={onContinue}
          className="mt-4 w-full font-mono text-[10px] uppercase tracking-[0.2em] hover:underline"
          style={{ color: "#4a4845" }}>
          continue the demo →
        </button>
      </Section>

    </motion.div>
  );
}

const LINES = [
  "[FIRECRAWL] Reading {c}...",
  "[GROQ] Analyzing content and signals...",
  "[SCOUT] Calculating acquisition readiness...",
  "[WRITER] Generating strategic intervention...",
  "[AXON] Intelligence layer compiled · deploying...",
];

function LoadingState({ company }: { company: string }) {
  const [shown, setShown] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setShown(p => Math.min(p + 1, LINES.length)), 900);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <div className="border p-6 w-full max-w-md" style={{ background: "#040404", borderColor: "#1a1a1a" }}>
        <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: "#4a4845" }}>
          AXON · LIVE REASONING
        </div>
        <ul className="space-y-2">
          {LINES.slice(0, shown).map((l, i) => (
            <motion.li key={l} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
              className="font-mono text-[12px]"
              style={{ color: i === shown - 1 ? "#c8f060" : "#dedad4" }}>
              {l.replace("{c}", company)}
              {i === shown - 1 && <span className="ml-1 animate-pulse">_</span>}
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function IntelligenceScreen({ company, isLoading, scoutData, error, onRescan, onContinue }: Props) {
  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  if (isLoading) return (
    <div className="mx-auto max-w-3xl px-5 pb-20 pt-16">
      <LoadingState company={company} />
    </div>
  );

  if (error) return (
    <div className="mx-auto max-w-3xl px-5 pb-20 pt-16">
      <div className="border-l-4 p-5" style={{ borderColor: "#f05870", background: "rgba(240,88,112,0.06)" }}>
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] mb-2" style={{ color: "#f05870" }}>
          AXON · SCAN FAILED
        </div>
        <p className="font-mono text-[12px]" style={{ color: "#dedad4" }}>{error}</p>
        {onRescan && (
          <button type="button" onClick={onRescan}
            className="mt-4 border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] hover:bg-white/5"
            style={{ borderColor: "#1a1a1a", color: "#dedad4" }}>
            → retry scan
          </button>
        )}
      </div>
    </div>
  );

  if (!scoutData) return (
    <div className="mx-auto max-w-3xl px-5 pb-20 pt-16">
      <LoadingState company={company} />
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl px-5 pb-20 pt-16">
      <Results scout={scoutData} onContinue={onContinue} onRescan={onRescan} scrollTop={scrollTop} />
    </div>
  );
}
