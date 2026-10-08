import { HttpError } from "./security";
import type { Scope } from "./store";
export type ControlRecord={caseId:string;runIds:string[];kind:"DELETE"|"REVOKE";blockedAt:string;receiptId:string;policyVersion:string;phase:"BLOCKED"|"PURGED"};
export async function assertScopeActive(env:Env,s:Scope) {
 if(!env.BENCHMARK_CONTROL) throw new HttpError(503,"Control ledger unavailable");
 let record:string|null;
 try {record=await env.BENCHMARK_CONTROL.get("case:"+s.caseId);} catch {throw new HttpError(503,"Control ledger unavailable");}
 if(record) throw new HttpError(403,"Case unavailable");
 const row=await env.BENCHMARK_DB.prepare("SELECT r.run_id FROM benchmark_runs r JOIN benchmark_submissions s ON s.case_id=r.case_id WHERE r.case_id=? AND r.run_id=? AND NOT EXISTS(SELECT 1 FROM benchmark_case_controls c WHERE c.case_id=r.case_id)").bind(s.caseId,s.runId).first();
 if(!row) throw new HttpError(403,"Case unavailable");
}
// Operator-only: preserve denial independently of D1 Time Travel. No secret or evidence is stored.
export async function recordControl(env:Env,record:ControlRecord) {
 if(!env.BENCHMARK_CONTROL) throw new Error("External control ledger required");
 await env.BENCHMARK_DB.prepare("INSERT OR IGNORE INTO benchmark_case_controls(case_id,blocked_at,kind) VALUES(?,?,?)").bind(record.caseId,record.blockedAt,record.kind).run();
 await env.BENCHMARK_CONTROL.put("case:"+record.caseId,JSON.stringify(record));
 const receiptKey="receipt:"+record.receiptId+":"+record.phase;
 const previous=await env.BENCHMARK_CONTROL.get(receiptKey);
 if(previous && previous!==JSON.stringify(record)) throw new Error("Receipt identity already used");
 if(!previous) await env.BENCHMARK_CONTROL.put(receiptKey,JSON.stringify(record));
 const saved=await env.BENCHMARK_CONTROL.get("case:"+record.caseId);
 if(!saved || JSON.parse(saved).receiptId!==record.receiptId) throw new Error("Control ledger write not verified");
}
export async function revokeCase(env:Env,s:Scope) {
 await assertScopeActive(env,s);
 const runs=await env.BENCHMARK_DB.prepare("SELECT run_id FROM benchmark_runs WHERE case_id=? ORDER BY run_id").bind(s.caseId).all<{run_id:string}>();
 await recordControl(env,{caseId:s.caseId,runIds:runs.results.map(r=>r.run_id),kind:"REVOKE",blockedAt:new Date().toISOString(),receiptId:crypto.randomUUID(),policyVersion:"case-revocation-v1",phase:"BLOCKED"});
}
// Run while beta routes and recovery are disabled after any D1 restore; never restore this KV ledger with D1.
export async function reconcileControls(env:Env) {
 const cases=await env.BENCHMARK_DB.prepare("SELECT case_id FROM benchmark_submissions").all<{case_id:string}>();
 const accepted=new Set(cases.results.map(r=>r.case_id));
 let cursor:string|undefined;
 do {
  const page: Awaited<ReturnType<KVNamespace["list"]>>=await env.BENCHMARK_CONTROL.list({prefix:"case:",cursor});
  for(const key of page.keys) {
   const value=await env.BENCHMARK_CONTROL.get<ControlRecord>(key.name,"json");
   if(!value || key.name!=="case:"+value.caseId) throw new Error("Invalid restore ledger");
   accepted.add(value.caseId);
   await env.BENCHMARK_DB.prepare("INSERT OR IGNORE INTO benchmark_case_controls(case_id,blocked_at,kind) VALUES(?,?,?)").bind(value.caseId,value.blockedAt,value.kind).run();
  }
  cursor=page.list_complete?undefined:page.cursor;
 } while(cursor);
 for(const prefix of ["invitation:","invitation-revoked:"]) {
  cursor=undefined;
  do {
   const page: Awaited<ReturnType<KVNamespace["list"]>>=await env.BENCHMARK_CONTROL.list({prefix,cursor});
   for(const key of page.keys) {
    const value=await env.BENCHMARK_CONTROL.get<{state:string;caseId?:string;at?:string}>(key.name,"json");
    if(!value) throw new Error("Invalid invitation restore ledger");
    if(value.caseId) accepted.add(value.caseId);
    if(prefix==="invitation-revoked:") await env.BENCHMARK_DB.prepare("UPDATE benchmark_invitations SET revoked_at=? WHERE secret_hash=? AND revoked_at IS NULL").bind(value.at || new Date().toISOString(),key.name.slice(prefix.length)).run();
   }
   cursor=page.list_complete?undefined:page.cursor;
  } while(cursor);
 }
 await env.BENCHMARK_DB.prepare("UPDATE benchmark_beta_capacity SET accepted=MAX(accepted,?) WHERE singleton=1").bind(accepted.size).run();
}

// Prepared migration operation only; do not run remotely without separate approval.
export async function backfillLegacyRevocations(env:Env) {
 const cases=await env.BENCHMARK_DB.prepare("SELECT case_id FROM benchmark_submissions WHERE revoked_at IS NOT NULL").all<{case_id:string}>();
 for(const value of cases.results) {
  if(await env.BENCHMARK_CONTROL.get("case:"+value.case_id)) continue;
  const runs=await env.BENCHMARK_DB.prepare("SELECT run_id FROM benchmark_runs WHERE case_id=? ORDER BY run_id").bind(value.case_id).all<{run_id:string}>();
  await recordControl(env,{caseId:value.case_id,runIds:runs.results.map(r=>r.run_id),kind:"REVOKE",blockedAt:new Date().toISOString(),receiptId:crypto.randomUUID(),policyVersion:"legacy-revocation-backfill-v1",phase:"BLOCKED"});
 }
}
