import { env } from "cloudflare:workers";
import { applyD1Migrations, introspectWorkflowInstance, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { beforeAll, expect, it } from "vitest";
import { intakeSchema, closeReport } from "../../src/lib/benchmark/domain";
import { submit, getRun } from "../../src/lib/benchmark/store";
import { benchmarkApi } from "../../src/lib/benchmark/api";
import { capability } from "../../src/lib/benchmark/security";
const runtime=env as Env & {TEST_MIGRATIONS:D1Migration[]};
beforeAll(()=>applyD1Migrations(runtime.BENCHMARK_DB,runtime.TEST_MIGRATIONS));
function input(){
 return intakeSchema.parse({companyType:"SaaS",role:"Controller",stack:"Billing and ERP",economicChangeType:"WRITE_OFF_PAYMENT",originalState:"Write-off executed",whatChanged:"Payment received",whenChanged:"UNKNOWN",systemsAffected:"Ledger",newEvidence:"Redacted payment summary",decisionV1:"Write-off",decisionV2:"Reverse write-off",authorization:"Controller approval",expectedReversals:"Write-off reversal",actualActions:"Reversed",verification:"UNKNOWN",humanWorkRequired:"Controller review",unknownFields:["verification"],incumbentAssessment:"SUFFICIENT",authorityRequired:"YES",closed:true,authorized:true,redacted:true,permissions:{process:true,ai:false,publication:false},evidence:[]});
}
it("real D1 and Workflow persist a draft, wait for human approval and release the private map after a retried step",async()=>{
 const key=crypto.randomUUID(),contact={workEmail:"controller@example.com",permission:true as const};
 const scope=await submit(runtime.BENCHMARK_DB,key,input(),contact);
 expect(await submit(runtime.BENCHMARK_DB,key,input(),contact)).toEqual(scope);
 const instance=await introspectWorkflowInstance(runtime.BENCHMARK,scope.runId);
 try{
  await instance.modify(async m=>{
    await m.disableRetryDelays();
    await m.mockStepError({name:"deterministic checks"},new Error("retry fixture"),1);
  });
  const workflow=await runtime.BENCHMARK.create({id:scope.runId,params:scope});
  await instance.waitForStepResult({name:"human review gate"});
  const draftRun=await getRun(runtime.BENCHMARK_DB,scope);
  expect(draftRun?.report_json).toBeNull();
  expect(draftRun?.state).toBe("REVIEW_REQUIRED");
  const draft=JSON.parse(draftRun!.draft_json!);
  closeReport(draft.findings,draft.evidence);
  expect(draft.findings.some((f:{classification:string;claim:string})=>f.classification==="UNKNOWN"&&f.claim==="UNKNOWN")).toBe(true);
  expect(draftRun?.draft_json).not.toContain(contact.workEmail);
  const token=await capability(runtime,scope.caseId,scope.runId);
  const ctx=createExecutionContext();
  const request=()=>new Request("https://benchmark.test/api/benchmark/results/"+scope.caseId,{headers:{authorization:"Bearer "+token,"x-benchmark-run":scope.runId}});
  expect((await benchmarkApi(request(),runtime,ctx)).status).toBe(409);
  // Only this runtime fixture writes approval directly. Production uses Access-verified API.
  await runtime.BENCHMARK_DB.prepare("UPDATE benchmark_runs SET reviewer_subject='runtime-reviewer',review_note='Evidence and limitations reviewed',review_decision='APPROVE',approved_at=?,updated_at=? WHERE case_id=? AND run_id=?").bind(new Date().toISOString(),new Date().toISOString(),scope.caseId,scope.runId).run();
  await workflow.sendEvent({type:"review",payload:scope});
  await instance.waitForStatus("complete");
  const result=await benchmarkApi(request(),runtime,ctx);
  expect(result.status).toBe(200);
  const report=await result.json() as typeof draft & {status:string};
  expect(report.status).toBe("COUNTEREXAMPLE");
  closeReport(report.findings,report.evidence);
  expect((await getRun(runtime.BENCHMARK_DB,scope))?.draft_json).toBe(draftRun?.draft_json);
  await waitOnExecutionContext(ctx);
 }finally{await instance.dispose();}
});
