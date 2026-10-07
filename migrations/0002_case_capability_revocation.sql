ALTER TABLE benchmark_submissions ADD COLUMN revoked_at TEXT;
CREATE TRIGGER immutable_capability_revocation BEFORE UPDATE OF revoked_at ON benchmark_submissions WHEN OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS NOT OLD.revoked_at BEGIN SELECT RAISE(ABORT,'capability revocation is permanent'); END;
