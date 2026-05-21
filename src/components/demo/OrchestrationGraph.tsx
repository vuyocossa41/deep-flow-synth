import { motion } from "framer-motion";

interface Node {
  id: string;
  x: number;
  y: number;
  label: string;
  color: string;
  active?: boolean;
}
interface Edge {
  from: string;
  to: string;
}

const nodes: Node[] = [
  { id: "scout", x: 50, y: 70, label: "Scout", color: "oklch(0.85 0.22 152)" },
  { id: "writer", x: 175, y: 40, label: "Writer", color: "oklch(0.85 0.22 152)" },
  { id: "memory", x: 175, y: 130, label: "Memory", color: "oklch(0.72 0.16 250)" },
  { id: "finance", x: 300, y: 70, label: "Finance", color: "oklch(0.72 0.16 250)" },
  { id: "decision", x: 425, y: 100, label: "Decision", color: "oklch(0.75 0.17 295)" },
];

const edges: Edge[] = [
  { from: "scout", to: "writer" },
  { from: "scout", to: "memory" },
  { from: "writer", to: "decision" },
  { from: "memory", to: "finance" },
  { from: "finance", to: "decision" },
];

function getNode(id: string) {
  return nodes.find((n) => n.id === id)!;
}

interface Props {
  active?: string;
  height?: number;
}

export function OrchestrationGraph({ active = "scout", height = 180 }: Props) {
  return (
    <svg viewBox="0 0 500 200" className="w-full" style={{ height }}>
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 Z" fill="oklch(0.62 0.03 250)" />
        </marker>
      </defs>

      {edges.map((e, i) => {
        const a = getNode(e.from);
        const b = getNode(e.to);
        const isActive = e.from === active || e.to === active;
        return (
          <g key={i}>
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={isActive ? "oklch(0.85 0.22 152 / 0.6)" : "oklch(0.28 0.03 250 / 0.7)"}
              strokeWidth={1}
              strokeDasharray="4 4"
              className={isActive ? "animate-flow" : ""}
              markerEnd="url(#arrow)"
            />
          </g>
        );
      })}

      {nodes.map((n) => {
        const isActive = n.id === active;
        return (
          <g key={n.id}>
            {isActive && (
              <motion.circle
                cx={n.x}
                cy={n.y}
                r={26}
                fill="none"
                stroke={n.color}
                strokeOpacity={0.4}
                initial={{ r: 18, opacity: 0.6 }}
                animate={{ r: 32, opacity: 0 }}
                transition={{ duration: 1.6, repeat: Infinity }}
              />
            )}
            <circle
              cx={n.x}
              cy={n.y}
              r={isActive ? 16 : 14}
              fill="oklch(0.16 0.022 245)"
              stroke={n.color}
              strokeWidth={isActive ? 2 : 1}
              opacity={isActive ? 1 : 0.65}
            />
            <text
              x={n.x}
              y={n.y + 4}
              textAnchor="middle"
              fontFamily="var(--font-mono)"
              fontSize="9"
              fill={isActive ? n.color : "oklch(0.62 0.03 250)"}
              fontWeight="600"
            >
              {n.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
