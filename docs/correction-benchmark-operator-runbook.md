# Benchmark owner operating procedure

Prepared from 54b9817 for owner review. No production action is authorized by this document. No public administrative endpoint.

## Preconditions and security boundary

Use the trusted Codespaces terminal as designated owner vuyocossa41@gmail.com. Verify MFA and recovery independently. The CLI requires a user-bound Cloudflare grant whose /user response identifies this owner and reports two-factor authentication enabled. Service tokens and grants unable to read user identity fail closed. MFA status does not prove fresh step-up authentication. Local approval is an OS-controlled attestation, not a cryptographic independent proof; a compromised owner workspace or administrator bypass can defeat it.

Before remote execution: approve beta-30d-v1; supply controller identity/privacy contact; review credentials and repository administrators; provision the control KV; approve migrations 0003/0004 and the prepared release. These actions are not performed by this runner. The deployed baseline lacks the control binding and is refused.

Private config JSON fields: account=34a8750c552e11cbd96f3ffceba8b62a, database=ab704500-0ec3-466c-bff7-39492bfb6234, workflow=axon-correction-benchmark-beta, kv=actual nonzero control namespace ID. The first three are pinned. Live Worker bindings must match all resources. Required privileges: User Details read, beta Worker settings read, D1 read/edit, dedicated control KV read/edit, Workflow read/edit. Scope as tightly as the provider permits; some D1/Workflow grants are account-wide. No deployment, Access edit, token administration, Scout or unrelated permissions are required by this CLI. Dashboard maintenance uses separately authorized owner authority.

## Private execution envelope

Set umask 077. Use an owner-owned mode-0700 directory outside the repository. Config, request, approval, credential and output are private mode-0600 regular files. Owner prepares the credential through an approved secret manager: never in chat, command arguments, environment variables, URLs, source control or terminal output. Disable shell tracing/session recording. Never cat/tee secrets or enable HTTP debug logging. Do not sync private files or include them in Codespace exports. Inputs cannot be symlinks; outputs refuse overwrite and repository paths.

PRIVATE below denotes this protected directory; use unique filenames for each operation. Commands contain paths only:

~~~bash
node scripts/benchmark-operator/cli.mjs approve "$PRIVATE/config.json" "$PRIVATE/request.json" "$PRIVATE/approval.json"
node scripts/benchmark-operator/cli.mjs run "$PRIVATE/config.json" "$PRIVATE/request.json" "$PRIVATE/result.json" "$PRIVATE/approval.json" 3< "$PRIVATE/cloudflare-token"
~~~

Approve shows operation, case ID, target IDs, request hash and policy version only. Owner types the exact APPROVE hash. Approval binds every request field and target, expires within 15 minutes, and is consumed via an exclusive .used marker before mutation. Authentication verifies owner, MFA and actual bindings before execution. Outputs are reserved before mutation. Errors suppress provider bodies and secrets. Success prints a completion message only. Read-only operations omit the approval argument:

~~~bash
node scripts/benchmark-operator/cli.mjs run "$PRIVATE/config.json" "$PRIVATE/request.json" "$PRIVATE/result.json" 3< "$PRIVATE/cloudflare-token"
~~~

On failure preserve approval .used marker, output and control fences. Do not retry blindly or remove the marker. Inspect non-sensitive private state and obtain a fresh reviewed approval. Private output may contain an invitation secret; handle it only through the approved secret manager/private delivery channel. Cloudflare still handles authenticated requests; never enable request-body capture.

## Exact operations

1. Capacity request: {"operation":"capacity"}. Read accepted, maximum and remaining privately. Deletion does not free lifetime capacity. Preflight found two submissions/eight slots; reread before issuance. Limit invitations to remaining capacity.
2. Issue one: {"operation":"issue","expiresAt":"OWNER_SELECTED_ISO_TIME"}. Approve/run once. Secret/hash are written directly to private output. Deliver privately; retain hash/expiry in the operating register, not the secret. Possession authorizes admission; participant identity is not verified. An ambiguous API failure may leave an invitation whose secret was not saved: inspect hashed metadata and separately authorize revocation, never automatic reissuance. This preparation sends no invitation.
3. Revoke: {"operation":"revoke","hash":"EXACT_64_HEX_HASH"}. Approve/run. D1 and external KV record revocation. KV visibility is eventual across regions: close intake for urgent revocation/reconciliation, verify denial/no new case and preserve lifetime accounting.
4. Dry-run: {"operation":"plan","caseId":"EXACT_UUID"}. No mutation. Output includes only case/run IDs, five table counts, cutoff, last update, eligibility, blockers and hash. No contact/report output. Exact D1 runs are matched to Workflow IDs. Expired instance absence requires successful complete enumeration; API errors abort. Waiting/active/retryable/nonterminal runs block deletion. Routine eligibility requires 30 days after terminal update; no emergency bypass.
5. Approve deletion: review policy, IDs/counts/blockers. Build {"operation":"delete","caseId":"EXACT_UUID","plan":THE_EXACT_DRY_RUN_OBJECT}; approve that exact file. Plan expires in 15 minutes. The dry-run time is frozen for rechecking so seconds between commands do not change the hash. Changed case/run/counts refuse deletion. Never edit cutoff to force eligibility.
6. Execute: close intake and suspend recovery first. Run once. The existing lifecycle writes external KV and D1 fences before deleting Workflow instances/stored state, verifies absence, then purges benchmark_events, benchmark_findings, benchmark_permissions, benchmark_runs and benchmark_submissions. Any provider failure preserves D1 and leaves fences. A minimal non-sensitive receipt/control record remains outside D1 restore. Do not restart blocked runs or clear fences after partial failure. Escalate for separately approved recovery.
7. Verify: {"operation":"verify","caseId":"EXACT_UUID"}. Requires external PURGED record, zero five-table rows and each recorded Workflow absent. controlFencePresent is not an HTTP capability test. Separately use a secret-manager-backed client with logging disabled to test original capability denial, and an unrelated control capability still works. Record only IDs/status codes/receipt IDs. Never paste capability into chat or terminal. No claim of immediate provider-backup/client-copy deletion.

Remote delete is POST /accounts/{account}/workflows/{name}/instances/batch/delete with exactly one ID, as in official Wrangler. Require deleted=[exact ID], errors=[], then verify absence independently. Live API permissions/transport still require a separately approved synthetic canary; isolated tests do not establish production authorization.

## Owner Dashboard closure procedure

No product switch is added. Obtain explicit maintenance authorization before changing settings. Prepare a Cloudflare Access application scoped solely to axon-correction-benchmark-beta.vuyocossa41.workers.dev/api/benchmark/submissions with Block Everyone. Verify unauthenticated synthetic POST denied and capacity unchanged. Existing Scout and reviewer policies remain outside this change. No bypass or service-token policies.

Record the beta Worker's existing five-minute cron under Settings/Triggers, remove only this beta schedule, verify schedules empty and allow already dispatched invocations to finish. Removal does not cancel running work. Enumerate instance metadata only. With separate approval pause exact active beta instances and verify pause. Waiting/legacy runs require individual disposition. During destructive maintenance prevent competing reviewer mutations. Abort deletion when an active/retryable run remains or scope changes.

For database restoration/security incidents, temporarily block the entire beta hostname except owner maintenance access and keep cron suspended. D1 restoration can resurrect cases, invitations and counters. Do not restore external KV from the D1 snapshot. KV's eventual consistency is not an immediate global restoration firewall: remain closed throughout reconciliation.

## Reconcile and reopen only with authorization

Approve {"operation":"reconcile"}. Reapply case fences, consumed/revoked invitations and monotonic capacity from external controls. The runner never reopens intake. Verify ledger completeness/provider reads, compare accepted count with pre-restore operating register, test revoked/deleted capabilities and used invitations denied, unrelated case intact. Missing/inconsistent ledger leaves intake closed. Retain minimal controls across restore; no promise to purge provider snapshots instantly.

Record owner reopening authorization. Resume only individually authorized nonblocked instances; preserve/defer legacy disposition. Restore exact recorded cron, verify recovery does not recreate blocked cases, then remove only temporary maintenance Access policy/application. Retain reviewer restrictions on /review/* and /api/benchmark/review/*. Before external invitations test valid synthetic admission, expired/used/revoked denial, rate limiter, capacity, draft privacy and result isolation. Dashboard closing/reopening is a human procedure, not an automatic CLI action.

## Legacy case and blockers

Legacy a76615e1-7938-4716-8324-1453bc42fb04 belongs to revoked synthetic case b2733a5d-6538-4a9e-9ba5-ac0d9773a05b; preflight WAITING. Inspect only metadata. No approval/resume/terminate/delete authorized. Waiting has no terminal retention clock and blocks routine purge. Owner must choose separately authorized disposition.

External release remains NO-GO pending MFA/recovery, administrators/credential dependency review, controller/privacy contact, beta-30d-v1 approval, real KV/bindings/migrations/deployment approval and synthetic live API/capability canary. No remote change, real invitation or deployment is authorized here.

## Validation sources

Tests cover target/time-bound approval, owner/MFA refusal, private file permissions/symlink/overwrite/replay refusal, D1 batch format, provider errors versus absence, exact deletion acknowledgement. Cloudflare isolated runtime exercises this operator core for dry-run/approval/Workflow delete/five-table purge, old capability denial, unrelated control survival and recovery/restore fences.

[Workflow Workers API](https://developers.cloudflare.com/workflows/build/workers-api/); [official instance-delete command](https://github.com/cloudflare/workers-sdk/blob/main/packages/wrangler/src/workflows/commands/instances/delete.ts); [D1 batch query API](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/query/).

## Read-only legacy review (2026-10-08)

Authenticated Dashboard instance inventory confirmed legacy a76615e1-7938-4716-8324-1453bc42fb04 is Waiting, with no completion duration; original 82631be8-4645-45f2-973b-9daf10e59b80 is Completed. No instance was opened for evidence/step output and no lifecycle action was taken. The account still shows one waiting and one completed instance.

## Prepared test evidence

Codespaces validation: 49 benchmark unit tests passed; five Cloudflare isolated runtime tests passed; strict benchmark TypeScript passed; production build passed (client and Worker). Node syntax checks for all three MJS files passed; the CLI's in-memory esbuild core load passed. Expected synthetic runtime errors include duplicate-instance and not-found probes; the suite exits zero. No remote CLI mutation or real invitation occurred. The remote adapter has mocked HTTP contract tests and official-source route verification, not a live destructive production test.
