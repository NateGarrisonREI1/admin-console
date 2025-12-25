import Link from "next/link";
import { MOCK_JOBS } from "../_data/mockJobs";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

export default function JobsPage() {
  return (
    <div className="rei-card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Jobs</div>
          <div style={{ color: "var(--muted)" }}>Select a job to manage systems + create LEAF snapshots</div>
        </div>

        <button className="rei-btn rei-btnPrimary" type="button" disabled>
          + Create Job
        </button>
      </div>

      <div style={{ height: 14 }} />

      <div style={{ border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1.4fr 1fr 0.8fr",
            gap: 10,
            padding: "12px 14px",
            background: "rgba(16,24,40,.03)",
            fontWeight: 900,
            fontSize: 12,
            color: "var(--muted)",
          }}
        >
          <div>Customer</div>
          <div>Address</div>
          <div>Report ID</div>
          <div>Updated</div>
        </div>

        {MOCK_JOBS.map((job) => (
          <Link
            key={job.id}
            href={`/admin/jobs/${job.id}`}
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 1.4fr 1fr 0.8fr",
              gap: 10,
              padding: "12px 14px",
              textDecoration: "none",
              color: "inherit",
              borderTop: "1px solid var(--border)",
            }}
          >
            <div style={{ fontWeight: 900 }}>{job.customerName}</div>
            <div style={{ color: "var(--muted)" }}>{job.address ?? "—"}</div>
            <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{job.reportId}</div>
            <div style={{ color: "var(--muted)" }}>{formatDate(job.createdAt)}</div>
          </Link>
        ))}
      </div>

      <div style={{ height: 10 }} />
      <div style={{ fontSize: 12, color: "var(--muted)" }}>
        Mock data for now. Next we’ll wire this to Supabase and enable <b>Create Job</b>.
      </div>
    </div>
  );
}
