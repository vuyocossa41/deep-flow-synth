import { assertScopeActive } from "./control";
import { createRemoteJWKSet, jwtVerify, SignJWT } from "jose";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function capability(env: Env, caseId: string, runId: string) {
  if (!env.BENCHMARK_CASE_SECRET || env.BENCHMARK_CASE_SECRET.length < 32)
    throw new HttpError(503, "Case access is not configured");
  return new SignJWT({ caseId, runId, scope: "case:read" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("axon-correction-benchmark")
    .setAudience("private-case")
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(new TextEncoder().encode(env.BENCHMARK_CASE_SECRET));
}
export async function requireCase(request: Request, env: Env, caseId: string, runId: string) {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new HttpError(401, "Private case key required");
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(env.BENCHMARK_CASE_SECRET),
      {
        issuer: "axon-correction-benchmark",
        audience: "private-case",
        algorithms: ["HS256"],
        maxTokenAge: "14d",
      },
    );
    if (payload.caseId !== caseId || payload.runId !== runId || payload.scope !== "case:read")
      throw new Error();
    if (
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number" ||
      payload.exp - payload.iat > 14 * 86400
    )
      throw new Error();
    const access = await env.BENCHMARK_DB.prepare(
      "SELECT s.revoked_at FROM benchmark_submissions s JOIN benchmark_runs r ON r.case_id=s.case_id WHERE s.case_id=? AND r.run_id=?",
    )
      .bind(caseId, runId)
      .first<{ revoked_at: string | null }>();
    if (!access || access.revoked_at !== null) throw new Error();
    await assertScopeActive(env,{caseId,runId});
  } catch {
    throw new HttpError(403, "Private case key is invalid, expired or revoked");
  }
}
export async function requireReviewer(request: Request, env: Env) {
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token || !env.BENCHMARK_ACCESS_TEAM || !env.BENCHMARK_ACCESS_AUD)
    throw new HttpError(403, "Cloudflare Access reviewer authorization required");
  try {
    const issuer = "https://" + env.BENCHMARK_ACCESS_TEAM;
    const { payload } = await jwtVerify(
      token,
      createRemoteJWKSet(new URL(issuer + "/cdn-cgi/access/certs")),
      { issuer, audience: env.BENCHMARK_ACCESS_AUD, algorithms: ["RS256"] },
    );
    if (!payload.sub) throw new Error();
    return payload.sub;
  } catch {
    throw new HttpError(403, "Invalid reviewer authorization");
  }
}
export function origin(request: Request, env: Env) {
  if (request.headers.get("origin") !== env.BENCHMARK_ORIGIN)
    throw new HttpError(403, "Same-origin mutation required");
}
export async function readJson(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new HttpError(415, "Structured JSON required");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Body required");
  let length = 0;
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 65536) {
      await reader.cancel();
      throw new HttpError(413, "Intake exceeds 64 KiB");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new HttpError(400, "Invalid JSON");
  }
}
