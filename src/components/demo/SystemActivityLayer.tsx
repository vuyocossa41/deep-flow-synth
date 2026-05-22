import { useEffect, useRef } from "react";

/**
 * Ambient AI infrastructure layer.
 * Canvas-based: flowing particles along invisible vectors, soft node pulses,
 * occasional "signal pings" sweeping across the field.
 * Respects prefers-reduced-motion. Pointer-events:none, sits behind everything.
 */
export function SystemActivityLayer() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; hue: number };
    type Node = { x: number; y: number; r: number; phase: number; hue: number };
    type Ping = { x: number; y: number; r: number; max: number; hue: number; alive: boolean };

    const particles: Particle[] = [];
    const nodes: Node[] = [];
    const pings: Ping[] = [];

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * DPR;
      canvas.height = h * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      nodes.length = 0;
      const count = Math.max(8, Math.round((w * h) / 90000));
      for (let i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 1.4 + Math.random() * 1.6,
          phase: Math.random() * Math.PI * 2,
          hue: Math.random() > 0.55 ? 152 : 250,
        });
      }
    };

    const spawnParticle = () => {
      const fromNode = nodes[Math.floor(Math.random() * nodes.length)];
      if (!fromNode) return;
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.25 + Math.random() * 0.5;
      particles.push({
        x: fromNode.x,
        y: fromNode.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        max: 180 + Math.random() * 220,
        hue: fromNode.hue,
      });
    };

    const spawnPing = () => {
      const n = nodes[Math.floor(Math.random() * nodes.length)];
      if (!n) return;
      pings.push({
        x: n.x,
        y: n.y,
        r: 0,
        max: 80 + Math.random() * 140,
        hue: n.hue,
        alive: true,
      });
    };

    let t = 0;
    const loop = () => {
      t += 1;
      ctx.clearRect(0, 0, w, h);

      // faint connecting lines between nearby nodes
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 38000) {
            const alpha = (1 - d2 / 38000) * 0.06;
            ctx.strokeStyle = `oklch(0.85 0.22 152 / ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // nodes
      for (const n of nodes) {
        n.phase += 0.02;
        const breathe = 0.7 + 0.3 * Math.sin(n.phase);
        ctx.fillStyle = `oklch(0.85 0.22 ${n.hue} / ${0.35 * breathe})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * (1 + breathe * 0.25), 0, Math.PI * 2);
        ctx.fill();
      }

      // particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        const lifeT = p.life / p.max;
        const alpha = lifeT < 0.15 ? lifeT / 0.15 : 1 - (lifeT - 0.15) / 0.85;
        ctx.fillStyle = `oklch(0.9 0.2 ${p.hue} / ${alpha * 0.55})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.1, 0, Math.PI * 2);
        ctx.fill();
        if (p.life >= p.max || p.x < -20 || p.y < -20 || p.x > w + 20 || p.y > h + 20) {
          particles.splice(i, 1);
        }
      }

      // signal pings
      for (let i = pings.length - 1; i >= 0; i--) {
        const ping = pings[i];
        ping.r += 1.4;
        const t2 = ping.r / ping.max;
        const alpha = (1 - t2) * 0.35;
        ctx.strokeStyle = `oklch(0.85 0.22 ${ping.hue} / ${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(ping.x, ping.y, ping.r, 0, Math.PI * 2);
        ctx.stroke();
        if (ping.r >= ping.max) pings.splice(i, 1);
      }

      if (t % 6 === 0 && particles.length < 90) spawnParticle();
      if (t % 140 === 0) spawnPing();

      raf = requestAnimationFrame(loop);
    };

    resize();
    window.addEventListener("resize", resize);
    if (!reduced) {
      for (let i = 0; i < 20; i++) spawnParticle();
      loop();
    } else {
      // single static frame
      loop();
      cancelAnimationFrame(raf);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-70"
    />
  );
}
