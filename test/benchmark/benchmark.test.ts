import { digest } from "../../src/lib/benchmark/domain";
const fixtureInvites=new Map<string,string>();
async function fixtureInvitation(db:D1Database,key:string) {
 let secret=fixtureInvites.get(key);
 if(!secret) {secret=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,"0")).join("");fixtureInvites.set(key,secret);}
 await db.prepare("INSERT OR IGNORE INTO benchmark_invitations(secret_hash,created_at,expires_at) VALUES(?,?,?)").bind(await digest(secret),new Date().toISOString(),new Date(Date.now()+86400000).toISOString()).run();
 return secret;
}
async function submit(db:D1Database,key:string,value:Parameters<typeof rawSubmit>[2],contact:Parameters<typeof rawSubmit>[3]) {
 return rawSubmit(db,key,value,contact,await digest(await fixtureInvitation(db,key)));
}
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { decodeJwt, exportJWK, generateKeyPair, SignJWT } from "jose";
import {
  closeReport,
  deterministic,
  intakeSchema,
  normalize,
  qualify,
  validateClaims,
  isCounterexample,
  type Intake,
  type Draft,
} from "../../src/lib/benchmark/domain";
import { submit as rawSubmit, getRun, persistDraft, type Scope } from "../../src/lib/benchmark/store";
import { processCase, release, type Steps } from "../../src/lib/benchmark/engine";
import { capability, requireCase, requireReviewer } from "../../src/lib/benchmark/security";
import { analysis } from "../../src/lib/benchmark/ai";
import { benchmarkApi } from "../../src/lib/benchmark/api";

function database() {
  const sql = new DatabaseSync(":memory:");
  sql.exec(readFileSync("migrations/0001_correction_benchmark.sql", "utf8"));
  sql.exec(readFileSync("migrations/0002_case_capability_revocation.sql", "utf8"));
  sql.exec(readFileSync("migrations/0003_beta_safety.sql", "utf8"));
  sql.exec(readFileSync("migrations/0004_closed_beta.sql", "utf8"));
  class Statement {
    args: any[] = [];
    constructor(public query: string) {}
    bind(...args: any[]) {
      this.args = args;
      return this;
    }
    async first<T>() {
      return (sql.prepare(this.query).get(...this.args) as T) || null;
    }
    async all<T>() {
      return { results: sql.prepare(this.query).all(...this.args) as T[], success: true, meta: {} };
    }
    async run() {
      const r = sql.prepare(this.query).run(...this.args);
      return { success: true, results: [], meta: { changes: Number(r.changes) } };
    }
  }
  const db = {
    prepare: (query: string) => new Statement(query),
    async batch(statements: Statement[]) {
      sql.exec("BEGIN");
      try {
        const result = [];
        for (const s of statements) result.push(await s.run());
        sql.exec("COMMIT");
        return result;
      } catch (e) {
        sql.exec("ROLLBACK");
        throw e;
      }
    },
  };
  return { db: db as D1Database, sql };
}
function input(overrides: Partial<Intake> = {}): Intake {
  return intakeSchema.parse({
    companyType: "B2B SaaS",
    role: "Controller",
    stack: "ERP and billing",
    economicChangeType: "WRITE_OFF_PAYMENT",
    originalState: "Receivable written off",
    whatChanged: "Payment arrived",
    whenChanged: "2026-01-02T00:00:00Z",
    systemsAffected: "Billing and ledger",
    newEvidence: "Redacted bank confirmation",
    decisionV1: "Approved write-off",
    decisionV2: "Approved reversal after payment",
    authorization: "Controller approved the reversal",
    expectedReversals: "Reverse write-off",
    actualActions: "Write-off reversed",
    verification: "Ledger reconciled",
    humanWorkRequired: "Controller approval and ledger check",
    unknownFields: [],
    incumbentAssessment: "UNKNOWN",
    authorityRequired: "UNKNOWN",
    closed: true,
    authorized: true,
    redacted: true,
    permissions: { process: true, ai: false, publication: false },
    evidence: [],
    ...overrides,
  });
}
const contact = { workEmail: "controller@example.com", permission: true as const };
let db: D1Database, sql: DatabaseSync, env: Env;
beforeEach(async () => {
  const adapter = database();
  db = adapter.db;
  sql = adapter.sql;
  fixtureInvites.clear();
  const controls=new Map<string,string>();
  env = {
    BENCHMARK_AI_MODE:"AI_DISABLED",
    BENCHMARK_CONTROL:{get:vi.fn(async (key:string,type?:string)=>{const value=controls.get(key)||null;return type==="json"&&value?JSON.parse(value):value;}),put:vi.fn(async(key:string,value:string)=>{controls.set(key,value);}),list:vi.fn(async(options:{prefix:string})=>({keys:[...controls.keys()].filter(k=>k.startsWith(options.prefix)).map(name=>({name})),list_complete:true}))},
    BENCHMARK_DB: db,
    BENCHMARK_SUBMISSION_LIMIT: { limit: vi.fn(async () => ({ success: true })) },
    BENCHMARK_CASE_SECRET: "test-secret-with-at-least-32-characters",
    BENCHMARK_ORIGIN: "https://benchmark.test",
    BENCHMARK_MODEL: "llama-3.3-70b-versatile",
    BENCHMARK_ACCESS_TEAM: "reviewer.cloudflareaccess.com",
    BENCHMARK_ACCESS_AUD: "reviewer-app",
    BENCHMARK: {
      get: vi.fn(async (id:string) => ({ id, status: async () => ({ status: "running" }), sendEvent: vi.fn() })),
      create: vi.fn(),
    },
  } as Env;
  sql.prepare("INSERT INTO benchmark_invitations(secret_hash,created_at,expires_at) VALUES(?,?,?)").run(await digest("a".repeat(64)),new Date().toISOString(),new Date(Date.now()+86400000).toISOString());
});
afterEach(() => {
  sql.close();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
async function saved(value = input()) {
  return submit(db, crypto.randomUUID(), value, contact);
}
async function approve(s: Scope, decision = "APPROVE") {
  await db
    .prepare(
      "UPDATE benchmark_runs SET reviewer_subject='reviewer-subject',review_note='Reviewed evidence and authorization in full',review_decision=?,approved_at=?,updated_at=? WHERE case_id=? AND run_id=?",
    )
    .bind(decision, new Date().toISOString(), new Date().toISOString(), s.caseId, s.runId)
    .run();
}
class ReplaySteps implements Steps {
  cache = new Map<string, unknown>();
  crashOnce = false;
  async do<T>(name: string, callback: () => Promise<T> | T): Promise<T> {
    if (this.cache.has(name)) return this.cache.get(name) as T;
    const result = await callback();
    if (name === "human review gate" && this.crashOnce) {
      this.crashOnce = false;
      throw new Error("simulated crash after D1 commit");
    }
    this.cache.set(name, result);
    return result;
  }
  async waitForEvent() {
    throw new Error("unexpected wait in replay test");
  }
}
describe("adversarial evidence rules", () => {
  it("INCUMBENT_SUFFICIENT remains a counterexample, never an AXON superiority claim", () => {
    const evidence = normalize(input({ incumbentAssessment: "SUFFICIENT" }));
    const findings = deterministic(evidence);
    expect(isCounterexample(evidence)).toBe(true);
    expect(findings.find((f) => f.topic === "INCUMBENT_SUFFICIENT")).toMatchObject({
      classification: "OBSERVED",
      claim: "SUFFICIENT",
      sourceEvidenceIds: ["e-incumbentassessment"],
    });
  });
  it("HUMAN_AUTHORITY_FLOOR is observed and remains explicit", () => {
    const evidence = normalize(input({ authorityRequired: "YES" }));
    expect(isCounterexample(evidence)).toBe(true);
    expect(deterministic(evidence).find((f) => f.topic === "HUMAN_AUTHORITY_FLOOR")?.claim).toBe(
      "YES",
    );
  });
  it("preserves UNKNOWN, including explicitly marked zero-looking fields", () => {
    const evidence = normalize(input({ actualActions: "0", unknownFields: ["actualActions"] }));
    const finding = deterministic(evidence).find((f) => f.stage === "OBSERVED_CORRECTIONS");
    expect(finding).toMatchObject({ classification: "UNKNOWN", claim: "UNKNOWN" });
    expect(() =>
      validateClaims(
        {
          claims: [
            {
              stage: "OBSERVED_CORRECTIONS",
              classification: "OBSERVED",
              claim: "0",
              sourceEvidenceIds: ["e-actualactions"],
            },
          ],
        },
        evidence,
      ),
    ).toThrow();
  });
  it("keeps conflicting evidence and all provenance links", () => {
    const evidence = normalize(
      input({
        evidence: [
          {
            id: "e-conflict",
            field: "authorization",
            value: "Authorization revoked",
            occurredAt: "UNKNOWN",
            contradicts: ["e-authorization"],
          },
        ],
      }),
    );
    const findings = deterministic(evidence);
    expect(
      findings.some(
        (f) =>
          f.classification === "COUNTEREVIDENCE" && f.sourceEvidenceIds.includes("e-authorization"),
      ),
    ).toBe(true);
    closeReport(findings, evidence);
    expect(isCounterexample(evidence)).toBe(true);
  });
  it("rejects agent hallucinated fields, fabricated observations and unsupported amounts", () => {
    const evidence = normalize(input());
    const claim = {
      stage: "V2",
      classification: "OBSERVED",
      claim: "Paid 999999",
      sourceEvidenceIds: ["e-decisionv2"],
    };
    expect(() => validateClaims({ claims: [claim] }, evidence)).toThrow();
    expect(() =>
      validateClaims(
        {
          claims: [
            {
              ...claim,
              classification: "INFERRED",
              claim: "Inference: reverse 999999",
              ledgerAmount: 999999,
            },
          ],
        },
        evidence,
      ),
    ).toThrow();
    expect(() =>
      validateClaims(
        { claims: [{ ...claim, classification: "INFERRED", claim: "Inference: reverse 999999" }] },
        evidence,
      ),
    ).toThrow();
  });
  it("requires provenance closure and every map stage", () => {
    const evidence = normalize(input());
    const findings = deterministic(evidence);
    closeReport(findings, evidence);
    expect(() =>
      closeReport(
        [{ ...findings[0], sourceEvidenceIds: ["e-invented"] }, ...findings.slice(1)],
        evidence,
      ),
    ).toThrow();
    expect(() =>
      closeReport(
        findings.filter((f) => f.stage !== "V2"),
        evidence,
      ),
    ).toThrow();
  });
  it("rejects invalid authorization and refuses qualification when authorization evidence is unknown", () => {
    expect(() => intakeSchema.parse({ ...input(), authorized: false })).toThrow();
    expect(qualify(normalize(input({ authorization: "UNKNOWN" })))).toBe(false);
  });
  it("rejects duplicate IDs and dangling contradiction references", () => {
    expect(() =>
      normalize(
        input({
          evidence: [
            {
              id: "e-decisionv1",
              field: "decisionV1",
              value: "x",
              occurredAt: "UNKNOWN",
              contradicts: [],
            },
          ],
        }),
      ),
    ).toThrow();
    expect(() =>
      normalize(
        input({
          evidence: [
            {
              id: "e-extra",
              field: "decisionV1",
              value: "x",
              occurredAt: "UNKNOWN",
              contradicts: ["e-missing"],
            },
          ],
        }),
      ),
    ).toThrow();
  });
});
describe("persistence, capability and retry", () => {
  it("deduplicates submissions and preserves immutable case/run identity", async () => {
    const key = crypto.randomUUID(),
      a = await submit(db, key, input(), contact),
      b = await submit(db, key, input(), contact);
    expect(a).toEqual(b);
    expect(sql.prepare("SELECT COUNT(*) AS n FROM benchmark_submissions").get()?.n).toBe(1);
    expect(sql.prepare("SELECT COUNT(*) AS n FROM benchmark_runs").get()?.n).toBe(1);
    await expect(
      submit(db, key, input({ decisionV2: "Different correction" }), contact),
    ).rejects.toThrow("IDEMPOTENCY_CONFLICT");
    await expect(
      db
        .prepare("UPDATE benchmark_runs SET evidence_hash='other' WHERE case_id=? AND run_id=?")
        .bind(a.caseId, a.runId)
        .run(),
    ).rejects.toThrow("immutable run identity");
  });
  it("isolates cases and refuses tokens for a different case or run", async () => {
    const a = await saved(),
      b = await saved();
    const token = await capability(env, a.caseId, a.runId);
    const request = new Request("https://benchmark.test", {
      headers: { authorization: "Bearer " + token },
    });
    await requireCase(request, env, a.caseId, a.runId);
    await expect(requireCase(request, env, b.caseId, b.runId)).rejects.toThrow();
    await expect(requireCase(request, env, a.caseId, b.runId)).rejects.toThrow();
    expect(await getRun(db, { caseId: a.caseId, runId: b.runId })).toBeNull();
  });
  it("rejects absent, forged and expired private capabilities", async () => {
    const s = await saved();
    await expect(
      requireCase(new Request("https://benchmark.test"), env, s.caseId, s.runId),
    ).rejects.toThrow();
    const forged = await new SignJWT({ ...s, scope: "case:read" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer("axon-correction-benchmark")
      .setAudience("private-case")
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode("different-secret-at-least-32-characters"));
    await expect(
      requireCase(
        new Request("https://benchmark.test", { headers: { authorization: "Bearer " + forged } }),
        env,
        s.caseId,
        s.runId,
      ),
    ).rejects.toThrow();
    const token = await new SignJWT({ ...s, scope: "case:read" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer("axon-correction-benchmark")
      .setAudience("private-case")
      .setExpirationTime(1)
      .sign(new TextEncoder().encode(env.BENCHMARK_CASE_SECRET));
    await expect(
      requireCase(
        new Request("https://benchmark.test", { headers: { authorization: "Bearer " + token } }),
        env,
        s.caseId,
        s.runId,
      ),
    ).rejects.toThrow();
  });
  it("keeps contact metadata outside evidence and prompts, and honors AI permission isolation", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const s = await saved();
    const steps = new ReplaySteps();
    steps.crashOnce = true;
    await expect(processCase(env, s, steps)).rejects.toThrow("simulated crash");
    const run = await getRun(db, s);
    expect(run?.draft_json).not.toContain(contact.workEmail);
    expect(fetcher).not.toHaveBeenCalled();
    const other = await saved(
      input({ permissions: { process: true, ai: true, publication: false } }),
    );
    expect(other.caseId).not.toBe(s.caseId);
    expect(
      sql.prepare("SELECT ai FROM benchmark_permissions WHERE case_id=?").get(s.caseId)?.ai,
    ).toBe(0);
  });
  it("workflow retry after a committed draft produces one immutable report with closed provenance", async () => {
    const s = await saved(),
      steps = new ReplaySteps();
    steps.crashOnce = true;
    await expect(processCase(env, s, steps)).rejects.toThrow("simulated crash");
    const before = await getRun(db, s);
    expect(before?.report_json).toBeNull();
    const count = sql
      .prepare("SELECT COUNT(*) AS n FROM benchmark_findings WHERE case_id=? AND run_id=?")
      .get(s.caseId, s.runId)?.n;
    await approve(s);
    await processCase(env, s, steps);
    const after = await getRun(db, s);
    expect(after?.draft_json).toBe(before?.draft_json);
    expect(after?.report_json).not.toBeNull();
    expect(
      sql
        .prepare("SELECT COUNT(*) AS n FROM benchmark_findings WHERE case_id=? AND run_id=?")
        .get(s.caseId, s.runId)?.n,
    ).toBe(count);
    const report = JSON.parse(after!.report_json!) as Draft;
    closeReport(report.findings, report.evidence);
    await processCase(env, s, steps);
    expect((await getRun(db, s))?.report_json).toBe(after?.report_json);
  });
  it("cannot release a draft without persisted reviewer approval", async () => {
    const s = await saved(),
      steps = new ReplaySteps();
    steps.crashOnce = true;
    await expect(processCase(env, s, steps)).rejects.toThrow();
    await expect(release(env, s)).rejects.toThrow("Human approval required");
  });
  it("private API hides drafts before approval and rejects cross-case reads", async () => {
    const a = await saved(),
      b = await saved(),
      token = await capability(env, a.caseId, a.runId);
    const ctx = { waitUntil: vi.fn() } as ExecutionContext;
    const pending = await benchmarkApi(
      new Request("https://benchmark.test/api/benchmark/results/" + a.caseId, {
        headers: { authorization: "Bearer " + token, "x-benchmark-run": a.runId },
      }),
      env,
      ctx,
    );
    expect(pending.status).toBe(409);
    const isolated = await benchmarkApi(
      new Request("https://benchmark.test/api/benchmark/cases/" + b.caseId, {
        headers: { authorization: "Bearer " + token, "x-benchmark-run": b.runId },
      }),
      env,
      ctx,
    );
    expect(isolated.status).toBe(403);
  });
  it("verifies Cloudflare Access signatures, issuer and audience", async () => {
    const { publicKey, privateKey } = await generateKeyPair("RS256");
    const jwk = await exportJWK(publicKey);
    jwk.kid = "test-key";
    jwk.alg = "RS256";
    jwk.use = "sig";
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ keys: [jwk] }), {
            headers: { "content-type": "application/json" },
          }),
      ),
    );
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "RS256", kid: "test-key" })
      .setSubject("reviewer")
      .setIssuer("https://" + env.BENCHMARK_ACCESS_TEAM)
      .setAudience(env.BENCHMARK_ACCESS_AUD)
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(privateKey);
    expect(
      await requireReviewer(
        new Request("https://benchmark.test", { headers: { "Cf-Access-Jwt-Assertion": token } }),
        env,
      ),
    ).toBe("reviewer");
    await expect(
      requireReviewer(
        new Request("https://benchmark.test", { headers: { "Cf-Access-Jwt-Assertion": token } }),
        { ...env, BENCHMARK_ACCESS_AUD: "wrong" },
      ),
    ).rejects.toThrow();
    await expect(requireReviewer(new Request("https://benchmark.test"), env)).rejects.toThrow();
  });
  it("reviewer approval wakes the workflow and yields a private result end to end", async () => {
    const s = await saved(),
      steps = new ReplaySteps();
    steps.crashOnce = true;
    await expect(processCase(env, s, steps)).rejects.toThrow();
    const { publicKey, privateKey } = await generateKeyPair("RS256"),
      jwk = await exportJWK(publicKey);
    jwk.kid = "review";
    jwk.alg = "RS256";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ keys: [jwk] })),
    );
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "RS256", kid: "review" })
      .setSubject("reviewer")
      .setIssuer("https://" + env.BENCHMARK_ACCESS_TEAM)
      .setAudience(env.BENCHMARK_ACCESS_AUD)
      .setExpirationTime("1h")
      .sign(privateKey);
    const request = new Request(
      "https://benchmark.test/api/benchmark/review/" + s.caseId + "?run=" + s.runId,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: env.BENCHMARK_ORIGIN, "x-benchmark-invitation": "a".repeat(64),
        "CF-Connecting-IP": "192.0.2.1",
          "Cf-Access-Jwt-Assertion": token,
        },
        body: JSON.stringify({
          decision: "APPROVE",
          note: "Reviewed source support and human authorization",
          acknowledgeLimitations: true,
        }),
      },
    );
    expect(
      (await benchmarkApi(request, env, { waitUntil: vi.fn() } as ExecutionContext)).status,
    ).toBe(200);
    await processCase(env, s, steps);
    const key = await capability(env, s.caseId, s.runId);
    const result = await benchmarkApi(
      new Request("https://benchmark.test/api/benchmark/results/" + s.caseId, {
        headers: { authorization: "Bearer " + key, "x-benchmark-run": s.runId },
      }),
      env,
      { waitUntil: vi.fn() } as ExecutionContext,
    );
    expect(result.status).toBe(200);
    expect((await result.json()).status).toBe("BENCHMARK_COMPLETE");
  });
});

describe("additional retry and provider boundaries", () => {
  it("repairs status when a draft exists after a crash before the status write", async () => {
    const s = await saved(),
      steps = new ReplaySteps();
    steps.crashOnce = true;
    await expect(processCase(env, s, steps)).rejects.toThrow();
    const draft = JSON.parse((await getRun(db, s))!.draft_json!) as Draft;
    await db
      .prepare("UPDATE benchmark_submissions SET status='BENCHMARKING' WHERE case_id=?")
      .bind(s.caseId)
      .run();
    await persistDraft(db, s, draft);
    expect(
      sql.prepare("SELECT status FROM benchmark_submissions WHERE case_id=?").get(s.caseId)?.status,
    ).toBe("HUMAN_REVIEW_REQUIRED");
  });
  it("ends an unqualified run without leaving it in the dispatch backlog", async () => {
    const s = await saved(input({ authorization: "UNKNOWN" }));
    expect(await processCase(env, s, new ReplaySteps())).toEqual({
      status: "INSUFFICIENT_EVIDENCE",
    });
    expect((await getRun(db, s))?.state).toBe("INSUFFICIENT_EVIDENCE");
  });
  it("rejects hallucinated provider fields and sends only redacted evidence to the provider", async () => {
    const evidence = normalize(input());
    const fetcher = vi.fn(async () =>
      Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({
                claims: [
                  {
                    stage: "V2",
                    classification: "INFERRED",
                    claim: "Inference: paid 999999",
                    sourceEvidenceIds: ["e-decisionv2"],
                    ledgerAmount: 999999,
                  },
                ],
              }),
            },
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetcher);
    const result = await analysis({ ...env, BENCHMARK_AI_MODE:"AUTHORIZED_AI", GROQ_API_KEY: "fixture-key" }, evidence, false);
    expect(result.claims).toEqual([]);
    expect(result.error).toContain("rejected");
    const body = JSON.parse(fetcher.mock.calls[0][1]!.body as string);
    expect(JSON.stringify(body)).not.toContain(contact.workEmail);
    expect(body.messages[1].content).not.toContain("contact");
  });
  it("rejects malformed evidence with a client error and never stores it", async () => {
    const request = new Request("https://benchmark.test/api/benchmark/submissions", {
      method: "POST",
      headers: {
        origin: env.BENCHMARK_ORIGIN, "x-benchmark-invitation": "a".repeat(64),
        "CF-Connecting-IP": "192.0.2.1",
        "content-type": "application/json",
        "idempotency-key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        evidence: input({
          evidence: [
            {
              id: "e-bad",
              field: "authorization",
              value: "Conflict",
              occurredAt: "UNKNOWN",
              contradicts: ["e-missing"],
            },
          ],
        }),
        contact,
      }),
    });
    expect(
      (await benchmarkApi(request, env, { waitUntil: vi.fn() } as ExecutionContext)).status,
    ).toBe(400);
    expect(sql.prepare("SELECT COUNT(*) AS n FROM benchmark_submissions").get()?.n).toBe(0);
  });
});

describe("M1.1 private capability hardening", () => {
  it("issues exactly fourteen-day capabilities and rejects old ninety-day tokens", async () => {
    const s = await saved();
    const token = await capability(env, s.caseId, s.runId);
    const decoded = decodeJwt(token);
    expect(decoded.exp! - decoded.iat!).toBe(14 * 86400);
    const old = await new SignJWT({ ...s, scope: "case:read" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer("axon-correction-benchmark")
      .setAudience("private-case")
      .setIssuedAt()
      .setExpirationTime("90d")
      .sign(new TextEncoder().encode(env.BENCHMARK_CASE_SECRET));
    await expect(
      requireCase(
        new Request("https://benchmark.test", { headers: { authorization: "Bearer " + old } }),
        env,
        s.caseId,
        s.runId,
      ),
    ).rejects.toThrow();
  });
  it("revokes all capabilities for one case without affecting another case", async () => {
    const a = await saved(),
      b = await saved();
    const at = await capability(env, a.caseId, a.runId),
      bt = await capability(env, b.caseId, b.runId);
    await db
      .prepare(
        "UPDATE benchmark_submissions SET revoked_at=? WHERE case_id=? AND revoked_at IS NULL",
      )
      .bind(new Date().toISOString(), a.caseId)
      .run();
    await expect(
      requireCase(
        new Request("https://benchmark.test", { headers: { authorization: "Bearer " + at } }),
        env,
        a.caseId,
        a.runId,
      ),
    ).rejects.toThrow("revoked");
    await requireCase(
      new Request("https://benchmark.test", { headers: { authorization: "Bearer " + bt } }),
      env,
      b.caseId,
      b.runId,
    );
    const renewed = await capability(env, a.caseId, a.runId);
    await expect(
      requireCase(
        new Request("https://benchmark.test", { headers: { authorization: "Bearer " + renewed } }),
        env,
        a.caseId,
        a.runId,
      ),
    ).rejects.toThrow();
    for (const kind of ["cases", "results"]) {
      expect(
        (
          await benchmarkApi(
            new Request("https://benchmark.test/api/benchmark/" + kind + "/" + a.caseId, {
              headers: { authorization: "Bearer " + at, "x-benchmark-run": a.runId },
            }),
            env,
            { waitUntil: vi.fn() } as ExecutionContext,
          )
        ).status,
      ).toBe(403);
    }
    await expect(
      db
        .prepare("UPDATE benchmark_submissions SET revoked_at=NULL WHERE case_id=?")
        .bind(a.caseId)
        .run(),
    ).rejects.toThrow("permanent");
  });
});

describe("M1.4 submission and deletion safety", () => {
  const ctx = () => ({ waitUntil: vi.fn() }) as unknown as ExecutionContext;
  const request = (body = "{invalid") => new Request("https://benchmark.test/api/benchmark/submissions", {
    method: "POST", headers: { origin: env.BENCHMARK_ORIGIN, "x-benchmark-invitation": "a".repeat(64), "content-type":"application/json",
      "CF-Connecting-IP":"192.0.2.55", "idempotency-key":crypto.randomUUID() }, body,
  });
  it("rejects excess before parsing, persistence and dispatch and recovers after reset", async () => {
    let calls=0, window=0;
    env.BENCHMARK_SUBMISSION_LIMIT = { limit: vi.fn(async () => ({ success: ++calls<=5 })) } as RateLimit;
    for(let i=0;i<5;i++) expect((await benchmarkApi(request(),env,ctx())).status).toBe(400);
    const context=ctx(), denied=await benchmarkApi(request(),env,context);
    expect(denied.status).toBe(429); expect(denied.headers.get("retry-after")).toBe("60");
    expect(sql.prepare("SELECT COUNT(*) n FROM benchmark_submissions").get()?.n).toBe(0);
    expect(context.waitUntil).not.toHaveBeenCalled(); expect(env.BENCHMARK.create).not.toHaveBeenCalled();
    calls=0; window+=60;
    expect(window).toBe(60);
    expect((await benchmarkApi(request(),env,ctx())).status).toBe(400);
  });
  it("fails closed without protection and never limits private reads or Scout paths", async () => {
    env.BENCHMARK_SUBMISSION_LIMIT = undefined as unknown as RateLimit;
    expect((await benchmarkApi(request(),env,ctx())).status).toBe(503);
    const a=await saved(), token=await capability(env,a.caseId,a.runId);
    expect((await benchmarkApi(new Request("https://benchmark.test/api/benchmark/cases/"+a.caseId,
      {headers:{authorization:"Bearer "+token,"x-benchmark-run":a.runId}}),env,ctx())).status).toBe(200);
    expect((await benchmarkApi(new Request("https://benchmark.test/api/scout"),env,ctx())).status).toBe(404);
  });
  it("enforces the global lifetime cap atomically and permits idempotent retry", async () => {
    const key=crypto.randomUUID(), a=await submit(db,key,input(),contact);
    for(let i=0;i<9;i++) await saved();
    expect(await submit(db,key,input(),contact)).toEqual(a);
    await expect(saved()).rejects.toThrow("BENCHMARK_CAP_REACHED");
    expect(sql.prepare("SELECT COUNT(*) n FROM benchmark_runs").get()?.n).toBe(10);
    const context=ctx();
    expect((await benchmarkApi(request(JSON.stringify({evidence:input(),contact})),env,context)).status).toBe(429);
    expect(context.waitUntil).not.toHaveBeenCalled();
  });
  it("deletes only an eligible synthetic case, denies its original capability and preserves control", async () => {
    const {planDeletion,deleteCase,retentionPolicyVersion}=await import("../../src/lib/benchmark/retention");
    const a=await saved(), b=await saved(), at=await capability(env,a.caseId,a.runId), bt=await capability(env,b.caseId,b.runId);
    const steps=new ReplaySteps(); steps.crashOnce=true;
    await expect(processCase(env,a,steps)).rejects.toThrow(); await approve(a); await processCase(env,a,steps);
    const now=new Date(Date.now()+31*86400000);
    let removed=false;
    env.BENCHMARK.get=vi.fn(async(id:string)=>{if(removed)throw new Error("instance.not_found");return {id,status:async()=>({status:"complete"}),delete:async()=>{removed=true;}};}) as any;
    const plan=await planDeletion(env,a.caseId,now); expect(plan.eligible).toBe(true);
    expect(plan.counts.benchmark_findings).toBeGreaterThan(0); expect(plan.counts.benchmark_events).toBeGreaterThan(0);
    expect(await getRun(db,a)).not.toBeNull();
    await expect(deleteCase(env,plan,{caseId:b.caseId,planHash:plan.hash,policyVersion:retentionPolicyVersion,approvedAt:now.toISOString()},now)).rejects.toThrow("approval");
    const receipt=await deleteCase(env,plan,{caseId:a.caseId,planHash:plan.hash,policyVersion:retentionPolicyVersion,approvedAt:now.toISOString()},now);
    expect(JSON.stringify(receipt)).not.toContain(contact.workEmail); expect(JSON.stringify(receipt)).not.toContain(a.caseId);
    const req=(token:string)=>new Request("https://benchmark.test",{headers:{authorization:"Bearer "+token}});
    await expect(requireCase(req(at),env,a.caseId,a.runId)).rejects.toThrow();
    await requireCase(req(bt),env,b.caseId,b.runId); expect(await getRun(db,b)).not.toBeNull();
    expect(sql.prepare("SELECT accepted FROM benchmark_beta_capacity").get()?.accepted).toBe(2);
    await expect(db.prepare("UPDATE benchmark_deletion_receipts SET deleted_rows=1").run()).rejects.toThrow("immutable");
    await expect(db.prepare("DELETE FROM benchmark_deletion_receipts").run()).rejects.toThrow("immutable");
  });
  it("refuses active workflows, early retention and changed dry runs", async () => {
    const {planDeletion,deleteCase,retentionPolicyVersion}=await import("../../src/lib/benchmark/retention");
    const a=await saved(), now=new Date(Date.now()+31*86400000);
    expect((await planDeletion(env,a.caseId,now)).eligible).toBe(false);
    await db.prepare("UPDATE benchmark_runs SET state='INSUFFICIENT_EVIDENCE' WHERE case_id=?").bind(a.caseId).run();
    expect((await planDeletion(env,a.caseId,now)).blockers).toContain("Workflow active or retryable");
    env.BENCHMARK.get=vi.fn(async()=>({status:async()=>({status:"complete"})})) as any;
    expect((await planDeletion(env,a.caseId,new Date())).eligible).toBe(false);
    const plan=await planDeletion(env,a.caseId,now);
    await db.prepare("UPDATE benchmark_runs SET updated_at=? WHERE case_id=?").bind(now.toISOString(),a.caseId).run();
    await expect(deleteCase(env,plan,{caseId:a.caseId,planHash:plan.hash,policyVersion:retentionPolicyVersion,approvedAt:now.toISOString()},now)).rejects.toThrow("unsafe");
    expect(await getRun(db,a)).not.toBeNull();
  });
});

describe("M1.5 controlled beta",()=>{
 it("requires admission before intake persistence and never dispatches unauthorized submissions",async()=>{
  const ctx={waitUntil:vi.fn()} as unknown as ExecutionContext;
  const r=await benchmarkApi(new Request(env.BENCHMARK_ORIGIN+"/api/benchmark/submissions",{method:"POST",headers:{origin:env.BENCHMARK_ORIGIN,"CF-Connecting-IP":"192.0.2.9","content-type":"application/json","idempotency-key":crypto.randomUUID()},body:JSON.stringify({evidence:input(),contact})}),env,ctx);
  expect(r.status).toBe(403);expect(ctx.waitUntil).not.toHaveBeenCalled();expect(sql.prepare("SELECT COUNT(*) n FROM benchmark_submissions").get()?.n).toBe(0);
 });
 it("stores only invitation hashes and makes single-use admission/capacity atomic and retry-safe",async()=>{
  const {issueInvitation,revokeInvitation}=await import("../../src/lib/benchmark/admission");
  const invitation=await issueInvitation(db,new Date(Date.now()+86400000).toISOString()),key=crypto.randomUUID();
  const a=await rawSubmit(db,key,input(),contact,invitation.hash);
  expect(await rawSubmit(db,key,input(),contact,invitation.hash)).toEqual(a);
  await expect(rawSubmit(db,crypto.randomUUID(),input(),contact,invitation.hash)).rejects.toThrow("INVITATION_DENIED");
  expect(sql.prepare("SELECT accepted FROM benchmark_beta_capacity").get()?.accepted).toBe(1);
  expect(JSON.stringify(sql.prepare("SELECT * FROM benchmark_invitations").all())).not.toContain(invitation.secret);
  await revokeInvitation(env,invitation.hash);
  await expect(rawSubmit(db,key,input(),contact,invitation.hash)).rejects.toThrow("INVITATION_DENIED");
 });
 it("rolls back invitation consumption when aggregate capacity refuses admission",async()=>{
  const {issueInvitation}=await import("../../src/lib/benchmark/admission");
  const invitation=await issueInvitation(db,new Date(Date.now()+86400000).toISOString());
  sql.prepare("UPDATE benchmark_beta_capacity SET accepted=10").run();
  await expect(rawSubmit(db,crypto.randomUUID(),input(),contact,invitation.hash)).rejects.toThrow("BENCHMARK_CAP_REACHED");
  expect(sql.prepare("SELECT consumed_at FROM benchmark_invitations WHERE secret_hash=?").get(invitation.hash)?.consumed_at).toBeNull();
  expect(sql.prepare("SELECT COUNT(*) n FROM benchmark_runs").get()?.n).toBe(0);
 });
 it("rejects unknown, expired and revoked invitations",async()=>{
  await expect(rawSubmit(db,crypto.randomUUID(),input(),contact,"0".repeat(64))).rejects.toThrow("INVITATION_DENIED");
  const secret=await fixtureInvitation(db,crypto.randomUUID()),hash=await digest(secret);
  sql.prepare("UPDATE benchmark_invitations SET expires_at='2000-01-01T00:00:00Z' WHERE secret_hash=?").run(hash);
  await expect(rawSubmit(db,crypto.randomUUID(),input(),contact,hash)).rejects.toThrow("INVITATION_DENIED");
  sql.prepare("UPDATE benchmark_invitations SET expires_at='2100-01-01T00:00:00Z',revoked_at='2026-01-01T00:00:00Z' WHERE secret_hash=?").run(hash);
  await expect(rawSubmit(db,crypto.randomUUID(),input(),contact,hash)).rejects.toThrow("INVITATION_DENIED");
 });
 it("enforces AI_DISABLED despite permission and a provider key, while deterministic review completes",async()=>{
  const fetcher=vi.fn(()=>{throw new Error("No external transfer allowed");});vi.stubGlobal("fetch",fetcher);
  const a=await saved(input({permissions:{process:true,ai:true,publication:false}}));
  env.GROQ_API_KEY="synthetic-key";
  expect((await analysis(env,normalize(input()),false)).error).toContain("AI_DISABLED");
  const steps=new ReplaySteps();steps.crashOnce=true;await expect(processCase(env,a,steps)).rejects.toThrow();await approve(a);await processCase(env,a,steps);
  const report=JSON.parse((await getRun(db,a))!.report_json!);closeReport(report.findings,report.evidence);expect(report.findings.length).toBeGreaterThan(0);
  expect(fetcher).not.toHaveBeenCalled();
 });
 it("blocks stale writes, dispatch, replay and recovery and preserves denial after D1 fence loss",async()=>{
  const {revokeCase,reconcileControls}=await import("../../src/lib/benchmark/control");
  const {start,recoverPending}=await import("../../src/lib/benchmark/engine");
  const a=await saved(),b=await saved(),at=await capability(env,a.caseId,a.runId),bt=await capability(env,b.caseId,b.runId);
  await revokeCase(env,a);
  await expect(start(env,a)).rejects.toThrow("unavailable");
  await expect(processCase(env,a,new ReplaySteps())).rejects.toThrow("unavailable");
  await expect(db.prepare("UPDATE benchmark_runs SET state='PENDING' WHERE case_id=?").bind(a.caseId).run()).rejects.toThrow("CASE_BLOCKED");
  sql.prepare("DELETE FROM benchmark_case_controls WHERE case_id=?").run(a.caseId); // simulated restore of pre-revocation D1
  await expect(requireCase(new Request("https://benchmark.test",{headers:{authorization:"Bearer "+at}}),env,a.caseId,a.runId)).rejects.toThrow("revoked");
  await reconcileControls(env);
  expect(sql.prepare("SELECT kind FROM benchmark_case_controls WHERE case_id=?").get(a.caseId)?.kind).toBe("REVOKE");
  await requireCase(new Request("https://benchmark.test",{headers:{authorization:"Bearer "+bt}}),env,b.caseId,b.runId);
  await recoverPending(env);expect(env.BENCHMARK.create).not.toHaveBeenCalled();
 });
 it("preserves D1 and denial when Workflow deletion fails",async()=>{
  const {planDeletion,deleteCase,retentionPolicyVersion}=await import("../../src/lib/benchmark/retention");
  const a=await saved();sql.prepare("UPDATE benchmark_runs SET state='COMPLETE'").run();
  env.BENCHMARK.get=vi.fn(async(id:string)=>({id,status:async()=>({status:"complete"}),delete:async()=>{throw new Error("API failure");}})) as any;
  const now=new Date(Date.now()+31*86400000),plan=await planDeletion(env,a.caseId,now);
  await expect(deleteCase(env,plan,{caseId:a.caseId,planHash:plan.hash,policyVersion:retentionPolicyVersion,approvedAt:now.toISOString()},now)).rejects.toThrow("API failure");
  expect(await getRun(db,a)).not.toBeNull();expect(await env.BENCHMARK_CONTROL.get("case:"+a.caseId)).not.toBeNull();
 });
});

it("restoring a purged case does not restore its original capability or processing authority",async()=>{
 const {planDeletion,deleteCase,retentionPolicyVersion}=await import("../../src/lib/benchmark/retention");
 const {reconcileControls}=await import("../../src/lib/benchmark/control");
 const a=await saved(),b=await saved(),token=await capability(env,a.caseId,a.runId);
 const steps=new ReplaySteps();steps.crashOnce=true;await expect(processCase(env,a,steps)).rejects.toThrow();await approve(a);await processCase(env,a,steps);
 const tables=["benchmark_submissions","benchmark_permissions","benchmark_runs","benchmark_findings","benchmark_events"];
 const snapshot=tables.map(table=>({table,rows:sql.prepare("SELECT * FROM "+table+" WHERE case_id=?").all(a.caseId)}));
 let removed=false;env.BENCHMARK.get=vi.fn(async(id:string)=>{if(id===a.runId&&removed)throw new Error("instance.not_found");return {id,status:async()=>({status:"complete"}),delete:async()=>{removed=true;}};}) as any;
 const now=new Date(Date.now()+31*86400000),plan=await planDeletion(env,a.caseId,now);
 await deleteCase(env,plan,{caseId:a.caseId,planHash:plan.hash,policyVersion:retentionPolicyVersion,approvedAt:now.toISOString()},now);
 // Simulate D1 Time Travel restoring a complete old image; external KV is deliberately not restored.
 sql.prepare("DELETE FROM benchmark_case_controls WHERE case_id=?").run(a.caseId);
 const trigger=sql.prepare("SELECT sql FROM sqlite_master WHERE name='invitation_admission'").get()?.sql as string;
 sql.exec("DROP TRIGGER invitation_admission");
 for(const {table,rows} of snapshot) for(const row of rows) {
  const columns=Object.keys(row);sql.prepare("INSERT INTO "+table+"("+columns.join(",")+") VALUES("+columns.map(()=>"?").join(",")+")").run(...Object.values(row) as any[]);
 }
 sql.exec(trigger);
 const request=new Request("https://benchmark.test",{headers:{authorization:"Bearer "+token}});
 await expect(requireCase(request,env,a.caseId,a.runId)).rejects.toThrow("revoked");
 await expect(processCase(env,a,steps)).rejects.toThrow("unavailable");
 await reconcileControls(env);expect(sql.prepare("SELECT kind FROM benchmark_case_controls WHERE case_id=?").get(a.caseId)?.kind).toBe("DELETE");
 expect(await getRun(db,b)).not.toBeNull();
});
it("refuses wrong Workflow identity before deletion",async()=>{
 const {planDeletion}=await import("../../src/lib/benchmark/retention");const a=await saved();sql.prepare("UPDATE benchmark_runs SET state='COMPLETE'").run();
 env.BENCHMARK.get=vi.fn(async()=>({id:crypto.randomUUID(),status:async()=>({status:"complete"})})) as any;
 const plan=await planDeletion(env,a.caseId,new Date(Date.now()+31*86400000));expect(plan.eligible).toBe(false);expect(plan.blockers).toContain("Workflow identity mismatch");
 expect(await env.BENCHMARK_CONTROL.get("case:"+a.caseId)).toBeNull();
});

it("preserves invitation revocation outside a restored D1 image",async()=>{
 const {issueInvitation,revokeInvitation,assertInvitationUsable}=await import("../../src/lib/benchmark/admission");
 const invite=await issueInvitation(db,new Date(Date.now()+86400000).toISOString());
 await revokeInvitation(env,invite.hash);sql.prepare("UPDATE benchmark_invitations SET revoked_at=NULL WHERE secret_hash=?").run(invite.hash);
 await expect(assertInvitationUsable(env,invite.hash,crypto.randomUUID())).rejects.toThrow("unavailable");
});

it("deletes every registered Workflow for one case and never the control case",async()=>{
 const {planDeletion,deleteCase,retentionPolicyVersion}=await import("../../src/lib/benchmark/retention");
 const a=await saved(),b=await saved(),secondRun=crypto.randomUUID();
 sql.prepare("INSERT INTO benchmark_runs(case_id,run_id,evidence_hash,version,state,created_at,updated_at) SELECT case_id,?,evidence_hash,version,'COMPLETE',created_at,updated_at FROM benchmark_runs WHERE case_id=?").run(secondRun,a.caseId);
 sql.prepare("UPDATE benchmark_runs SET state='COMPLETE' WHERE case_id=?").run(a.caseId);
 const deleted=new Set<string>();env.BENCHMARK.get=vi.fn(async(id:string)=>{if(deleted.has(id))throw new Error("instance.not_found");return {id,status:async()=>({status:"complete"}),delete:async()=>{deleted.add(id);}};}) as any;
 const now=new Date(Date.now()+31*86400000),plan=await planDeletion(env,a.caseId,now);expect(plan.runIds).toHaveLength(2);
 await deleteCase(env,plan,{caseId:a.caseId,planHash:plan.hash,policyVersion:retentionPolicyVersion,approvedAt:now.toISOString()},now);
 expect(deleted).toEqual(new Set([a.runId,secondRun]));expect(await getRun(db,b)).not.toBeNull();
});
it("rechecks the approved plan after fencing and refuses a pre-fence mutation",async()=>{
 const {planDeletion,deleteCase,retentionPolicyVersion}=await import("../../src/lib/benchmark/retention");
 const a=await saved();sql.prepare("UPDATE benchmark_runs SET state='COMPLETE'").run();const deleteMethod=vi.fn();
 env.BENCHMARK.get=vi.fn(async(id:string)=>({id,status:async()=>({status:"complete"}),delete:deleteMethod})) as any;
 const now=new Date(Date.now()+31*86400000),plan=await planDeletion(env,a.caseId,now);
 const original=db.prepare.bind(db);
 db.prepare=((query:string)=>{const statement=original(query);if(query.startsWith("INSERT OR IGNORE INTO benchmark_case_controls")){const run=statement.run.bind(statement);statement.run=async()=>{sql.prepare("UPDATE benchmark_runs SET updated_at=? WHERE case_id=?").run(now.toISOString(),a.caseId);return run();};}return statement;}) as any;
 await expect(deleteCase(env,plan,{caseId:a.caseId,planHash:plan.hash,policyVersion:retentionPolicyVersion,approvedAt:now.toISOString()},now)).rejects.toThrow("before fence");
 expect(deleteMethod).not.toHaveBeenCalled();expect(await getRun(db,a)).not.toBeNull();
});

it("polling is sequential, pauses hidden tabs and stops on release",async()=>{
 const {pollCase}=await import("../../src/lib/benchmark/polling");vi.useFakeTimers();
 try {
  let resolve!:(value:{status:string;resultReady:boolean})=>void;
  const load=vi.fn(()=>new Promise<{status:string;resultReady:boolean}>(r=>{resolve=r;}));const data=vi.fn();let visible=true;
  const stop=pollCase(load,data,vi.fn(),()=>visible);await vi.advanceTimersByTimeAsync(60000);expect(load).toHaveBeenCalledTimes(1);
  resolve({status:"HUMAN_REVIEW_REQUIRED",resultReady:false});await Promise.resolve();visible=false;
  await vi.advanceTimersByTimeAsync(15000);expect(load).toHaveBeenCalledTimes(1);visible=true;
  await vi.advanceTimersByTimeAsync(30000);expect(load).toHaveBeenCalledTimes(2);
  resolve({status:"BENCHMARK_COMPLETE",resultReady:true});await Promise.resolve();await vi.advanceTimersByTimeAsync(240000);expect(load).toHaveBeenCalledTimes(2);stop();
 } finally {vi.useRealTimers();}
});
it("polling stops permanently on capability denial",async()=>{
 const {pollCase}=await import("../../src/lib/benchmark/polling");vi.useFakeTimers();
 try {const load=vi.fn(async()=>{throw Object.assign(new Error("denied"),{status:403});});const stop=pollCase(load,vi.fn(),vi.fn(),()=>true);await vi.advanceTimersByTimeAsync(240000);expect(load).toHaveBeenCalledTimes(1);stop();}finally{vi.useRealTimers();}
});
