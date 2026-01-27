// src/app/contractor/leads/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

function fmtJson(v: any) {
  try {
    return JSON.stringify(v ?? null, null, 2);
  } catch {
    return String(v);
  }
}

export default async function ContractorLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold">Lead Details</h1>
          <p className="mt-2 text-slate-600">Please log in to view lead details.</p>
          <div className="mt-4">
            <Link className="rounded-lg bg-slate-900 px-4 py-2 text-white" href="/login">
              Go to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { data, error } = await supabase
    .from("contractor_leads")
    .select("*")
    .eq("id", id)
    .eq("sold_to_user_id", user.id)
    .maybeSingle();

  if (error || !data) return notFound();

  const lead = data as any;

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/contractor/leads" className="text-sm font-semibold text-slate-700 hover:underline">
          ← Back to My Leads
        </Link>
        <Link href="/contractor/job-board" className="text-sm font-semibold text-[#43a419] hover:underline">
          Open Job Board
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{lead.title || "Lead"}</h1>
        <p className="mt-2 text-slate-600">{lead.summary || "No summary provided."}</p>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold text-slate-500">Status</div>
            <div className="mt-1 font-bold text-slate-900">{String(lead.status)}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold text-slate-500">Purchased</div>
            <div className="mt-1 font-bold text-slate-900">{lead.sold_at ? new Date(lead.sold_at).toLocaleString() : "—"}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold text-slate-500">Price</div>
            <div className="mt-1 font-bold text-slate-900">{lead.price_cents ? `$${(lead.price_cents / 100).toFixed(2)}` : "—"}</div>
          </div>
        </div>
      </div>

      {/* Public details */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Public details</h2>
        <pre className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs overflow-auto">
          {fmtJson(lead.public_details)}
        </pre>
      </div>

      {/* Private details (unlocked after purchase; should be present for your purchased leads flow) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Private details (unlocked)</h2>
        <p className="mt-1 text-sm text-slate-600">
          This is where contact info / address details show after purchase.
        </p>
        <pre className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs overflow-auto">
          {fmtJson(lead.private_details)}
        </pre>
      </div>
    </div>
  );
}
