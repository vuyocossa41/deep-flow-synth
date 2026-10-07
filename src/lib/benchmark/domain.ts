import { z } from "zod";

export const stages = [
  "V1",
  "DOWNSTREAM_CONSEQUENCES",
  "NEW_EVIDENCE",
  "V2",
  "EXPECTED_CORRECTIONS",
  "OBSERVED_CORRECTIONS",
  "VERIFICATION",
] as const;
export const classes = ["OBSERVED", "INFERRED", "UNKNOWN", "COUNTEREVIDENCE"] as const;
export const fields = [
  "companyType",
  "role",
  "stack",
  "economicChangeType",
  "originalState",
  "whatChanged",
  "whenChanged",
  "systemsAffected",
  "newEvidence",
  "decisionV1",
  "decisionV2",
  "authorization",
  "expectedReversals",
  "actualActions",
  "verification",
  "humanWorkRequired",
  "unknownFields",
  "incumbentAssessment",
  "authorityRequired",
] as const;
const text = z.string().trim().min(1).max(3000);
const time = z.union([z.string().datetime({ offset: true }), z.literal("UNKNOWN")]);
export const evidenceSchema = z
  .object({
    id: z.string().regex(/^e-[a-z0-9-]{1,60}$/),
    field: z.enum(fields),
    value: text,
    occurredAt: time,
    contradicts: z.array(z.string()).max(20),
  })
  .strict();
export const intakeSchema = z
  .object({
    companyType: text,
    role: text,
    stack: text,
    economicChangeType: z.enum([
      "WRITE_OFF_PAYMENT",
      "AMENDMENT_EFFECTIVE_DATE",
      "USAGE_CORRECTION",
      "OTHER",
    ]),
    originalState: text,
    whatChanged: text,
    whenChanged: time,
    systemsAffected: text,
    newEvidence: text,
    decisionV1: text,
    decisionV2: text,
    authorization: text,
    expectedReversals: text,
    actualActions: text,
    verification: text,
    humanWorkRequired: text,
    unknownFields: z.array(z.enum(fields)).max(20),
    incumbentAssessment: z.enum(["SUFFICIENT", "INSUFFICIENT", "UNKNOWN"]),
    authorityRequired: z.enum(["YES", "NO", "UNKNOWN"]),
    closed: z.literal(true),
    authorized: z.literal(true),
    redacted: z.literal(true),
    permissions: z
      .object({ process: z.literal(true), ai: z.boolean(), publication: z.literal(false) })
      .strict(),
    evidence: z.array(evidenceSchema).max(30).default([]),
  })
  .strict();
export const submissionSchema = z
  .object({
    evidence: intakeSchema,
    contact: z
      .object({ workEmail: z.string().email().max(254), permission: z.literal(true) })
      .strict(),
  })
  .strict();
export type Intake = z.infer<typeof intakeSchema>;
export type Evidence = z.infer<typeof evidenceSchema>;
export const claimSchema = z
  .object({
    stage: z.enum(stages),
    classification: z.enum(classes),
    claim: text,
    sourceEvidenceIds: z.array(z.string()).min(1).max(30),
    topic: z
      .enum(["CORRECTION", "INCUMBENT_SUFFICIENT", "HUMAN_AUTHORITY_FLOOR"])
      .default("CORRECTION"),
  })
  .strict();
export type Claim = z.infer<typeof claimSchema>;
export type Finding = Claim & { id: string; producer: string };
export type Draft = {
  schemaVersion: string;
  runId: string;
  evidenceHash: string;
  evidence: Evidence[];
  findings: Finding[];
  analysisErrors: string[];
  counterexample: boolean;
};
export const unknown = (value: string) => value.trim().toUpperCase() === "UNKNOWN";
export function normalize(input: Intake): Evidence[] {
  const evidence: Evidence[] = fields.map((field) => ({
    id: "e-" + field.toLowerCase(),
    field,
    value: input.unknownFields.includes(field)
      ? "UNKNOWN"
      : field === "unknownFields"
        ? input.unknownFields.join(", ") || "None explicitly marked"
        : String(input[field]),
    occurredAt: input.whenChanged,
    contradicts: [],
  }));
  evidence.push(...input.evidence);
  const ids = new Set<string>();
  for (const e of evidence) {
    if (ids.has(e.id)) throw new Error("Duplicate evidence ID");
    ids.add(e.id);
  }
  for (const e of evidence) {
    for (const ref of e.contradicts)
      if (!ids.has(ref) || ref === e.id) throw new Error("Invalid contradiction reference");
    if (input.unknownFields.includes(e.field) && !unknown(e.value))
      throw new Error("Evidence conflicts with explicitly unknown field");
  }
  return evidence;
}
const stageFields = {
  V1: "decisionV1",
  DOWNSTREAM_CONSEQUENCES: "systemsAffected",
  NEW_EVIDENCE: "newEvidence",
  V2: "decisionV2",
  EXPECTED_CORRECTIONS: "expectedReversals",
  OBSERVED_CORRECTIONS: "actualActions",
  VERIFICATION: "verification",
} as const;
export function deterministic(evidence: Evidence[]): Finding[] {
  const findings: Finding[] = stages.flatMap((stage) =>
    evidence
      .filter((e) => e.field === stageFields[stage])
      .map((e) => ({
        id: "det-" + stage + "-" + e.id,
        stage,
        topic: "CORRECTION",
        classification: unknown(e.value)
          ? "UNKNOWN"
          : e.contradicts.length
            ? "COUNTEREVIDENCE"
            : "OBSERVED",
        claim: e.value,
        sourceEvidenceIds: [e.id, ...e.contradicts],
        producer: "structured-evidence-v0",
      })),
  );
  for (const [field, topic] of [
    ["incumbentAssessment", "INCUMBENT_SUFFICIENT"],
    ["authorityRequired", "HUMAN_AUTHORITY_FLOOR"],
  ] as const) {
    const e = evidence.find((e) => e.field === field)!;
    findings.push({
      id: "guard-" + field,
      stage: "VERIFICATION",
      topic,
      classification: unknown(e.value) ? "UNKNOWN" : "OBSERVED",
      claim: e.value,
      sourceEvidenceIds: [e.id],
      producer: "structured-evidence-v0",
    });
  }
  // Conflicts on any field must survive normalization, even outside the seven map fields.
  for (const e of evidence.filter(
    (e) => e.contradicts.length && !findings.some((f) => f.sourceEvidenceIds[0] === e.id),
  )) {
    findings.push({
      id: "conflict-" + e.id,
      stage: "VERIFICATION",
      topic: "CORRECTION",
      classification: "COUNTEREVIDENCE",
      claim: e.value,
      sourceEvidenceIds: [e.id, ...e.contradicts],
      producer: "structured-evidence-v0",
    });
  }
  return findings;
}
export function validateClaims(raw: unknown, evidence: Evidence[]): Claim[] {
  const claims = z
    .object({ claims: z.array(claimSchema).max(30) })
    .strict()
    .parse(raw).claims;
  for (const c of claims) {
    const sources = c.sourceEvidenceIds.map((id) => evidence.find((e) => e.id === id));
    if (sources.some((e) => !e)) throw new Error("Provenance closure violated");
    const known = sources.filter((e): e is Evidence => !!e && !unknown(e.value));
    if (c.classification !== "UNKNOWN" && !known.length)
      throw new Error("UNKNOWN cannot become a fact");
    if (c.classification === "UNKNOWN" && c.claim !== "UNKNOWN")
      throw new Error("UNKNOWN must remain UNKNOWN");
    if (c.classification === "OBSERVED" && !known.some((e) => e.value === c.claim))
      throw new Error("Observed claim must quote evidence exactly");
    if (c.classification === "INFERRED" && !c.claim.startsWith("Inference:"))
      throw new Error("Inference must be labelled");
    if (
      c.classification === "COUNTEREVIDENCE" &&
      !sources.some(
        (e) =>
          e?.contradicts.length && e.contradicts.every((id) => c.sourceEvidenceIds.includes(id)),
      )
    )
      throw new Error("Conflict provenance missing");
    const numbers: string[] = c.claim.match(/\d+(?:[.,]\d+)*/g) || [];
    if (
      numbers.some(
        (n) => !known.some((e) => Array.from(e.value.match(/\d+(?:[.,]\d+)*/g) || []).includes(n)),
      )
    )
      throw new Error("Hallucinated numeric field");
    if (
      c.topic !== "CORRECTION" &&
      c.classification !== "OBSERVED" &&
      c.classification !== "UNKNOWN"
    )
      throw new Error("Guardrails require observations or UNKNOWN");
  }
  return claims;
}
export function closeReport(findings: Finding[], evidence: Evidence[]) {
  for (const { id, producer, ...claim } of findings) validateClaims({ claims: [claim] }, evidence);
  for (const stage of stages)
    if (!findings.some((f) => f.stage === stage)) throw new Error("Missing map stage");
  for (const topic of ["INCUMBENT_SUFFICIENT", "HUMAN_AUTHORITY_FLOOR"])
    if (!findings.some((f) => f.topic === topic)) throw new Error("Missing adversarial guardrail");
}
export function qualify(evidence: Evidence[]) {
  return ["decisionV1", "decisionV2", "newEvidence", "authorization"].every((field) =>
    evidence.some((e) => e.field === field && !unknown(e.value)),
  );
}
export function isCounterexample(evidence: Evidence[]) {
  return evidence.some(
    (e) =>
      e.contradicts.length ||
      (e.field === "incumbentAssessment" && e.value === "SUFFICIENT") ||
      (e.field === "authorityRequired" && e.value === "YES"),
  );
}
export function stable(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
  if (value && typeof value === "object")
    return (
      "{" +
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => JSON.stringify(k) + ":" + stable(v))
        .join(",") +
      "}"
    );
  return JSON.stringify(value);
}
export async function digest(value: string) {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
