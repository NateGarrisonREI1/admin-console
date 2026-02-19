// src/types/admin-ops.ts
// Types for REI in-house operations

export type TeamMemberStatus = "active" | "inactive" | "on_leave";
export type ScheduleStatus = "scheduled" | "confirmed" | "in_progress" | "completed" | "no_show" | "cancelled" | "rescheduled";
export type DirectLeadStatus = "pending" | "assigned" | "in_progress" | "completed" | "cancelled";
export type PartnerStatus = "active" | "inactive" | "suspended";
export type DispatchStatus = "pending" | "accepted" | "declined" | "in_progress" | "completed" | "cancelled";
export type PaymentStatus = "pending" | "invoiced" | "paid" | "overdue";
export type InspectionType = "standard" | "203k" | "commercial" | "pre_listing" | "new_construction";

export type TimeOffPeriod = {
  start: string; // ISO date YYYY-MM-DD
  end: string;
  reason?: string;
};

// ─── HES Team ────────────────────────────────────────────────
export type HesTeamMember = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  certifications: string[];
  service_areas: string[];
  status: string;
  avg_rating: number;
  total_completed: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type HesScheduleEntry = {
  id: string;
  team_member_id: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  address: string | null;
  city: string | null;
  state: string;
  zip: string | null;
  scheduled_date: string;
  scheduled_time: string | null;
  duration_minutes: number;
  special_notes: string | null;
  status: string;
  completed_at: string | null;
  customer_rating: number | null;
  customer_feedback: string | null;
  report_generated: boolean;
  invoice_amount: number | null;
  payment_status: string;
  created_at: string;
  updated_at: string;
  // Joined
  team_member?: HesTeamMember | null;
};

// ─── Inspector Team ──────────────────────────────────────────
export type InspectorTeamMember = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  license_number: string | null;
  certifications: string[];
  service_areas: string[];
  status: string;
  avg_rating: number;
  total_completed: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type InspectorScheduleEntry = {
  id: string;
  team_member_id: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  address: string | null;
  city: string | null;
  state: string;
  zip: string | null;
  inspection_type: string;
  scheduled_date: string;
  scheduled_time: string | null;
  duration_minutes: number;
  special_notes: string | null;
  status: string;
  completed_at: string | null;
  customer_rating: number | null;
  customer_feedback: string | null;
  report_generated: boolean;
  invoice_amount: number | null;
  payment_status: string;
  created_at: string;
  updated_at: string;
  // Joined
  team_member?: InspectorTeamMember | null;
};

// ─── Direct Leads ────────────────────────────────────────────
export type DirectLead = {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  address: string | null;
  city: string | null;
  state: string;
  zip: string | null;
  service_needed: string[];
  date_needed: string | null;
  time_needed: string | null;
  budget: number | null;
  special_notes: string | null;
  source: string;
  assigned_type: string | null;
  assigned_to_id: string | null;
  status: string;
  completed_at: string | null;
  customer_rating: number | null;
  customer_feedback: string | null;
  invoice_amount: number | null;
  payment_status: string;
  created_at: string;
  updated_at: string;
};

// ─── Partner Contractors ─────────────────────────────────────
export type PartnerType = "contractor" | "hes_assessor" | "home_inspector";

export type PartnerContractor = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  partner_type: PartnerType;
  service_types: string[];
  service_areas: string[];
  license_number: string | null;
  status: string;
  avg_rating: number;
  total_leads_sent: number;
  total_closed: number;
  avg_response_hours: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PartnerDispatch = {
  id: string;
  partner_id: string;
  direct_lead_id: string;
  status: string;
  dispatched_at: string;
  response_at: string | null;
  completed_at: string | null;
  amount_owed: number;
  payment_status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  partner?: PartnerContractor | null;
  direct_lead?: DirectLead | null;
};

// ─── Admin Dashboard ─────────────────────────────────────────
export type AdminDashboardKpis = {
  active_brokers: number;
  revenue_this_month: number;
  broker_revenue: number;
  leads_posted: number;
  leads_purchased: number;
  leads_closed: number;
  services_completed: number;
  hes_staff_count: number;
  hes_capacity_pct: number;
  hes_scheduled_today: number;
  inspector_staff_count: number;
  inspector_capacity_pct: number;
  inspector_scheduled_today: number;
  partner_count: number;
  partner_active_pct: number;
  partner_available: number;
  pending_direct_leads: number;
  alerts: AdminAlert[];
};

export type AdminAlert = {
  type: "error" | "warning" | "info";
  message: string;
};

export type AdminBrokerSummary = {
  id: string;
  user_id: string;
  company_name: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  // Computed
  user_email?: string;
  user_name?: string;
  homes_assessed: number;
  leads_posted: number;
  leads_closed: number;
  revenue_earned: number;
  contractor_count: number;
  hes_assessor_count: number;
  inspector_count: number;
  last_activity?: string;
};

export type RevenueBreakdown = {
  broker_commissions: number;
  broker_lead_count: number;
  inhouse_hes_revenue: number;
  inhouse_hes_count: number;
  inhouse_inspection_revenue: number;
  inhouse_inspection_count: number;
  partner_dispatch_revenue: number;
  partner_dispatch_count: number;
  total_revenue: number;
  rei_take: number;
};

// ─── Broker Health ──────────────────────────────────────────

/** Time-windowed inputs for the health score calculation */
export type BrokerHealthInput = {
  leads_posted_30d: number;
  leads_posted_30_60d: number;
  leads_posted_90d: number;
  leads_closed_90d: number;
  revenue_30d: number;
  revenue_30_60d: number;
  /** Epoch ms of the broker's most recent meaningful action (lead, assessment) */
  last_activity_ms: number;
  created_at: string;
  contractor_count: number;
  hes_assessor_count: number;
  inspector_count: number;
};

export type BrokerHealthScore = {
  overall: number;
  activity: number;
  conversion: number;
  stickiness: number;
  network_quality: number;
  revenue_trend: number;
  risk_level: "low" | "medium" | "high";
};

export type BrokerHealthSummary = AdminBrokerSummary & {
  health_score: BrokerHealthScore;
};

export type BrokerContractorPerformance = {
  id: string;
  name: string;
  company_name: string | null;
  leads_sent: number;
  leads_closed: number;
  avg_rating: number;
  provider_type: string;
};

export type BrokerHealthAudit = {
  broker: AdminBrokerSummary;
  health_score: BrokerHealthScore;
  contractors: BrokerContractorPerformance[];
  leads_last_30_days: number;
  leads_last_7_days: number;
  avg_days_to_close: number;
  revenue_by_type: { type: string; count: number; closed: number; revenue: number }[];
  alerts: { type: "success" | "warning" | "info"; message: string }[];
};
