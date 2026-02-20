import type { SupabaseClient } from "@supabase/supabase-js";

export type AppRole = "admin" | "rei_staff" | "broker" | "contractor" | "homeowner" | "affiliate";

export function defaultPathForRole(role: AppRole): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "rei_staff":
      return "/rei-team/dashboard";
    case "broker":
      return "/broker/dashboard";
    case "contractor":
      return "/contractor/dashboard";
    case "affiliate":
      return "/affiliate/dashboard";
    case "homeowner":
    default:
      return "/homeowner/dashboard";
  }
}

/**
 * Ensure the user has a profile row; create one if missing.
 * Returns the user role.
 */
export async function ensureProfileAndGetRole(
  supabase: SupabaseClient,
  userId: string
): Promise<AppRole> {
  // 1) Try fetch
  const { data: existing, error: selErr } = await supabase
    .from("app_profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (selErr) {
    // If RLS blocks or table missing, surface a useful error
    throw new Error(`Failed to read app_profiles: ${selErr.message}`);
  }

  if (existing?.role) return existing.role as AppRole;

  // 2) Get the auth user's email so we never create a profile without it
  const { data: authData } = await supabase.auth.getUser();
  const email = authData?.user?.email ?? null;

  // 3) Create default profile with email
  const { error: insErr } = await supabase.from("app_profiles").insert({
    id: userId,
    email,
  });
  if (insErr) throw new Error(`Failed to create app_profiles row: ${insErr.message}`);

  // 4) Fetch again
  const { data: created, error: sel2Err } = await supabase
    .from("app_profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (sel2Err) throw new Error(`Failed to re-read app_profiles: ${sel2Err.message}`);

  return (created.role as AppRole) || "homeowner";
}
