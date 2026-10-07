import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { fields, stages, type Draft } from "@/lib/benchmark/domain";
const button =
  "inline-flex rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-50";
const input = "mt-2 block w-full rounded-md border border-input bg-background p-3 text-foreground";
export function Frame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="relative z-10 mx-auto max-w-5xl px-5 py-10">
      <a className="sr-only focus:not-sr-only" href="#benchmark-content">
        Skip to content
      </a>
      <header className="mb-14 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
        <a href="/benchmark" className="font-mono text-sm tracking-widest text-primary">
          AXON / CORRECTION BENCHMARK
        </a>
        <a href="/" className="text-sm text-muted-foreground">
          Main application
        </a>
      </header>
      <main id="benchmark-content">
        <h1 className="mb-7 text-3xl font-bold md:text-5xl">{title}</h1>
        {children}
      </main>
      <footer className="mt-16 border-t border-border pt-5 text-sm text-muted-foreground">
        One closed correction. Structured redacted evidence. Human-reviewed private result.
      </footer>
    </div>
  );
}
export function BenchmarkPage() {
  const scenarios = [
    [
      "01",
      "Write-off executed, then customer pays",
      "Trace the payment through the earlier write-off and the corrections that followed.",
    ],
    [
      "02",
      "Amendment executed, then effective date corrected",
      "Follow the revised date through billing, recognition and downstream records.",
    ],
    [
      "03",
      "Usage invoiced and revenue recognized, then corrected",
      "Compare expected reversals with observed billing and revenue corrections.",
    ],
  ];
  return (
    <Frame title="What happens after the decision changes?">
      <p className="mb-8 max-w-2xl text-lg leading-relaxed text-muted-foreground">
        The AXON Economic Correction Benchmark maps one closed correction from decision V1 to new
        evidence, decision V2, downstream corrections and verification. It keeps observations,
        inferences, unknowns and counterevidence separate.
      </p>
      <a href="/submit" className={button}>
        SUBMIT ONE CLOSED CORRECTION
      </a>
      <section className="my-14 grid gap-5 md:grid-cols-3" aria-label="Adversarial scenarios">
        {scenarios.map(([n, title, body]) => (
          <article key={n} className="rounded-lg border border-border bg-card p-6">
            <span className="font-mono text-primary">{n}</span>
            <h2 className="my-4 text-xl font-semibold">{title}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
          </article>
        ))}
      </section>
      <h2 className="mb-4 text-xl font-semibold">A Correction Map with an evidence trail</h2>
      <p className="max-w-3xl leading-relaxed text-muted-foreground">
        V1 → downstream consequences → new evidence → V2 → expected corrections → observed
        corrections → verification. If incumbent systems were sufficient, or human authority was
        essential, the benchmark records that limitation. UNKNOWN stays UNKNOWN.
      </p>
      <p className="mt-5 text-sm text-muted-foreground">
        Submit summaries only. Remove customer names, personal data, credentials, API keys and
        confidential contract text. No files or production access are requested.
      </p>
    </Frame>
  );
}
const labels: Record<string, string> = {
  companyType: "Company type",
  role: "Role",
  stack: "Stack",
  economicChangeType: "Economic-change type",
  originalState: "Original state",
  whatChanged: "What changed",
  whenChanged: "When it changed (ISO timestamp or UNKNOWN)",
  systemsAffected: "Systems already affected",
  newEvidence: "New evidence",
  decisionV1: "Decision V1",
  decisionV2: "Decision V2",
  authorization: "Authorization evidence",
  expectedReversals: "Expected reversals",
  actualActions: "Actual actions",
  verification: "Verification",
  humanWorkRequired: "Human work required",
};
export async function api(path: string, init: RequestInit = {}) {
  const r = await fetch("/api/benchmark" + path, init);
  const data = await r.json();
  if (!r.ok)
    throw new Error(
      data.error +
        (data.fields
          ? " — " +
            data.fields
              .map((f: { field: string; message: string }) => f.field + ": " + f.message)
              .join("; ")
          : ""),
    );
  return data;
}
export function SubmitPage() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [receipt, setReceipt] = useState<{ caseId: string; runId: string; caseUrl: string } | null>(
      null,
    );
  const [key] = useState(() => crypto.randomUUID());
  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const evidence: Record<string, unknown> = {};
    for (const field of Object.keys(labels)) evidence[field] = String(form.get(field) || "UNKNOWN");
    evidence.unknownFields = fields.filter((f) => form.get("unknown-" + f) === "on");
    evidence.incumbentAssessment = form.get("incumbentAssessment");
    evidence.authorityRequired = form.get("authorityRequired");
    evidence.closed = form.get("closed") === "on";
    evidence.authorized = form.get("authorized") === "on";
    evidence.redacted = form.get("redacted") === "on";
    evidence.permissions = {
      process: form.get("process") === "on",
      ai: form.get("ai") === "on",
      publication: false,
    };
    try {
      evidence.evidence = JSON.parse(String(form.get("extraEvidence") || "[]"));
      const data = await api("/submissions", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": key },
        body: JSON.stringify({
          evidence,
          contact: {
            workEmail: form.get("workEmail"),
            permission: form.get("contactPermission") === "on",
          },
        }),
      });
      sessionStorage.setItem(
        "axon-case-" + data.caseId,
        JSON.stringify({ token: data.caseKey, runId: data.runId }),
      );
      setReceipt(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setBusy(false);
    }
  }
  if (receipt)
    return (
      <Frame title="Correction received">
        <p className="mb-4">
          Save your private case link. Anyone with this link can read this case for 90 days.
        </p>
        <p className="mb-2 break-all font-mono text-sm">Case {receipt.caseId}</p>
        <p className="mb-7 break-all font-mono text-sm">Run {receipt.runId}</p>
        <a className={button} href={receipt.caseUrl}>
          Open private case
        </a>
        <p className="mt-6 break-all text-sm">
          <a href={receipt.caseUrl} className="underline">
            Save or copy this private case link
          </a>
        </p>
        <p className="mt-6 text-sm text-muted-foreground">
          Processing is asynchronous. A reviewer must approve the map before it is released. Email
          delivery is deferred in this milestone; retrieve the result from this link.
        </p>
      </Frame>
    );
  return (
    <Frame title="Submit one closed correction">
      <p className="mb-8 max-w-3xl text-muted-foreground">
        Use redacted summaries. Enter UNKNOWN for any missing fact and mark fields that remain
        unknown. Work email is contact metadata only and is excluded from benchmark evidence and AI
        prompts.
      </p>
      <form onSubmit={send} className="space-y-8">
        <fieldset>
          <legend className="mb-4 text-xl font-semibold">Correction evidence</legend>
          <div className="grid gap-6 md:grid-cols-2">
            {Object.entries(labels).map(([field, label]) => (
              <label key={field} className="block text-sm">
                {label}
                {field === "economicChangeType" ? (
                  <select name={field} className={input}>
                    <option value="WRITE_OFF_PAYMENT">Write-off followed by payment</option>
                    <option value="AMENDMENT_EFFECTIVE_DATE">Amendment effective date</option>
                    <option value="USAGE_CORRECTION">Usage correction</option>
                    <option value="OTHER">Other</option>
                  </select>
                ) : (
                  <textarea
                    name={field}
                    required
                    maxLength={3000}
                    rows={
                      field === "companyType" || field === "role" || field === "whenChanged" ? 1 : 3
                    }
                    className={input}
                    placeholder="Redacted summary or UNKNOWN"
                  />
                )}
                <span className="mt-2 flex items-center gap-2 text-muted-foreground">
                  <input type="checkbox" name={"unknown-" + field} /> This field is UNKNOWN
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="space-y-5 rounded-lg border border-border p-5">
          <legend className="px-2 font-semibold">Adversarial checks</legend>
          <label className="block">
            Were incumbent systems sufficient?
            <select name="incumbentAssessment" className={input}>
              <option value="UNKNOWN">UNKNOWN</option>
              <option value="SUFFICIENT">SUFFICIENT</option>
              <option value="INSUFFICIENT">INSUFFICIENT</option>
            </select>
          </label>
          <label className="block">
            Was human authority required?
            <select name="authorityRequired" className={input}>
              <option value="UNKNOWN">UNKNOWN</option>
              <option value="YES">YES</option>
              <option value="NO">NO</option>
            </select>
          </label>
        </fieldset>
        <details className="rounded-lg border border-border p-5">
          <summary className="cursor-pointer font-semibold">
            Additional structured evidence and conflicts
          </summary>
          <p className="my-4 text-sm text-muted-foreground">
            Optional JSON array. Each record needs id, field, value, occurredAt and contradicts. To
            contradict V2, reference e-decisionv2. Base IDs use e- plus the lowercase field name.
          </p>
          <label className="block text-sm">
            Evidence records
            <textarea
              name="extraEvidence"
              rows={6}
              className={input}
              defaultValue="[]"
              placeholder='[{"id":"e-extra","field":"decisionV2","value":"Redacted conflicting evidence","occurredAt":"UNKNOWN","contradicts":["e-decisionv2"]}]'
            />
          </label>
        </details>
        <fieldset className="space-y-4">
          <legend className="mb-4 text-xl font-semibold">Contact and permissions</legend>
          <label className="block">
            Work email
            <input name="workEmail" type="email" required maxLength={254} className={input} />
          </label>
          {[
            ["contactPermission", "I permit storage of this work email as contact metadata."],
            ["closed", "This correction is closed."],
            ["authorized", "I am authorized to submit this redacted case."],
            [
              "redacted",
              "I removed identities, personal data, secrets and confidential contract text.",
            ],
            ["process", "I permit private benchmark processing of this evidence."],
          ].map(([name, label]) => (
            <label key={name} className="flex items-start gap-3">
              <input name={name} type="checkbox" required className="mt-1" />
              <span>{label}</span>
            </label>
          ))}
          <label className="flex items-start gap-3">
            <input name="ai" type="checkbox" className="mt-1" />
            <span>
              I permit AI analysis of the redacted evidence. Optional; otherwise the map uses
              structured findings and human review.
            </span>
          </label>
          <p className="text-sm text-muted-foreground">
            Publication permission is off. Submitting a case authorizes no customer claims, payment
            claims or accounting actions.
          </p>
        </fieldset>
        <p role="alert" className="text-destructive">
          {error}
        </p>
        <button disabled={busy} className={button}>
          {busy ? "Submitting…" : "SUBMIT ONE CLOSED CORRECTION"}
        </button>
      </form>
    </Frame>
  );
}
export function usePrivateCase(id: string) {
  const [access, setAccess] = useState<{ token: string; runId: string } | null>(null);
  useEffect(() => {
    const fragment = new URLSearchParams(location.hash.slice(1)).get("key");
    try {
      if (fragment) {
        const payload = JSON.parse(
          atob(fragment.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
        );
        const saved = { token: fragment, runId: payload.runId };
        sessionStorage.setItem("axon-case-" + id, JSON.stringify(saved));
        setAccess(saved);
      } else {
        const saved = sessionStorage.getItem("axon-case-" + id);
        if (saved) setAccess(JSON.parse(saved));
      }
    } catch {
      setAccess(null);
    }
  }, [id]);
  return access;
}
function auth(access: { token: string; runId: string }) {
  return { authorization: "Bearer " + access.token, "x-benchmark-run": access.runId };
}
export function CasePage({ id }: { id: string }) {
  const access = usePrivateCase(id),
    [data, setData] = useState<{ status: string; resultReady: boolean } | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    if (!access) return;
    let active = true;
    const load = () =>
      api("/cases/" + id, { headers: auth(access) })
        .then((d) => {
          if (active) {
            setData(d);
            setError("");
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    load();
    const timer = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [id, access]);
  return (
    <Frame title="Your correction case">
      <p className="mb-7 break-all font-mono text-sm">{id}</p>
      <p role="status" className="mb-7 text-xl text-primary">
        {data?.status || "Loading private case…"}
      </p>
      {error && <p role="alert">{error}</p>}
      {!access && <p>Open the saved private link to access this case.</p>}
      {data?.status === "INSUFFICIENT_EVIDENCE" && (
        <p>
          Evidence or authorization is insufficient, or the reviewer declined release. Submit a new
          closed case with the missing redacted evidence.
        </p>
      )}
      {data?.status === "HUMAN_REVIEW_REQUIRED" && (
        <p>A private draft is awaiting reviewer approval.</p>
      )}
      {data?.resultReady && access && (
        <a className={button} href={"/result/" + id + "#key=" + access.token}>
          Open Correction Map
        </a>
      )}
    </Frame>
  );
}
export function MapView({ draft }: { draft: Draft }) {
  return (
    <>
      <p className="mb-7 text-sm text-muted-foreground">
        KNOWN / OBSERVED means reported in submitted evidence. It is not independent verification.
        Every finding links to its source. UNKNOWN is never zero.
      </p>
      {draft.analysisErrors?.length > 0 && (
        <aside className="mb-7 rounded-md border border-border p-4">
          <h2 className="font-semibold">Analysis limitations</h2>
          {draft.analysisErrors.map((e) => (
            <p key={e}>{e}</p>
          ))}
        </aside>
      )}
      <div className="space-y-4">
        {stages.map((stage, i) => (
          <section key={stage} className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-4 font-mono text-primary">
              {String(i + 1).padStart(2, "0")} / {stage.replace(/_/g, " ")}
            </h2>
            {draft.findings
              .filter((f) => f.stage === stage)
              .map((f) => (
                <article key={f.id} className="mb-4 border-t border-border pt-4">
                  <p className="mb-2 text-xs font-semibold tracking-wide">
                    {f.classification === "OBSERVED" ? "KNOWN / OBSERVED" : f.classification}{" "}
                    {f.topic !== "CORRECTION" ? "· " + f.topic : ""}
                  </p>
                  <p className="whitespace-pre-wrap leading-relaxed">{f.claim}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Source:{" "}
                    {f.sourceEvidenceIds.map((id, i) => (
                      <span key={id}>
                        {i ? ", " : ""}
                        <a href={"#" + id} className="underline">
                          {id}
                        </a>
                      </span>
                    ))}{" "}
                    · {f.producer}
                  </p>
                </article>
              ))}
          </section>
        ))}
      </div>
      <details className="mt-8 rounded-lg border border-border p-5">
        <summary className="cursor-pointer font-semibold">Source evidence register</summary>
        {draft.evidence.map((e) => (
          <article id={e.id} key={e.id} className="mt-4 border-t border-border pt-4">
            <h3 className="font-mono text-sm">
              {e.id} / {e.field}
            </h3>
            <p className="mt-2 whitespace-pre-wrap">{e.value}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Occurred: {e.occurredAt}
              {e.contradicts.length ? " · Contradicts: " + e.contradicts.join(", ") : ""}
            </p>
          </article>
        ))}
      </details>
    </>
  );
}
export function ResultPage({ id }: { id: string }) {
  const access = usePrivateCase(id),
    [report, setReport] = useState<(Draft & { status: string; approvedAt: string }) | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    if (access)
      api("/results/" + id, { headers: auth(access) })
        .then(setReport)
        .catch((e) => setError(e.message));
  }, [id, access]);
  return (
    <Frame title="Correction Map">
      {error && <p role="alert">{error}</p>}
      {!access && <p>Open the saved private case link.</p>}
      {report ? (
        <>
          <p className="mb-7 text-primary">
            {report.status} · Reviewed {report.approvedAt}
          </p>
          <p className="mb-7 break-all font-mono text-xs">
            Run {report.runId} · Evidence {report.evidenceHash}
          </p>
          <MapView draft={report} />
        </>
      ) : (
        <p role="status">Awaiting private result.</p>
      )}
    </Frame>
  );
}
export function ReviewPage({ id }: { id: string }) {
  const [data, setData] = useState<{
      draft: Draft | null;
      state: string;
      approvedAt: string | null;
    } | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false),
    [run, setRun] = useState("");
  useEffect(() => {
    const runId = new URLSearchParams(location.search).get("run") || "";
    setRun(runId);
    api("/review/" + id + "?run=" + encodeURIComponent(runId))
      .then(setData)
      .catch((e) => setError(e.message));
  }, [id]);
  async function decide(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      await api("/review/" + id + "?run=" + encodeURIComponent(run), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          decision: form.get("decision"),
          note: form.get("note"),
          acknowledgeLimitations: form.get("ack") === "on",
        }),
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Frame title="Review one Correction Map">
      <p className="mb-7 text-sm text-muted-foreground">
        Cloudflare Access reviewer authorization is required. Assess source support, authorization,
        unknowns, counterevidence and both adversarial checks. Approval releases only the private
        result.
      </p>
      {error && <p role="alert">{error}</p>}
      {data?.draft && (
        <>
          <MapView draft={data.draft} />
          {data.approvedAt || done ? (
            <p className="mt-8" role="status">
              Review recorded. Private release is asynchronous.
            </p>
          ) : (
            <form onSubmit={decide} className="mt-8 space-y-5">
              <label className="block">
                Decision
                <select name="decision" className={input}>
                  <option value="APPROVE">Approve private result</option>
                  <option value="COUNTEREXAMPLE">Release as counterexample</option>
                  <option value="REJECT">Reject release: insufficient evidence</option>
                </select>
              </label>
              <label className="block">
                Review rationale
                <textarea
                  name="note"
                  minLength={20}
                  maxLength={3000}
                  required
                  rows={4}
                  className={input}
                />
              </label>
              <label className="flex gap-3">
                <input name="ack" type="checkbox" required />
                <span>
                  I checked provenance, authorization, limitations and counterevidence. This does
                  not authorize publication or customer/payment claims.
                </span>
              </label>
              <button disabled={busy} className={button}>
                {busy ? "Recording…" : "Record review decision"}
              </button>
            </form>
          )}
        </>
      )}
    </Frame>
  );
}
