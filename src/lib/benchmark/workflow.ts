import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { processCase } from "./engine";
import type { Scope } from "./store";
export class CorrectionWorkflow extends WorkflowEntrypoint<Env, Scope> {
  async run(event: WorkflowEvent<Scope>, step: WorkflowStep) {
    if (event.instanceId !== event.payload.runId) throw new Error("Workflow/run identity mismatch");
    const result=await processCase(this.env, event.payload, step);
    // Keep final Workflow output minimal; evidence still persists in step state until deletion.
    return {caseId:event.payload.caseId,runId:event.payload.runId,status:result?.status ?? "COMPLETE"};
  }
}
