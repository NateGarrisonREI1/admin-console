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
