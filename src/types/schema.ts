// src/types/schema.ts
// Hand-written types for Phase 5 tables.
// These supplement the auto-generated supabase.ts types.

// ──────────────────────────────────────────
// snapshot_cache
// ──────────────────────────────────────────

export type SnapshotCache = {
  id: string;
  admin_job_id: string;
  simulation_job_id: string | null;
  snapshot_data: Record<string, unknown>;
  cached_at: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
};

export type SnapshotCacheInsert = {
  id?: string;
  admin_job_id: string;
  simulation_job_id?: string | null;
  snapshot_data: Record<string, unknown>;
  cached_at?: string;
  expires_at?: string;
};

export type SnapshotCacheUpdate = Partial<
  Pick<SnapshotCache, "snapshot_data" | "simulation_job_id" | "cached_at" | "expires_at">
>;

// ──────────────────────────────────────────
// leads
// ──────────────────────────────────────────

export type LeadStatus = "draft" | "active" | "sold" | "expired" | "canceled";
export type BuyerType = "contractor" | "broker" | "other";

export type Lead = {
  id: string;
  admin_job_id: string;
  status: LeadStatus;
  posted_at: string | null;
  expires_at: string | null;
  price: number | null;
  buyer_id: string | null;
  buyer_type: BuyerType | null;
  sold_at: string | null;
  notes: string | null;
  service_tags: string[];
  created_at: string;
  updated_at: string;
};

export type LeadInsert = {
  id?: string;
  admin_job_id: string;
  status?: LeadStatus;
  posted_at?: string | null;
  expires_at?: string | null;
  price?: number | null;
  buyer_id?: string | null;
  buyer_type?: BuyerType | null;
  notes?: string | null;
  service_tags?: string[];
};

export type LeadUpdate = Partial<
  Pick<
    Lead,
    | "status"
    | "posted_at"
    | "expires_at"
    | "price"
    | "buyer_id"
    | "buyer_type"
    | "sold_at"
    | "notes"
    | "service_tags"
  >
>;

// ──────────────────────────────────────────
// contact_log
// ──────────────────────────────────────────

export type ContactMethod = "phone" | "email" | "sms" | "in_person" | "system";
export type ContactDirection = "inbound" | "outbound";

export type ContactLog = {
  id: string;
  admin_job_id: string;
  contact_method: ContactMethod;
  direction: ContactDirection;
  subject: string | null;
  body: string | null;
  contacted_by: string | null;
  contacted_at: string;
  response_received: boolean;
  response_at: string | null;
  created_at: string;
};

export type ContactLogInsert = {
  id?: string;
  admin_job_id: string;
  contact_method?: ContactMethod;
  direction?: ContactDirection;
  subject?: string | null;
  body?: string | null;
  contacted_by?: string | null;
  contacted_at?: string;
  response_received?: boolean;
  response_at?: string | null;
};

// ──────────────────────────────────────────
// admin_jobs (new simulation link columns)
// ──────────────────────────────────────────

export type SimulationSyncStatus = "pending" | "synced" | "failed";

export type AdminJobSimulationFields = {
  simulation_job_id: string | null;
  last_simulation_sync: string | null;
  simulation_sync_status: SimulationSyncStatus | null;
};

// ──────────────────────────────────────────
// Phase 4: system_leads
// ──────────────────────────────────────────

export type SystemType = "water_heater" | "hvac" | "solar";
export type SystemLeadStatus = "available" | "purchased" | "expired" | "archived";
export type ContactedStatus = "new" | "contacted" | "quoted" | "closed" | "lost";

export type LeafReportData = {
  current_system_age?: number;
  current_system_efficiency?: string;
  estimated_savings_annual?: number;
  estimated_incentives?: number;
  roi_years?: number;
  recommended_upgrades?: string[];
  performance_data?: Record<string, unknown>;
};

export type SystemLead = {
  id: string;
  homeowner_id: string | null;
  system_type: SystemType;
  address: string | null;
  city: string | null;
  state: string;
  zip: string;
  homeowner_name: string | null;
  homeowner_phone: string | null;
  homeowner_email: string | null;
  best_contact_time: string | null;
  leaf_report_data: LeafReportData;
  price: number;
  status: SystemLeadStatus;
  posted_date: string | null;
  expiration_date: string | null;
  purchased_by_contractor_id: string | null;
  purchased_date: string | null;
  contacted_status: ContactedStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type SystemLeadInsert = {
  id?: string;
  homeowner_id?: string | null;
  system_type: SystemType;
  address?: string | null;
  city?: string | null;
  state: string;
  zip: string;
  homeowner_name?: string | null;
  homeowner_phone?: string | null;
  homeowner_email?: string | null;
  best_contact_time?: string | null;
  leaf_report_data?: LeafReportData;
  price?: number;
  status?: SystemLeadStatus;
  posted_date?: string | null;
  expiration_date?: string | null;
};

// ──────────────────────────────────────────
// Phase 4: hes_requests
// ──────────────────────────────────────────

export type PropertyType = "single_family" | "multi_family" | "commercial";
export type HesRequestStatus =
  | "pending"
  | "assigned_internal"
  | "assigned_affiliate"
  | "completed"
  | "cancelled";

export type HesRequest = {
  id: string;
  broker_id: string;
  property_address: string;
  city: string;
  state: string;
  zip: string;
  property_type: PropertyType;
  requested_completion_date: string | null;
  notes: string | null;
  status: HesRequestStatus;
  assigned_to_internal_user_id: string | null;
  assigned_to_affiliate_id: string | null;
  posted_for_sale_date: string | null;
  purchased_by_affiliate_id: string | null;
  purchased_date: string | null;
  completion_date: string | null;
  hes_report_url: string | null;
  price: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type HesRequestInsert = {
  id?: string;
  broker_id: string;
  property_address: string;
  city: string;
  state: string;
  zip: string;
  property_type?: PropertyType;
  requested_completion_date?: string | null;
  notes?: string | null;
  price?: number;
};

// ──────────────────────────────────────────
// Phase 4: contractor_profiles
// ──────────────────────────────────────────

export type ContractorProfile = {
  id: string;
  company_name: string | null;
  system_specialties: SystemType[];
  service_radius_miles: number;
  service_zip_codes: string[];
  phone: string | null;
  email: string | null;
  website: string | null;
  license_number: string | null;
  insurance_verified: boolean;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
};

// ──────────────────────────────────────────
// Phase 4: contractor_lead_status
// ──────────────────────────────────────────

export type ContractorLeadStatus = {
  id: string;
  contractor_id: string;
  system_lead_id: string;
  status: ContactedStatus;
  notes: string | null;
  quote_amount: number | null;
  closed_date: string | null;
  updated_at: string;
};

// ──────────────────────────────────────────
// Phase 4: payments
// ──────────────────────────────────────────

export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";

export type Payment = {
  id: string;
  contractor_id: string | null;
  system_lead_id: string | null;
  hes_request_id: string | null;
  amount: number;
  system_type: string | null;
  stripe_transaction_id: string | null;
  status: PaymentStatus;
  created_at: string;
  refunded_date: string | null;
};
