import { issueInvitation, revokeInvitation } from "../../src/lib/benchmark/admission";
import { planDeletion, deleteCase, retentionPolicyVersion } from "../../src/lib/benchmark/retention";
import { reconcileControls } from "../../src/lib/benchmark/control";
import { digest, stable } from "../../src/lib/benchmark/domain";
export type Request = {operation:string;caseId?:string;hash?:string;expiresAt?:string;plan?:Awaited<ReturnType<typeof planDeletion>>};
export type Approval = {requestHash:string;target:string;owner:string;approvedAt:string;expiresAt:string;policyVersion:string};
export async function requestHash(request:Request,target:string){return digest(stable({request,target}));}
export async function authorize(request:Request,target:string,approval:Approval|undefined,now:Date){
 if(!approval || approval.owner!=="vuyocossa41@gmail.com" || approval.target!==target || approval.requestHash!==await requestHash(request,target) || approval.policyVersion!==retentionPolicyVersion || !Number.isFinite(Date.parse(approval.approvedAt)) || Date.parse(approval.approvedAt)>now.getTime() || Date.parse(approval.approvedAt)<now.getTime()-15*60000 || !Number.isFinite(Date.parse(approval.expiresAt)) || Date.parse(approval.expiresAt)<=now.getTime() || Date.parse(approval.expiresAt)>Date.parse(approval.approvedAt)+15*60000) throw new Error("APPROVAL_REQUIRED");
}
const tables=["benchmark_events","benchmark_findings","benchmark_permissions","benchmark_runs","benchmark_submissions"];
async function verifiedAbsence(env:Env,caseId:string){
 if(!/^[0-9a-f-]{36}$/i.test(caseId))throw new Error("CASE_REQUIRED");
 const rows=await env.BENCHMARK_DB.prepare("SELECT run_id FROM benchmark_runs WHERE case_id=? ORDER BY run_id").bind(caseId).all<{run_id:string}>();const absent:string[]=[];
 for(const row of rows.results){try{const instance=await env.BENCHMARK.get(row.run_id);if(instance.id!==row.run_id)throw new Error("INSTANCE_IDENTITY_REFUSED");}catch(error){if(error instanceof Error && /instance[._ ]not[_ ]found/i.test(error.message))absent.push(row.run_id);else throw error;}}
 return absent;
}
export async function operate(env:Env,request:Request,target:string,approval?:Approval,now=new Date()){
 if(["issue","revoke","delete","reconcile"].includes(request.operation))await authorize(request,target,approval,now);
 switch(request.operation){
 case "capacity": {const row=await env.BENCHMARK_DB.prepare("SELECT accepted,maximum FROM benchmark_beta_capacity WHERE singleton=1").first<{accepted:number;maximum:number}>();if(!row)throw new Error("MIGRATIONS_REQUIRED");return {...row,remaining:Math.max(0,row.maximum-row.accepted)};}
 case "issue":return issueInvitation(env.BENCHMARK_DB,request.expiresAt || "");
 case "revoke":await revokeInvitation(env,request.hash || "");return {revoked:true};
 case "plan":return planDeletion(env,request.caseId || "",now,await verifiedAbsence(env,request.caseId || ""));
 case "delete": {if(!request.plan || request.caseId!==request.plan.caseId)throw new Error("PLAN_SCOPE_REQUIRED");const frozen=new Date(Date.parse(request.plan.cutoff)+30*86400000);if(!Number.isFinite(frozen.getTime()) || frozen.getTime()>now.getTime() || frozen.getTime()<now.getTime()-15*60000)throw new Error("PLAN_EXPIRED");return deleteCase(env,request.plan,{caseId:request.plan.caseId,planHash:request.plan.hash,policyVersion:retentionPolicyVersion,approvedAt:approval!.approvedAt},frozen,await verifiedAbsence(env,request.caseId));}
 case "verify": {if(!request.caseId || !/^[0-9a-f-]{36}$/i.test(request.caseId))throw new Error("CASE_REQUIRED");const record=await env.BENCHMARK_CONTROL.get<{phase:string;caseId:string;runIds:string[]}>("case:"+request.caseId,"json");if(record?.phase!=="PURGED" || record.caseId!==request.caseId || !Array.isArray(record.runIds) || !record.runIds.length)throw new Error("PURGE_NOT_RECORDED");for(const table of tables){const row=await env.BENCHMARK_DB.prepare("SELECT COUNT(*) AS n FROM "+table+" WHERE case_id=?").bind(request.caseId).first<{n:number}>();if(row?.n!==0)throw new Error("D1_NOT_EMPTY");}for(const id of record.runIds){let absent=false;try{await env.BENCHMARK.get(id);}catch(e){absent=e instanceof Error && /instance[._ ]not[_ ]found/i.test(e.message);}if(!absent)throw new Error("WORKFLOW_NOT_ABSENT");}return {caseId:request.caseId,d1Empty:true,workflowAbsent:true,controlFencePresent:true};}
 case "reconcile":await reconcileControls(env);return {reconciled:true,reopenAuthorized:false};
 default:throw new Error("UNKNOWN_OPERATION");
 }
}
