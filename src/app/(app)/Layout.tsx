import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AppShell from "./_components/AppShell";
import { ensureProfileAndGetRole } from "@/lib/auth/role";
import { requirePortalRole } from "@/lib/auth/requireRole";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug?: string[] };
}) {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();

  if (!data?.user) redirect("/login");

  const role = await ensureProfileAndGetRole(
    supabase as any,
    data.user.id
  );

  // Determine which portal this request is for
  const pathname =
    typeof params?.slug?.[0] === "string"
      ? params.slug[0]
      : null;

  if (
    pathname === "broker" ||
    pathname === "contractor" ||
    pathname === "homeowner" ||
    pathname === "affiliate" ||
    pathname === "rei-team"
  ) {
    requirePortalRole(role, pathname);
  }

  return (
    <AppShell userEmail={data.user.email ?? null}>
      {children}
    </AppShell>
  );
}
