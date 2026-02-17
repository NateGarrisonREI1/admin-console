// src/app/(app)/contractor/job-board/page.tsx
export const dynamic = "force-dynamic";

import { supabaseServer } from "@/lib/supabase/server";

type LeadRow = {
  id: string;
  created_at: string;
  status: string | null;
  price_cents: number | null;

  expires_at: string | null;

  is_assigned_only: boolean | null;
  assigned_contractor_profile_id: string | null;

  system_catalog_id: string | null;

  location_city: string | null;
  location_state: string | null;
  location_zip: string | null;

  title: string | null;
  summary: string | null;
  public_details: any;
};

function money(cents?: number | null) {
  const v = typeof cents === "number" ? cents : 0;
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(v / 100);
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function outputsFromPublicDetails(details: any) {
  const arr = Array.isArray(details?.requested_outputs) ? details.requested_outputs.map(String) : [];
  const set = new Set(arr);
  return {
    snapshot: set.has("leaf_snapshot") || set.has("snapshot"),
    inspection: set.has("inspection"),
    hes: set.has("hes_report") || set.has("hes"),
  };
}

function chip(label: string, active: boolean) {
  const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border";
  if (active) {
    return (
      <span
        className={base}
        style={{
          background: "rgba(67,164,25,0.12)",
          color: "#43a419",
          borderColor: "rgba(67,164,25,0.30)",
        }}
      >
        {label}
      </span>
    );
  }
  return <span className={`${base} bg-slate-100 text-slate-700 border-slate-200`}>{label}</span>;
}

function isExpired(expires_at?: string | null) {
  if (!expires_at) return false;
  const t = new Date(expires_at).getTime();
  if (Number.isNaN(t)) return false;
  return t <= Date.now();
}

function expiresSoon(expires_at?: string | null) {
  if (!expires_at) return false;
  const t = new Date(expires_at).getTime();
  if (Number.isNaN(t)) return false;
  const hours = (t - Date.now()) / 36e5;
  return hours > 0 && hours <= 48;
}

function canSeeLead(lead: LeadRow, contractorProfileId: string | null) {
  if (lead.status !== "open") return false;
  if (isExpired(lead.expires_at)) return false;

  if (!lead.is_assigned_only) return true;

  // assigned-only rules
  if (!lead.assigned_contractor_profile_id) return false;
  if (!contractorProfileId) return false;
  return lead.assigned_contractor_profile_id === contractorProfileId;
}

export default async function ContractorJobBoardPage() {
  const supabase = await supabaseServer();

  // Identify current user (for assignment-only leads)
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        Error loading session: {userErr.message}
      </div>
    );
  }

  // Attempt to load contractor profile id (non-fatal if blocked)
  let contractorProfileId: string | null = null;
  let contractorRoleDetected = false;
  let profileLookupBlocked = false;

  if (user?.id) {
    const { data: profile, error: profileErr } = await supabase
      .from("app_profiles")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileErr) {
      // Keep board working; assigned-only won't show
      profileLookupBlocked = true;
      console.warn("job-board profileErr:", profileErr);
    } else if (profile?.id) {
      contractorRoleDetected = String(profile.role) === "contractor";
      if (contractorRoleDetected) contractorProfileId = profile.id;
    }
  }

  // Fetch open leads (RLS must allow this)
  const { data, error } = await supabase
    .from("contractor_leads")
    .select(
      `
      id,
      created_at,
      status,
      price_cents,
      expires_at,
      is_assigned_only,
      assigned_contractor_profile_id,
      system_catalog_id,
      location_city,
      location_state,
      location_zip,
      title,
      summary,
      public_details
    `
    )
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(200);

  const raw = (data ?? []) as LeadRow[];

  // Filter by visibility rules
  const leads = raw.filter((lead) => canSeeLead(lead, contractorProfileId));

  const assignedCount = leads.filter((l) => l.is_assigned_only).length;

  // If user is signed in but we couldn't confirm contractor identity,
  // assigned-only leads will be hidden.
  const assignedMayBeHidden =
    !!user?.id && (!contractorProfileId || !contractorRoleDetected || profileLookupBlocked);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Open Job Board</h1>
            <p className="mt-1.5 text-sm text-slate-600">
              Browse active homeowner requests and buy leads. (Checkout flow is next.)
            </p>

            {!user?.id && (
              <p className="mt-2 text-sm text-amber-700">
                You’re not signed in — assigned-only jobs won’t show. Sign in as a contractor to see
                assigned jobs.
              </p>
            )}

            {assignedMayBeHidden && (
              <p className="mt-2 text-sm text-amber-700">
                Assigned-only leads may be hidden for this account (contractor profile not detected).
                If this is wrong, we need to adjust RLS for <code className="font-mono">app_profiles</code>{" "}
                or your role field.
              </p>
            )}

            {error && (
              <p className="mt-2 text-sm text-red-600">
                Error loading leads: {String((error as any)?.message ?? error)}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-lg px-4 py-2.5 text-sm font-semibold bg-[#43a419]/10 text-[#2f7a10] border border-[#43a419]/20">
              {leads.length} Open
            </span>

            {assignedCount > 0 && (
              <span className="rounded-lg px-4 py-2.5 text-sm font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                {assignedCount} Assigned
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {leads.length ? (
          leads.map((lead) => {
            const outs = outputsFromPublicDetails(lead.public_details);
            const loc = [lead.location_city, lead.location_state, lead.location_zip]
              .filter(Boolean)
              .join(", ");
            const exp = lead.expires_at ? fmtDate(lead.expires_at) : null;

            return (
              <div key={lead.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold tracking-tight text-slate-900 truncate">
                        {lead.title || "Home Energy Upgrade Estimate"}
                      </h3>

                      {lead.is_assigned_only ? (
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border bg-slate-100 text-slate-700 border-slate-200">
                          Assigned
                        </span>
                      ) : null}

                      {expiresSoon(lead.expires_at) ? (
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border bg-amber-50 text-amber-800 border-amber-200">
                          Expiring soon
                        </span>
                      ) : null}

                      {chip("Snapshot", !!outs.snapshot)}
                      {chip("Inspection", !!outs.inspection)}
                      {chip("HES", !!outs.hes)}

                      <span className="ml-auto md:ml-0 text-xs text-slate-500">
                        Posted • {fmtDate(lead.created_at)}
                      </span>
                    </div>

                    <div className="mt-1 text-sm text-slate-600">{loc || "Location hidden"}</div>

                    {lead.summary ? (
                      <div className="mt-3 text-sm text-slate-700 leading-relaxed">{lead.summary}</div>
                    ) : (
                      <div className="mt-3 text-sm text-slate-500">No summary provided.</div>
                    )}

                    {exp ? (
                      <div className="mt-3 text-xs text-slate-500">Expires • {exp}</div>
                    ) : null}
                  </div>

                  <div className="flex flex-col items-stretch gap-2 w-full md:w-56">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="text-xs font-medium text-slate-500">Lead Price</div>
                      <div className="mt-0.5 text-xl font-bold text-slate-900">
                        {money(lead.price_cents)}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">Full details unlock after purchase</div>
                    </div>

                    <button
                      disabled
                      className="rounded-xl bg-[#43a419] px-4 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#3a8f16] transition-colors"
                      title="Checkout flow is next (Stripe)"
                    >
                      Buy Lead (next)
                    </button>

                    <div className="text-xs text-slate-500 text-center">
                      Next step: Stripe checkout + “unlock private details”.
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-10 text-center text-slate-500">
            No open leads yet. Create one from Admin → Projects → kebab → “Configure + Post Lead…”.
          </div>
        )}
      </div>
    </div>
  );
}
