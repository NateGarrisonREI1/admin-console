-- Phase 4: payments table
-- Records all lead purchases

CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

CREATE TABLE payments (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id           uuid REFERENCES app_profiles(id),
  system_lead_id          uuid REFERENCES system_leads(id),
  hes_request_id          uuid REFERENCES hes_requests(id),
  amount                  numeric(10,2) NOT NULL,
  system_type             text,  -- denormalized for reporting
  stripe_transaction_id   text,
  status                  payment_status NOT NULL DEFAULT 'pending',
  created_at              timestamptz NOT NULL DEFAULT now(),
  refunded_date           timestamptz
);

-- Indexes
CREATE INDEX idx_payments_contractor ON payments(contractor_id);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX idx_payments_status ON payments(status);

-- RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY "admin_full_payments" ON payments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM app_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users: read own payments
CREATE POLICY "user_read_own_payments" ON payments
  FOR SELECT
  USING (contractor_id = auth.uid());
