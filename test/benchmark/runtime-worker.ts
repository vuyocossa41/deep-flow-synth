// Test-only entry point; production continues to use src/server.ts.
export { CorrectionWorkflow } from "../../src/lib/benchmark/workflow";
import { benchmarkApi } from "../../src/lib/benchmark/api";
export default {fetch(request:Request,env:Env,ctx:ExecutionContext){return benchmarkApi(request,env,ctx);}};
