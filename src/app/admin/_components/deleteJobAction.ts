"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "../../../lib/supabase/admin";

export async function deleteJobAction(jobId: string) {
  const admin = supabaseAdmin();

  // Delete file metadata first
  const { error: filesErr } = await admin
    .from("admin_job_files")
    .delete()
    .eq("job_id", jobId);
  if (filesErr) throw filesErr;

  // Delete the job
  const { error: jobErr } = await admin.from("admin_jobs").delete().eq("id", jobId);
  if (jobErr) throw jobErr;

  // Bust cache for jobs list
  revalidatePath("/admin/jobs");
}

