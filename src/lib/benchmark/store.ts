import { digest, stable, type Intake, type Draft } from "./domain";
export type Scope={caseId:string;runId:string};
export type Submission={case_id:string;evidence_json:string;payload_hash:string;status:string;created_at:string};
export type Run={case_id:string;run_id:string;evidence_hash:string;state:string;draft_json:string|null;report_json:string|null;review_decision:string|null;approved_at:string|null;reviewer_subject:string|null;review_note:string|null};
export async function getRun(db:D1Database,s:Scope){return db.prepare("SELECT * FROM benchmark_runs WHERE case_id=? AND run_id=?").bind(s.caseId,s.runId).first<Run>();}
export async function getSubmission(db:D1Database,caseId:string){return db.prepare("SELECT case_id,evidence_json,payload_hash,status,created_at FROM benchmark_submissions WHERE case_id=?").bind(caseId).first<Submission>();}
export function event(db:D1Database,s:Scope,id:string,kind:string,payload:unknown){return db.prepare("INSERT OR IGNORE INTO benchmark_events(case_id,run_id,event_id,kind,payload_json,created_at) VALUES(?,?,?,?,?,?)").bind(s.caseId,s.runId,id,kind,JSON.stringify(payload),new Date().toISOString());}
export async function state(db:D1Database,s:Scope,status:string){
  await db.batch([db.prepare("UPDATE benchmark_submissions SET status=?,updated_at=? WHERE case_id=? AND EXISTS(SELECT 1 FROM benchmark_runs WHERE case_id=? AND run_id=? AND approved_at IS NULL)").bind(status,new Date().toISOString(),s.caseId,s.caseId,s.runId),event(db,s,"status:"+status,"STATUS",{status})]);
}
export async function submit(db:D1Database,key:string,input:Intake,contact:{workEmail:string;permission:true}){
  const keyHash=await digest(key),payloadHash=await digest(stable({input,contact}));
  const s={caseId:crypto.randomUUID(),runId:crypto.randomUUID()},now=new Date().toISOString();
  await db.batch([
    db.prepare("INSERT OR IGNORE INTO benchmark_submissions(case_id,idempotency_hash,payload_hash,evidence_json,contact_email,contact_permission,status,created_at,updated_at) VALUES(?,?,?,?,?,1,'RECEIVED',?,?)").bind(s.caseId,keyHash,payloadHash,JSON.stringify(input),contact.workEmail,now,now),
    db.prepare("INSERT INTO benchmark_permissions(case_id,process,ai,publication,created_at) SELECT case_id,1,?,0,? FROM benchmark_submissions WHERE case_id=?").bind(Number(input.permissions.ai),now,s.caseId),
    db.prepare("INSERT INTO benchmark_runs(case_id,run_id,evidence_hash,version,state,created_at,updated_at) SELECT case_id,?,?,'v0.1','PENDING',?,? FROM benchmark_submissions WHERE case_id=?").bind(s.runId,await digest(stable(input)),now,now,s.caseId)
  ]);
  const saved=await db.prepare("SELECT case_id,payload_hash FROM benchmark_submissions WHERE idempotency_hash=?").bind(keyHash).first<{case_id:string;payload_hash:string}>();
  if(!saved||saved.payload_hash!==payloadHash)throw new Error("IDEMPOTENCY_CONFLICT");
  const run=await db.prepare("SELECT run_id FROM benchmark_runs WHERE case_id=?").bind(saved.case_id).first<{run_id:string}>();
  if(!run)throw new Error("Missing run");return {caseId:saved.case_id,runId:run.run_id};
}
export async function persistDraft(db:D1Database,s:Scope,draft:Draft){
  const existing=await getRun(db,s);if(existing?.draft_json){await state(db,s,"HUMAN_REVIEW_REQUIRED");return;}
  const now=new Date().toISOString();
  await db.batch([
    ...draft.findings.map(f=>db.prepare("INSERT OR IGNORE INTO benchmark_findings(case_id,run_id,finding_id,stage,topic,classification,claim,source_evidence_ids,producer,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(s.caseId,s.runId,f.id,f.stage,f.topic,f.classification,f.claim,JSON.stringify(f.sourceEvidenceIds),f.producer,now)),
    db.prepare("UPDATE benchmark_runs SET draft_json=?,state='REVIEW_REQUIRED',updated_at=? WHERE case_id=? AND run_id=? AND draft_json IS NULL").bind(JSON.stringify(draft),now,s.caseId,s.runId),
    event(db,s,"draft","DRAFT_READY",{evidenceHash:draft.evidenceHash})
  ]);
  await state(db,s,"HUMAN_REVIEW_REQUIRED");
}
