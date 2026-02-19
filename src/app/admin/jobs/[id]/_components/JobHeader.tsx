import Link from "next/link";
import DeleteJobInlineButton from "../../../_components/DeleteJobInlineButton";

type AdminJobForHeader = {
  id: string;
  created_at: string;
  status: string;

  customer_name?: string | null;
  customer_type?: string | null;

  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;

  inspection_status?: string | null;
  requested_outputs?: string[] | null;

  intake_payload?: any;
};

function fmtDate(ts: string) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

function customerTypeLabel(t?: string | null) {
  if (!t) return null;
  if (t === "homeowner") return "Homeowner";
  if (t === "agent_broker") return "Agent / Broker";
  if (t === "inspector") return "Inspector";
  return "Other";
}

function intentLabel(v: string) {
  if (v === "leaf_snapshot") return "LEAF Snapshot";
  if (v === "inspection") return "Inspection";
  if (v === "hes_report") return "HES Report";
  return v;
}

function chip(text: string) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        border: "1px solid #e5e7eb",
        borderRadius: 999,
        padding: "4px 10px",
        fontSize: 12,
        fontWeight: 900,
        background: "#fff",
      }}
    >
      {text}
    </span>
  );
}

function pill(status: string) {
  const live = status === "new" || status === "in_progress";
  return <span className={live ? "pill-live" : "pill-later"}>{status}</span>;
}

export default function JobHeader({
  job,
  jobId,
}: {
  job: AdminJobForHeader;
  jobId: string;
}) {
  const typeLabel = customerTypeLabel(job.customer_type);

  const locationLine = `${job.state ?? ""} ${job.zip ?? ""}`.trim();
  const addrLine = [job.address1, job.address2, job.city].filter(Boolean).join(", ");

  const intake = (job.intake_payload as any) || {};
  const brokerName = intake?.broker?.name || null;
  const inspectorName = intake?.inspector?.name || null;
  const otherDesc = intake?.other_customer_desc || null;

  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
      <div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>{job.customer_name || "Job"}</h1>
          {typeLabel && <span className="pill-live">{typeLabel}</span>}
          {pill(job.status)}
        </div>

        <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {(job.requested_outputs ?? []).map((o: string, idx: number) => (
  <span key={`${o}-${idx}`}>{chip(intentLabel(o))}</span>
))}
          {job.inspection_status === "has_report" && chip("Inspection exists")}
          {job.customer_type === "agent_broker" && brokerName && chip(`Broker: ${brokerName}`)}
          {job.customer_type === "inspector" && inspectorName && chip(`Inspector: ${inspectorName}`)}
          {job.customer_type === "other" && otherDesc && chip(`Other: ${otherDesc}`)}
        </div>

        <div style={{ marginTop: 8, fontSize: 13, opacity: 0.75 }}>
          {locationLine || "—"} • created: {fmtDate(job.created_at)}
        </div>
        {addrLine && <div style={{ marginTop: 4, fontSize: 13, opacity: 0.75 }}>{addrLine}</div>}
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <Link href="/admin/schedule" className="admin-btn" style={{ textDecoration: "none" }}>
          Back
        </Link>
        <Link href="/admin/intake" className="admin-btn" style={{ textDecoration: "none" }}>
          + New Job
        </Link>

        {/* ✅ Delete (client) */}
        <DeleteJobInlineButton
          jobId={jobId}
          label="Delete Job"
          compact={false}
          redirectTo="/admin/schedule"
        />
      </div>
    </div>
  );
}
