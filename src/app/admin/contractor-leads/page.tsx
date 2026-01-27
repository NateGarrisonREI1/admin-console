// src/app/admin/contractor-leads/page.tsx
import AdminContractorLeadsConsole from "./_components/AdminContractorLeadsConsole";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";

const PAGE_SIZE = 20;

type SearchParams = {
  tab?: string; // "open" | "purchased"
  page?: string; // "1", "2", ...
};

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
  title: string | null;

  // IMPORTANT: contractor_leads does NOT have "location"
  // We build location from these:
  location_city: string | null;
  location_state: string | null;
  location_zip: string | null;

  status: string | null;
  price_cents: number | null;
  created_at: string | null;
  expires_at: string | null;
  sold_at: string | null;
  sold_to_user_id: string | null;
  assigned_to_user_id: string | null;
  removed_at: string | null;
  removed_reason: string | null;
};

export default async function AdminContractorLeadsPage(props: {
  searchParams?: SearchParams;
}) {
  await requireAdmin();

  const tabRaw = (props.searchParams?.tab || "open").toLowerCase();
  const tab: "open" | "purchased" =
    tabRaw === "purchased" ? "purchased" : "open";

  const pageNum = clampInt(
    parseInt(props.searchParams?.page || "1", 10) || 1,
    1,
    9999
  );
  const from = (pageNum - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const nowIso = new Date().toISOString();

  let q = supabaseAdmin
    .from("contractor_leads")
    .select(
      `
        id,
        title,
        location_city,
        location_state,
        location_zip,
        status,
        price_cents,
        created_at,
        expires_at,
        sold_at,
        sold_to_user_id,
        assigned_to_user_id,
        removed_at,
        removed_reason
      `,
      { count: "exact" }
    );

  if (tab === "open") {
    q = q
      .eq("status", "open")
      // open leads must not be expired
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order("created_at", { ascending: false });
  } else {
    q = q
      .eq("status", "sold")
      .order("sold_at", { ascending: false, nullsFirst: false });
  }

  const { data, count, error } = await q.range(from, to);

  if (error) throw new Error(error.message);

  const leadsDb = (data ?? []) as LeadRowDb[];

  // Shape to match AdminContractorLeadsConsole LeadRow type
  const leads = leadsDb.map((l) => ({
    id: l.id,
    title: l.title,
    location: fmtLocation(l),
    status: l.status,
    price_cents: l.price_cents,
    created_at: l.created_at,
    expires_at: l.expires_at,
    sold_at: l.sold_at,
    sold_to_user_id: l.sold_to_user_id,
    assigned_to_user_id: l.assigned_to_user_id,
    removed_at: l.removed_at,
    removed_reason: l.removed_reason,
  }));

  return (
    <AdminContractorLeadsConsole
      tab={tab}
      page={pageNum}
      pageSize={PAGE_SIZE}
      totalCount={count ?? 0}
      leads={leads}
    />
  );
}
