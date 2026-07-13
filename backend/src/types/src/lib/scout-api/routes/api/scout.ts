import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { runScout, type ScoutEnv } from "@/lib/scout-api/orchestrator";

// In-memory rate limit — best-effort per warm isolate, same spirit as the
// Python slowapi limiter (5/minute per IP). Cloudflare isolates can spin up
// fresh under load, so this doesn't guarantee a hard global cap, but it
// absorbs the common case: one visitor/bot hammering the endpoint.
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE_LIMIT;
}

export const Route = createFileRoute("/api/scout")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({ status: "AXON online" });
      },
      POST: async ({ request }) => {
        const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
        if (isRateLimited(ip)) {
          return Response.json({ detail: "Rate limit exceeded — try again in a minute." }, { status: 429 });
        }

        let domain: string;
        try {
          const body = await request.json();
          domain = String((body as { domain?: unknown })?.domain ?? "").trim();
        } catch {
          return Response.json({ detail: "Invalid request body" }, { status: 400 });
        }

        if (!domain) {
          return Response.json({ detail: "Domain cannot be empty" }, { status: 400 });
        }

        try {
          const scoutEnv = env as unknown as ScoutEnv;
          const result = await runScout(scoutEnv, domain);
          return Response.json(result);
        } catch (error) {
          console.error(error);
          const detail = error instanceof Error ? error.message : "Scout failed";
          return Response.json({ detail }, { status: 500 });
        }
      },
    },
  },
});
