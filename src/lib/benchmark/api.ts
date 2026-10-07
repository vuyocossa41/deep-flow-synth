import { z } from "zod";
import { closeReport, normalize, submissionSchema, type Draft } from "./domain";
import { capability, HttpError, origin, readJson, requireCase, requireReviewer } from "./security";
import { getRun, getSubmission, submit, type Scope } from "./store";
import { start } from "./engine";
const uuid = z.string().uuid();
const json = (value: unknown, status = 200) =>
  Response.json(value, {
    status,
    headers: {
      "cache-control": "no-store",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
    },
  });
export async function benchmarkApi(request: Request, env: Env, ctx: ExecutionContext) {
  try {
    const path = new URL(request.url).pathname.replace("/api/benchmark", "");
    if (request.method !== "GET") origin(request, env);
    if (path === "/submissions" && request.method === "POST") {
      if (!env.BENCHMARK_CASE_SECRET || env.BENCHMARK_CASE_SECRET.length < 32)
        throw new HttpError(503, "Private case access not configured");
      const key = request.headers.get("idempotency-key");
      if (!key || !/^[a-zA-Z0-9-]{32,100}$/.test(key))
        throw new HttpError(400, "A random stable submission key is required");
      const input = submissionSchema.parse(await readJson(request));
      try {
        normalize(input.evidence);
      } catch {
        throw new HttpError(400, "Invalid evidence IDs, contradiction links or UNKNOWN fields");
      }
      const content = JSON.stringify(input.evidence);
      if (
        /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(content) ||
        /\b(?:sk_live_|sk_test_|ghp_|AKIA)[A-Za-z0-9]+/.test(content) ||
        /-----BEGIN .*PRIVATE KEY-----/.test(content)
      )
        throw new HttpError(
          400,
          "Remove identities or credentials from evidence; contact email belongs only in contact metadata",
        );
      const s = await submit(env.BENCHMARK_DB, key, input.evidence, input.contact);
      ctx.waitUntil(
        start(env, s).catch(() => {
          console.error(
            JSON.stringify({
              component: "benchmark-dispatch",
              caseId: s.caseId,
              error: "Dispatch pending; scheduled recovery will retry",
            }),
          );
        }),
      );
      const token = await capability(env, s.caseId, s.runId);
      return json({ ...s, caseKey: token, caseUrl: "/case/" + s.caseId + "#key=" + token }, 202);
    }
    const match = path.match(/^\/(cases|results|review)\/([^/]+)$/);
    if (!match) throw new HttpError(404, "Endpoint not found");
    const [, kind, id] = match;
    const caseId = uuid.parse(id);
    // Reviewer authorization precedes database lookup to prevent case enumeration.
    const reviewer = kind === "review" ? await requireReviewer(request, env) : null;
    const runId =
      kind === "review"
        ? uuid.parse(new URL(request.url).searchParams.get("run"))
        : uuid.parse(request.headers.get("x-benchmark-run"));
    const s = { caseId, runId };
    if (kind !== "review") await requireCase(request, env, caseId, runId);
    const run = await getRun(env.BENCHMARK_DB, s),
      submission = await getSubmission(env.BENCHMARK_DB, caseId);
    if (!run || !submission) throw new HttpError(404, "Case not found");
    if (kind === "cases" && request.method === "GET") {
      if (run.state === "PENDING") ctx.waitUntil(start(env, s));
      return json({
        ...s,
        status: submission.status,
        createdAt: submission.created_at,
        resultReady: !!run.report_json,
      });
    }
    if (kind === "results" && request.method === "GET") {
      if (!run.report_json) throw new HttpError(409, "Correction Map pending human approval");
      return json(JSON.parse(run.report_json));
    }
    if (kind === "review" && request.method === "GET")
      return json({
        ...s,
        state: run.state,
        draft: run.draft_json ? JSON.parse(run.draft_json) : null,
        approvedAt: run.approved_at,
      });
    if (kind === "review" && request.method === "POST") {
      const decision = z
        .object({
          decision: z.enum(["APPROVE", "COUNTEREXAMPLE", "REJECT"]),
          note: z.string().trim().min(20).max(3000),
          acknowledgeLimitations: z.literal(true),
        })
        .strict()
        .parse(await readJson(request));
      if (!run.draft_json) throw new HttpError(409, "Draft not ready");
      closeReport(
        (JSON.parse(run.draft_json) as Draft).findings,
        (JSON.parse(run.draft_json) as Draft).evidence,
      );
      if (run.approved_at && run.review_decision !== decision.decision)
        throw new HttpError(409, "Review is immutable");
      if (!run.approved_at) {
        const now = new Date().toISOString();
        await env.BENCHMARK_DB.batch([
          env.BENCHMARK_DB.prepare(
            "UPDATE benchmark_runs SET reviewer_subject=?,review_note=?,review_decision=?,approved_at=?,updated_at=? WHERE case_id=? AND run_id=? AND state='REVIEW_REQUIRED' AND approved_at IS NULL",
          ).bind(reviewer, decision.note, decision.decision, now, now, caseId, runId),
          env.BENCHMARK_DB.prepare(
            "INSERT OR IGNORE INTO benchmark_events(case_id,run_id,event_id,kind,payload_json,created_at) SELECT case_id,run_id,'review','HUMAN_REVIEW',json_object('reviewer',reviewer_subject,'decision',review_decision,'note',review_note),approved_at FROM benchmark_runs WHERE case_id=? AND run_id=? AND approved_at IS NOT NULL",
          ).bind(caseId, runId),
        ]);
        const saved = await getRun(env.BENCHMARK_DB, s);
        if (saved?.review_decision !== decision.decision)
          throw new HttpError(409, "Another reviewer already decided");
      }
      if (decision.decision === "REJECT") {
        await env.BENCHMARK_DB.prepare(
          "UPDATE benchmark_submissions SET status='INSUFFICIENT_EVIDENCE',updated_at=? WHERE case_id=? AND EXISTS(SELECT 1 FROM benchmark_runs WHERE case_id=? AND run_id=? AND review_decision='REJECT')",
        )
          .bind(new Date().toISOString(), caseId, caseId, runId)
          .run();
      }
      const instance = await env.BENCHMARK.get(runId);
      const current = await instance.status();
      if (current.status !== "complete")
        await instance.sendEvent({ type: "review", payload: { caseId, runId } });
      return json({ approved: true, status: "RELEASE_PENDING" });
    }
    throw new HttpError(405, "Method not allowed");
  } catch (error) {
    if (error instanceof z.ZodError)
      return json(
        {
          error: "Invalid structured input",
          fields: error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
        },
        400,
      );
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    if (error instanceof Error && error.message === "IDEMPOTENCY_CONFLICT")
      return json({ error: "Submission key already used with different content" }, 409);
    console.error(JSON.stringify({ component: "benchmark-api", error: "Request failed" }));
    return json({ error: "Request failed; retry with the same submission key" }, 500);
  }
}
