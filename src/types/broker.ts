// src/types/broker.ts
// Broker Console type definitions.

export type BrokerContractorStatus = "active" | "paused" | "removed";
export type BrokerAssessmentStatus = "not_started" | "in_progress" | "completed" | "expired";
export type BrokerLeadStatus = "active" | "sold" | "in_progress" | "closed" | "expired" | "lost";
export type SystemType = "hvac" | "solar" | "water_heater" | "electrical" | "insulation";
export type LeadVisibility = "network" | "public";
export type ManualLeadType = "hes_assessment" | "home_inspection";

export interface Broker {
  id: string;
  user_id: string;
  company_name: string | null;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  bio: string | null;
  service_areas: string[];
  default_hvac_price: number;
  default_solar_price: number;
  default_water_price: number;
  default_electrical_price: number;
  default_insulation_price: number;
  commission_split_percent: number;
  branding_primary_color: string | null;
  branding_accent_color: string | null;
  created_at: string;
  updated_at: string;
}

export interface BrokerInsert {
  user_id: string;
  company_name?: string;
  phone?: string;
  email?: string;
  bio?: string;
  service_areas?: string[];
  commission_split_percent?: number;
}

export type ProviderType = "contractor" | "hes_assessor" | "inspector";

export interface BrokerContractor {
  id: string;
  broker_id: string;
  contractor_user_id: string | null;
  contractor_name: string;
  contractor_email: string | null;
  contractor_phone: string | null;
  provider_type: ProviderType;
  service_types: string[];
  service_areas: string[];
  lead_cost_override: number | null;
  commission_split_override: number | null;
  status: BrokerContractorStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BrokerContractorInsert {
  broker_id: string;
  contractor_name: string;
  contractor_email?: string;
  contractor_phone?: string;
  provider_type?: ProviderType;
  service_types?: string[];
  service_areas?: string[];
  lead_cost_override?: number;
  commission_split_override?: number;
  notes?: string;
}

export interface BrokerAssessment {
  id: string;
  broker_id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  status: BrokerAssessmentStatus;
  hes_score: number | null;
  home_age: number | null;
  assessment_data: Record<string, any>;
  assessment_link: string | null;
  completed_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BrokerAssessmentInsert {
  broker_id: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  notes?: string;
}

export interface BrokerLead {
  id: string;
  broker_id: string;
  assessment_id: string | null;
  lead_type: string;
  system_type: string;
  description: string | null;
  price: number;
  status: BrokerLeadStatus;
  visibility: string;
  assigned_to_provider_id: string | null;
  expiration_date: string | null;
  purchased_by_contractor_id: string | null;
  purchased_at: string | null;
  closed_at: string | null;
  broker_commission: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  assessment?: BrokerAssessment | null;
  contractor?: BrokerContractor | null;
  assigned_provider?: BrokerContractor | null;
}

export interface BrokerLeadInsert {
  broker_id: string;
  assessment_id?: string;
  lead_type?: string;
  system_type: string;
  description?: string;
  price: number;
  visibility?: string;
  assigned_to_provider_id?: string;
  expiration_date?: string;
  notes?: string;
}

export interface BrokerKPIs {
  homes_assessed: number;
  revenue: number;
  leads_posted: number;
  leads_sold: number;
  jobs_closed: number;
  conversion_rate: number;
  avg_lead_price: number;
  active_contractors: number;
}

export interface BrokerAnalytics {
  kpis: BrokerKPIs;
  revenue_by_month: { month: string; revenue: number }[];
  leads_by_system: { system_type: string; count: number }[];
  top_contractors: {
    id: string;
    name: string;
    leads_sent: number;
    jobs_closed: number;
    conversion_rate: number;
    revenue: number;
  }[];
}

// ─── Contacts ─────────────────────────────────────────────
export type ContactStatus = "past_customer" | "current_listing" | "potential_buyer" | "referral" | "other";

export interface BrokerContact {
  id: string;
  broker_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  status: string;
  last_contact_date: string | null;
  notes: string | null;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface BrokerContactInsert {
  broker_id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  status?: string;
  last_contact_date?: string;
  notes?: string;
  source?: string;
}

// ─── Campaigns ────────────────────────────────────────────
export type CampaignStatus = "draft" | "sending" | "sent" | "archived";

export interface BrokerCampaign {
  id: string;
  broker_id: string;
  name: string;
  subject: string | null;
  message: string | null;
  target_count: number;
  sent_count: number;
  opened_count: number;
  completed_count: number;
  hes_requested_count: number;
  status: string;
  sent_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface BrokerCampaignInsert {
  broker_id: string;
  name: string;
  subject?: string;
  message?: string;
  target_count?: number;
}

export interface CampaignRecipient {
  id: string;
  campaign_id: string;
  contact_id: string;
  email: string | null;
  status: string;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  completed_at: string | null;
  hes_requested_at: string | null;
  created_at: string;
  // Joined
  contact?: BrokerContact | null;
}

export interface CsvImportResult {
  imported: number;
  duplicates: number;
  invalid: number;
  errors: string[];
}

export interface CampaignPerformance {
  campaign: BrokerCampaign;
  recipients: CampaignRecipient[];
  funnel: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    completed: number;
    hes_requested: number;
  };
  rates: {
    open_rate: number;
    click_rate: number;
    completion_rate: number;
    hes_rate: number;
  };
}
