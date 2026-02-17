// src/app/admin/contractor-leads/page.tsx
import AdminContractorLeadsConsole from "./_components/AdminContractorLeadsConsole";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";

const PAGE_SIZE = 20;

type SearchParams = {
  tab?: string; // "open" | "purchased"
  page?: string; // "1", "2", ...
};

type Opt = { id: string; name: string };

async function requireAdmin() {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);

  const user = data.user;
  if (!user) throw new Error("Not authenticated");

  const { data: profile, error: pErr } = await supabase
    .from("app_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (pErr) throw new Error(pErr.message);
  if (profile?.role !== "admin") throw new Error("Not authorized");

  return { user };
}

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function fmtLocation(row: {
  location_city?: string | null;
  location_state?: string | null;
  location_zip?: string | null;
}) {
  const city = (row.location_city || "").trim();
  const state = (row.location_state || "").trim();
  const zip = (row.location_zip || "").trim();

  const left = [city, state].filter(Boolean).join(city && state ? ", " : "");
  const full = [left, zip].filter(Boolean).join(left && zip ? " " : "");
  return full || null;
}

type LeadRowDb = {
  id: string;
  admin_job_id: string | null;

  title: string | null;
  summary: string | null;

  location_city: string | null;
  location_state: string | null;
  location_zip: string | null;

  status: string | null;
  price_cents: number | null;
  created_at: string | null;
  expires_at: string | null;

  system_catalog_id: string | null;
  is_assigned_only: boolean | null;
  assigned_contractor_profile_id: string | null;

  sold_at: string | null;
  sold_to_user_id: string | null;

  removed_at: string | null;
  removed_reason: string | null;
};

export default async function AdminContractorLeadsPage(props: { searchParams?: SearchParams }) {
  await requireAdmin();

  const tabRaw = (props.searchParams?.tab || "open").toLowerCase();
  const tab: "open" | "purchased" = tabRaw === "purchased" ? "purchased" : "open";

  const pageNum = clampInt(parseInt(props.searchParams?.page || "1", 10) || 1, 1, 9999);
  const from = (pageNum - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const nowIso = new Date().toISOString();

  // 1) Leads list
  let q = supabaseAdmin
    .from("contractor_leads")
    .select(
      `
        id,
        admin_job_id,
        title,
        summary,
        location_city,
        location_state,
        location_zip,
        status,
        price_cents,
        created_at,
        expires_at,
        system_catalog_id,
        is_assigned_only,
        assigned_contractor_profile_id,
        sold_at,
        sold_to_user_id,
        removed_at,
        removed_reason
      `,
      { count: "exact" }
    );

  if (tab === "open") {
    q = q
      .eq("status", "open")
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order("created_at", { ascending: false });
  } else {
    q = q.eq("status", "sold").order("sold_at", { ascending: false, nullsFirst: false });
  }

  const { data, count, error } = await q.range(from, to);
  if (error) throw new Error(error.message);

  const leadsDb = (data ?? []) as LeadRowDb[];

  const leads = leadsDb.map((l) => ({
    id: l.id,
    admin_job_id: l.admin_job_id,
    title: l.title,
    summary: l.summary,
    location: fmtLocation(l),
    status: l.status,
    price_cents: l.price_cents,
    created_at: l.created_at,
    expires_at: l.expires_at,
    system_catalog_id: l.system_catalog_id,
    is_assigned_only: l.is_assigned_only,
    assigned_contractor_profile_id: l.assigned_contractor_profile_id,
    sold_at: l.sold_at,
    sold_to_user_id: l.sold_to_user_id,
    removed_at: l.removed_at,
    removed_reason: l.removed_reason,
  }));

  // 2) Contractor dropdown options (matches your app_profiles schema)
  const { data: contractorRows, error: cErr } = await supabaseAdmin
    .from("app_profiles")
    .select("id, role, first_name, last_name, phone")
    .eq("role", "contractor")
    .order("last_name", { ascending: true, nullsFirst: false })
    .limit(500);

  if (cErr) {
    // non-fatal
    console.warn("contractor dropdown load failed:", cErr);
  }

  const contractors: Opt[] = (contractorRows ?? []).map((r: any) => {
    const first = String(r.first_name || "").trim();
    const last = String(r.last_name || "").trim();
    const phone = String(r.phone || "").trim();
    const name = [first, last].filter(Boolean).join(" ") || phone || r.id;
    return { id: r.id, name };
  });

  // 3) System dropdown options
  let systems: Opt[] = [];
  try {
    const { data: systemRows } = await supabaseAdmin
      .from("system_catalog")
      .select("id, name, title")
      .order("name", { ascending: true, nullsFirst: false })
      .limit(500);

    systems = (systemRows ?? []).map((s: any) => ({
      id: s.id,
      name: String(s.name || s.title || s.id),
    }));
  } catch (e) {
    systems = [];
  }

  return (
    <AdminContractorLeadsConsole
      tab={tab}
      page={pageNum}
      pageSize={PAGE_SIZE}
      totalCount={count ?? 0}
      leads={leads}
      contractors={contractors}
      systems={systems}
    />
  );
}
