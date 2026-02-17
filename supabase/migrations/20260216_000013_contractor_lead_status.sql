-- Phase 4: contractor_lead_status table
-- Tracks contractor's interaction with each purchased lead

CREATE TABLE contractor_lead_status (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id   uuid NOT NULL REFERENCES app_profiles(id),
  system_lead_id  uuid NOT NULL REFERENCES system_leads(id) ON DELETE CASCADE,
  status          contacted_status NOT NULL DEFAULT 'new',
  notes           text,
  quote_amount    numeric(10,2),
  closed_date     timestamptz,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE UNIQUE INDEX idx_contractor_lead_status_unique
  ON contractor_lead_status(contractor_id, system_lead_id);
CREATE INDEX idx_contractor_lead_status_status ON contractor_lead_status(status);

-- Updated_at trigger
CREATE TRIGGER set_contractor_lead_status_updated_at
  BEFORE UPDATE ON contractor_lead_status
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE contractor_lead_status ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY "admin_full_contractor_lead_status" ON contractor_lead_status
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM app_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Contractors: full access on own rows
CREATE POLICY "contractor_own_lead_status" ON contractor_lead_status
  FOR ALL
  USING (contractor_id = auth.uid());
