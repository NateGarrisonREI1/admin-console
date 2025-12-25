import Link from "next/link";
import { MOCK_JOBS } from "../../_data/mockJobs";

export default function JobDetailPage({ params }: { params: { jobId: string } }) {
  const job = MOCK_JOBS.find((j) => j.id === params.jobId);

  if (!job) {
    return (
      <div className="rei-card">
        <div style={{ fontWeight: 900, fontSize: 16 }}>Job not found</div>
        <div style={{ color: "var(--muted)", marginTop: 6 }}>
          No mock job exists with id: <code>{params.jobId}</code>
        </div>
        <div style={{ marginTop: 12 }}>
          <Link href="/admin/jobs">← Back to Jobs</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* Header card */}
      <div className="rei-card">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>
              {job.customerName} — <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{job.reportId}</span>
            </div>
            <div style={{ color: "var(--muted)" }}>{job.address ?? "—"}</div>

            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 10, color: "var(--muted)", fontSize: 13 }}>
              <div><b style={{ color: "var(--text)" }}>Sq Ft:</b> {job.sqft ?? "—"}</div>
              <div><b style={{ color: "var(--text)" }}>Year Built:</b> {job.yearBuilt ?? "—"}</div>
              <div><b style={{ color: "var(--text)" }}>Systems:</b> {job.systems.length}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <Link className="rei-btn" href="/admin/jobs" style={{ textDecoration: "none", color: "inherit" }}>
              ← Jobs
            </Link>
            <button className="rei-btn rei-btnPrimary" type="button" disabled>
              Send Mock Report
            </button>
          </div>
        </div>
      </div>

      {/* Systems list */}
      <div className="rei-card">
        <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 10 }}>Existing Systems</div>

        <div style={{ border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.1fr 1.4fr 0.7fr 0.7fr 0.9fr 1fr",
              gap: 10,
              padding: "12px 14px",
              background: "rgba(16,24,40,.03)",
              fontWeight: 900,
              fontSize: 12,
              color: "var(--muted)",
            }}
          >
            <div>Type</div>
            <div>Subtype</div>
            <div>Age</div>
            <div>Operational</div>
            <div>Wear</div>
            <div />
          </div>

          {job.systems.map((s) => (
            <div
              key={s.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1.1fr 1.4fr 0.7fr 0.7fr 0.9fr 1fr",
                gap: 10,
                padding: "12px 14px",
                borderTop: "1px solid var(--border)",
                alignItems: "center",
              }}
            >
              <div style={{ fontWeight: 900 }}>{s.type}</div>
              <div style={{ color: "var(--muted)" }}>{s.subtype}</div>
              <div style={{ color: "var(--muted)" }}>{s.ageYears} yrs</div>
              <div style={{ color: "var(--muted)" }}>{s.operational}</div>
              <div style={{ color: "var(--muted)" }}>{s.wear}/5</div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <Link
                  className="rei-btn rei-btnPrimary"
                  href={`/admin/snapshots/new?jobId=${encodeURIComponent(job.id)}&systemId=${encodeURIComponent(s.id)}`}
                  style={{ textDecoration: "none" }}
                >
                  Create Snapshot
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: "var(--muted)" }}>
          Next: that “Create Snapshot” button will open your LEAF System Snapshot UI (using the system’s intake data).
        </div>
      </div>
    </div>
  );
}
