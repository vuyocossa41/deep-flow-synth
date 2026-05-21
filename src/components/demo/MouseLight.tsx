import { useEffect, useState } from "react";

/**
 * Subtle radial spotlight that follows the cursor.
 * Hidden on touch / reduced motion. Uses pointer-events:none so it never breaks UX.
 */
export function MouseLight() {
  const [pos, setPos] = useState({ x: -1000, y: -1000 });
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const isFine = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!isFine || reduced) return;
    setEnabled(true);
    const onMove = (e: PointerEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  if (!enabled) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-300"
      style={{
        background: `radial-gradient(420px circle at ${pos.x}px ${pos.y}px, oklch(0.85 0.22 152 / 0.07), transparent 60%)`,
      }}
    />
  );
}
