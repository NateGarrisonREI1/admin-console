// src/lib/services/types.ts
// DTOs and filter interfaces for service layer.

import type {
  LeadStatus,
  BuyerType,
  ContactMethod,
  ContactDirection,
  SimulationSyncStatus,
} from "@/types/schema";

// ──────────────────────────────────────────
// Job
// ──────────────────────────────────────────

export type JobStatus = "new" | "in_progress" | "complete" | "archived";

export type CreateJobDTO = {
  state: string;
  zip: string;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_type?: string | null;
  notes?: string | null;
};

export type JobFilters = {
  status?: JobStatus;
  customer?: string;
  state?: string;
  zip?: string;
  after?: string;
  before?: string;
  page?: number;
  per_page?: number;
};

export type Job = {
  id: string;
  status: JobStatus;
  state: string;
  zip: string;
  address1: string | null;
  address2: string | null;
  city: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_type: string | null;
  notes: string | null;
  confirmation_code: string | null;
  inspection_status: string | null;
  simulation_job_id: string | null;
  simulation_sync_status: SimulationSyncStatus | null;
  last_simulation_sync: string | null;
  created_at: string;
  updated_at: string | null;
};

// ──────────────────────────────────────────
// Customer
// ──────────────────────────────────────────

export type Customer = {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_type: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string;
  zip: string;
  created_at: string;
};

export type CustomerUpdate = Partial<
  Pick<
    Customer,
    | "customer_name"
    | "customer_email"
    | "customer_phone"
    | "customer_type"
    | "address1"
    | "address2"
    | "city"
    | "state"
    | "zip"
  >
>;

// ──────────────────────────────────────────
// Contact log
// ──────────────────────────────────────────

export type ContactLogEntry = {
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

export type CreateContactLogDTO = {
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
// Schedule
// ──────────────────────────────────────────

export type ScheduleType = "hes_visit" | "inspection" | "follow_up" | "other";
export type ScheduleStatus = "pending" | "confirmed" | "completed" | "canceled";

export type Schedule = {
  id: string;
  job_id: string;
  kind: ScheduleType;
  status: ScheduleStatus;
  start_at: string;
  end_at: string;
  assignee: string | null;
  notes: string | null;
  created_at: string;
};

export type ScheduleFilters = {
  job_id?: string;
  type?: ScheduleType;
  status?: ScheduleStatus;
  after?: string;
  before?: string;
  page?: number;
  per_page?: number;
};

export type ScheduleUpdate = Partial<
  Pick<Schedule, "status" | "start_at" | "end_at" | "assignee" | "notes">
>;

export type TimeSlot = {
  start: string;
  end: string;
  available: boolean;
};

// ──────────────────────────────────────────
// Lead
// ──────────────────────────────────────────

export type LeadDTO = {
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

export type LeadFilters = {
  status?: LeadStatus;
  job_id?: string;
  price_min?: number;
  price_max?: number;
  posted_after?: string;
  posted_before?: string;
  page?: number;
  per_page?: number;
};

export type LeadUpdateDTO = Partial<
  Pick<
    LeadDTO,
    "status" | "price" | "notes" | "posted_at" | "expires_at" | "service_tags"
  >
>;

// ──────────────────────────────────────────
// Snapshot
// ──────────────────────────────────────────

export type CachedSnapshot = {
  id: string;
  admin_job_id: string;
  simulation_job_id: string | null;
  snapshot_data: Record<string, unknown>;
  cached_at: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
};

// ──────────────────────────────────────────
// Webhooks
// ──────────────────────────────────────────

export type JobCreatedWebhook = {
  simulation_job_id: string;
  state: string;
  zip: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  address1?: string;
  city?: string;
};

export type SimulationReadyWebhook = {
  simulation_job_id: string;
  admin_job_id?: string;
  snapshot_data: Record<string, unknown>;
};

export type HESCompleteWebhook = {
  admin_job_id?: string;
  simulation_job_id?: string;
};

// ──────────────────────────────────────────
// Paginated result
// ──────────────────────────────────────────

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  per_page: number;
};
