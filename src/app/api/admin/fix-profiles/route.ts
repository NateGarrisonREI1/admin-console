import { NextResponse } from "next/server";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";

export async function POST() {
  // Auth check — admin only
  const supabase = await supabaseServer();
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: prof } = await supabaseAdmin
    .from("app_profiles")
    .select("role")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (prof?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  // Find all profiles with null email
  const { data: nullProfiles, error: fetchErr } = await supabaseAdmin
    .from("app_profiles")
    .select("id")
    .is("email", null);

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  if (!nullProfiles || nullProfiles.length === 0) {
    return NextResponse.json({ fixed: 0, message: "No profiles with null email found." });
  }

  let fixed = 0;
  const errors: { id: string; error: string }[] = [];

  for (const profile of nullProfiles) {
    try {
      const { data: user, error: userErr } = await supabaseAdmin.auth.admin.getUserById(profile.id);
      if (userErr || !user?.user) {
        errors.push({ id: profile.id, error: userErr?.message || "Auth user not found" });
        continue;
      }

      const email = user.user.email;
      if (!email) {
        errors.push({ id: profile.id, error: "Auth user also has no email" });
        continue;
      }

      const { error: updateErr } = await supabaseAdmin
        .from("app_profiles")
        .update({ email })
        .eq("id", profile.id);

      if (updateErr) {
        errors.push({ id: profile.id, error: updateErr.message });
      } else {
        fixed++;
      }
    } catch (e) {
      errors.push({ id: profile.id, error: e instanceof Error ? e.message : "Unknown error" });
    }
  }

  return NextResponse.json({
    total_null_emails: nullProfiles.length,
    fixed,
    errors: errors.length > 0 ? errors : undefined,
    message: `Fixed ${fixed} of ${nullProfiles.length} profiles.`,
  });
}
