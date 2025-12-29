import Link from "next/link";
import { supabaseServer } from "../../../../lib/supabase/server";
import { toggleSystemActive } from "./actions";

const GREEN = "#43a419";

export default async function SystemDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = supabaseServer();

  const { data: system } = await supabase
    .from("system_catalog")
    .select(
      `
      id,
      display_name,
      system_type,
      description,
      manufacturer,
      model,
      fuel_type,
      is_active,
      created_at,
      updated_at
    `
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!system) {
    return (
      <div>
        <Link href="/admin/systems" style={{ color: GREEN, fontWeight: 900 }}>
          ← Back to Systems
        </Link>
        <p style={{ marginTop: 16, opacity: 0.75 }}>System not found.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Link href="/admin" style={{ color: GREEN, fontWeight: 900, textDecoration: "none" }}>
          Admin
        </Link>
        <span style={{ opacity: 0.6 }}> / </span>
        <Link href="/admin/systems" style={{ color: GREEN, fontWeight: 900, textDecoration: "none" }}>
          Systems
        </Link>
        <span style={{ opacity: 0.6 }}> / </span>
        <span style={{ fontWeight: 900 }}>{system.display_name ?? "System"}</span>
      </div>

      <h1 style={{ fontSize: 30, fontWeight: 900, marginBottom: 6 }}>
        {system.display_name ?? "(no display name)"}
      </h1>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <StatusPill active={!!system.is_active} />

        <form
          action={async () => {
            "use server";
            await toggleSystemActive(system.id, !system.is_active);
          }}
        >
          <button
            type="submit"
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: `1px solid rgba(67,164,25,0.45)`,
              background: "rgba(67,164,25,0.12)",
              color: GREEN,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Set {system.is_active ? "Inactive" : "Active"}
          </button>
        </form>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 12,
        }}
      >
        <Field label="System type" value={system.system_type} />
        <Field label="Manufacturer" value={system.manufacturer} />
        <Field label="Model" value={system.model} />
        <Field label="Fuel type" value={system.fuel_type} />
        <Field label="Description" value={system.description} wide />
        <Field label="Created" value={system.created_at} />
        <Field label="Updated" value={system.updated_at} />
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  wide,
}: {
  label: string;
  value?: string | null;
  wide?: boolean;
}) {
  return (
    <div
      style={{
        gridColumn: wide ? "1 / -1" : undefined,
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: 14,
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 6 }}>{label}</div>
      <div style={{ fontWeight: 800, color: "#0f172a" }}>{value || "-"}</div>
    </div>
  );
}

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

