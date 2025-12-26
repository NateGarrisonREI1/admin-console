import Link from "next/link";

export default function SnapshotsPage() {
  return (
    <div className="rei-card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>LEAF System Snapshots</div>
          <div style={{ color: "var(--muted)" }}>
            This page will list snapshots across jobs (Supabase later).
          </div>
        </div>

        <Link className="rei-btn rei-btnPrimary" href="/admin/jobs" style={{ textDecoration: "none" }}>
          Go to Jobs
        </Link>
      </div>

      <div style={{ height: 10 }} />
      <div style={{ color: "var(--muted)" }}>
        For now, create snapshots from a Job → Existing Systems → <b>Create Snapshot</b>.
      </div>
    </div>
  );
}
