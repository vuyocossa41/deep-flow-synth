import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { closeReport, deterministic, intakeSchema, normalize, qualify, validateClaims, isCounterexample, type Intake, type Draft } from "../../src/lib/benchmark/domain";
import { submit, getRun, persistDraft, type Scope } from "../../src/lib/benchmark/store";
import { processCase, release, type Steps } from "../../src/lib/benchmark/engine";
import { capability, requireCase, requireReviewer } from "../../src/lib/benchmark/security";
import { analysis } from "../../src/lib/benchmark/ai";
import { benchmarkApi } from "../../src/lib/benchmark/api";

function database(){
 const sql=new DatabaseSync(":memory:");sql.exec(readFileSync("migrations/0001_correction_benchmark.sql","utf8"));
 class Statement{
   args:any[]=[];constructor(public query:string){}
   bind(...args:any[]){this.args=args;return this;}
   async first<T>(){return (sql.prepare(this.query).get(...this.args) as T)||null;}
   async all<T>(){return {results:sql.prepare(this.query).all(...this.args) as T[],success:true,meta:{}};}
   async run(){const r=sql.prepare(this.query).run(...this.args);return {success:true,results:[],meta:{changes:Number(r.changes)}};}
 }
 const db={prepare:(query:string)=>new Statement(query),async batch(statements:Statement[]){sql.exec("BEGIN");try{const result=[];for(const s of statements)result.push(await s.run());sql.exec("COMMIT");return result;}catch(e){sql.exec("ROLLBACK");throw e;}}};
 return {db:db as D1Database,sql};
}
function input(overrides:Partial<Intake>={}):Intake{
 return intakeSchema.parse({companyType:"B2B SaaS",role:"Controller",stack:"ERP and billing",economicChangeType:"WRITE_OFF_PAYMENT",originalState:"Receivable written off",whatChanged:"Payment arrived",whenChanged:"2026-01-02T00:00:00Z",systemsAffected:"Billing and ledger",newEvidence:"Redacted bank confirmation",decisionV1:"Approved write-off",decisionV2:"Approved reversal after payment",authorization:"Controller approved the reversal",expectedReversals:"Reverse write-off",actualActions:"Write-off reversed",verification:"Ledger reconciled",humanWorkRequired:"Controller approval and ledger check",unknownFields:[],incumbentAssessment:"UNKNOWN",authorityRequired:"UNKNOWN",closed:true,authorized:true,redacted:true,permissions:{process:true,ai:false,publication:false},evidence:[],...overrides});
}
const contact={workEmail:"controller@example.com",permission:true as const};
let db:D1Database,sql:DatabaseSync,env:Env;
beforeEach(()=>{const adapter=database();db=adapter.db;sql=adapter.sql;env={BENCHMARK_DB:db,BENCHMARK_CASE_SECRET:"test-secret-with-at-least-32-characters",BENCHMARK_ORIGIN:"https://benchmark.test",BENCHMARK_MODEL:"llama-3.3-70b-versatile",BENCHMARK_ACCESS_TEAM:"reviewer.cloudflareaccess.com",BENCHMARK_ACCESS_AUD:"reviewer-app",BENCHMARK:{get:vi.fn(async()=>({status:async()=>({status:"running"}),sendEvent:vi.fn()})),create:vi.fn()} } as Env;});
afterEach(()=>{sql.close();vi.restoreAllMocks();vi.unstubAllGlobals();});
async function saved(value=input()){return submit(db,crypto.randomUUID(),value,contact);}
async function approve(s:Scope,decision="APPROVE"){
 await db.prepare("UPDATE benchmark_runs SET reviewer_subject='reviewer-subject',review_note='Reviewed evidence and authorization in full',review_decision=?,approved_at=?,updated_at=? WHERE case_id=? AND run_id=?").bind(decision,new Date().toISOString(),new Date().toISOString(),s.caseId,s.runId).run();
}
class ReplaySteps implements Steps{
 cache=new Map<string,unknown>();crashOnce=false;
 async do<T>(name:string,callback:()=>Promise<T>|T):Promise<T>{
  if(this.cache.has(name))return this.cache.get(name) as T;
  const result=await callback();
  if(name==="human review gate"&&this.crashOnce){this.crashOnce=false;throw new Error("simulated crash after D1 commit");}
  this.cache.set(name,result);return result;
 }
 async waitForEvent(){throw new Error("unexpected wait in replay test");}
}
describe("adversarial evidence rules",()=>{
 it("INCUMBENT_SUFFICIENT remains a counterexample, never an AXON superiority claim",()=>{
  const evidence=normalize(input({incumbentAssessment:"SUFFICIENT"}));const findings=deterministic(evidence);
  expect(isCounterexample(evidence)).toBe(true);expect(findings.find(f=>f.topic==="INCUMBENT_SUFFICIENT")).toMatchObject({classification:"OBSERVED",claim:"SUFFICIENT",sourceEvidenceIds:["e-incumbentassessment"]});
 });
 it("HUMAN_AUTHORITY_FLOOR is observed and remains explicit",()=>{
  const evidence=normalize(input({authorityRequired:"YES"}));expect(isCounterexample(evidence)).toBe(true);expect(deterministic(evidence).find(f=>f.topic==="HUMAN_AUTHORITY_FLOOR")?.claim).toBe("YES");
 });
 it("preserves UNKNOWN, including explicitly marked zero-looking fields",()=>{
  const evidence=normalize(input({actualActions:"0",unknownFields:["actualActions"]}));const finding=deterministic(evidence).find(f=>f.stage==="OBSERVED_CORRECTIONS");expect(finding).toMatchObject({classification:"UNKNOWN",claim:"UNKNOWN"});
  expect(()=>validateClaims({claims:[{stage:"OBSERVED_CORRECTIONS",classification:"OBSERVED",claim:"0",sourceEvidenceIds:["e-actualactions"]}]},evidence)).toThrow();
 });
 it("keeps conflicting evidence and all provenance links",()=>{
  const evidence=normalize(input({evidence:[{id:"e-conflict",field:"authorization",value:"Authorization revoked",occurredAt:"UNKNOWN",contradicts:["e-authorization"]}]}));const findings=deterministic(evidence);expect(findings.some(f=>f.classification==="COUNTEREVIDENCE"&&f.sourceEvidenceIds.includes("e-authorization"))).toBe(true);closeReport(findings,evidence);expect(isCounterexample(evidence)).toBe(true);
 });
 it("rejects agent hallucinated fields, fabricated observations and unsupported amounts",()=>{
  const evidence=normalize(input());const claim={stage:"V2",classification:"OBSERVED",claim:"Paid 999999",sourceEvidenceIds:["e-decisionv2"]};
  expect(()=>validateClaims({claims:[claim]},evidence)).toThrow();
  expect(()=>validateClaims({claims:[{...claim,classification:"INFERRED",claim:"Inference: reverse 999999",ledgerAmount:999999}]},evidence)).toThrow();
  expect(()=>validateClaims({claims:[{...claim,classification:"INFERRED",claim:"Inference: reverse 999999"}]},evidence)).toThrow();
 });
 it("requires provenance closure and every map stage",()=>{
  const evidence=normalize(input());const findings=deterministic(evidence);closeReport(findings,evidence);
  expect(()=>closeReport([{...findings[0],sourceEvidenceIds:["e-invented"]},...findings.slice(1)],evidence)).toThrow();
  expect(()=>closeReport(findings.filter(f=>f.stage!=="V2"),evidence)).toThrow();
 });
 it("rejects invalid authorization and refuses qualification when authorization evidence is unknown",()=>{
  expect(()=>intakeSchema.parse({...input(),authorized:false})).toThrow();expect(qualify(normalize(input({authorization:"UNKNOWN"})))).toBe(false);
 });
 it("rejects duplicate IDs and dangling contradiction references",()=>{
  expect(()=>normalize(input({evidence:[{id:"e-decisionv1",field:"decisionV1",value:"x",occurredAt:"UNKNOWN",contradicts:[]}]}))).toThrow();
  expect(()=>normalize(input({evidence:[{id:"e-extra",field:"decisionV1",value:"x",occurredAt:"UNKNOWN",contradicts:["e-missing"]}]}))).toThrow();
 });
});
describe("persistence, capability and retry",()=>{
 it("deduplicates submissions and preserves immutable case/run identity",async()=>{
  const key=crypto.randomUUID(),a=await submit(db,key,input(),contact),b=await submit(db,key,input(),contact);expect(a).toEqual(b);
  expect(sql.prepare("SELECT COUNT(*) AS n FROM benchmark_submissions").get()?.n).toBe(1);
  expect(sql.prepare("SELECT COUNT(*) AS n FROM benchmark_runs").get()?.n).toBe(1);
  await expect(submit(db,key,input({decisionV2:"Different correction"}),contact)).rejects.toThrow("IDEMPOTENCY_CONFLICT");
  await expect(db.prepare("UPDATE benchmark_runs SET evidence_hash='other' WHERE case_id=? AND run_id=?").bind(a.caseId,a.runId).run()).rejects.toThrow("immutable run identity");
 });
 it("isolates cases and refuses tokens for a different case or run",async()=>{
  const a=await saved(),b=await saved();const token=await capability(env,a.caseId,a.runId);
  const request=new Request("https://benchmark.test",{headers:{authorization:"Bearer "+token}});
  await requireCase(request,env,a.caseId,a.runId);
  await expect(requireCase(request,env,b.caseId,b.runId)).rejects.toThrow();await expect(requireCase(request,env,a.caseId,b.runId)).rejects.toThrow();
  expect(await getRun(db,{caseId:a.caseId,runId:b.runId})).toBeNull();
 });
 it("rejects absent, forged and expired private capabilities",async()=>{
  const s=await saved();await expect(requireCase(new Request("https://benchmark.test"),env,s.caseId,s.runId)).rejects.toThrow();
  const forged=await new SignJWT({...s,scope:"case:read"}).setProtectedHeader({alg:"HS256"}).setIssuer("axon-correction-benchmark").setAudience("private-case").setExpirationTime("1h").sign(new TextEncoder().encode("different-secret-at-least-32-characters"));
  await expect(requireCase(new Request("https://benchmark.test",{headers:{authorization:"Bearer "+forged}}),env,s.caseId,s.runId)).rejects.toThrow();
  const token=await new SignJWT({...s,scope:"case:read"}).setProtectedHeader({alg:"HS256"}).setIssuer("axon-correction-benchmark").setAudience("private-case").setExpirationTime(1).sign(new TextEncoder().encode(env.BENCHMARK_CASE_SECRET));
  await expect(requireCase(new Request("https://benchmark.test",{headers:{authorization:"Bearer "+token}}),env,s.caseId,s.runId)).rejects.toThrow();
 });
 it("keeps contact metadata outside evidence and prompts, and honors AI permission isolation",async()=>{
  const fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);const s=await saved();
  const steps=new ReplaySteps();steps.crashOnce=true;await expect(processCase(env,s,steps)).rejects.toThrow("simulated crash");
  const run=await getRun(db,s);expect(run?.draft_json).not.toContain(contact.workEmail);expect(fetcher).not.toHaveBeenCalled();
  const other=await saved(input({permissions:{process:true,ai:true,publication:false}}));expect(other.caseId).not.toBe(s.caseId);
  expect(sql.prepare("SELECT ai FROM benchmark_permissions WHERE case_id=?").get(s.caseId)?.ai).toBe(0);
 });
 it("workflow retry after a committed draft produces one immutable report with closed provenance",async()=>{
  const s=await saved(),steps=new ReplaySteps();steps.crashOnce=true;await expect(processCase(env,s,steps)).rejects.toThrow("simulated crash");
  const before=await getRun(db,s);expect(before?.report_json).toBeNull();const count=sql.prepare("SELECT COUNT(*) AS n FROM benchmark_findings WHERE case_id=? AND run_id=?").get(s.caseId,s.runId)?.n;
  await approve(s);await processCase(env,s,steps);const after=await getRun(db,s);
  expect(after?.draft_json).toBe(before?.draft_json);expect(after?.report_json).not.toBeNull();expect(sql.prepare("SELECT COUNT(*) AS n FROM benchmark_findings WHERE case_id=? AND run_id=?").get(s.caseId,s.runId)?.n).toBe(count);
  const report=JSON.parse(after!.report_json!) as Draft;closeReport(report.findings,report.evidence);
  await processCase(env,s,steps);expect((await getRun(db,s))?.report_json).toBe(after?.report_json);
 });
 it("cannot release a draft without persisted reviewer approval",async()=>{
  const s=await saved(),steps=new ReplaySteps();steps.crashOnce=true;await expect(processCase(env,s,steps)).rejects.toThrow();await expect(release(env,s)).rejects.toThrow("Human approval required");
 });
 it("private API hides drafts before approval and rejects cross-case reads",async()=>{
  const a=await saved(),b=await saved(),token=await capability(env,a.caseId,a.runId);
  const ctx={waitUntil:vi.fn()} as ExecutionContext;
  const pending=await benchmarkApi(new Request("https://benchmark.test/api/benchmark/results/"+a.caseId,{headers:{authorization:"Bearer "+token,"x-benchmark-run":a.runId}}),env,ctx);expect(pending.status).toBe(409);
  const isolated=await benchmarkApi(new Request("https://benchmark.test/api/benchmark/cases/"+b.caseId,{headers:{authorization:"Bearer "+token,"x-benchmark-run":b.runId}}),env,ctx);expect(isolated.status).toBe(403);
 });
 it("verifies Cloudflare Access signatures, issuer and audience",async()=>{
  const {publicKey,privateKey}=await generateKeyPair("RS256");const jwk=await exportJWK(publicKey);jwk.kid="test-key";jwk.alg="RS256";jwk.use="sig";
  vi.stubGlobal("fetch",vi.fn(async()=>new Response(JSON.stringify({keys:[jwk]}),{headers:{"content-type":"application/json"}})));
  const token=await new SignJWT({}).setProtectedHeader({alg:"RS256",kid:"test-key"}).setSubject("reviewer").setIssuer("https://"+env.BENCHMARK_ACCESS_TEAM).setAudience(env.BENCHMARK_ACCESS_AUD).setIssuedAt().setExpirationTime("1h").sign(privateKey);
  expect(await requireReviewer(new Request("https://benchmark.test",{headers:{"Cf-Access-Jwt-Assertion":token}}),env)).toBe("reviewer");
  await expect(requireReviewer(new Request("https://benchmark.test",{headers:{"Cf-Access-Jwt-Assertion":token}}),{...env,BENCHMARK_ACCESS_AUD:"wrong"})).rejects.toThrow();
  await expect(requireReviewer(new Request("https://benchmark.test"),env)).rejects.toThrow();
 });
 it("reviewer approval wakes the workflow and yields a private result end to end",async()=>{
  const s=await saved(),steps=new ReplaySteps();steps.crashOnce=true;await expect(processCase(env,s,steps)).rejects.toThrow();
  const {publicKey,privateKey}=await generateKeyPair("RS256"),jwk=await exportJWK(publicKey);jwk.kid="review";jwk.alg="RS256";
  vi.stubGlobal("fetch",vi.fn(async()=>Response.json({keys:[jwk]})));
  const token=await new SignJWT({}).setProtectedHeader({alg:"RS256",kid:"review"}).setSubject("reviewer").setIssuer("https://"+env.BENCHMARK_ACCESS_TEAM).setAudience(env.BENCHMARK_ACCESS_AUD).setExpirationTime("1h").sign(privateKey);
  const request=new Request("https://benchmark.test/api/benchmark/review/"+s.caseId+"?run="+s.runId,{method:"POST",headers:{"content-type":"application/json",origin:env.BENCHMARK_ORIGIN,"Cf-Access-Jwt-Assertion":token},body:JSON.stringify({decision:"APPROVE",note:"Reviewed source support and human authorization",acknowledgeLimitations:true})});
  expect((await benchmarkApi(request,env,{waitUntil:vi.fn()} as ExecutionContext)).status).toBe(200);
  await processCase(env,s,steps);const key=await capability(env,s.caseId,s.runId);
  const result=await benchmarkApi(new Request("https://benchmark.test/api/benchmark/results/"+s.caseId,{headers:{authorization:"Bearer "+key,"x-benchmark-run":s.runId}}),env,{waitUntil:vi.fn()} as ExecutionContext);
  expect(result.status).toBe(200);expect((await result.json()).status).toBe("BENCHMARK_COMPLETE");
 });
});

describe("additional retry and provider boundaries",()=>{
 it("repairs status when a draft exists after a crash before the status write",async()=>{
  const s=await saved(),steps=new ReplaySteps();steps.crashOnce=true;
  await expect(processCase(env,s,steps)).rejects.toThrow();
  const draft=JSON.parse((await getRun(db,s))!.draft_json!) as Draft;
  await db.prepare("UPDATE benchmark_submissions SET status='BENCHMARKING' WHERE case_id=?").bind(s.caseId).run();
  await persistDraft(db,s,draft);
  expect(sql.prepare("SELECT status FROM benchmark_submissions WHERE case_id=?").get(s.caseId)?.status).toBe("HUMAN_REVIEW_REQUIRED");
 });
 it("ends an unqualified run without leaving it in the dispatch backlog",async()=>{
  const s=await saved(input({authorization:"UNKNOWN"}));
  expect(await processCase(env,s,new ReplaySteps())).toEqual({status:"INSUFFICIENT_EVIDENCE"});
  expect((await getRun(db,s))?.state).toBe("INSUFFICIENT_EVIDENCE");
 });
 it("rejects hallucinated provider fields and sends only redacted evidence to the provider",async()=>{
  const evidence=normalize(input());
  const fetcher=vi.fn(async()=>Response.json({choices:[{message:{content:JSON.stringify({claims:[{stage:"V2",classification:"INFERRED",claim:"Inference: paid 999999",sourceEvidenceIds:["e-decisionv2"],ledgerAmount:999999}]})}}]}));
  vi.stubGlobal("fetch",fetcher);
  const result=await analysis({...env,GROQ_API_KEY:"fixture-key"},evidence,false);
  expect(result.claims).toEqual([]);expect(result.error).toContain("rejected");
  const body=JSON.parse(fetcher.mock.calls[0][1]!.body as string);
  expect(JSON.stringify(body)).not.toContain(contact.workEmail);
  expect(body.messages[1].content).not.toContain("contact");
 });
 it("rejects malformed evidence with a client error and never stores it",async()=>{
  const request=new Request("https://benchmark.test/api/benchmark/submissions",{method:"POST",headers:{origin:env.BENCHMARK_ORIGIN,"content-type":"application/json","idempotency-key":crypto.randomUUID()},body:JSON.stringify({evidence:input({evidence:[{id:"e-bad",field:"authorization",value:"Conflict",occurredAt:"UNKNOWN",contradicts:["e-missing"]}]}),contact})});
  expect((await benchmarkApi(request,env,{waitUntil:vi.fn()} as ExecutionContext)).status).toBe(400);
  expect(sql.prepare("SELECT COUNT(*) AS n FROM benchmark_submissions").get()?.n).toBe(0);
 });
});
