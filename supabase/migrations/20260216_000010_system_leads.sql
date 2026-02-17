-- Phase 4: system_leads table
-- Stores contractor leads from homeowner system upgrade requests

-- Enums
CREATE TYPE system_type AS ENUM ('water_heater', 'hvac', 'solar');
CREATE TYPE system_lead_status AS ENUM ('available', 'purchased', 'expired', 'archived');
CREATE TYPE contacted_status AS ENUM ('new', 'contacted', 'quoted', 'closed', 'lost');

CREATE TABLE system_leads (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id  uuid,  -- FK to external leaf-diagnose-sim-2 (not enforced)
  system_type   system_type NOT NULL,

  -- Location
  address       text,
  city          text,
  state         text NOT NULL,
  zip           text NOT NULL,

  -- Homeowner contact (visible after purchase)
  homeowner_name  text,
  homeowner_phone text,
  homeowner_email text,
  best_contact_time text,

  -- LEAF report data
  leaf_report_data jsonb DEFAULT '{}'::jsonb,

  -- Marketplace
  price             numeric(10,2) NOT NULL DEFAULT 0,
  status            system_lead_status NOT NULL DEFAULT 'available',
  posted_date       timestamptz,
  expiration_date   timestamptz,

  -- Purchase
  purchased_by_contractor_id uuid REFERENCES app_profiles(id),
  purchased_date             timestamptz,
  contacted_status           contacted_status NOT NULL DEFAULT 'new',

  -- Timestamps
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz  -- soft delete
);

-- Indexes
CREATE INDEX idx_system_leads_system_type ON system_leads(system_type);
CREATE INDEX idx_system_leads_status ON system_leads(status);
CREATE INDEX idx_system_leads_posted_date ON system_leads(posted_date DESC);
CREATE INDEX idx_system_leads_purchased_by ON system_leads(purchased_by_contractor_id);
CREATE INDEX idx_system_leads_zip ON system_leads(zip);
CREATE INDEX idx_system_leads_expiration ON system_leads(expiration_date);

-- Updated_at trigger
CREATE TRIGGER set_system_leads_updated_at
  BEFORE UPDATE ON system_leads
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE system_leads ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY "admin_full_system_leads" ON system_leads
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM app_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Contractors: read available + own purchased
CREATE POLICY "contractor_read_system_leads" ON system_leads
  FOR SELECT
  USING (
    (status = 'available' AND deleted_at IS NULL)
    OR purchased_by_contractor_id = auth.uid()
  );
