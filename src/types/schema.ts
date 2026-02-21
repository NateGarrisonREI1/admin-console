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

export type ExclusivityStatus = "exclusive" | "available" | "expired" | "none";
export type LeadSourceType = "manual" | "leaf_cta" | "campaign" | "referral";
export type ConversionStatus = "pending" | "in_progress" | "completed" | "failed";

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
  // Exclusivity & routing
  exclusivity_status: ExclusivityStatus;
  exclusive_broker_id: string | null;
  exclusivity_expires_at: string | null;
  claimed_by_broker_id: string | null;
  claimed_at: string | null;
  routed_to_contractor_id: string | null;
  routed_at: string | null;
  // Source tracking
  source_type: LeadSourceType;
  source_leaf_session_id: string | null;
  source_leaf_finding: string | null;
  source_job_id: string | null;
  // Revenue & conversion
  revenue_split: Record<string, unknown> | null;
  conversion_status: ConversionStatus;
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
  // Exclusivity & routing
  exclusivity_status?: ExclusivityStatus;
  exclusive_broker_id?: string | null;
  exclusivity_expires_at?: string | null;
  claimed_by_broker_id?: string | null;
  claimed_at?: string | null;
  routed_to_contractor_id?: string | null;
  routed_at?: string | null;
  // Source tracking
  source_type?: LeadSourceType;
  source_leaf_session_id?: string | null;
  source_leaf_finding?: string | null;
  source_job_id?: string | null;
  // Revenue & conversion
  revenue_split?: Record<string, unknown> | null;
  conversion_status?: ConversionStatus;
};

// ─── Lead routing history ─────────────────────────

export type LeadRoutingAction =
  | "created"
  | "exclusive_assigned"
  | "claimed"
  | "routed"
  | "dismissed"
  | "exclusivity_expired"
  | "posted_open"
  | "sold"
  | "converted"
  | "expired";

export type LeadRoutingActorType = "system" | "broker" | "contractor" | "admin";

export type LeadRoutingHistory = {
  id: string;
  lead_id: string;
  action: LeadRoutingAction;
  actor_type: LeadRoutingActorType | null;
  actor_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
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
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  status: PaymentStatus;
  created_at: string;
  refunded_date: string | null;
};

// ──────────────────────────────────────────
// user_relationships
// ──────────────────────────────────────────

export type RelationshipType = "invited_by" | "in_broker_network" | "broker_for" | "manages";

export type UserRelationship = {
  id: string;
  user_id: string;
  related_user_id: string;
  relationship_type: RelationshipType;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type UserRelationshipInsert = {
  id?: string;
  user_id: string;
  related_user_id: string;
  relationship_type: RelationshipType;
  metadata?: Record<string, unknown>;
};

// ──────────────────────────────────────────
// user_sources
// ──────────────────────────────────────────

export type SourceType = "rei_direct" | "broker_campaign" | "broker_invite" | "organic_website" | "admin_created";

export type UserSource = {
  id: string;
  user_id: string;
  source_type: SourceType;
  source_ref_id: string | null;
  campaign_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type UserSourceInsert = {
  id?: string;
  user_id: string;
  source_type?: SourceType;
  source_ref_id?: string | null;
  campaign_id?: string | null;
  metadata?: Record<string, unknown>;
};

// ──────────────────────────────────────────
// Lead Pricing Config
// ──────────────────────────────────────────

export type SystemTypeSlug = "hvac" | "water_heater" | "solar" | "electrical" | "plumbing";

export type LeadPricingConfig = {
  id: string;
  system_type: SystemTypeSlug;
  display_name: string;
  min_price: number;
  max_price: number;
  default_price: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

// ──────────────────────────────────────────
// Contractor Network / Customers / Referrals
// ──────────────────────────────────────────

export type ContractorNetworkContact = {
  id: string;
  contractor_id: string;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  company_name: string | null;
  trade: string | null;
  notes: string | null;
  created_at: string;
};

export type ContractorCustomer = {
  id: string;
  contractor_id: string;
  lead_id: string | null;
  homeowner_name: string;
  homeowner_email: string | null;
  homeowner_phone: string | null;
  homeowner_address: string | null;
  job_type: string;
  job_date: string | null;
  job_status: string;
  notes: string | null;
  created_at: string;
};

export type ReferralStatus = "sent" | "accepted" | "completed" | "declined";

export type ContractorReferral = {
  id: string;
  from_contractor_id: string;
  to_contractor_id: string | null;
  to_contact_name: string | null;
  to_contact_email: string | null;
  to_contact_phone: string | null;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_address: string | null;
  job_description: string | null;
  sent_via: string;
  sent_at: string;
  status: ReferralStatus;
};

// ──────────────────────────────────────────
// Service Catalog
// ──────────────────────────────────────────

export type ServiceCategorySlug = "hes" | "inspection";

export type ServiceCategory = {
  id: string;
  name: string;
  slug: ServiceCategorySlug;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type ServiceTier = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  size_label: string;
  sq_ft_min: number | null;
  sq_ft_max: number | null;
  price: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

export type ServiceAddon = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  price_range_low: number | null;
  price_range_high: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};
