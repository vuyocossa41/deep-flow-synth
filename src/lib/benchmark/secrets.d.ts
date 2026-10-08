/// <reference path="../../../worker-configuration.d.ts" />
interface Env {
    BENCHMARK_CONTROL: KVNamespace;
    BENCHMARK_AI_MODE: "AI_DISABLED" | "AUTHORIZED_AI";
  BENCHMARK_SUBMISSION_LIMIT: RateLimit;
  BENCHMARK_CASE_SECRET: string;
  GROQ_API_KEY?: string;
}
