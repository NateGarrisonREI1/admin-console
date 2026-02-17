// src/app/api/generate-snapshot/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { generateAndSaveHesSnapshot } from "../../../lib/hes/generateHesSnapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function s(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

async function readJobId(request: Request) {
  const ct = s(request.headers.get("content-type")).toLowerCase();

  if (ct.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    return s((body as any)?.job_id).trim();
  }

  const formData = await request.formData();
  return s(formData.get("job_id")).trim();
}

export async function POST(request: Request) {
  try {
    const jobId = await readJobId(request);

    if (!jobId) {
      return NextResponse.json({ error: "Missing job_id" }, { status: 400 });
    }

    const admin = supabaseAdmin;

    // Optional sanity check: ensure job exists (keeps error messaging clean)
    const { data: job, error: jobErr } = await admin
      .from("admin_jobs")
      .select("id")
      .eq("id", jobId)
      .single();

    if (jobErr || !job) {
      return NextResponse.json(
        { error: `Job not found: ${jobErr?.message || "unknown"}` },
        { status: 404 }
      );
    }

    // ✅ Proper: parse + save snapshot via shared lib
    const { snapshotId, output } = await generateAndSaveHesSnapshot(admin, jobId);

    return NextResponse.json({
      success: true,
      message: "Snapshot preview generated (HES parse).",
      snapshotId,
      preview: output,
    });
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Internal server error: ${msg}` }, { status: 500 });
  }
}
