-- Phase 5 Extended: Audit logs table for tracking admin + user actions

CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action        TEXT NOT NULL,
  actor_id      UUID REFERENCES auth.users(id),
  actor_role    TEXT,
  resource_type TEXT NOT NULL,
  resource_id   UUID NOT NULL,
  changes       JSONB,
  details       TEXT,
  ip_address    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- RLS: admins only
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on audit_logs"
  ON audit_logs FOR ALL
  USING (
    EXISTS (SELECT 1 FROM app_profiles WHERE id = auth.uid() AND role = 'admin')
  );
