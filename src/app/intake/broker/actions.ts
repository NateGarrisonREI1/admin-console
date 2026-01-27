// src/app/intake/broker/actions.ts
"use server";

import { redirect } from "next/navigation";
import { supabaseAdmin } from "../../../lib/supabase/admin";

function safeName(n: string) {
  return n.replace(/[^\w.\-]+/g, "_");
}

function confirmationCode() {
  const a = Math.random().toString(36).slice(2, 6).toUpperCase();
  const b = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `REI-${a}${b}`;
}

function str(v: FormDataEntryValue | null) {
  return typeof v === "string" ? v.trim() : "";
}

function on(v: FormDataEntryValue | null) {
  const s = typeof v === "string" ? v.trim().toLowerCase() : "";
  return s === "1" || s === "true" || s === "on" || s === "yes";
}

const BUCKET = "job-files";

export async function submitBrokerIntake(formData: FormData) {
  const admin = supabaseAdmin();
  const code = confirmationCode();

  // Honeypot: if filled, silently accept
  const hp = str(formData.get("company"));
  if (hp) {
    redirect(`/intake/broker/success?code=${encodeURIComponent(code)}`);
  }

  // REQUIRED by DB schema
  const state = str(formData.get("state"));
  const zip = str(formData.get("zip"));
  if (!state || !zip) throw new Error("Broker intake requires state and zip.");

  // Property (also used by jobs list + console header)
  const address1 = str(formData.get("address1"));
  const address2 = str(formData.get("address2"));
  const city = str(formData.get("city"));

  // Broker / Client
  const broker_name = str(formData.get("broker_name"));
  const broker_email = str(formData.get("broker_email"));
  const broker_phone = str(formData.get("broker_phone"));
  const brokerage = str(formData.get("brokerage"));

  const client_name = str(formData.get("client_name"));
  const client_email = str(formData.get("client_email"));
  const client_phone = str(formData.get("client_phone"));

  // Timeline + notes
  const needed_by = str(formData.get("needed_by"));
  const listing_status = str(formData.get("listing_status"));
  const notes = str(formData.get("notes"));

  // Requested services from the pills (hidden inputs)
  const requested_outputs = [
    on(formData.get("want_snapshot")) ? "leaf_snapshot" : null,
    on(formData.get("want_inspection")) ? "inspection" : null,
    on(formData.get("want_hes")) ? "hes_report" : null,
  ].filter(Boolean) as string[];

  // Build structured intake payload (ContextRail expects broker/client objects)
  const raw = Object.fromEntries(formData.entries());

  const intake_payload: any = {
    // keep raw for debugging / future mapping
    raw,

    // structured blocks used by the admin console UI
    broker: {
      name: broker_name,
      email: broker_email,
      phone: broker_phone,
      brokerage,
    },
    client: {
      name: client_name,
      email: client_email,
      phone: client_phone,
    },
    timeline: {
      needed_by,
      listing_status,
    },
    notes,

    // also keep flat copies (your admin edit action writes these too)
    broker_name,
    broker_email,
    broker_phone,
    brokerage,
    client_name,
    client_email,
    client_phone,

    // optional: helpful for future debugging
    source: "broker_public",
    confirmation_code: code,
  };

  // Pick a display name for lists/headers
  const customer_name = client_name || broker_name || "Broker Intake";

  // Create job (IMPORTANT: requested_outputs + address fields)
  const { data: job, error: jobErr } = await admin
    .from("admin_jobs")
    .insert({
      source: "broker_public",
      intake_source: "broker_public",
      customer_type: "agent_broker",

      status: "new",
      response_status: "unreviewed",
      confirmation_code: code,

      customer_name,
      address1: address1 || null,
      address2: address2 || null,
      city: city || null,
      state,
      zip,

      // ✅ critical for scheduler + jobs list chips
      requested_outputs,

      // ✅ structured payload for ContextRail / console
      intake_payload,
    })
    .select("id")
    .single();

  if (jobErr || !job?.id) {
    throw new Error(`submitBrokerIntake: job insert failed: ${jobErr?.message ?? "unknown error"}`);
  }

  const jobId = job.id;

  // ✅ normalized requests table (what your new card reads)
  if (requested_outputs.length) {
    const rows = requested_outputs.map((k) => ({
      job_id: jobId,
      request_key: k,
      status: "requested",
    }));

    const { error: rErr } = await admin.from("admin_job_requests").insert(rows);
    if (rErr) {
      // don’t fail the intake if requests insert fails; log it loudly
      console.error("submitBrokerIntake: admin_job_requests insert failed", rErr);
    }
  }

  // Files (support input name="files" multiple)
  const files = (formData.getAll("files") || []).filter(Boolean) as File[];

  for (const file of files) {
    if (!file || typeof (file as any).name !== "string" || !(file as any).name) continue;

    const path = `broker/${jobId}/${Date.now()}_${safeName(file.name)}`;

    const { error: uploadErr } = await admin.storage.from(BUCKET).upload(path, file, {
      upsert: false,
      contentType: file.type || undefined,
    });

    if (uploadErr) {
      console.error("submitBrokerIntake: storage upload failed", uploadErr);
      continue;
    }

    const { error: metaErr } = await admin.from("admin_job_files").insert({
      job_id: jobId,

      // Canonical
      bucket: BUCKET,
      path,
      filename: file.name,
      content_type: file.type || null,
      size_bytes: file.size ?? null,
      uploaded_by: "broker_public",
      meta: { source: "broker_public" },

      // Legacy compatibility (if columns exist)
      storage_path: path,
      file_path: path,
      file_name: file.name,
      original_filename: file.name,
      mime_type: file.type || null,
      file_size_bytes: file.size ?? null,
      category: "broker",
    });

    if (metaErr) console.error("submitBrokerIntake: file meta insert failed", metaErr);
  }

  redirect(`/intake/broker/success?code=${encodeURIComponent(code)}`);
}
