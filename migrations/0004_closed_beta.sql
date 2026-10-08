ALTER TABLE benchmark_submissions ADD COLUMN invitation_hash TEXT;
CREATE TABLE benchmark_invitations (
 secret_hash TEXT PRIMARY KEY, created_at TEXT NOT NULL, expires_at TEXT NOT NULL,
 revoked_at TEXT, consumed_case_id TEXT, consumed_at TEXT,
 CHECK((consumed_case_id IS NULL)=(consumed_at IS NULL))
);
CREATE TRIGGER invitation_admission BEFORE INSERT ON benchmark_submissions
WHEN NOT EXISTS(SELECT 1 FROM benchmark_submissions WHERE idempotency_hash=NEW.idempotency_hash)
BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM benchmark_invitations WHERE secret_hash=NEW.invitation_hash AND revoked_at IS NULL AND consumed_at IS NULL AND expires_at>NEW.created_at) THEN RAISE(ABORT,'INVITATION_DENIED') END;
END;
CREATE TRIGGER consume_invitation AFTER INSERT ON benchmark_submissions BEGIN
 UPDATE benchmark_invitations SET consumed_case_id=NEW.case_id,consumed_at=NEW.created_at WHERE secret_hash=NEW.invitation_hash AND consumed_at IS NULL;
END;
CREATE TABLE benchmark_case_controls(case_id TEXT PRIMARY KEY, blocked_at TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('DELETE','REVOKE')));
CREATE TRIGGER fence_benchmark_events_insert BEFORE INSERT ON benchmark_events WHEN EXISTS(SELECT 1 FROM benchmark_case_controls WHERE case_id=NEW.case_id) BEGIN SELECT RAISE(ABORT,'CASE_BLOCKED'); END;
CREATE TRIGGER fence_benchmark_events_update BEFORE UPDATE ON benchmark_events WHEN EXISTS(SELECT 1 FROM benchmark_case_controls WHERE case_id=NEW.case_id) BEGIN SELECT RAISE(ABORT,'CASE_BLOCKED'); END;
CREATE TRIGGER fence_benchmark_findings_insert BEFORE INSERT ON benchmark_findings WHEN EXISTS(SELECT 1 FROM benchmark_case_controls WHERE case_id=NEW.case_id) BEGIN SELECT RAISE(ABORT,'CASE_BLOCKED'); END;
CREATE TRIGGER fence_benchmark_findings_update BEFORE UPDATE ON benchmark_findings WHEN EXISTS(SELECT 1 FROM benchmark_case_controls WHERE case_id=NEW.case_id) BEGIN SELECT RAISE(ABORT,'CASE_BLOCKED'); END;
CREATE TRIGGER fence_benchmark_permissions_insert BEFORE INSERT ON benchmark_permissions WHEN EXISTS(SELECT 1 FROM benchmark_case_controls WHERE case_id=NEW.case_id) BEGIN SELECT RAISE(ABORT,'CASE_BLOCKED'); END;
CREATE TRIGGER fence_benchmark_permissions_update BEFORE UPDATE ON benchmark_permissions WHEN EXISTS(SELECT 1 FROM benchmark_case_controls WHERE case_id=NEW.case_id) BEGIN SELECT RAISE(ABORT,'CASE_BLOCKED'); END;
CREATE TRIGGER fence_benchmark_runs_insert BEFORE INSERT ON benchmark_runs WHEN EXISTS(SELECT 1 FROM benchmark_case_controls WHERE case_id=NEW.case_id) BEGIN SELECT RAISE(ABORT,'CASE_BLOCKED'); END;
CREATE TRIGGER fence_benchmark_runs_update BEFORE UPDATE ON benchmark_runs WHEN EXISTS(SELECT 1 FROM benchmark_case_controls WHERE case_id=NEW.case_id) BEGIN SELECT RAISE(ABORT,'CASE_BLOCKED'); END;
CREATE TRIGGER fence_benchmark_submissions_insert BEFORE INSERT ON benchmark_submissions WHEN EXISTS(SELECT 1 FROM benchmark_case_controls WHERE case_id=NEW.case_id) BEGIN SELECT RAISE(ABORT,'CASE_BLOCKED'); END;
CREATE TRIGGER fence_benchmark_submissions_update BEFORE UPDATE ON benchmark_submissions WHEN EXISTS(SELECT 1 FROM benchmark_case_controls WHERE case_id=NEW.case_id) BEGIN SELECT RAISE(ABORT,'CASE_BLOCKED'); END;
