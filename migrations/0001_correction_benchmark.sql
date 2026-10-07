PRAGMA foreign_keys = ON;
CREATE TABLE benchmark_submissions (
  case_id TEXT PRIMARY KEY, idempotency_hash TEXT NOT NULL UNIQUE, payload_hash TEXT NOT NULL,
  evidence_json TEXT NOT NULL, contact_email TEXT NOT NULL, contact_permission INTEGER NOT NULL CHECK(contact_permission=1),
  status TEXT NOT NULL CHECK(status IN ('RECEIVED','QUALIFYING','INSUFFICIENT_EVIDENCE','BENCHMARKING','HUMAN_REVIEW_REQUIRED','BENCHMARK_COMPLETE','COUNTEREXAMPLE')),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE benchmark_permissions (
  case_id TEXT PRIMARY KEY REFERENCES benchmark_submissions(case_id), process INTEGER NOT NULL CHECK(process=1),
  ai INTEGER NOT NULL CHECK(ai IN (0,1)), publication INTEGER NOT NULL DEFAULT 0 CHECK(publication=0), created_at TEXT NOT NULL
);
CREATE TABLE benchmark_runs (
  case_id TEXT NOT NULL REFERENCES benchmark_submissions(case_id), run_id TEXT NOT NULL UNIQUE,
  evidence_hash TEXT NOT NULL, version TEXT NOT NULL, state TEXT NOT NULL,
  draft_json TEXT, report_json TEXT, reviewer_subject TEXT, review_note TEXT, review_decision TEXT,
  approved_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(case_id,run_id)
);
CREATE TABLE benchmark_events (
  case_id TEXT NOT NULL, run_id TEXT NOT NULL, event_id TEXT NOT NULL, kind TEXT NOT NULL,
  payload_json TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(case_id,run_id,event_id),
  FOREIGN KEY(case_id,run_id) REFERENCES benchmark_runs(case_id,run_id)
);
CREATE TABLE benchmark_findings (
  case_id TEXT NOT NULL, run_id TEXT NOT NULL, finding_id TEXT NOT NULL, stage TEXT NOT NULL,
  topic TEXT NOT NULL, classification TEXT NOT NULL CHECK(classification IN ('OBSERVED','INFERRED','UNKNOWN','COUNTEREVIDENCE')),
  claim TEXT NOT NULL, source_evidence_ids TEXT NOT NULL, producer TEXT NOT NULL, created_at TEXT NOT NULL,
  PRIMARY KEY(case_id,run_id,finding_id), FOREIGN KEY(case_id,run_id) REFERENCES benchmark_runs(case_id,run_id)
);
CREATE TRIGGER immutable_run_identity BEFORE UPDATE OF case_id,run_id,evidence_hash,version,created_at ON benchmark_runs BEGIN SELECT RAISE(ABORT,'immutable run identity'); END;
CREATE TRIGGER immutable_evidence BEFORE UPDATE OF evidence_json,payload_hash,idempotency_hash ON benchmark_submissions BEGIN SELECT RAISE(ABORT,'immutable submission'); END;
CREATE TRIGGER immutable_findings BEFORE UPDATE ON benchmark_findings BEGIN SELECT RAISE(ABORT,'immutable finding'); END;
CREATE TRIGGER immutable_draft BEFORE UPDATE OF draft_json ON benchmark_runs WHEN OLD.draft_json IS NOT NULL AND NEW.draft_json IS NOT OLD.draft_json BEGIN SELECT RAISE(ABORT,'immutable draft'); END;
CREATE TRIGGER immutable_report BEFORE UPDATE OF report_json ON benchmark_runs WHEN OLD.report_json IS NOT NULL AND NEW.report_json IS NOT OLD.report_json BEGIN SELECT RAISE(ABORT,'immutable report'); END;
CREATE TRIGGER immutable_review BEFORE UPDATE OF approved_at,reviewer_subject,review_note,review_decision ON benchmark_runs WHEN OLD.approved_at IS NOT NULL BEGIN SELECT RAISE(ABORT,'immutable review'); END;
