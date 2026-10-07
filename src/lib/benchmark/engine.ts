import { analysis } from "./ai";
import { closeReport, deterministic, digest, intakeSchema, isCounterexample, normalize, qualify, stable, type Draft, type Finding } from "./domain";
import { event, getRun, getSubmission, persistDraft, state, type Scope } from "./store";
export interface Steps {
  do<T>(name:string, callback:()=>Promise<T>|T):Promise<T>;
  waitForEvent(name:string,options:{type:string;timeout:"30 days"}):Promise<unknown>;
}
export async function release(env:Env,s:Scope){
  const run=await getRun(env.BENCHMARK_DB,s);
  if(!run?.draft_json||!run.approved_at||!run.reviewer_subject)throw new Error("Human approval required");
  if(run.report_json)return JSON.parse(run.report_json);
  if(run.review_decision==="REJECT")return null;
  const draft=JSON.parse(run.draft_json) as Draft;
  closeReport(draft.findings,draft.evidence);
  const status=draft.counterexample||run.review_decision==="COUNTEREXAMPLE"?"COUNTEREXAMPLE":"BENCHMARK_COMPLETE";
  const report={...draft,status,approvedAt:run.approved_at,reviewNote:run.review_note,knownMeaning:"KNOWN / OBSERVED means reported in redacted submitted evidence, not independently verified."};
  const now=new Date().toISOString();
  await env.BENCHMARK_DB.batch([
    env.BENCHMARK_DB.prepare("UPDATE benchmark_runs SET report_json=?,state='COMPLETE',updated_at=? WHERE case_id=? AND run_id=? AND report_json IS NULL AND approved_at IS NOT NULL").bind(JSON.stringify(report),now,s.caseId,s.runId),
    env.BENCHMARK_DB.prepare("UPDATE benchmark_submissions SET status=?,updated_at=? WHERE case_id=? AND EXISTS(SELECT 1 FROM benchmark_runs WHERE case_id=? AND run_id=? AND approved_at IS NOT NULL)").bind(status,now,s.caseId,s.caseId,s.runId),
    event(env.BENCHMARK_DB,s,"released","REPORT_RELEASED",{status})
  ]);return report;
}
export async function processCase(env:Env,s:Scope,step:Steps){
  const input=await step.do("validation",async()=>{
    const submission=await getSubmission(env.BENCHMARK_DB,s.caseId),run=await getRun(env.BENCHMARK_DB,s);
    if(!submission||!run)throw new Error("Case/run scope missing");
    const input=intakeSchema.parse(JSON.parse(submission.evidence_json));
    if(await digest(stable(input))!==run.evidence_hash)throw new Error("Evidence identity changed");
    const p=await env.BENCHMARK_DB.prepare("SELECT process FROM benchmark_permissions WHERE case_id=?").bind(s.caseId).first<{process:number}>();
    if(!p?.process)throw new Error("Processing is not authorized");
    return input;
  });
  const qualified=await step.do("qualification",async()=>{
    await state(env.BENCHMARK_DB,s,"QUALIFYING");
    const yes=qualify(normalize(input));if(!yes)await state(env.BENCHMARK_DB,s,"INSUFFICIENT_EVIDENCE");return yes;
  });
  if(!qualified)return {status:"INSUFFICIENT_EVIDENCE"};
  const evidence=await step.do("normalization",()=>normalize(input));
  const checks=await step.do("deterministic checks",async()=>{await state(env.BENCHMARK_DB,s,"BENCHMARKING");return deterministic(evidence);});
  const model=await step.do("AI analysis",async()=>{
    const p=await env.BENCHMARK_DB.prepare("SELECT ai FROM benchmark_permissions WHERE case_id=?").bind(s.caseId).first<{ai:number}>();
    return p?.ai?analysis(env,evidence,false):{claims:[],error:null};
  });
  const counter=await step.do("adversarial countercheck",async()=>{
    const p=await env.BENCHMARK_DB.prepare("SELECT ai FROM benchmark_permissions WHERE case_id=?").bind(s.caseId).first<{ai:number}>();
    return p?.ai?analysis(env,evidence,true,model.claims):{claims:[],error:null};
  });
  await step.do("human review gate",async()=>{
    const findings:Finding[]=[...checks,...model.claims.map((c,i)=>({...c,id:"ai-"+i,producer:env.BENCHMARK_MODEL})),...counter.claims.map((c,i)=>({...c,id:"counter-"+i,producer:"countercheck:"+env.BENCHMARK_MODEL}))];
    closeReport(findings,evidence);
    const run=await getRun(env.BENCHMARK_DB,s);if(!run)throw new Error("Run missing");
    await persistDraft(env.BENCHMARK_DB,s,{schemaVersion:"v0.1",runId:s.runId,evidenceHash:run.evidence_hash,evidence,findings,analysisErrors:[model.error,counter.error].filter((v):v is string=>!!v),counterexample:isCounterexample(evidence)||findings.some(f=>f.classification==="COUNTEREVIDENCE")});
  });
  for(let i=0;;i++){
    const review=await step.do("review status "+i,async()=>{const run=await getRun(env.BENCHMARK_DB,s);return run?.approved_at?run.review_decision:null;});
    if(review){if(review==="REJECT")return {status:"INSUFFICIENT_EVIDENCE"};break;}
    try{await step.waitForEvent("review decision "+i,{type:"review",timeout:"30 days"});}catch{/* Expiry does not authorize release. */ }
  }
  return step.do("Correction Map",()=>release(env,s));
}
export async function start(env:Env,s:Scope){
  try{const existing=await env.BENCHMARK.get(s.runId);await existing.status();return;}
  catch{/* Missing instance: create with the immutable run ID. */}
  try{await env.BENCHMARK.create({id:s.runId,params:s});}
  catch{const existing=await env.BENCHMARK.get(s.runId);await existing.status();}
}
export async function recoverPending(env:Env){
  const pending=await env.BENCHMARK_DB.prepare("SELECT case_id,run_id FROM benchmark_runs WHERE state='PENDING' LIMIT 25").all<{case_id:string;run_id:string}>();
  for(const r of pending.results)await start(env,{caseId:r.case_id,runId:r.run_id});
}
