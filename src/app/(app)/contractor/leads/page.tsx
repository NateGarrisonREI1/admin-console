// src/app/contractor/leads/page.tsx
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

type Lead = {
  id: string;
  admin_job_id: string | null;
  status: string;
  price_cents: number | null;
  created_at: string;
  sold_at: string | null;
  sold_to_user_id: string | null;
  is_completed: boolean | null;

  location_city: string | null;
  location_state: string | null;
  location_zip: string | null;

  title: string | null;
  summary: string | null;

  public_details: any;
  private_details: any;
};

function money(cents?: number | null) {
  if (!cents || !Number.isFinite(cents)) return "—";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(cents / 100);
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function statusPill(status: string) {
  const s = String(status || "").toLowerCase();

  const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border";

  if (s === "refunded") return <span className={`${base} bg-rose-50 text-rose-700 border-rose-200`}>Refunded</span>;
  if (s === "expired") return <span className={`${base} bg-slate-100 text-slate-700 border-slate-200`}>Expired</span>;
  if (s === "cancelled") return <span className={`${base} bg-slate-100 text-slate-700 border-slate-200`}>Cancelled</span>;
  if (s === "open") return <span className={`${base} bg-emerald-50 text-emerald-700 border-emerald-200`}>Open</span>;

  // default “sold / purchased”
  return <span className={`${base} bg-blue-50 text-blue-700 border-blue-200`}>Purchased</span>;
}

function tabHref(view: string) {
  return view === "active" ? "/contractor/leads" : `/contractor/leads?view=${encodeURIComponent(view)}`;
}

export default async function ContractorMyLeadsPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string }>;
}) {
  const sp = searchParams ? await searchParams : undefined;
  const viewRaw = (sp?.view || "active").toLowerCase();
  const view: "active" | "completed" | "refunded" | "expired" =
    viewRaw === "completed" || viewRaw === "refunded" || viewRaw === "expired" ? (viewRaw as any) : "active";

  const supabase = await supabaseServer();

  // who is the logged-in contractor?
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold">My Leads</h1>
          <p className="mt-2 text-slate-600">Please log in to view purchased leads.</p>
          <div className="mt-4">
            <Link className="rounded-lg bg-slate-900 px-4 py-2 text-white" href="/login">
              Go to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Base query: only leads that belong to this contractor
  // NOTE: This relies on either:
  //  - RLS that allows sold_to_user_id = auth.uid()
  //  - OR your supabaseServer has permission (service role) (not recommended)
  let q = supabase
    .from("contractor_leads")
    .select(
      "id, admin_job_id, status, price_cents, created_at, sold_at, sold_to_user_id, is_completed, location_city, location_state, location_zip, title, summary, public_details, private_details"
    )
    .eq("sold_to_user_id", user.id)
    .order("sold_at", { ascending: false, nullsFirst: false })
    .limit(200);

  // Tabs:
  // - active: purchased, not completed, not refunded, not expired
  // - completed: is_completed = true
  // - refunded: status = refunded
  // - expired: status = expired (in case you ever show owned expirations)
  if (view === "completed") {
    q = q.eq("is_completed", true);
  } else if (view === "refunded") {
    q = q.eq("status", "refunded");
  } else if (view === "expired") {
    q = q.eq("status", "expired");
  } else {
    // active
    q = q.eq("is_completed", false).not("status", "in", "(refunded,expired,cancelled)");
  }

  const { data, error } = await q;

  const leads = (data ?? []) as Lead[];

  // quick counts for tabs (optional but nice)
  const { data: allMine } = await supabase
    .from("contractor_leads")
    .select("id, status, is_completed")
    .eq("sold_to_user_id", user.id);

  const all = (allMine ?? []) as Array<{ id: string; status: string; is_completed: boolean | null }>;
  const countActive = all.filter((l) => !l.is_completed && !["refunded", "expired", "cancelled"].includes(String(l.status))).length;
  const countCompleted = all.filter((l) => l.is_completed).length;
  const countRefunded = all.filter((l) => String(l.status) === "refunded").length;
  const countExpired = all.filter((l) => String(l.status) === "expired").length;

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Leads</h1>
            <p className="mt-1 text-sm text-slate-600">
              Purchased leads you can work, complete, and (later) request refunds on.
            </p>
            {error ? (
              <p className="mt-2 text-sm text-rose-600">Error loading leads: {String(error.message ?? error)}</p>
            ) : null}
          </div>

          <div className="flex gap-2">
            <Link
              href="/contractor/job-board"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              Open Job Board
            </Link>
            <Link
              href="/contractor"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              Home
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={tabHref("active")}
            className={`rounded-full px-4 py-2 text-sm font-semibold border transition-colors ${
              view === "active" ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200 hover:bg-slate-50"
            }`}
          >
            Active <span className="opacity-80">({countActive})</span>
          </Link>

          <Link
            href={tabHref("completed")}
            className={`rounded-full px-4 py-2 text-sm font-semibold border transition-colors ${
              view === "completed" ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200 hover:bg-slate-50"
            }`}
          >
            Completed <span className="opacity-80">({countCompleted})</span>
          </Link>

          <Link
            href={tabHref("refunded")}
            className={`rounded-full px-4 py-2 text-sm font-semibold border transition-colors ${
              view === "refunded" ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200 hover:bg-slate-50"
            }`}
          >
            Refunded <span className="opacity-80">({countRefunded})</span>
          </Link>

          <Link
            href={tabHref("expired")}
            className={`rounded-full px-4 py-2 text-sm font-semibold border transition-colors ${
              view === "expired" ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200 hover:bg-slate-50"
            }`}
          >
            Expired <span className="opacity-80">({countExpired})</span>
          </Link>
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {leads.length ? (
          leads.map((lead) => {
            const loc = [lead.location_city, lead.location_state, lead.location_zip].filter(Boolean).join(", ");

            return (
              <div key={lead.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold tracking-tight text-slate-900 truncate">
                        {lead.title || "Lead"}
                      </h3>
                      {statusPill(lead.status)}
                      {lead.is_completed ? (
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
                          Completed
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-1 text-sm text-slate-600">{loc || "—"}</div>

                    <div className="mt-2 text-sm text-slate-600">
                      {lead.summary?.trim() ? lead.summary : "No summary provided."}
                    </div>

                    <div className="mt-3 text-xs text-slate-500">
                      Purchased: <span className="font-semibold text-slate-700">{fmtDate(lead.sold_at)}</span>
                    </div>
                  </div>

                  <div className="w-full md:w-64">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs font-semibold text-slate-500">Paid</div>
                      <div className="mt-1 text-xl font-extrabold text-slate-900">{money(lead.price_cents)}</div>

                      <div className="mt-3 flex gap-2">
                        <Link
                          href={`/contractor/leads/${lead.id}`}
                          className="flex-1 rounded-lg bg-[#43a419] px-4 py-2 text-center text-sm font-bold text-white hover:bg-[#3a8f16]"
                        >
                          View Details →
                        </Link>
                      </div>

                      <div className="mt-3 text-xs text-slate-500">
                        Details include contact info (if unlocked).
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-10 text-center text-slate-600">
            <div className="text-lg font-bold">No leads in this view</div>
            <div className="mt-2 text-sm">
              Go to the{" "}
              <Link className="font-semibold text-[#43a419] underline" href="/contractor/job-board">
                Open Job Board
              </Link>{" "}
              to purchase leads.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
