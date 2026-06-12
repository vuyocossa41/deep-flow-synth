import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface Props {
  domain: string;
  onQualified: (data: GateData) => void;
  onWaitlist: () => void;
}

export interface GateData {
  email: string;
  name: string;
  arr: string;
  teamSize: string;
}

const ARR_OPTIONS = [
  { value: "pre", label: "Pre-revenue", qualifies: false },
  { value: "100k", label: "$100k – $500k", qualifies: false },
  { value: "500k", label: "$500k – $2M", qualifies: true },
  { value: "2m", label: "$2M – $10M", qualifies: true },
  { value: "10m", label: "$10M+", qualifies: true },
];

const TEAM_OPTIONS = [
  { value: "solo", label: "Just me", qualifies: false },
  { value: "1-2", label: "1–2 people", qualifies: true },
  { value: "3-5", label: "3–5 people", qualifies: true },
  { value: "5+", label: "5+ people", qualifies: true },
];

type Step = "gate" | "waitlist" | "activating";

export function QualificationGate({ domain, onQualified, onWaitlist }: Props) {
  const [step, setStep] = useState<Step>("gate");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [arr, setArr] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistDone, setWaitlistDone] = useState(false);
  const [activatingStep, setActivatingStep] = useState(0);

  const arrOption = ARR_OPTIONS.find(o => o.value === arr);
  const teamOption = TEAM_OPTIONS.find(o => o.value === teamSize);
  const qualifies = arrOption?.qualifies && teamOption?.qualifies;
  const canSubmit = email.includes("@") && name.trim() && arr && teamSize;

  const handleSubmit = () => {
    if (!canSubmit) return;

    if (!qualifies) {
      setStep("waitlist");
      return;
    }

    // Qualified — show activation sequence then proceed
    setStep("activating");
    let s = 0;
    const iv = window.setInterval(() => {
      s++;
      setActivatingStep(s);
      if (s >= 4) {
        window.clearInterval(iv);
        setTimeout(() => {
          onQualified({ email, name, arr, teamSize });
        }, 600);
      }
    }, 700);
  };

  const handleWaitlist = () => {
    if (!waitlistEmail.includes("@")) return;
    setWaitlistDone(true);
    setTimeout(onWaitlist, 2000);
  };

  if (step === "waitlist") {
    return (
      <div className="relative min-h-svh flex items-center justify-center px-4" style={{ background: "#040404" }}>
        <div aria-hidden className="pointer-events-none fixed inset-0 z-0" style={{ background: "rgba(255,40,40,0.03)" }} />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {!waitlistDone ? (
            <>
              <div className="mb-8 text-center">
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] mb-4" style={{ color: "#4a4845" }}>
                  AXON · ACCESS RESTRICTED
                </div>
                <h2 className="font-mono text-[22px] font-bold" style={{ color: "#dedad4" }}>
                  AXON is built for companies<br />with active revenue infrastructure.
                </h2>
                <p className="mt-3 font-mono text-[12px] leading-relaxed" style={{ color: "#4a4845" }}>
                  Current deployments require $500k+ ARR and an active sales motion.
                  We're building an early-stage programme — join the list.
                </p>
              </div>

              <div className="border p-6" style={{ background: "#0a0a0a", borderColor: "#1a1a1a" }}>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] mb-4" style={{ color: "#4a4845" }}>
                  Early-stage waitlist
                </div>
                <input
                  value={waitlistEmail}
                  onChange={e => setWaitlistEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-transparent border px-3 py-2.5 font-mono text-[13px] outline-none mb-3"
                  style={{ borderColor: "#2a2a2a", color: "#dedad4" }}
                />
                <button
                  onClick={handleWaitlist}
                  disabled={!waitlistEmail.includes("@")}
                  className="w-full py-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] transition-opacity disabled:opacity-30"
                  style={{ background: "#c8f060", color: "#040404" }}
                >
                  Join waitlist →
                </button>
              </div>

              <div className="mt-4 text-center font-mono text-[10px]" style={{ color: "#2a2a2a" }}>
                No spam. We notify you when early-stage programme opens.
              </div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center border p-8"
              style={{ background: "#0a0a0a", borderColor: "#1a1a1a" }}
            >
              <div className="font-mono text-[32px] mb-4" style={{ color: "#c8f060" }}>✓</div>
              <div className="font-mono text-[14px] font-bold" style={{ color: "#dedad4" }}>
                You're on the list.
              </div>
              <div className="mt-2 font-mono text-[11px]" style={{ color: "#4a4845" }}>
                We'll notify you when the early-stage programme opens.
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    );
  }

  if (step === "activating") {
    const steps = [
      `→ Identity verified · ${email}`,
      `→ Scanning ${domain} signal footprint...`,
      `→ Intelligence layer initialising...`,
      `→ Revenue infrastructure gap analysis ready.`,
    ];
    return (
      <div className="relative min-h-svh flex items-center justify-center px-4" style={{ background: "#040404" }}>
        <div className="w-full max-w-md border p-6" style={{ background: "#040404", borderColor: "#1a1a1a" }}>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] mb-4" style={{ color: "#c8f060" }}>
            AXON · ACCESS GRANTED · INITIALISING
          </div>
          <ul className="space-y-2">
            {steps.slice(0, activatingStep).map((s, i) => (
              <motion.li
                key={s}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                className="font-mono text-[12px]"
                style={{ color: i === activatingStep - 1 ? "#c8f060" : "#dedad4" }}
              >
                {s}
                {i === activatingStep - 1 && <span className="ml-1 animate-pulse">_</span>}
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-svh flex items-center justify-center px-4 py-16" style={{ background: "#040404" }}>
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0" style={{ background: "rgba(255,40,40,0.02)" }} />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        {/* Header */}
        <div className="mb-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] mb-3" style={{ color: "#4a4845" }}>
            AXON · INTELLIGENCE GATE · {domain.toUpperCase()}
          </div>
          <h2 className="font-mono text-[24px] font-bold leading-tight" style={{ color: "#dedad4" }}>
            Before we analyse {domain},<br />
            <span style={{ color: "#c8f060" }}>confirm your deployment profile.</span>
          </h2>
          <p className="mt-3 font-mono text-[12px]" style={{ color: "#4a4845" }}>
            AXON deploys inside companies with active revenue operations.
            This ensures the intelligence we generate is relevant to your infrastructure.
          </p>
        </div>

        <div className="border p-6 space-y-6" style={{ background: "#0a0a0a", borderColor: "#1a1a1a" }}>

          {/* Name */}
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] mb-2" style={{ color: "#4a4845" }}>
              Your name
            </div>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="First name"
              className="w-full bg-transparent border px-3 py-2.5 font-mono text-[13px] outline-none transition-colors"
              style={{ borderColor: name ? "#c8f060" : "#2a2a2a", color: "#dedad4" }}
            />
          </div>

          {/* Email */}
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] mb-2" style={{ color: "#4a4845" }}>
              Professional email
            </div>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              type="email"
              className="w-full bg-transparent border px-3 py-2.5 font-mono text-[13px] outline-none transition-colors"
              style={{ borderColor: email.includes("@") ? "#c8f060" : "#2a2a2a", color: "#dedad4" }}
            />
          </div>

          {/* ARR */}
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] mb-2" style={{ color: "#4a4845" }}>
              Annual recurring revenue
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ARR_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => setArr(o.value)}
                  className="border px-3 py-2 font-mono text-[11px] text-left transition-all"
                  style={{
                    borderColor: arr === o.value ? "#c8f060" : "#2a2a2a",
                    background: arr === o.value ? "rgba(200,240,96,0.08)" : "transparent",
                    color: arr === o.value ? "#c8f060" : "#4a4845",
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Team size */}
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] mb-2" style={{ color: "#4a4845" }}>
              Sales team size
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TEAM_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => setTeamSize(o.value)}
                  className="border px-3 py-2 font-mono text-[11px] text-left transition-all"
                  style={{
                    borderColor: teamSize === o.value ? "#c8f060" : "#2a2a2a",
                    background: teamSize === o.value ? "rgba(200,240,96,0.08)" : "transparent",
                    color: teamSize === o.value ? "#c8f060" : "#4a4845",
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Qualification preview */}
          <AnimatePresence>
            {arr && teamSize && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t pt-4"
                style={{ borderColor: "#1a1a1a" }}
              >
                {qualifies ? (
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[18px]" style={{ color: "#c8f060" }}>✓</span>
                    <div>
                      <div className="font-mono text-[11px] font-bold" style={{ color: "#c8f060" }}>
                        Profile confirmed · AXON deployment available
                      </div>
                      <div className="font-mono text-[10px]" style={{ color: "#4a4845" }}>
                        Your intelligence assessment is ready to generate.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[18px]" style={{ color: "#f05870" }}>○</span>
                    <div>
                      <div className="font-mono text-[11px] font-bold" style={{ color: "#f05870" }}>
                        Early-stage profile detected
                      </div>
                      <div className="font-mono text-[10px]" style={{ color: "#4a4845" }}>
                        AXON deploys at $500k+ ARR. We'll add you to the early-stage waitlist.
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* CTA */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full py-3.5 font-mono text-[12px] font-bold uppercase tracking-[0.2em] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: canSubmit ? (qualifies ? "#c8f060" : "#f05870") : "#1a1a1a",
              color: canSubmit ? "#040404" : "#4a4845",
            }}
          >
            {!canSubmit
              ? "Complete your profile →"
              : qualifies
                ? `Analyse ${domain} →`
                : "Join early-stage waitlist →"}
          </button>
        </div>

        <div className="mt-4 text-center font-mono text-[10px]" style={{ color: "#2a2a2a" }}>
          Max 10 deployments/month · $500k+ ARR required · Your data stays in your infrastructure
        </div>
      </motion.div>
    </div>
  );
}