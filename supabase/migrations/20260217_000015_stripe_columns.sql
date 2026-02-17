-- Phase 5: Add Stripe-related columns for payment integration
-- Adds stripe columns to payments table and app_profiles

-- payments: track Stripe payment intent and charge IDs
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT;

-- app_profiles: track Stripe customer ID for all roles
ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Indexes for lookups
CREATE INDEX IF NOT EXISTS idx_payments_stripe_pi ON payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_charge ON payments(stripe_charge_id);
CREATE INDEX IF NOT EXISTS idx_app_profiles_stripe ON app_profiles(stripe_customer_id);
