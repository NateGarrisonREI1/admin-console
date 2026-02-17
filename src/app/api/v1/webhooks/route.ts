// src/app/api/v1/webhooks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WEBHOOK_SECRET = process.env.CRON_SECRET ?? "";

type WebhookPayload = {
  event: "job-created" | "simulation-ready" | "hes-complete";
  data: Record<string, unknown>;
};

/**
 * POST /api/v1/webhooks
 * Receive webhook events from leaf-diagnose-sim-2.
 * Auth: X-Webhook-Secret header must match CRON_SECRET env var.
 *
 * Events:
 * - job-created: A new simulation job was created. Create/link admin job.
 * - simulation-ready: Simulation results are available. Cache snapshot.
 * - hes-complete: HES visit/report is complete. Update job status.
 */
export async function POST(req: NextRequest) {
  // Auth via shared secret
  const secret = req.headers.get("x-webhook-secret") ?? "";
  if (!WEBHOOK_SECRET || secret !== WEBHOOK_SECRET) {
    return NextResponse.json(
      { data: null, error: "Unauthorized", status: 401 },
      { status: 401 }
    );
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { data: null, error: "Invalid JSON body", status: 400 },
      { status: 400 }
    );
  }

  if (!payload.event || !payload.data) {
    return NextResponse.json(
      { data: null, error: "Missing event or data", status: 400 },
      { status: 400 }
    );
  }

  try {
    switch (payload.event) {
      case "job-created":
        return await handleJobCreated(payload.data);
      case "simulation-ready":
        return await handleSimulationReady(payload.data);
      case "hes-complete":
        return await handleHesComplete(payload.data);
      default:
        return NextResponse.json(
          { data: null, error: `Unknown event: ${payload.event}`, status: 400 },
          { status: 400 }
        );
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`Webhook ${payload.event} error:`, msg);
    return NextResponse.json(
      { data: null, error: msg, status: 500 },
      { status: 500 }
    );
  }
}

/**
 * job-created: Link or create an admin_job for a new simulation job.
 * Expected data: { simulation_job_id, customer_name?, state, zip, ... }
 */
async function handleJobCreated(data: Record<string, unknown>) {
  const simJobId = String(data.simulation_job_id ?? "").trim();
  if (!simJobId) {
    return NextResponse.json(
      { data: null, error: "simulation_job_id is required", status: 400 },
      { status: 400 }
    );
  }

  // Check if we already have a job linked to this simulation
  const { data: existing } = await supabaseAdmin
    .from("admin_jobs")
    .select("id")
    .eq("simulation_job_id", simJobId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { data: { admin_job_id: existing.id, linked: true }, error: null, status: 200 },
      { status: 200 }
    );
  }

  // Create a new admin job
  const state = String(data.state ?? "").trim().toUpperCase();
  const zip = String(data.zip ?? "").trim();

  if (!state || !zip) {
    return NextResponse.json(
      { data: null, error: "state and zip are required", status: 400 },
      { status: 400 }
    );
  }

  const { data: job, error } = await supabaseAdmin
    .from("admin_jobs")
    .insert({
      simulation_job_id: simJobId,
      simulation_sync_status: "pending",
      state,
      zip,
      customer_name: data.customer_name ? String(data.customer_name) : null,
      customer_email: data.customer_email ? String(data.customer_email) : null,
      customer_phone: data.customer_phone ? String(data.customer_phone) : null,
      address1: data.address1 ? String(data.address1) : null,
      city: data.city ? String(data.city) : null,
      status: "new",
    })
    .select("id")
    .single();

  if (error) throw error;

  return NextResponse.json(
    { data: { admin_job_id: job.id, created: true }, error: null, status: 201 },
    { status: 201 }
  );
}

/**
 * simulation-ready: Cache the simulation snapshot for a job.
 * Expected data: { simulation_job_id, admin_job_id?, snapshot_data }
 */
async function handleSimulationReady(data: Record<string, unknown>) {
  const simJobId = String(data.simulation_job_id ?? "").trim();
  const snapshotData = data.snapshot_data;

  if (!simJobId) {
    return NextResponse.json(
      { data: null, error: "simulation_job_id is required", status: 400 },
      { status: 400 }
    );
  }
  if (!snapshotData || typeof snapshotData !== "object") {
    return NextResponse.json(
      { data: null, error: "snapshot_data object is required", status: 400 },
      { status: 400 }
    );
  }

  // Find the admin job by simulation_job_id or admin_job_id
  let adminJobId = data.admin_job_id ? String(data.admin_job_id) : null;

  if (!adminJobId) {
    const { data: job } = await supabaseAdmin
      .from("admin_jobs")
      .select("id")
      .eq("simulation_job_id", simJobId)
      .maybeSingle();

    adminJobId = job?.id ?? null;
  }

  if (!adminJobId) {
    return NextResponse.json(
      { data: null, error: "No admin job found for this simulation", status: 404 },
      { status: 404 }
    );
  }

  // Upsert snapshot cache (replace any existing cache for this job)
  const now = new Date().toISOString();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { data: cache, error: cacheErr } = await supabaseAdmin
    .from("snapshot_cache")
    .upsert(
      {
        admin_job_id: adminJobId,
        simulation_job_id: simJobId,
        snapshot_data: snapshotData,
        cached_at: now,
        expires_at: expires,
      },
      { onConflict: "admin_job_id" }
    )
    .select("id")
    .single();

  if (cacheErr) {
    // Upsert on non-unique may fail; fall back to insert
    const { error: insErr } = await supabaseAdmin
      .from("snapshot_cache")
      .insert({
        admin_job_id: adminJobId,
        simulation_job_id: simJobId,
        snapshot_data: snapshotData,
        cached_at: now,
        expires_at: expires,
      });

    if (insErr) throw insErr;
  }

  // Update job sync status
  await supabaseAdmin
    .from("admin_jobs")
    .update({
      simulation_sync_status: "synced",
      last_simulation_sync: now,
    })
    .eq("id", adminJobId);

  return NextResponse.json(
    { data: { admin_job_id: adminJobId, cached: true }, error: null, status: 200 },
    { status: 200 }
  );
}

/**
 * hes-complete: Mark the HES visit as complete on the admin job.
 * Expected data: { admin_job_id OR simulation_job_id }
 */
async function handleHesComplete(data: Record<string, unknown>) {
  let adminJobId = data.admin_job_id ? String(data.admin_job_id) : null;
  const simJobId = data.simulation_job_id ? String(data.simulation_job_id) : null;

  if (!adminJobId && simJobId) {
    const { data: job } = await supabaseAdmin
      .from("admin_jobs")
      .select("id")
      .eq("simulation_job_id", simJobId)
      .maybeSingle();

    adminJobId = job?.id ?? null;
  }

  if (!adminJobId) {
    return NextResponse.json(
      { data: null, error: "admin_job_id or simulation_job_id is required", status: 400 },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from("admin_jobs")
    .update({ inspection_status: "complete" })
    .eq("id", adminJobId);

  if (error) throw error;

  // Log a system contact entry
  await supabaseAdmin.from("contact_log").insert({
    admin_job_id: adminJobId,
    contact_method: "system",
    direction: "inbound",
    subject: "HES visit completed",
    body: "HES visit marked as complete via webhook.",
    contacted_at: new Date().toISOString(),
  });

  return NextResponse.json(
    { data: { admin_job_id: adminJobId, hes_complete: true }, error: null, status: 200 },
    { status: 200 }
  );
}
