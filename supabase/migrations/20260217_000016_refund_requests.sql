-- Phase 5 Extended: Refund requests table + payments refund columns

-- Reason category enum
DO $$ BEGIN
  CREATE TYPE refund_reason_category AS ENUM (
    'no_response', 'competitor', 'bad_quality', 'not_interested', 'duplicate', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Refund request status enum
DO $$ BEGIN
  CREATE TYPE refund_request_status AS ENUM (
    'pending', 'approved', 'denied', 'more_info_requested'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Refund status for payments
DO $$ BEGIN
  CREATE TYPE payment_refund_status AS ENUM (
    'none', 'requested', 'approved', 'denied', 'refunded'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Refund requests table
CREATE TABLE IF NOT EXISTS refund_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id    UUID NOT NULL REFERENCES payments(id),
  contractor_id UUID NOT NULL REFERENCES auth.users(id),
  lead_id       UUID NOT NULL,
  lead_type     TEXT NOT NULL CHECK (lead_type IN ('system_lead', 'hes_request')),

  reason            TEXT NOT NULL,
  reason_category   refund_reason_category NOT NULL DEFAULT 'other',
  notes             TEXT,

  requested_date    TIMESTAMPTZ NOT NULL DEFAULT now(),
  status            refund_request_status NOT NULL DEFAULT 'pending',
  reviewed_by       UUID REFERENCES auth.users(id),
  reviewed_date     TIMESTAMPTZ,
  admin_notes       TEXT,
  refund_date       TIMESTAMPTZ,

  info_requested       TEXT,
  info_requested_date  TIMESTAMPTZ,
  info_response        TEXT,
  info_response_date   TIMESTAMPTZ,

  risk_score        INTEGER DEFAULT 0,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON refund_requests(status);
CREATE INDEX IF NOT EXISTS idx_refund_requests_contractor ON refund_requests(contractor_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_payment ON refund_requests(payment_id);

-- Update trigger
CREATE OR REPLACE FUNCTION update_refund_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_refund_requests_updated_at ON refund_requests;
CREATE TRIGGER trg_refund_requests_updated_at
  BEFORE UPDATE ON refund_requests
  FOR EACH ROW EXECUTE FUNCTION update_refund_requests_updated_at();

-- RLS
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on refund_requests"
  ON refund_requests FOR ALL
  USING (
    EXISTS (SELECT 1 FROM app_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Contractors view own refunds"
  ON refund_requests FOR SELECT
  USING (contractor_id = auth.uid());

CREATE POLICY "Contractors insert own refunds"
  ON refund_requests FOR INSERT
  WITH CHECK (contractor_id = auth.uid());

-- Payments table: add refund tracking columns
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_request_id UUID REFERENCES refund_requests(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_status payment_refund_status DEFAULT 'none';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_amount NUMERIC;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_stripe_id TEXT;

-- Index for refund status filtering
CREATE INDEX IF NOT EXISTS idx_payments_refund_status ON payments(refund_status);
