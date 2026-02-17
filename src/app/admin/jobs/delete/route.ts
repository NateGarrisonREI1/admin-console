import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

const BUCKET = "admin-attachments";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const jobId = String(body?.jobId || "").trim();

    if (!jobId) {
      return NextResponse.json({ ok: false, error: "Missing jobId" }, { status: 400 });
    }

    const admin = supabaseAdmin;

    // Grab file paths so we can delete storage objects best-effort
    const { data: fileRows, error: filesSelectErr } = await admin
      .from("admin_job_files")
      .select("file_path")
      .eq("job_id", jobId);

    if (filesSelectErr) {
      // Not fatal; keep going
      console.error("delete route: file select error:", filesSelectErr);
    }

    const paths = (fileRows ?? [])
      .map((r: any) => r.file_path)
      .filter(Boolean) as string[];

    // Delete child rows (DB)
    const { error: utilErr } = await admin.from("admin_job_utilities").delete().eq("job_id", jobId);
    if (utilErr) console.error("delete route: utilities delete error:", utilErr);

    const { error: sysErr } = await admin
      .from("admin_job_existing_systems")
      .delete()
      .eq("job_id", jobId);
    if (sysErr) console.error("delete route: systems delete error:", sysErr);

    const { error: filesErr } = await admin.from("admin_job_files").delete().eq("job_id", jobId);
    if (filesErr) console.error("delete route: files delete error:", filesErr);

    // Delete the job itself
    const { error: jobErr } = await admin.from("admin_jobs").delete().eq("id", jobId);
    if (jobErr) {
      console.error("delete route: job delete error:", jobErr);
      return NextResponse.json({ ok: false, error: "Failed to delete job" }, { status: 500 });
    }

    // Best-effort delete storage objects
    if (paths.length) {
      const { error: storageErr } = await admin.storage.from(BUCKET).remove(paths);
      if (storageErr) console.error("delete route: storage remove error:", storageErr);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("delete route: unexpected error:", e);
    return NextResponse.json({ ok: false, error: "Unexpected error" }, { status: 500 });
  }
}
