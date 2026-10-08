import { recordControl, type ControlRecord } from "./control";
import { digest, stable } from "./domain";
const tables = ["benchmark_events", "benchmark_findings", "benchmark_permissions", "benchmark_runs", "benchmark_submissions"] as const;
const terminal = new Set(["COMPLETE", "REJECTED", "INSUFFICIENT_EVIDENCE"]);
export const retentionPolicyVersion = "beta-30d-v1";
export type DeletionPlan = {
  caseId: string; counts: Record<string, number>; runIds: string[];
  lastUpdated: string; cutoff: string; eligible: boolean; blockers: string[]; hash: string;
};
// Operator-only module: no public endpoint, automatic purge, or remote CLI.
export async function planDeletion(env: Env, caseId: string, now: Date,
  verifiedAbsentRunIds: readonly string[] = []): Promise<DeletionPlan> {
  if (!/^[0-9a-f-]{36}$/i.test(caseId) || !Number.isFinite(now.getTime())) throw new Error("Invalid deletion scope");
  const counts: Record<string, number> = {};
  for (const table of tables) counts[table] = (await env.BENCHMARK_DB.prepare(
    "SELECT COUNT(*) AS n FROM " + table + " WHERE case_id=?").bind(caseId).first<{n:number}>())!.n;
  const runs = await env.BENCHMARK_DB.prepare(
    "SELECT run_id,state,updated_at FROM benchmark_runs WHERE case_id=? ORDER BY run_id").bind(caseId)
    .all<{run_id:string;state:string;updated_at:string}>();
  const cutoff = new Date(now.getTime() - 30 * 86400000).toISOString();
  const blockers: string[] = [];
  if (!counts.benchmark_submissions || !runs.results.length) blockers.push("Case/run missing");
  const lastUpdated = runs.results.map(r => r.updated_at).sort().at(-1) ?? "";
  for (const run of runs.results) {
    if (!terminal.has(run.state)) blockers.push("Nonterminal database run");
    if (!Number.isFinite(Date.parse(run.updated_at)) || run.updated_at > cutoff) blockers.push("Thirty-day retention not reached");
    try {
      const instance = await env.BENCHMARK.get(run.run_id);
      if(instance.id!==run.run_id) {blockers.push("Workflow identity mismatch");continue;}
      const status = await instance.status();
      if (!["complete", "terminated"].includes(status.status)) blockers.push("Workflow active or retryable");
    } catch {
      // An API failure is not proof of expiry. Operator must verify absence separately.
      if (!verifiedAbsentRunIds.includes(run.run_id)) blockers.push("Workflow absence not verified");
    }
  }
  const value = { caseId, counts, runIds: runs.results.map(r=>r.run_id), lastUpdated, cutoff,
    eligible: blockers.length===0, blockers };
  return { ...value, hash: await digest(stable(value)) };
}
export async function deleteCase(env: Env, plan: DeletionPlan,
  approval: { caseId:string; planHash:string; policyVersion:string; approvedAt:string },
  now: Date, verifiedAbsentRunIds: readonly string[] = []) {
  if (approval.caseId !== plan.caseId || approval.planHash !== plan.hash ||
      approval.policyVersion !== retentionPolicyVersion || !Number.isFinite(Date.parse(approval.approvedAt)))
    throw new Error("Explicit policy and case deletion approval required");
  const current = await planDeletion(env, plan.caseId, now, verifiedAbsentRunIds);
  if (!current.eligible || current.hash !== plan.hash) throw new Error("Dry-run changed or deletion unsafe");
  const receiptId = crypto.randomUUID(), total = Object.values(plan.counts).reduce((a,b)=>a+b,0);
  const record:ControlRecord={caseId:plan.caseId,runIds:plan.runIds,kind:"DELETE",blockedAt:now.toISOString(),receiptId,policyVersion:retentionPolicyVersion,phase:"BLOCKED"};
  await recordControl(env,record);
  const frozen=await planDeletion(env,plan.caseId,now,verifiedAbsentRunIds);
  if(!frozen.eligible || frozen.hash!==plan.hash) throw new Error("Case changed before fence; new approved plan required");
  // Fences are durable before stopping/removing state. Never purge D1 on API failure.
  for(const runId of plan.runIds) {
    if(verifiedAbsentRunIds.includes(runId)) continue;
    const instance=await env.BENCHMARK.get(runId);
    if(instance.id!==runId) throw new Error("Workflow identity mismatch");
    const handle=instance as typeof instance & {delete?:()=>Promise<void>};
    if(!handle.delete) throw new Error("Workflow delete API unavailable; D1 preserved");
    await handle.delete();
    let absent=false;
    try {await env.BENCHMARK.get(runId);} catch(error) {
      // Only documented not-found is absence; permissions/timeouts are not proof.
      absent=error instanceof Error && /instance[._ ]not[_ ]found/i.test(error.message);
    }
    if(!absent) throw new Error("Workflow deletion not verified; D1 preserved");
  }
  const guarded = "EXISTS(SELECT 1 FROM benchmark_deletion_receipts WHERE receipt_id=?)";
  await env.BENCHMARK_DB.batch([
    env.BENCHMARK_DB.prepare(
      "INSERT INTO benchmark_deletion_receipts(receipt_id,deleted_at,policy_version,deleted_rows) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM benchmark_submissions WHERE case_id=?) AND (SELECT MAX(updated_at) FROM benchmark_runs WHERE case_id=?)=? AND NOT EXISTS(SELECT 1 FROM benchmark_runs WHERE case_id=? AND (state NOT IN ('COMPLETE','REJECTED','INSUFFICIENT_EVIDENCE') OR updated_at>?))")
      .bind(receiptId, now.toISOString(), retentionPolicyVersion, total, plan.caseId, plan.caseId, plan.lastUpdated, plan.caseId, plan.cutoff),
    ...tables.map(table => env.BENCHMARK_DB.prepare("DELETE FROM " + table + " WHERE case_id=? AND " + guarded).bind(plan.caseId,receiptId)),
  ]);
  const receipt = await env.BENCHMARK_DB.prepare("SELECT receipt_id,deleted_at,policy_version,deleted_rows FROM benchmark_deletion_receipts WHERE receipt_id=?").bind(receiptId).first();
  if (!receipt) throw new Error("Deletion guard refused; no deletion performed");
  for (const table of tables) {
    const row = await env.BENCHMARK_DB.prepare("SELECT COUNT(*) AS n FROM " + table + " WHERE case_id=?").bind(plan.caseId).first<{n:number}>();
    if (row?.n !== 0) throw new Error("Deletion verification failed");
  }
  await recordControl(env,{...record,phase:"PURGED"});
  return receipt;
}
