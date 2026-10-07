# AXON Correction Benchmark V0 — first milestone

This implementation stops at structured submission → D1 → Cloudflare Workflow → draft Correction Map → Cloudflare Access reviewer decision → private approved result. It does not deploy or apply a production migration.

## Existing architecture and boundaries

Baseline: remote main `64075384d877df00d2d8181a25bc3386f91bb523`. Work branch: `correction-benchmark`. Execution and dependency installation take place in Codespaces.

The application uses TanStack Start, React, Vite and a Cloudflare Worker entry at `src/server.ts`. The existing Lovable Vite wrapper supplies the framework, React, Tailwind and Cloudflare plugins. Its configuration is preserved. `/api/scout` remains intact; its Groq and optional Firecrawl/Tavily integrations are real server paths, conditional on configured secrets. Live deployment and secret provisioning are not established by source inspection.

The original home experience uses demo/simulated state; it is not a persisted correction acquisition flow. The separate `backend/` FastAPI/Railway path is preserved and is not used for benchmark persistence. C04/Shadow remains a separate repository; no code is copied from it. No AXON D, broad dashboard, tenant-auth platform, database replacement or main-product redesign is introduced.

## Pages and API

| Page | Purpose |
| --- | --- |
| /benchmark | Explain benchmark and three adversarial scenarios |
| /submit | Structured redacted intake and separate work-email consent |
| /case/:id#key=CAPABILITY | Private status and approved-result link |
| /result/:id#key=CAPABILITY | Human-approved Correction Map |
| /review/:id?run=RUN_ID | Single-case Cloudflare Access review |

| API | Authorization and behavior |
| --- | --- |
| POST /api/benchmark/submissions | Same origin; strict JSON; stable random Idempotency-Key; returns 202 with caseId, runId, signed caseKey and private caseUrl |
| GET /api/benchmark/cases/:id | Bearer caseKey + x-benchmark-run; scoped status |
| GET /api/benchmark/results/:id | Same capability; 409 until approved report exists |
| GET /api/benchmark/review/:id?run=RUN_ID | Valid Cloudflare Access JWT; draft and run state |
| POST /api/benchmark/review/:id?run=RUN_ID | Valid Access JWT, same origin, decision, rationale and limitations acknowledgment |

The review decision is APPROVE, COUNTEREXAMPLE or REJECT. First decision is immutable; retries of the same decision re-signal the Workflow. A reviewer opens a known case/run link; no general case-list dashboard is introduced. There is no public report endpoint.

## Additive schema

Migration `migrations/0001_correction_benchmark.sql` creates five tables:

- `benchmark_submissions`: random case UUID, hashed idempotency key, canonical payload hash, immutable evidence JSON, separate contact email and consent, public case status, timestamps.
- `benchmark_permissions`: case-scoped processing and AI permission; publication permanently off in V0.
- `benchmark_runs`: immutable run UUID, case/run composite key, evidence hash and schema version, runtime state, immutable draft, immutable report and immutable reviewer decision.
- `benchmark_events`: append-only application events keyed by case/run/event; status, draft, review and release provenance.
- `benchmark_findings`: immutable material claims, case/run/finding key, map stage, topic, classification, source evidence IDs, producer and timestamp.

Composite foreign keys prevent findings/events from belonging to the wrong case/run. Application mutations bind case ID and run ID where runs are involved; submission creation and permissions bind the newly created case. A recovery index supports pending dispatch and review wake-ups. No tenant platform is needed for a one-case capability.

Partner, referral and audit-order tables and routes are deferred with email and payment phases. AUDIT_ELIGIBLE is not issued by this milestone.

## Workflow and states

Steps: validation → qualification → normalization → deterministic checks → AI analysis (only with permission) → adversarial countercheck (only with permission) → human review gate → persisted decision / durable wait → Correction Map.

Case statuses: RECEIVED, QUALIFYING, INSUFFICIENT_EVIDENCE, BENCHMARKING, HUMAN_REVIEW_REQUIRED, BENCHMARK_COMPLETE, COUNTEREXAMPLE.

Run states: PENDING, QUALIFYING, INSUFFICIENT_EVIDENCE, BENCHMARKING, REVIEW_REQUIRED, COMPLETE, REJECTED.

The Workflow instance ID equals the immutable run ID. D1 commits submission before dispatch. A five-minute scheduled handler retries pending dispatch and persisted review wake-ups, avoiding a Queue in this milestone. Workflows caches successful steps and retries failed steps. Saving findings/draft is idempotent; status repair works if an earlier attempt committed the draft and stopped before status update. Report release reads the persisted human decision; an event payload never authorizes release. Wait expiry never approves a case.

UNKNOWN authorization or absent V1/V2/new evidence fails qualification. An explicit conflicting-evidence link, sufficient incumbent, or required human authority produces a conservative COUNTEREXAMPLE marker. This is a limitation on automation/superiority claims, not a finding that the historical correction itself was invalid.

## Evidence and claims

The map has V1, downstream consequences, new evidence, V2, expected corrections, observed corrections and verification. Every claim has OBSERVED, INFERRED, UNKNOWN or COUNTEREVIDENCE plus source evidence IDs. The UI labels OBSERVED as KNOWN / OBSERVED and explains that it is submitter-reported evidence, not independent verification.

Normalization gives each structured field a stable evidence ID, preserves explicit UNKNOWN (including a numeric-looking value marked unknown), checks additional evidence IDs and contradiction links, and excludes contact metadata. OBSERVED must quote source evidence exactly. INFERRED must be labeled. Fabricated numeric values, unexpected model fields, unknown references and incomplete map/provenance closure are rejected. COUNTEREVIDENCE requires explicit contradiction links and both sides' source IDs.

INCUMBENT_SUFFICIENT and HUMAN_AUTHORITY_FLOOR are deterministic evidence-backed checks and cannot be replaced by AI. AI uses the existing Groq integration pattern with bounded requests and output validation. A missing provider, invalid output or provider failure becomes a visible draft limitation, not an invented finding. Free-text inference still requires semantic reviewer scrutiny; provenance validation cannot prove reasoning is correct.

## Security and configuration

Private links use a 90-day HS256 capability bound to case ID, run ID, read-only scope, issuer and audience. The secret must contain at least 32 characters of high-entropy secret material. The token is in a URL fragment, stored in sessionStorage and sent only in Authorization. Anyone holding the link has access to that single case. There is no account platform, per-link revocation or refresh endpoint in V0; rotating the signing secret invalidates all links.

Reviewer authorization verifies Access RS256 signature against the configured team's JWKS, issuer, audience and subject. Merely presenting a header is insufficient. Configure Cloudflare Access applications/policies covering BOTH `/review/*` and `/api/benchmark/review/*` with the same expected audience, and authorize only designated reviewers. No test/dev reviewer bypass exists in production.

POST endpoints require the configured Origin. Bodies are streamed with a 64 KiB bound and strict schemas; submissions require redaction, authorization and closed-case attestations. The API rejects common email/credential patterns in evidence, but this is not comprehensive PII detection. Do not submit identities, contracts, credentials, files, or production access. Email is accepted only as separately consented contact metadata; it is not included in evidence, findings, reports or LLM requests.

API responses are no-store. Logs omit evidence, contact and capabilities. No automatic publication, customer claims, accounting actions, email or payment claims are made.

Before a separately approved deployment, operators must:
1. Provision the intended benchmark D1 database and replace the placeholder database ID in Wrangler.
2. Review and apply the additive migration to that database.
3. Set BENCHMARK_ORIGIN to the exact application origin.
4. Configure BENCHMARK_ACCESS_TEAM as the full team hostname (without https://) and BENCHMARK_ACCESS_AUD as the intended reviewer application's audience.
5. Set BENCHMARK_CASE_SECRET as a Worker secret; optionally provision GROQ_API_KEY for consented AI analysis.
6. Confirm Access policies, retention/access practices, abuse controls and Cloudflare limits in the target account.

None of these production provisioning/deployment steps is performed by this milestone.

## Verification commands

Use Node 24 in Codespaces for the Node SQLite replay suite. Production runs on Workers, not Node.

```sh
npm ci
npm run cf:types
npm run test:benchmark
npm run test:benchmark:runtime
npm run check:benchmark
npm run build
```

The fast suite uses the same SQL migration with Node's in-memory SQLite adapter and a durable-step replay simulator. The runtime suite uses Cloudflare's Vitest plugin, real emulated D1 binding and actual Workflow class/step runtime, including a retried step, human approval wait, immutable draft and private report. Access-signed reviewer API approval is verified in the fast suite with cryptographically signed fixture JWTs and fixture JWKS.

Runtime tests never connect to a remote production D1 database. No Resend notification or Stripe checkout is tested or implemented here. Existing dependency audit findings and broader application lint/type issues should be assessed separately rather than repaired through an architecture rewrite.
