// src/lib/services/SnapshotService.ts
import { supabaseAdmin } from "@/lib/supabase/server";
import { NotFoundError, InternalError } from "./errors";
import type { CachedSnapshot } from "./types";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export class SnapshotService {
  /**
   * Cache a simulation snapshot for a job.
   * Inserts a new cache row (multiple snapshots per job are allowed;
   * getSnapshot returns the latest).
   */
  async cacheSnapshot(
    jobId: string,
    simJobId: string,
    data: Record<string, unknown>
  ): Promise<CachedSnapshot> {
    const now = new Date().toISOString();
    const expires = new Date(Date.now() + CACHE_TTL_MS).toISOString();

    const { data: row, error } = await supabaseAdmin
      .from("snapshot_cache")
      .insert({
        admin_job_id: jobId,
        simulation_job_id: simJobId,
        snapshot_data: data,
        cached_at: now,
        expires_at: expires,
      })
      .select()
      .single();

    if (error) {
      console.error("SnapshotService.cacheSnapshot error:", error);
      throw new InternalError(error.message);
    }

    // Update job sync status
    await supabaseAdmin
      .from("admin_jobs")
      .update({
        simulation_sync_status: "synced",
        last_simulation_sync: now,
      })
      .eq("id", jobId);

    return row as CachedSnapshot;
  }

  /**
   * Get the latest cached snapshot for a job.
   * Returns null if no cache exists.
   */
  async getSnapshot(jobId: string): Promise<CachedSnapshot | null> {
    const { data, error } = await supabaseAdmin
      .from("snapshot_cache")
      .select("*")
      .eq("admin_job_id", jobId)
      .order("cached_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("SnapshotService.getSnapshot error:", error);
      throw new InternalError(error.message);
    }

    return (data as CachedSnapshot) ?? null;
  }

  /** Check if a snapshot is past its expiration time. */
  isExpired(snapshot: CachedSnapshot): boolean {
    return Date.now() > new Date(snapshot.expires_at).getTime();
  }

  /**
   * Request a simulation refresh for a job.
   * Sets the job's sync status to "pending" so a background process
   * or webhook can pick it up.
   */
  async refreshSnapshot(jobId: string): Promise<CachedSnapshot | null> {
    const { data: job } = await supabaseAdmin
      .from("admin_jobs")
      .select("id, simulation_job_id")
      .eq("id", jobId)
      .single();

    if (!job) throw new NotFoundError("Job", jobId);

    await supabaseAdmin
      .from("admin_jobs")
      .update({ simulation_sync_status: "pending" })
      .eq("id", jobId);

    // Return current snapshot (may be stale)
    return this.getSnapshot(jobId);
  }

  /** Delete all cached snapshots for a job. */
  async deleteSnapshot(jobId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("snapshot_cache")
      .delete()
      .eq("admin_job_id", jobId);

    if (error) {
      console.error("SnapshotService.deleteSnapshot error:", error);
      throw new InternalError(error.message);
    }
  }
}
