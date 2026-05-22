import { motion } from "framer-motion";

interface Node {
  id: string;
  x: number;
  y: number;
  label: string;
  short: string;
  hue: number;
}
interface Edge {
  from: string;
  to: string;
}

// 6-agent neural topology — central "core" + orbiting agents
const CORE: Node = { id: "core", x: 250, y: 110, label: "Core", short: "OS", hue: 152 };
const ORBIT: Node[] = [
  { id: "signal", x: 70, y: 50, label: "Signal Hunter", short: "SIG", hue: 152 },
  { id: "icp", x: 70, y: 170, label: "ICP Intelligence", short: "ICP", hue: 152 },
  { id: "market", x: 250, y: 25, label: "Market Analyst", short: "MKT", hue: 250 },
  { id: "campaign", x: 250, y: 195, label: "Campaign Orch.", short: "CMP", hue: 250 },
  { id: "revenue", x: 430, y: 50, label: "Revenue Opt.", short: "REV", hue: 295 },
  { id: "strategy", x: 430, y: 170, label: "Strategy Engine", short: "STR", hue: 295 },
];
const NODES: Node[] = [CORE, ...ORBIT];

// every orbit ↔ core, plus a few cross-links
const EDGES: Edge[] = [
  ...ORBIT.map((n) => ({ from: n.id, to: "core" })),
  { from: "signal", to: "icp" },
  { from: "market", to: "campaign" },
  { from: "revenue", to: "strategy" },
  { from: "signal", to: "market" },
  { from: "campaign", to: "revenue" },
];

function getNode(id: string) {
  return NODES.find((n) => n.id === id)!;
}

interface Props {
  active?: string | string[];
  height?: number;
}

export function OrchestrationGraph({ active = "signal", height = 220 }: Props) {
  const activeSet = new Set(Array.isArray(active) ? active : [active]);

  return (
    <svg viewBox="0 0 500 220" className="w-full" style={{ height }}>
      <defs>
        <radialGradient id="coreFill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.85 0.22 152)" stopOpacity={0.9} />
          <stop offset="100%" stopColor="oklch(0.85 0.22 152)" stopOpacity={0.05} />
        </radialGradient>
        <marker
          id="arrow2"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto"
        >
          <path d="M0,0 L10,5 L0,10 Z" fill="oklch(0.62 0.03 250 / 0.6)" />
        </marker>
      </defs>

      {/* edges */}
      {EDGES.map((e, i) => {
        const a = getNode(e.from);
        const b = getNode(e.to);
        const isActive = activeSet.has(e.from) || activeSet.has(e.to);
        return (
          <g key={i}>
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={
                isActive ? "oklch(0.85 0.22 152 / 0.55)" : "oklch(0.32 0.03 250 / 0.55)"
              }
              strokeWidth={isActive ? 1.1 : 0.8}
              strokeDasharray="3 5"
              className={isActive ? "animate-flow" : ""}
            />
          </g>
        );
      })}

      {/* core */}
      <motion.circle
        cx={CORE.x}
        cy={CORE.y}
        r={36}
        fill="url(#coreFill)"
        animate={{ opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <circle
        cx={CORE.x}
        cy={CORE.y}
        r={22}
        fill="oklch(0.16 0.022 245)"
        stroke="oklch(0.85 0.22 152)"
        strokeWidth={1.2}
      />
      <text
        x={CORE.x}
        y={CORE.y + 4}
        textAnchor="middle"
        fontFamily="var(--font-mono)"
        fontSize="10"
        fill="oklch(0.85 0.22 152)"
        fontWeight={700}
      >
        OS
      </text>

      {/* orbit agents */}
      {ORBIT.map((n) => {
        const isActive = activeSet.has(n.id);
        const color = `oklch(0.85 0.20 ${n.hue})`;
        return (
          <g key={n.id}>
            {isActive && (
              <motion.circle
                cx={n.x}
                cy={n.y}
                r={20}
                fill="none"
                stroke={color}
                strokeOpacity={0.5}
                initial={{ r: 16, opacity: 0.5 }}
                animate={{ r: 32, opacity: 0 }}
                transition={{ duration: 1.6, repeat: Infinity }}
              />
            )}
            <circle
              cx={n.x}
              cy={n.y}
              r={isActive ? 16 : 14}
              fill="oklch(0.18 0.024 248)"
              stroke={color}
              strokeOpacity={isActive ? 1 : 0.55}
              strokeWidth={isActive ? 1.6 : 1}
            />
            <text
              x={n.x}
              y={n.y + 3}
              textAnchor="middle"
              fontFamily="var(--font-mono)"
              fontSize="8.5"
              fill={isActive ? color : "oklch(0.62 0.03 250)"}
              fontWeight={600}
            >
              {n.short}
            </text>
            <text
              x={n.x}
              y={n.y + (n.y > CORE.y ? 30 : -22)}
              textAnchor="middle"
              fontFamily="var(--font-mono)"
              fontSize="7.5"
              fill="oklch(0.62 0.03 250 / 0.85)"
            >
              {n.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
