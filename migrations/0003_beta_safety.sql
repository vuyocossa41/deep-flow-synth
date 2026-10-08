-- Review and approve before applying to the remote beta database.
CREATE TABLE benchmark_beta_capacity (
  singleton INTEGER PRIMARY KEY CHECK(singleton=1),
  accepted INTEGER NOT NULL CHECK(accepted>=0),
  maximum INTEGER NOT NULL CHECK(maximum=10)
);
INSERT INTO benchmark_beta_capacity SELECT 1,COUNT(*),10 FROM benchmark_submissions;
CREATE TRIGGER beta_capacity_guard BEFORE INSERT ON benchmark_submissions
WHEN NOT EXISTS(SELECT 1 FROM benchmark_submissions WHERE idempotency_hash=NEW.idempotency_hash)
AND (SELECT accepted>=maximum FROM benchmark_beta_capacity WHERE singleton=1)
BEGIN SELECT RAISE(ABORT,'BENCHMARK_CAP_REACHED'); END;
CREATE TRIGGER beta_capacity_count AFTER INSERT ON benchmark_submissions
BEGIN UPDATE benchmark_beta_capacity SET accepted=accepted+1 WHERE singleton=1; END;
-- No personal data, evidence, case ID, token, or reviewer identity in receipts.
CREATE TABLE benchmark_deletion_receipts (
  receipt_id TEXT PRIMARY KEY, deleted_at TEXT NOT NULL,
  policy_version TEXT NOT NULL, deleted_rows INTEGER NOT NULL CHECK(deleted_rows>0)
);
CREATE TRIGGER immutable_deletion_receipt_update BEFORE UPDATE ON benchmark_deletion_receipts
BEGIN SELECT RAISE(ABORT,'immutable deletion receipt'); END;
CREATE TRIGGER immutable_deletion_receipt_delete BEFORE DELETE ON benchmark_deletion_receipts
BEGIN SELECT RAISE(ABORT,'immutable deletion receipt'); END;
