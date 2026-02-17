// src/lib/services/WebhookService.ts
import { supabaseAdmin } from "@/lib/supabase/server";
import { ValidationError, NotFoundError, InternalError } from "./errors";
import { JobService } from "./JobService";
import { SnapshotService } from "./SnapshotService";
import type {
  Job,
  CachedSnapshot,
  JobCreatedWebhook,
  SimulationReadyWebhook,
  HESCompleteWebhook,
} from "./types";

const WEBHOOK_SECRET = process.env.CRON_SECRET ?? "";

export class WebhookService {
  private jobs: JobService;
  private snapshots: SnapshotService;

  constructor(jobs?: JobService, snapshots?: SnapshotService) {
    this.snapshots = snapshots ?? new SnapshotService();
    this.jobs = jobs ?? new JobService(this.snapshots);
  }

  /** Validate the webhook secret header. */
  validateWebhookSecret(secret: string): boolean {
    return Boolean(WEBHOOK_SECRET) && secret === WEBHOOK_SECRET;
  }

  /**
   * Handle job-created webhook from leaf-diagnose-sim-2.
   * Creates or links an admin job for the simulation.
   */
  async handleJobCreated(payload: JobCreatedWebhook): Promise<Job> {
    if (!payload.simulation_job_id?.trim()) {
      throw new ValidationError("simulation_job_id is required");
    }
    if (!payload.state?.trim() || !payload.zip?.trim()) {
      throw new ValidationError("state and zip are required");
    }

    // Check if already linked
    const { data: existing } = await supabaseAdmin
      .from("admin_jobs")
      .select("*")
      .eq("simulation_job_id", payload.simulation_job_id)
      .maybeSingle();

    if (existing) return existing as Job;

    // Create new admin job
    const job = await this.jobs.createJob({
      state: payload.state,
      zip: payload.zip,
      customer_name: payload.customer_name ?? null,
      customer_email: payload.customer_email ?? null,
      customer_phone: payload.customer_phone ?? null,
      address1: payload.address1 ?? null,
      city: payload.city ?? null,
    });

    // Link to simulation
    return this.jobs.linkToSimulation(job.id, payload.simulation_job_id);
  }

  /**
   * Handle simulation-ready webhook.
   * Caches the simulation snapshot and updates job sync status.
   */
  async handleSimulationReady(
    payload: SimulationReadyWebhook
  ): Promise<CachedSnapshot> {
    if (!payload.simulation_job_id?.trim()) {
      throw new ValidationError("simulation_job_id is required");
    }
    if (!payload.snapshot_data || typeof payload.snapshot_data !== "object") {
      throw new ValidationError("snapshot_data object is required");
    }

    // Find admin job
    let adminJobId = payload.admin_job_id ?? null;

    if (!adminJobId) {
      const { data: job } = await supabaseAdmin
        .from("admin_jobs")
        .select("id")
        .eq("simulation_job_id", payload.simulation_job_id)
        .maybeSingle();

      adminJobId = job?.id ?? null;
    }

    if (!adminJobId) {
      throw new NotFoundError("Admin job for simulation", payload.simulation_job_id);
    }

    return this.snapshots.cacheSnapshot(
      adminJobId,
      payload.simulation_job_id,
      payload.snapshot_data
    );
  }

  /**
   * Handle HES-complete webhook.
   * Marks the inspection as complete and logs a system contact entry.
   */
  async handleHESComplete(payload: HESCompleteWebhook): Promise<Job> {
    let adminJobId = payload.admin_job_id ?? null;

    if (!adminJobId && payload.simulation_job_id) {
      const { data: job } = await supabaseAdmin
        .from("admin_jobs")
        .select("id")
        .eq("simulation_job_id", payload.simulation_job_id)
        .maybeSingle();

      adminJobId = job?.id ?? null;
    }

    if (!adminJobId) {
      throw new ValidationError("admin_job_id or simulation_job_id is required");
    }

    const { data, error } = await supabaseAdmin
      .from("admin_jobs")
      .update({ inspection_status: "complete" })
      .eq("id", adminJobId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") throw new NotFoundError("Job", adminJobId);
      throw new InternalError(error.message);
    }

    // Log a system contact entry
    await supabaseAdmin.from("contact_log").insert({
      admin_job_id: adminJobId,
      contact_method: "system",
      direction: "inbound",
      subject: "HES visit completed",
      body: "HES visit marked as complete via webhook.",
      contacted_at: new Date().toISOString(),
    });

    return data as Job;
  }
}
