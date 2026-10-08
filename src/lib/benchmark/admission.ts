import { digest } from "./domain";
import { HttpError } from "./security";
// Operator-only. Never expose mint/revoke as an unauthenticated endpoint or log the returned secret.
export async function issueInvitation(db:D1Database, expiresAt:string) {
 if (!Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt)<=Date.now()) throw new Error("Future expiry required");
 const secret=Array.from(crypto.getRandomValues(new Uint8Array(32)), b=>b.toString(16).padStart(2,"0")).join("");
 const hash=await digest(secret);
 const result=await db.prepare("INSERT INTO benchmark_invitations(secret_hash,created_at,expires_at) SELECT ?,?,? WHERE (SELECT COUNT(*) FROM benchmark_invitations)<10")
  .bind(hash,new Date().toISOString(),expiresAt).run();
 if (!result.meta.changes) throw new Error("Ten-invitation pilot issuance cap reached");
 return {secret,hash};
}
export async function revokeInvitation(env:Env, hash:string) {
 if(!/^[a-f0-9]{64}$/.test(hash)) throw new Error("Invalid invitation scope");
 await env.BENCHMARK_CONTROL.put("invitation-revoked:"+hash,JSON.stringify({state:"REVOKED",at:new Date().toISOString()}));
 await env.BENCHMARK_DB.prepare("UPDATE benchmark_invitations SET revoked_at=? WHERE secret_hash=? AND revoked_at IS NULL").bind(new Date().toISOString(),hash).run();
}
export async function invitationHash(request:Request) {
 const secret=request.headers.get("x-benchmark-invitation");
 if(!secret || !/^[a-f0-9]{64}$/.test(secret)) throw new HttpError(403,"Operator-issued invitation required");
 return digest(secret);
}

export async function assertInvitationUsable(env:Env,hash:string,key:string) {
 if(await env.BENCHMARK_CONTROL.get("invitation-revoked:"+hash)) throw new HttpError(403,"Invitation unavailable");
 const record=await env.BENCHMARK_CONTROL.get<{state:string;keyHash?:string;caseId?:string}>("invitation:"+hash,"json");
 if(record && (record.state!=="CONSUMED" || record.keyHash!==await digest(key))) throw new HttpError(403,"Invitation unavailable");
 if(record) {
  const saved=await env.BENCHMARK_DB.prepare("SELECT case_id FROM benchmark_submissions WHERE idempotency_hash=? AND invitation_hash=?").bind(record.keyHash,hash).first<{case_id:string}>();
  if(!saved || saved.case_id!==record.caseId) throw new HttpError(403,"Invitation unavailable");
 }
}
// Persist only hashed admission identity outside D1 restoration; retries use the same record.
export async function recordAdmissionForScope(env:Env,s:{caseId:string;runId:string}) {
 const row=await env.BENCHMARK_DB.prepare("SELECT s.invitation_hash,s.idempotency_hash FROM benchmark_submissions s JOIN benchmark_runs r ON r.case_id=s.case_id WHERE s.case_id=? AND r.run_id=?").bind(s.caseId,s.runId).first<{invitation_hash:string|null;idempotency_hash:string}>();
 if(!row) throw new Error("Case/run scope missing");
 if(!row.invitation_hash) return; // legacy pre-admission synthetic cases only; migration prevents new null admissions
 if(await env.BENCHMARK_CONTROL.get("invitation-revoked:"+row.invitation_hash)) throw new HttpError(403,"Invitation unavailable");
 const previous=await env.BENCHMARK_CONTROL.get<{state:string;caseId?:string}>("invitation:"+row.invitation_hash,"json");
 if(previous?.state==="REVOKED" || (previous?.caseId && previous.caseId!==s.caseId)) throw new HttpError(403,"Invitation unavailable");
 if(!previous) await env.BENCHMARK_CONTROL.put("invitation:"+row.invitation_hash,JSON.stringify({state:"CONSUMED",caseId:s.caseId,runId:s.runId,keyHash:row.idempotency_hash}));
}
