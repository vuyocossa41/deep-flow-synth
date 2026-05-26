type Phase = "chaos" | "activation" | "intelligence";

interface Props {
  phase: Phase;
  onRestart: () => void;
}

const PHASES: { id: Phase; label: string }[] = [
  { id: "chaos", label: "CHAOS" },
  { id: "activation", label: "ACTIVATION" },
  { id: "intelligence", label: "INTELLIGENCE" },
];

export function PhaseHeader({ phase, onRestart }: Props) {
  return (
    <header
      className="fixed inset-x-0 top-0 z-[45] flex h-10 items-center justify-between border-b px-4 backdrop-blur-md"
      style={{
        background: "rgba(4, 4, 4, 0.72)",
        borderColor: "rgba(26, 26, 26, 0.9)",
      }}
    >
      <button
        type="button"
        onClick={onRestart}
        className="font-mono text-[10px] uppercase tracking-[0.2em] transition-opacity hover:opacity-80"
        style={{ color: "#dedad4" }}
      >
        AXON · FOUNDEROS
      </button>
      <nav
        className="hidden items-center gap-1 font-mono text-[9px] uppercase tracking-[0.14em] sm:flex"
        aria-label="Demo phase"
      >
        {PHASES.map((p, i) => (
          <span key={p.id} className="flex items-center gap-1">
            {i > 0 && (
              <span style={{ color: "#4a4845" }} aria-hidden>
                →
              </span>
            )}
            <span
              style={{
                color: phase === p.id ? "#c8f060" : "#4a4845",
              }}
            >
              [ {p.label} ]
            </span>
          </span>
        ))}
      </nav>
      <div
        className="font-mono text-[9px] uppercase tracking-[0.14em] sm:hidden"
        style={{ color: "#c8f060" }}
      >
        [ {PHASES.find((p) => p.id === phase)?.label ?? phase.toUpperCase()} ]
      </div>
    </header>
  );
}
