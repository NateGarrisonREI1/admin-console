// src/lib/services/JobService.ts
import { supabaseAdmin } from "@/lib/supabase/server";
import { NotFoundError, ValidationError, InternalError } from "./errors";
import { SnapshotService } from "./SnapshotService";
import type {
  Job,
  JobStatus,
  CreateJobDTO,
  JobFilters,
  CachedSnapshot,
  Paginated,
} from "./types";

const VALID_STATUSES: JobStatus[] = ["new", "in_progress", "complete", "archived"];

export class JobService {
  private snapshots: SnapshotService;

  constructor(snapshots?: SnapshotService) {
    this.snapshots = snapshots ?? new SnapshotService();
  }

  /** Create a new admin job. */
  async createJob(dto: CreateJobDTO): Promise<Job> {
    const state = dto.state?.trim().toUpperCase();
    const zip = dto.zip?.trim();

    if (!state || state.length !== 2) {
      throw new ValidationError("state is required (2-letter code)");
    }
    if (!zip || zip.length < 5) {
      throw new ValidationError("zip is required (5+ digits)");
    }

    const { data, error } = await supabaseAdmin
      .from("admin_jobs")
      .insert({
        state,
        zip,
        address1: dto.address1 ?? null,
        address2: dto.address2 ?? null,
        city: dto.city ?? null,
        customer_name: dto.customer_name ?? null,
        customer_email: dto.customer_email ?? null,
        customer_phone: dto.customer_phone ?? null,
        customer_type: dto.customer_type ?? null,
        notes: dto.notes ?? null,
        status: "new",
      })
      .select()
      .single();

    if (error) {
      console.error("JobService.createJob error:", error);
      throw new InternalError(error.message);
    }

    return data as Job;
  }

  /** Get a single job by ID. */
  async getJob(id: string): Promise<Job> {
    const { data, error } = await supabaseAdmin
      .from("admin_jobs")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) throw new NotFoundError("Job", id);

    return data as Job;
  }

  /** List jobs with optional filters and pagination. */
  async listJobs(filters: JobFilters = {}): Promise<Paginated<Job>> {
    const page = Math.max(1, filters.page ?? 1);
    const perPage = Math.min(100, Math.max(1, filters.per_page ?? 25));
    const offset = (page - 1) * perPage;

    let query = supabaseAdmin
      .from("admin_jobs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + perPage - 1);

    if (filters.status) query = query.eq("status", filters.status);
    if (filters.state) query = query.eq("state", filters.state);
    if (filters.zip) query = query.eq("zip", filters.zip);
    if (filters.customer) query = query.ilike("customer_name", `%${filters.customer}%`);
    if (filters.after) query = query.gte("created_at", filters.after);
    if (filters.before) query = query.lte("created_at", filters.before);

    const { data, error, count } = await query;

    if (error) {
      console.error("JobService.listJobs error:", error);
      throw new InternalError(error.message);
    }

    return {
      items: (data ?? []) as Job[],
      total: count ?? 0,
      page,
      per_page: perPage,
    };
  }

  /** Update a job's status. */
  async updateJobStatus(id: string, status: JobStatus): Promise<Job> {
    if (!VALID_STATUSES.includes(status)) {
      throw new ValidationError(`Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`);
    }

    const { data, error } = await supabaseAdmin
      .from("admin_jobs")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") throw new NotFoundError("Job", id);
      throw new InternalError(error.message);
    }

    return data as Job;
  }

  /** Link an admin job to a simulation job in leaf-diagnose-sim-2. */
  async linkToSimulation(jobId: string, simJobId: string): Promise<Job> {
    if (!simJobId.trim()) {
      throw new ValidationError("simulation_job_id is required");
    }

    const { data, error } = await supabaseAdmin
      .from("admin_jobs")
      .update({
        simulation_job_id: simJobId,
        simulation_sync_status: "pending",
      })
      .eq("id", jobId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") throw new NotFoundError("Job", jobId);
      throw new InternalError(error.message);
    }

    return data as Job;
  }

  /** Get the cached simulation snapshot for a job. */
  async getSimulationSnapshot(jobId: string): Promise<CachedSnapshot | null> {
    // Verify job exists
    await this.getJob(jobId);
    return this.snapshots.getSnapshot(jobId);
  }

  /** Request a simulation refresh for a job. */
  async refreshSimulation(jobId: string): Promise<CachedSnapshot | null> {
    return this.snapshots.refreshSnapshot(jobId);
  }

  /** Delete a job and all related records (DB cascade handles children). */
  async deleteJob(id: string): Promise<void> {
    // Verify existence
    await this.getJob(id);

    const { error } = await supabaseAdmin
      .from("admin_jobs")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("JobService.deleteJob error:", error);
      throw new InternalError(error.message);
    }
  }
}
