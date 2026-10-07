import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { processCase } from "./engine";
import type { Scope } from "./store";
export class CorrectionWorkflow extends WorkflowEntrypoint<Env, Scope> {
  async run(event: WorkflowEvent<Scope>, step: WorkflowStep) {
    return processCase(this.env, event.payload, step);
  }
}
