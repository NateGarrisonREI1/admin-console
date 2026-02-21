// src/app/(app)/broker/team/BrokerTeamClient.tsx
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { BrokerContractor } from "@/types/broker";
import type { ServiceCoverage, AddContractorInput, UpdateContractorInput } from "./actions";
import {
  addContractor,
  updateContractor,
  removeContractor,
  setPreferred,
} from "./actions";

// ─── Constants ──────────────────────────────────────────────────────

const SERVICE_TYPES = ["HVAC", "Solar", "Electrical", "Plumbing", "Insulation", "Windows", "Handyman", "Other"] as const;
const FILTER_TABS = ["All", ...SERVICE_TYPES.filter((t) => t !== "Other")] as const;
const SERVICE_AREAS = ["Portland Metro", "Salem", "Eugene", "Bend", "Statewide"] as const;

const SERVICE_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  HVAC: { bg: "rgba(239,68,68,0.12)", text: "#f87171", border: "rgba(239,68,68,0.25)" },
  Solar: { bg: "rgba(234,179,8,0.12)", text: "#facc15", border: "rgba(234,179,8,0.25)" },
  Electrical: { bg: "rgba(59,130,246,0.12)", text: "#60a5fa", border: "rgba(59,130,246,0.25)" },
  Plumbing: { bg: "rgba(6,182,212,0.12)", text: "#22d3ee", border: "rgba(6,182,212,0.25)" },
  Insulation: { bg: "rgba(168,85,247,0.12)", text: "#c084fc", border: "rgba(168,85,247,0.25)" },
  Windows: { bg: "rgba(20,184,166,0.12)", text: "#2dd4bf", border: "rgba(20,184,166,0.25)" },
  Handyman: { bg: "rgba(249,115,22,0.12)", text: "#fb923c", border: "rgba(249,115,22,0.25)" },
  Other: { bg: "rgba(148,163,184,0.12)", text: "#94a3b8", border: "rgba(148,163,184,0.25)" },
};

// ─── Props ──────────────────────────────────────────────────────────

type Props = {
  contractors: BrokerContractor[];
  coverage: ServiceCoverage[];
};

// ─── Empty form state ───────────────────────────────────────────────

const emptyForm = (): AddContractorInput => ({
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  website: "",
  serviceTypes: [],
  serviceAreas: [],
  notes: "",
});

// ─── Component ──────────────────────────────────────────────────────

export default function BrokerTeamClient({ contractors: initial, coverage: initialCoverage }: Props) {
  const router = useRouter();
  const [contractors, setContractors] = useState(initial);
  const [coverage, setCoverage] = useState(initialCoverage);
  const [filter, setFilter] = useState("All");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingContractor, setEditingContractor] = useState<BrokerContractor | null>(null);
  const [removingContractor, setRemovingContractor] = useState<BrokerContractor | null>(null);
  const [form, setForm] = useState<AddContractorInput>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Filtered contractors
  const filtered = filter === "All"
    ? contractors
    : contractors.filter((c) => (c.service_types ?? []).includes(filter));

  // ── Handlers ──────────────────────────────────────────────────────

  const refresh = useCallback(() => router.refresh(), [router]);

  const openAdd = () => {
    setForm(emptyForm());
    setError("");
    setShowAddModal(true);
  };

  const openEdit = (c: BrokerContractor) => {
    setForm({
      companyName: c.company_name ?? "",
      contactName: c.contractor_name,
      email: c.contractor_email ?? "",
      phone: c.contractor_phone ?? "",
      website: c.website ?? "",
      serviceTypes: c.service_types ?? [],
      serviceAreas: c.service_areas ?? [],
      notes: c.notes ?? "",
    });
    setError("");
    setEditingContractor(c);
  };

  const closeModals = () => {
    setShowAddModal(false);
    setEditingContractor(null);
    setRemovingContractor(null);
    setError("");
  };

  const handleAdd = async () => {
    setSaving(true);
    setError("");
    const result = await addContractor(form);
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setContractors((prev) => [result.contractor, ...prev]);
    updateCoverage([result.contractor, ...contractors]);
    closeModals();
  };

  const handleUpdate = async () => {
    if (!editingContractor) return;
    setSaving(true);
    setError("");
    const result = await updateContractor({ ...form, id: editingContractor.id });
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setContractors((prev) => prev.map((c) => (c.id === editingContractor.id ? result.contractor : c)));
    updateCoverage(contractors.map((c) => (c.id === editingContractor.id ? result.contractor : c)));
    closeModals();
  };

  const handleRemove = async () => {
    if (!removingContractor) return;
    setSaving(true);
    const result = await removeContractor(removingContractor.id);
    setSaving(false);
    if (!result.success) return;
    const updated = contractors.filter((c) => c.id !== removingContractor.id);
    setContractors(updated);
    updateCoverage(updated);
    closeModals();
  };

  const handleSetPreferred = async (c: BrokerContractor, serviceType: string) => {
    const result = await setPreferred(c.id, serviceType);
    if (!result.success) return;
    // Optimistically update: unset preferred on others with same service type, set on this one
    setContractors((prev) =>
      prev.map((item) => {
        if (item.id === c.id) return { ...item, is_preferred: true };
        if (item.is_preferred && (item.service_types ?? []).includes(serviceType)) {
          return { ...item, is_preferred: false };
        }
        return item;
      }),
    );
  };

  const updateCoverage = (list: BrokerContractor[]) => {
    const allTypes = ["HVAC", "Solar", "Electrical", "Plumbing", "Insulation", "Windows", "Handyman"];
    const covered = new Set<string>();
    for (const c of list) {
      for (const st of c.service_types ?? []) covered.add(st);
    }
    setCoverage(allTypes.map((type) => ({ type, covered: covered.has(type) })));
  };

  const toggleServiceType = (type: string) => {
    setForm((prev) => ({
      ...prev,
      serviceTypes: prev.serviceTypes.includes(type)
        ? prev.serviceTypes.filter((t) => t !== type)
        : [...prev.serviceTypes, type],
    }));
  };

  const toggleServiceArea = (area: string) => {
    setForm((prev) => ({
      ...prev,
      serviceAreas: prev.serviceAreas.includes(area)
        ? prev.serviceAreas.filter((a) => a !== area)
        : [...prev.serviceAreas, area],
    }));
  };

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 960 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>My Team</h1>
        <button
          onClick={openAdd}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            background: "#10b981",
            color: "#fff",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            transition: "background 0.15s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#059669"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#10b981"; }}
        >
          <PlusIcon style={{ width: 16, height: 16 }} />
          Add Contractor
        </button>
      </div>
      <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 20px" }}>
        Your go-to contractors. When you claim a lead, route it to your team.
      </p>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        {FILTER_TABS.map((tab) => {
          const active = filter === tab;
          return (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              style={{
                padding: "6px 14px",
                borderRadius: 9999,
                border: active ? "1px solid rgba(16,185,129,0.4)" : "1px solid #334155",
                background: active ? "rgba(16,185,129,0.12)" : "transparent",
                color: active ? "#10b981" : "#94a3b8",
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Contractors List */}
      {filtered.length === 0 ? (
        <EmptyState onAdd={openAdd} hasAny={contractors.length > 0} filter={filter} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((c) => (
            <ContractorCard
              key={c.id}
              contractor={c}
              onEdit={() => openEdit(c)}
              onRemove={() => setRemovingContractor(c)}
              onSetPreferred={(serviceType) => handleSetPreferred(c, serviceType)}
            />
          ))}
        </div>
      )}

      {/* Service Coverage */}
      <ServiceCoverageSection coverage={coverage} />

      {/* Add Modal */}
      {showAddModal && (
        <ContractorModal
          title="Add Contractor"
          submitLabel="Add to Team"
          form={form}
          error={error}
          saving={saving}
          onClose={closeModals}
          onSubmit={handleAdd}
          onToggleServiceType={toggleServiceType}
          onToggleServiceArea={toggleServiceArea}
          onFieldChange={(field, value) => setForm((prev) => ({ ...prev, [field]: value }))}
        />
      )}

      {/* Edit Modal */}
      {editingContractor && (
        <ContractorModal
          title="Edit Contractor"
          submitLabel="Save Changes"
          form={form}
          error={error}
          saving={saving}
          onClose={closeModals}
          onSubmit={handleUpdate}
          onToggleServiceType={toggleServiceType}
          onToggleServiceArea={toggleServiceArea}
          onFieldChange={(field, value) => setForm((prev) => ({ ...prev, [field]: value }))}
        />
      )}

      {/* Remove Confirmation */}
      {removingContractor && (
        <ConfirmRemoveModal
          contractor={removingContractor}
          saving={saving}
          onClose={closeModals}
          onConfirm={handleRemove}
        />
      )}
    </div>
  );
}

// ─── Contractor Card ────────────────────────────────────────────────

function ContractorCard({
  contractor: c,
  onEdit,
  onRemove,
  onSetPreferred,
}: {
  contractor: BrokerContractor;
  onEdit: () => void;
  onRemove: () => void;
  onSetPreferred: (serviceType: string) => void;
}) {
  return (
    <div
      style={{
        background: "#1e293b",
        border: "1px solid #334155",
        borderRadius: 12,
        padding: 20,
      }}
    >
      {/* Top row: company name + preferred badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 17, fontWeight: 700, color: "#f1f5f9" }}>
          {c.company_name || c.contractor_name}
        </span>
        {c.is_preferred && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 10px",
              borderRadius: 9999,
              fontSize: 11,
              fontWeight: 700,
              color: "#fbbf24",
              background: "rgba(251,191,36,0.10)",
              border: "1px solid rgba(251,191,36,0.25)",
            }}
          >
            &#9733; Preferred
          </span>
        )}
      </div>

      {/* Service type badges */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {(c.service_types ?? []).map((type) => {
          const colors = SERVICE_TYPE_COLORS[type] ?? SERVICE_TYPE_COLORS.Other;
          return (
            <span
              key={type}
              style={{
                padding: "3px 10px",
                borderRadius: 9999,
                fontSize: 11,
                fontWeight: 600,
                color: colors.text,
                background: colors.bg,
                border: `1px solid ${colors.border}`,
              }}
            >
              {type}
            </span>
          );
        })}
      </div>

      {/* Contact info */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 13, color: "#94a3b8", marginBottom: 10 }}>
        {c.company_name && c.contractor_name && (
          <span>{c.contractor_name}</span>
        )}
        {c.contractor_email && <span>{c.contractor_email}</span>}
        {c.contractor_phone && <span>{c.contractor_phone}</span>}
        {c.website && (
          <a href={c.website.startsWith("http") ? c.website : `https://${c.website}`} target="_blank" rel="noopener noreferrer" style={{ color: "#38bdf8", textDecoration: "none" }}>
            {c.website}
          </a>
        )}
      </div>

      {/* Service areas */}
      {(c.service_areas ?? []).length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {c.service_areas.map((area) => (
            <span
              key={area}
              style={{
                padding: "2px 8px",
                borderRadius: 6,
                fontSize: 11,
                color: "#64748b",
                background: "rgba(148,163,184,0.06)",
                border: "1px solid rgba(148,163,184,0.12)",
              }}
            >
              {area}
            </span>
          ))}
        </div>
      )}

      {/* Stats row */}
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 14 }}>
        Jobs routed: {c.leads_routed ?? 0} &nbsp;|&nbsp; Completed: {c.leads_completed ?? 0}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {!c.is_preferred && (c.service_types ?? []).length > 0 && (
          <button
            onClick={() => onSetPreferred(c.service_types[0])}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid rgba(251,191,36,0.3)",
              background: "rgba(251,191,36,0.08)",
              color: "#fbbf24",
              fontWeight: 600,
              fontSize: 12,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(251,191,36,0.15)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(251,191,36,0.08)"; }}
          >
            &#9733; Set as Preferred
          </button>
        )}
        <button
          onClick={onEdit}
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid #334155",
            background: "transparent",
            color: "#94a3b8",
            fontWeight: 600,
            fontSize: 12,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(148,163,184,0.08)"; e.currentTarget.style.color = "#cbd5e1"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8"; }}
        >
          Edit
        </button>
        <button
          onClick={onRemove}
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid rgba(239,68,68,0.25)",
            background: "transparent",
            color: "#f87171",
            fontWeight: 600,
            fontSize: 12,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────────────

function EmptyState({ onAdd, hasAny, filter }: { onAdd: () => void; hasAny: boolean; filter: string }) {
  if (hasAny) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: "#64748b", fontSize: 14 }}>
        No contractors match the &quot;{filter}&quot; filter.
      </div>
    );
  }

  return (
    <div
      style={{
        textAlign: "center",
        padding: 48,
        background: "#1e293b",
        border: "1px solid #334155",
        borderRadius: 12,
      }}
    >
      <p style={{ color: "#94a3b8", fontSize: 15, marginBottom: 20, maxWidth: 420, margin: "0 auto 20px" }}>
        Build your contractor network. When LEAF reports generate leads, you&apos;ll route them to your team.
      </p>
      <button
        onClick={onAdd}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "10px 20px",
          borderRadius: 8,
          border: "none",
          background: "#10b981",
          color: "#fff",
          fontWeight: 700,
          fontSize: 14,
          cursor: "pointer",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "#059669"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "#10b981"; }}
      >
        <PlusIcon style={{ width: 16, height: 16 }} />
        Add Your First Contractor
      </button>
    </div>
  );
}

// ─── Service Coverage Section ───────────────────────────────────────

function ServiceCoverageSection({ coverage }: { coverage: ServiceCoverage[] }) {
  const missing = coverage.filter((c) => !c.covered);

  return (
    <div
      style={{
        marginTop: 28,
        padding: 20,
        background: "#1e293b",
        border: "1px solid #334155",
        borderRadius: 12,
      }}
    >
      <h3 style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", marginBottom: 14 }}>
        Service Coverage
      </h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {coverage.map((c) => (
          <span
            key={c.type}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 12px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              color: c.covered ? "#10b981" : "#f87171",
              background: c.covered ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.06)",
              border: c.covered ? "1px solid rgba(16,185,129,0.2)" : "1px solid rgba(239,68,68,0.15)",
            }}
          >
            {c.covered ? "\u2611" : "\u2612"} {c.type}
          </span>
        ))}
      </div>
      {missing.length > 0 && (
        <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 12, margin: "12px 0 0" }}>
          {"\uD83D\uDCA1"} Add {missing.map((m) => m.type.toLowerCase()).join(" and ")} contractors to capture more leads from your LEAF reports.
        </p>
      )}
    </div>
  );
}

// ─── Contractor Modal (Add / Edit) ─────────────────────────────────

function ContractorModal({
  title,
  submitLabel,
  form,
  error,
  saving,
  onClose,
  onSubmit,
  onToggleServiceType,
  onToggleServiceArea,
  onFieldChange,
}: {
  title: string;
  submitLabel: string;
  form: AddContractorInput;
  error: string;
  saving: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onToggleServiceType: (type: string) => void;
  onToggleServiceArea: (area: string) => void;
  onFieldChange: (field: keyof AddContractorInput, value: string) => void;
}) {
  return (
    <Overlay onClose={onClose}>
      <div
        style={{
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: 12,
          padding: 24,
          width: "100%",
          maxWidth: 500,
          maxHeight: "85vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}>
            <XMarkIcon style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {error && (
          <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", fontSize: 13, marginBottom: 14 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <FieldInput label="Company Name *" value={form.companyName} onChange={(v) => onFieldChange("companyName", v)} />
          <FieldInput label="Contact Name *" value={form.contactName} onChange={(v) => onFieldChange("contactName", v)} />
          <FieldInput label="Email *" value={form.email} onChange={(v) => onFieldChange("email", v)} type="email" />
          <FieldInput label="Phone" value={form.phone} onChange={(v) => onFieldChange("phone", v)} type="tel" />
          <FieldInput label="Website" value={form.website} onChange={(v) => onFieldChange("website", v)} />

          {/* Service Types */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 6, display: "block" }}>
              Service Types
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {SERVICE_TYPES.map((type) => {
                const selected = form.serviceTypes.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => onToggleServiceType(type)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      border: selected ? "1px solid rgba(16,185,129,0.4)" : "1px solid #334155",
                      background: selected ? "rgba(16,185,129,0.12)" : "transparent",
                      color: selected ? "#10b981" : "#94a3b8",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Service Areas */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 6, display: "block" }}>
              Service Areas
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {SERVICE_AREAS.map((area) => {
                const selected = form.serviceAreas.includes(area);
                return (
                  <button
                    key={area}
                    type="button"
                    onClick={() => onToggleServiceArea(area)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      border: selected ? "1px solid rgba(16,185,129,0.4)" : "1px solid #334155",
                      background: selected ? "rgba(16,185,129,0.12)" : "transparent",
                      color: selected ? "#10b981" : "#94a3b8",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {area}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 6, display: "block" }}>
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => onFieldChange("notes", e.target.value)}
              rows={3}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #334155",
                background: "#0f172a",
                color: "#f1f5f9",
                fontSize: 13,
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid #334155",
              background: "transparent",
              color: "#94a3b8",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={saving}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              border: "none",
              background: saving ? "#334155" : "#10b981",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Saving..." : submitLabel}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

// ─── Confirm Remove Modal ───────────────────────────────────────────

function ConfirmRemoveModal({
  contractor,
  saving,
  onClose,
  onConfirm,
}: {
  contractor: BrokerContractor;
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const name = contractor.company_name || contractor.contractor_name;

  return (
    <Overlay onClose={onClose}>
      <div
        style={{
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: 12,
          padding: 24,
          width: "100%",
          maxWidth: 400,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", marginBottom: 12 }}>
          Remove {name}?
        </h2>
        <p style={{ fontSize: 14, color: "#94a3b8", marginBottom: 20 }}>
          Remove {name} from your team? This contractor will no longer receive routed leads.
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid #334155",
              background: "transparent",
              color: "#94a3b8",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              border: "none",
              background: saving ? "#334155" : "#ef4444",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Removing..." : "Remove"}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

// ─── Shared UI ──────────────────────────────────────────────────────

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      {children}
    </div>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 6, display: "block" }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "8px 12px",
          borderRadius: 8,
          border: "1px solid #334155",
          background: "#0f172a",
          color: "#f1f5f9",
          fontSize: 13,
          outline: "none",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}
