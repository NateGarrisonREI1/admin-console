import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

type LeadRow = {
  id: string;
  created_at: string;
  status: string | null;
  price_cents: number | null;
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
      <span className={base} style={{ background: "rgba(67,164,25,0.12)", color: "#43a419", borderColor: "rgba(67,164,25,0.30)" }}>
        {label}
      </span>
    );
  }
  return <span className={`${base} bg-slate-100 text-slate-700 border-slate-200`}>{label}</span>;
}

export default async function ContractorJobBoardPage() {
  const supabase = await supabaseServer();

  // NOTE: this uses RLS (supabaseServer). If you want the board public later,
  // we’ll add a safe read-only view + policy.
  const { data, error } = await supabase
    .from("contractor_leads")
    .select("id, created_at, status, price_cents, location_city, location_state, location_zip, title, summary, public_details")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(200);

  const leads = (data ?? []) as LeadRow[];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Open Job Board</h1>
            <p className="mt-1.5 text-sm text-slate-600">
              Browse active homeowner requests and buy leads. (Checkout flow is next.)
            </p>
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
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {leads.length ? (
          leads.map((lead) => {
            const outs = outputsFromPublicDetails(lead.public_details);
            const loc = [lead.location_city, lead.location_state, lead.location_zip].filter(Boolean).join(", ");
            return (
              <div key={lead.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold tracking-tight text-slate-900 truncate">
                        {lead.title || "Home Energy Upgrade Estimate"}
                      </h3>
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
                  </div>

                  <div className="flex flex-col items-stretch gap-2 w-full md:w-56">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="text-xs font-medium text-slate-500">Lead Price</div>
                      <div className="mt-0.5 text-xl font-bold text-slate-900">
                        {money(lead.price_cents)}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Full details unlock after purchase
                      </div>
                    </div>

                    <button
                      disabled
                      className="rounded-xl bg-[#43a419] px-4 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#3a8f16] transition-colors"
                      title="Checkout flow is next (Stripe)"
                    >
                      Buy Lead (next)
                    </button>

                    <div className="text-xs text-slate-500 text-center">
                      Want this live? Next step is Stripe checkout + “unlock private details”.
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-10 text-center text-slate-500">
            No open leads yet. Create one from Admin → Projects → kebab → “Create Contractor Lead”.
          </div>
        )}
      </div>
    </div>
  );
}
