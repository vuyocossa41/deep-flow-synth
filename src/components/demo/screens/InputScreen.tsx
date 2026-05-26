import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface Props {
  onSubmit: (company: string) => void;
}

const chips = ["Acme SaaS", "TechFlow", "DevStack", "ScaleUp AI", "Northwind"];

export function InputScreen({ onSubmit }: Props) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = (v: string) => {
    const trimmed = v.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  return (
    <div className="relative flex min-h-svh items-center justify-center px-4 py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/4 mx-auto h-[420px] max-w-3xl rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse, oklch(0.85 0.22 152 / 0.15), transparent 70%)",
        }}
      />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-xl text-center"
      >
        <div className="mb-8 flex items-center justify-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-signal">
          <span className="h-px w-8 bg-signal/30" />
          Live Demo
          <span className="h-px w-8 bg-signal/30" />
        </div>

        <h1 className="font-display text-[clamp(36px,6vw,64px)] font-extrabold leading-none tracking-tight">
          See <span className="text-gradient-signal">every OS</span>
          <br />
          work on your company
        </h1>
        <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
          Enter your company domain. Scout analyzes it in real time. Then watch
          autonomous infrastructure run across acquisition, finance, and strategy.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(value);
          }}
          className="glass-strong mt-12 flex items-center gap-3 rounded-xl px-5 py-4 focus-within:ring-signal"
        >
          <span className="font-mono text-sm text-signal">$</span>
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Enter your company domain..."
            autoComplete="off"
            spellCheck={false}
            className="flex-1 bg-transparent font-mono text-[15px] text-foreground caret-signal outline-none placeholder:text-muted-foreground/60"
          />
          <span className="rounded-md border border-border px-2 py-1 font-mono text-[10px] text-muted-foreground">
            ↵ Enter
          </span>
        </form>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {chips.map((c) => (
            <button
              key={c}
              onClick={() => {
                setValue(c);
                submit(c);
              }}
              className="rounded-full border border-border bg-panel/60 px-3 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:border-signal/60 hover:text-signal"
            >
              {c}
            </button>
          ))}
        </div>

        <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
          Press <span className="text-foreground/80">Enter</span> to run · Each
          run produces unique reasoning
        </p>
      </motion.div>
    </div>
  );
}
