import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function defaultTabForRole(role: string): string {
  switch (role) {
    case "contractor":
      return "/portal/leads";
    case "homeowner":
      return "/portal/home";
    default:
      // admin, rei_staff, hes_assessor, inspector, field_tech, affiliate
      return "/portal/schedule";
  }
}

export default async function PortalIndexPage() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) redirect("/login");

  const { data: profile } = await supabaseAdmin
    .from("app_profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  redirect(defaultTabForRole(profile?.role || "homeowner"));
}
