import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { runScout } from "@/lib/scout-api/orchestrator";

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60000;
const hits = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter(function(t) { return now - t < RATE_WINDOW_MS; });
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE_LIMIT;
}

export const Route = createFileRoute("/api/scout")({
  server: {
    handlers: {
      GET: async function() {
        return Response.json({ status: "AXON online" });
      },
      POST: async function(ctx) {
        const request = ctx.request;
        const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
        if (isRateLimited(ip)) {
          return Response.json({ detail: "Rate limit exceeded, try again in a minute." }, { status: 429 });
        }

        let domain;
        try {
          const body = await request.json();
          domain = String((body && body.domain) ?? "").trim();
        } catch {
          return Response.json({ detail: "Invalid request body" }, { status: 400 });
        }

        if (!domain) {
          return Response.json({ detail: "Domain cannot be empty" }, { status: 400 });
        }

        try {
          const result = await runScout(env, domain);
          return Response.json(result);
        } catch (error) {
          console.error(error);
          const detail = error instanceof Error ? error.message : "Scout failed";
          return Response.json({ detail: detail }, { status: 500 });
        }
      },
    },
  },
});
