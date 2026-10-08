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
import { env } from "cloudflare:workers";
import {
  applyD1Migrations,
  introspectWorkflowInstance,
  createExecutionContext,
  waitOnExecutionContext,
} from "cloudflare:test";
import { beforeAll, expect, it } from "vitest";
import { intakeSchema, closeReport } from "../../src/lib/benchmark/domain";
import { submit as rawSubmit, getRun } from "../../src/lib/benchmark/store";
import { benchmarkApi } from "../../src/lib/benchmark/api";
import { capability } from "../../src/lib/benchmark/security";
const runtime = env as Env & { TEST_MIGRATIONS: D1Migration[] };
beforeAll(() => applyD1Migrations(runtime.BENCHMARK_DB, runtime.TEST_MIGRATIONS));
function input() {
  return intakeSchema.parse({
    companyType: "SaaS",
    role: "Controller",
    stack: "Billing and ERP",
    economicChangeType: "WRITE_OFF_PAYMENT",
    originalState: "Write-off executed",
    whatChanged: "Payment received",
    whenChanged: "UNKNOWN",
    systemsAffected: "Ledger",
    newEvidence: "Redacted payment summary",
    decisionV1: "Write-off",
    decisionV2: "Reverse write-off",
    authorization: "Controller approval",
    expectedReversals: "Write-off reversal",
    actualActions: "Reversed",
    verification: "UNKNOWN",
    humanWorkRequired: "Controller review",
    unknownFields: ["verification"],
    incumbentAssessment: "SUFFICIENT",
    authorityRequired: "YES",
    closed: true,
    authorized: true,
    redacted: true,
    permissions: { process: true, ai: true, publication: false },
    evidence: [],
  });
}
it("real D1 and Workflow persist a draft, wait for human approval and release the private map after a retried step", async () => {
  const key = crypto.randomUUID(),
    contact = { workEmail: "controller@example.com", permission: true as const };
  const scope = await submit(runtime.BENCHMARK_DB, key, input(), contact);
  expect(await submit(runtime.BENCHMARK_DB, key, input(), contact)).toEqual(scope);
  const instance = await introspectWorkflowInstance(runtime.BENCHMARK, scope.runId);
  try {
    await instance.modify(async (m) => {
      await m.disableRetryDelays();
      await m.mockStepError({ name: "deterministic checks" }, new Error("retry fixture"), 1);
    });
    const workflow = await runtime.BENCHMARK.create({ id: scope.runId, params: scope });
    await instance.waitForStepResult({ name: "human review gate" });
    const draftRun = await getRun(runtime.BENCHMARK_DB, scope);
    expect(draftRun?.report_json).toBeNull();
    expect(draftRun?.state).toBe("REVIEW_REQUIRED");
    const draft = JSON.parse(draftRun!.draft_json!);
    closeReport(draft.findings, draft.evidence);
    expect(
      draft.findings.some(
        (f: { classification: string; claim: string }) =>
          f.classification === "UNKNOWN" && f.claim === "UNKNOWN",
      ),
    ).toBe(true);
    expect(draftRun?.draft_json).not.toContain(contact.workEmail);
    expect(draft.analysisErrors.join(" ")).toContain("AI_DISABLED");
    const token = await capability(runtime, scope.caseId, scope.runId);
    const ctx = createExecutionContext();
    const request = () =>
      new Request("https://benchmark.test/api/benchmark/results/" + scope.caseId, {
        headers: { authorization: "Bearer " + token, "x-benchmark-run": scope.runId },
      });
    expect((await benchmarkApi(request(), runtime, ctx)).status).toBe(409);
    // Only this runtime fixture writes approval directly. Production uses Access-verified API.
    await runtime.BENCHMARK_DB.prepare(
      "UPDATE benchmark_runs SET reviewer_subject='runtime-reviewer',review_note='Evidence and limitations reviewed',review_decision='APPROVE',approved_at=?,updated_at=? WHERE case_id=? AND run_id=?",
    )
      .bind(new Date().toISOString(), new Date().toISOString(), scope.caseId, scope.runId)
      .run();
    await workflow.sendEvent({ type: "review", payload: scope });
    await instance.waitForStatus("complete");
    const result = await benchmarkApi(request(), runtime, ctx);
    expect(result.status).toBe(200);
    const report = (await result.json()) as typeof draft & { status: string };
    expect(report.status).toBe("COUNTEREXAMPLE");
    closeReport(report.findings, report.evidence);
    expect((await getRun(runtime.BENCHMARK_DB, scope))?.draft_json).toBe(draftRun?.draft_json);
    await waitOnExecutionContext(ctx);
    // Isolated local runtime only: delete a completed synthetic case after simulated retention.
    const { planDeletion, deleteCase, retentionPolicyVersion } = await import("../../src/lib/benchmark/retention");
    const control = await submit(runtime.BENCHMARK_DB, crypto.randomUUID(), input(), contact);
    const controlToken = await capability(runtime, control.caseId, control.runId);
    const now = new Date(Date.now()+31*86400000);
    const plan = await planDeletion(runtime, scope.caseId, now);
    expect(plan.eligible).toBe(true);
    await deleteCase(runtime, plan, {caseId:scope.caseId,planHash:plan.hash,policyVersion:retentionPolicyVersion,approvedAt:now.toISOString()},now);
    expect((await benchmarkApi(request(), runtime, ctx)).status).toBe(403);
    expect((await benchmarkApi(new Request("https://benchmark.test/api/benchmark/cases/"+control.caseId,
      {headers:{authorization:"Bearer "+controlToken,"x-benchmark-run":control.runId}}),runtime,ctx)).status).toBe(200);
    expect(await getRun(runtime.BENCHMARK_DB,scope)).toBeNull();
    await expect(runtime.BENCHMARK.get(scope.runId)).rejects.toThrow("instance.not_found");
    const {start,recoverPending}=await import("../../src/lib/benchmark/engine");
    await expect(start(runtime,scope)).rejects.toThrow("unavailable");
    await expect(runtime.BENCHMARK_DB.prepare("INSERT INTO benchmark_runs(case_id,run_id,evidence_hash,version,state,created_at,updated_at) VALUES(?,?,?,'v0.1','PENDING',?,?)").bind(scope.caseId,scope.runId,"synthetic",now.toISOString(),now.toISOString()).run()).rejects.toThrow("CASE_BLOCKED");
    expect(await runtime.BENCHMARK_CONTROL.get("case:"+scope.caseId)).not.toBeNull();
    await recoverPending(runtime); // control case can start; deleted case cannot recover
    await (await runtime.BENCHMARK.get(control.runId)).delete();
    await expect(runtime.BENCHMARK.get(scope.runId)).rejects.toThrow("instance.not_found");

  } finally {
    await instance.dispose();
  }
});

it("submission API dispatches one immutable Workflow for duplicate POSTs", async () => {
  const context = createExecutionContext();
  const key = crypto.randomUUID();
  const body = JSON.stringify({
    evidence: input(),
    contact: { workEmail: "controller@example.com", permission: true },
  });
  const invitation=await fixtureInvitation(runtime.BENCHMARK_DB,key);
  const request = () =>
    new Request("https://benchmark.test/api/benchmark/submissions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: runtime.BENCHMARK_ORIGIN, "x-benchmark-invitation": invitation,
        "CF-Connecting-IP": "192.0.2.1",
        "idempotency-key": key,
      },
      body,
    });
  const first = await benchmarkApi(request(), runtime, context);
  expect(first.status).toBe(202);
  const receiptWithKey = (await first.json()) as { caseId: string; runId: string };
  const receipt = { caseId: receiptWithKey.caseId, runId: receiptWithKey.runId };
  const second = await benchmarkApi(request(), runtime, context);
  expect(second.status).toBe(202);
  expect(await second.json()).toMatchObject(receipt);
  await waitOnExecutionContext(context);
  const instance = await introspectWorkflowInstance(runtime.BENCHMARK, receipt.runId);
  try {
    await instance.waitForStepResult({ name: "human review gate" });
    expect((await getRun(runtime.BENCHMARK_DB, receipt))?.state).toBe("REVIEW_REQUIRED");
    expect((await getRun(runtime.BENCHMARK_DB, receipt))?.report_json).toBeNull();
    const count = await runtime.BENCHMARK_DB.prepare(
      "SELECT COUNT(*) AS n FROM benchmark_runs WHERE case_id=?",
    )
      .bind(receipt.caseId)
      .first<{ n: number }>();
    expect(count?.n).toBe(1);
    await runtime.BENCHMARK_DB.prepare(
      "UPDATE benchmark_runs SET reviewer_subject='runtime-reviewer',review_note='Duplicate dispatch fixture rejected',review_decision='REJECT',approved_at=?,updated_at=? WHERE case_id=? AND run_id=?",
    )
      .bind(new Date().toISOString(), new Date().toISOString(), receipt.caseId, receipt.runId)
      .run();
    await (
      await runtime.BENCHMARK.get(receipt.runId)
    ).sendEvent({ type: "review", payload: receipt });
    await instance.waitForStatus("complete");
    expect((await getRun(runtime.BENCHMARK_DB, receipt))?.state).toBe("REJECTED");
  } finally {
    await instance.dispose();
  }
});

it("enforces case revocation against the real D1 binding", async () => {
  const contact = { workEmail: "controller@example.com", permission: true as const };
  const a = await submit(runtime.BENCHMARK_DB, crypto.randomUUID(), input(), contact);
  const b = await submit(runtime.BENCHMARK_DB, crypto.randomUUID(), input(), contact);
  const { requireCase } = await import("../../src/lib/benchmark/security");
  const at = await capability(runtime, a.caseId, a.runId),
    bt = await capability(runtime, b.caseId, b.runId);
  const req = (token: string) =>
    new Request("https://benchmark.test", { headers: { authorization: "Bearer " + token } });
  await requireCase(req(at), runtime, a.caseId, a.runId);
  await runtime.BENCHMARK_DB.prepare(
    "UPDATE benchmark_submissions SET revoked_at=? WHERE case_id=? AND revoked_at IS NULL",
  )
    .bind(new Date().toISOString(), a.caseId)
    .run();
  await expect(requireCase(req(at), runtime, a.caseId, a.runId)).rejects.toThrow("revoked");
  await requireCase(req(bt), runtime, b.caseId, b.runId);
});

it("native rate-limit runtime rejects before D1 and recovers after the sixty-second window", async () => {
  const ip="192.0.2."+Math.floor(Math.random()*200+20), ctx=createExecutionContext();
  const count=async()=> (await runtime.BENCHMARK_DB.prepare("SELECT COUNT(*) n FROM benchmark_runs").first<{n:number}>())!.n;
  const before=await count();
  const req=()=>new Request("https://benchmark.test/api/benchmark/submissions",{method:"POST",
    headers:{origin:runtime.BENCHMARK_ORIGIN,"x-benchmark-invitation":"a".repeat(64),"content-type":"application/json","CF-Connecting-IP":ip,"idempotency-key":crypto.randomUUID()},body:"{invalid"});
  for(let i=0;i<5;i++) expect((await benchmarkApi(req(),runtime,ctx)).status).toBe(400);
  const rejected=await benchmarkApi(req(),runtime,ctx);
  expect(rejected.status).toBe(429); expect(rejected.headers.get("retry-after")).toBe("60");
  expect(await count()).toBe(before);
  await new Promise(resolve=>setTimeout(resolve,61000));
  expect((await benchmarkApi(req(),runtime,ctx)).status).toBe(400);
  expect(await count()).toBe(before);
  await waitOnExecutionContext(ctx);
},90000);

it("real D1 admits one winner for concurrent reuse of a single invitation",async()=>{
 const {issueInvitation}=await import("../../src/lib/benchmark/admission");
 const invitation=await issueInvitation(runtime.BENCHMARK_DB,new Date(Date.now()+86400000).toISOString());
 const contact={workEmail:"controller@example.com",permission:true as const};
 const attempts=await Promise.allSettled([rawSubmit(runtime.BENCHMARK_DB,crypto.randomUUID(),input(),contact,invitation.hash),rawSubmit(runtime.BENCHMARK_DB,crypto.randomUUID(),input(),contact,invitation.hash)]);
 expect(attempts.filter(r=>r.status==="fulfilled")).toHaveLength(1);
 expect(attempts.filter(r=>r.status==="rejected")).toHaveLength(1);
 const count=await runtime.BENCHMARK_DB.prepare("SELECT COUNT(*) n FROM benchmark_submissions WHERE invitation_hash=?").bind(invitation.hash).first<{n:number}>();expect(count?.n).toBe(1);
 const winner=attempts.find(r=>r.status==="fulfilled") as PromiseFulfilledResult<{caseId:string;runId:string}>;
 const row=await runtime.BENCHMARK_DB.prepare("SELECT consumed_case_id FROM benchmark_invitations WHERE secret_hash=?").bind(invitation.hash).first<{consumed_case_id:string}>();expect(row?.consumed_case_id).toBe(winner.value.caseId);
});
