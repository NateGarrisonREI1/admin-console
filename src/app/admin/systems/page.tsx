import Link from "next/link";
import { listSystems, listSystemTypes } from "../../../lib/data/systemCatalog";

const GREEN = "#43a419";

export default async function SystemsPage({
  searchParams,
}: {
  searchParams: { system_type?: string; active?: string; q?: string };
}) {
  const systemType = searchParams.system_type ?? "";
  const activeOnly = searchParams.active === "1";
  const q = searchParams.q ?? "";

  const [types, systems] = await Promise.all([
    listSystemTypes(),
    listSystems({
      systemType: systemType || undefined,
      activeOnly,
      search: q || undefined,
    }),
  ]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 4 }}>
            Systems
          </h1>
          <div style={{ opacity: 0.7 }}>
            Browse the System Catalog. Phase 3 allows toggling active status only.
          </div>
        </div>

        <div
          style={{
            fontSize: 12,
            opacity: 0.7,
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: 999,
            padding: "8px 10px",
            height: "fit-content",
          }}
        >
          {systems.length} system{systems.length === 1 ? "" : "s"}
        </div>
      </div>

      {/* Filters */}
      <form
        style={{
          marginTop: 16,
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "end",
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          padding: 14,
        }}
      >
        <div>
          <div style={{ fontSize: 12, opacity: 0.65, marginBottom: 4 }}>
            System type
          </div>
          <select
            name="system_type"
            defaultValue={systemType}
            style={{ padding: 8, borderRadius: 10, border: "1px solid #e5e7eb" }}
          >
            <option value="">All</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div style={{ fontSize: 12, opacity: 0.65, marginBottom: 4 }}>
            Search
          </div>
          <input
            name="q"
            defaultValue={q}
            placeholder="display name…"
            style={{
              padding: 8,
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              width: 260,
              maxWidth: "70vw",
            }}
          />
        </div>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" name="active" value="1" defaultChecked={activeOnly} />
          <span style={{ fontWeight: 700 }}>Active only</span>
        </label>

        <button
          type="submit"
          style={{
            padding: "9px 12px",
            borderRadius: 10,
            border: `1px solid rgba(67,164,25,0.45)`,
            background: "rgba(67,164,25,0.12)",
            color: GREEN,
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Apply
        </button>

        <Link href="/admin/systems" style={{ fontWeight: 800, color: GREEN }}>
          Clear
        </Link>
      </form>

      {/* Table */}
      <div
        style={{
          marginTop: 16,
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        {systems.length === 0 ? (
          <div style={{ padding: 16, opacity: 0.75 }}>No systems found.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th align="left" style={th}>Name</th>
                <th align="left" style={th}>Type</th>
                <th align="left" style={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {systems.map((s) => (
                <tr key={s.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                  <td style={td}>
                    <Link
                      href={`/admin/systems/${s.id}`}
                      style={{ fontWeight: 900, color: "#0f172a", textDecoration: "none" }}
                    >
                      {s.display_name ?? "(no name)"}
                    </Link>
                  </td>
                  <td style={td}>
                    <span style={{ opacity: 0.85 }}>{s.system_type ?? "-"}</span>
                  </td>
                  <td style={td}>
                    <StatusPill active={!!s.is_active} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const th: React.CSSProperties = {
  padding: "12px 14px",
  fontSize: 12,
  letterSpacing: 0.4,
  textTransform: "uppercase",
  opacity: 0.65,
};

const td: React.CSSProperties = {
  padding: "12px 14px",
};

function StatusPill({ active }: { active: boolean }) {
  if (active) {
    return (
      <span
        style={{
          fontSize: 12,
          fontWeight: 900,
          color: GREEN,
          background: "rgba(67,164,25,0.12)",
          border: "1px solid rgba(67,164,25,0.35)",
          padding: "4px 10px",
          borderRadius: 999,
        }}
      >
        Active
      </span>
    );
  }
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 900,
        color: "#64748b",
        background: "#f1f5f9",
        border: "1px solid #e5e7eb",
        padding: "4px 10px",
        borderRadius: 999,
      }}
    >
      Inactive
    </span>
  );
}

