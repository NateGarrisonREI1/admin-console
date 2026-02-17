-- Phase 4: contractor_profiles table
-- Stores contractor specializations and settings

CREATE TABLE contractor_profiles (
  id                    uuid PRIMARY KEY REFERENCES app_profiles(id),
  company_name          text,
  system_specialties    system_type[] DEFAULT '{}',
  service_radius_miles  integer DEFAULT 50,
  service_zip_codes     text[] DEFAULT '{}',
  phone                 text,
  email                 text,
  website               text,
  license_number        text,
  insurance_verified    boolean NOT NULL DEFAULT false,
  stripe_customer_id    text,

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_contractor_profiles_specialties ON contractor_profiles USING gin(system_specialties);
CREATE INDEX idx_contractor_profiles_zips ON contractor_profiles USING gin(service_zip_codes);

-- Updated_at trigger
CREATE TRIGGER set_contractor_profiles_updated_at
  BEFORE UPDATE ON contractor_profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE contractor_profiles ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY "admin_full_contractor_profiles" ON contractor_profiles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM app_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Contractors: read/update own
CREATE POLICY "contractor_read_own_profile" ON contractor_profiles
  FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "contractor_update_own_profile" ON contractor_profiles
  FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "contractor_insert_own_profile" ON contractor_profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());
