import { HttpError } from "./security";
import { digest } from "./domain";
// Only called by the exact POST submission branch. Never persist or log IPs.
export async function protectSubmission(request: Request, env: Env) {
  const ip = request.headers.get("CF-Connecting-IP");
  if (!ip || !env.BENCHMARK_SUBMISSION_LIMIT || !env.BENCHMARK_CONTROL)
    throw new HttpError(503, "Submission protection unavailable");
  try {
    const key = "benchmark:submit:ip:" + await digest(ip);
    const { success } = await env.BENCHMARK_SUBMISSION_LIMIT.limit({ key });
    if (!success) throw new HttpError(429, "Submission limit reached; retry after 60 seconds");
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(503, "Submission protection unavailable");
  }
}
