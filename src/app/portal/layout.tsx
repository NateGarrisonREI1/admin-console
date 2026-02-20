import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import PortalShell from "./_components/PortalShell";

export const dynamic = "force-dynamic";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) redirect("/login");

  const { data: profile } = await supabaseAdmin
    .from("app_profiles")
    .select("id, role, full_name, email")
    .eq("id", data.user.id)
    .single();

  if (!profile) redirect("/login");

  const role = profile.role || "homeowner";
  const name = profile.full_name || profile.email || "User";

  return (
    <PortalShell role={role} userName={name} userEmail={profile.email}>
      {children}
    </PortalShell>
  );
}
