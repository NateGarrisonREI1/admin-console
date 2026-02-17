-- Phase 4: hes_requests table
-- Stores HES visit requests from brokers

CREATE TYPE property_type AS ENUM ('single_family', 'multi_family', 'commercial');
CREATE TYPE hes_request_status AS ENUM (
  'pending',
  'assigned_internal',
  'assigned_affiliate',
  'completed',
  'cancelled'
);

CREATE TABLE hes_requests (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id                   uuid NOT NULL REFERENCES app_profiles(id),

  -- Property info
  property_address            text NOT NULL,
  city                        text NOT NULL,
  state                       text NOT NULL,
  zip                         text NOT NULL,
  property_type               property_type NOT NULL DEFAULT 'single_family',
  requested_completion_date   date,
  notes                       text,

  -- Status & assignment
  status                      hes_request_status NOT NULL DEFAULT 'pending',
  assigned_to_internal_user_id uuid REFERENCES app_profiles(id),
  assigned_to_affiliate_id    uuid REFERENCES app_profiles(id),

  -- Marketplace (for affiliate purchase)
  posted_for_sale_date        timestamptz,
  purchased_by_affiliate_id   uuid REFERENCES app_profiles(id),
  purchased_date              timestamptz,

  -- Completion
  completion_date             timestamptz,
  hes_report_url              text,

  -- Price
  price                       numeric(10,2) NOT NULL DEFAULT 10.00,

  -- Timestamps
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz  -- soft delete
);

-- Indexes
CREATE INDEX idx_hes_requests_broker ON hes_requests(broker_id);
CREATE INDEX idx_hes_requests_status ON hes_requests(status);
CREATE INDEX idx_hes_requests_completion_date ON hes_requests(requested_completion_date);
CREATE INDEX idx_hes_requests_affiliate ON hes_requests(assigned_to_affiliate_id);
CREATE INDEX idx_hes_requests_purchased_by ON hes_requests(purchased_by_affiliate_id);

-- Updated_at trigger
CREATE TRIGGER set_hes_requests_updated_at
  BEFORE UPDATE ON hes_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE hes_requests ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY "admin_full_hes_requests" ON hes_requests
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM app_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Brokers: read own requests, can create
CREATE POLICY "broker_read_own_hes_requests" ON hes_requests
  FOR SELECT
  USING (broker_id = auth.uid());

CREATE POLICY "broker_insert_hes_requests" ON hes_requests
  FOR INSERT
  WITH CHECK (broker_id = auth.uid());

-- HES Affiliates: read available (posted for sale) + own purchased
CREATE POLICY "affiliate_read_hes_requests" ON hes_requests
  FOR SELECT
  USING (
    (posted_for_sale_date IS NOT NULL AND status != 'cancelled' AND deleted_at IS NULL)
    OR purchased_by_affiliate_id = auth.uid()
    OR assigned_to_affiliate_id = auth.uid()
  );
