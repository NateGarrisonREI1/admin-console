// src/app/admin/network/NetworkClient.tsx
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { NetworkData, NetworkPartner } from "./actions";
import { addNetworkPartner, removeNetworkPartner, updateNetworkPartnerStatus } from "./actions";

// ─── Design tokens ──────────────────────────────────────────────────
const CARD = "#1e293b";
const BORDER = "#334155";
const TEXT = "#f1f5f9";
const TEXT_SEC = "#cbd5e1";
const TEXT_DIM = "#64748b";
const TEXT_MUTED = "#94a3b8";
const EMERALD = "#10b981";
const BG = "#0f172a";

type FilterType = "all" | "contractor" | "hes_assessor" | "inspector";

const TYPE_LABELS: Record<string, string> = {
  contractor: "Contractor",
  hes_assessor: "HES Assessor",
  inspector: "Inspector",
};

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  contractor: { bg: "rgba(16,185,129,0.15)", text: "#10b981" },
  hes_assessor: { bg: "rgba(59,130,246,0.15)", text: "#3b82f6" },
  inspector: { bg: "rgba(245,158,11,0.15)", text: "#f59e0b" },
};

const SERVICE_AREAS = ["Portland Metro", "Salem", "Eugene", "Bend", "Medford", "Corvallis"];
const SERVICE_TYPES = ["HVAC", "Solar", "Water Heater", "Electrical", "Plumbing", "Insulation", "Windows", "Handyman"];

// ─── KPI Card ───────────────────────────────────────────────────────

function KpiCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 14px" }}>
      <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color, marginTop: 2 }}>{value}</div>
    </div>
  );
}

// ─── Toast ──────────────────────────────────────────────────────────

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 100,
      padding: "12px 20px", borderRadius: 10,
      background: EMERALD, color: "#fff",
      fontWeight: 700, fontSize: 13,
      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
    }}>
      {message}
    </div>
  );
}

// ─── Modal Overlay ──────────────────────────────────────────────────

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9990,
        background: "rgba(0,0,0,0.5)",
        display: "flex", justifyContent: "center", alignItems: "center",
        padding: 24,
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 520 }}>
        {children}
      </div>
    </div>
  );
}

// ─── Add to Network Modal ───────────────────────────────────────────

function AddNetworkModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [memberType, setMemberType] = useState("contractor");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [selectedAreas, setSelectedAreas] = useState<Set<string>>(new Set());
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleArea(area: string) {
    setSelectedAreas((prev) => {
      const next = new Set(prev);
      next.has(area) ? next.delete(area) : next.add(area);
      return next;
    });
  }

  function toggleService(svc: string) {
    setSelectedServices((prev) => {
      const next = new Set(prev);
      next.has(svc) ? next.delete(svc) : next.add(svc);
      return next;
    });
  }

  async function handleSubmit() {
    if (!name.trim()) { setError("Name is required."); return; }
    setSaving(true);
    setError(null);
    const result = await addNetworkPartner({
      name: name.trim(),
      member_type: memberType,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      company_name: companyName.trim() || undefined,
      service_areas: [...selectedAreas],
      services: [...selectedServices],
      notes: notes.trim() || undefined,
    });
    setSaving(false);
    if (result.success) {
      onAdded();
    } else {
      setError(result.error || "Failed to add partner.");
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px", borderRadius: 8,
    border: `1px solid ${BORDER}`, background: BG, color: TEXT,
    fontSize: 13, outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: TEXT_MUTED, marginBottom: 4, display: "block",
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: TEXT, margin: "0 0 16px" }}>Add to Network</h2>

        {error && (
          <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.1)", color: "#ef4444", fontSize: 12, fontWeight: 600, marginBottom: 12 }}>
            {error}
          </div>
        )}

        {/* Type */}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Type</label>
          <div style={{ display: "flex", gap: 0, background: BG, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: "hidden", width: "fit-content" }}>
            {(["contractor", "hes_assessor", "inspector"] as const).map((t, idx, arr) => {
              const active = memberType === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setMemberType(t)}
                  style={{
                    padding: "6px 14px", border: "none",
                    borderRight: idx < arr.length - 1 ? `1px solid ${BORDER}` : "none",
                    background: active ? "rgba(16,185,129,0.1)" : "transparent",
                    color: active ? EMERALD : TEXT_MUTED,
                    fontSize: 12, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  {TYPE_LABELS[t]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Name + Company */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Company</label>
            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Company name" style={inputStyle} />
          </div>
        </div>

        {/* Email + Phone */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="555-555-5555" style={inputStyle} />
          </div>
        </div>

        {/* Service Areas */}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Service Areas</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {SERVICE_AREAS.map((area) => {
              const active = selectedAreas.has(area);
              return (
                <button
                  key={area}
                  type="button"
                  onClick={() => toggleArea(area)}
                  style={{
                    padding: "5px 12px", borderRadius: 9999,
                    fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer",
                    background: active ? EMERALD : "#334155",
                    color: active ? "#fff" : TEXT_SEC,
                  }}
                >
                  {area}
                </button>
              );
            })}
          </div>
        </div>

        {/* Services */}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Services</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {SERVICE_TYPES.map((svc) => {
              const active = selectedServices.has(svc);
              return (
                <button
                  key={svc}
                  type="button"
                  onClick={() => toggleService(svc)}
                  style={{
                    padding: "5px 12px", borderRadius: 9999,
                    fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer",
                    background: active ? EMERALD : "#334155",
                    color: active ? "#fff" : TEXT_SEC,
                  }}
                >
                  {svc}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes..."
            rows={2}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 16px", borderRadius: 8, border: `1px solid ${BORDER}`,
              background: "transparent", color: TEXT_MUTED, fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !name.trim()}
            style={{
              padding: "8px 16px", borderRadius: 8, border: "none",
              background: EMERALD, color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
              opacity: saving || !name.trim() ? 0.5 : 1,
            }}
          >
            {saving ? "Adding..." : "Add Partner"}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export default function NetworkClient({ data }: { data: NetworkData }) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const filteredPartners = useMemo(() => {
    let list = data.partners;
    if (filter !== "all") {
      list = list.filter((p) => p.member_type === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.email && p.email.toLowerCase().includes(q)) ||
          (p.company_name && p.company_name.toLowerCase().includes(q))
      );
    }
    return list;
  }, [data.partners, filter, search]);

  const handleRowClick = useCallback(() => {
    setToast("Detail page coming soon");
  }, []);

  function handleRefresh() { router.refresh(); }

  async function handleToggleStatus(p: NetworkPartner) {
    const newStatus = p.status === "active" ? "inactive" : "active";
    await updateNetworkPartnerStatus(p.id, newStatus);
    handleRefresh();
  }

  async function handleRemove(p: NetworkPartner) {
    await removeNetworkPartner(p.id);
    handleRefresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT, margin: 0 }}>My Network</h1>
          <p style={{ fontSize: 13, color: TEXT_DIM, margin: "4px 0 0", fontWeight: 500 }}>
            Manage REI&apos;s contractor and partner network.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          style={{
            padding: "8px 14px", borderRadius: 8, border: "none",
            background: EMERALD, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}
        >
          + Add to Network
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
        <KpiCard label="Total Partners" value={data.stats.total} color={EMERALD} />
        <KpiCard label="Contractors" value={data.stats.contractors} color="#10b981" />
        <KpiCard label="HES Partners" value={data.stats.hes} color="#3b82f6" />
        <KpiCard label="Inspectors" value={data.stats.inspectors} color="#f59e0b" />
      </div>

      {/* Filter Toggle */}
      <div style={{ display: "flex", gap: 0, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: "hidden", width: "fit-content" }}>
        {([
          { key: "all" as FilterType, label: "All" },
          { key: "contractor" as FilterType, label: "Contractors" },
          { key: "hes_assessor" as FilterType, label: "HES Assessors" },
          { key: "inspector" as FilterType, label: "Inspectors" },
        ]).map((opt, idx, arr) => {
          const active = filter === opt.key;
          const count =
            opt.key === "all"
              ? data.partners.length
              : data.partners.filter((p) => p.member_type === opt.key).length;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => setFilter(opt.key)}
              style={{
                padding: "7px 14px", border: "none",
                borderRight: idx < arr.length - 1 ? `1px solid ${BORDER}` : "none",
                background: active ? "rgba(16,185,129,0.1)" : "transparent",
                color: active ? EMERALD : TEXT_MUTED,
                fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}
            >
              {opt.label}
              <span style={{ marginLeft: 5, padding: "1px 6px", borderRadius: 9999, fontSize: 10, fontWeight: 700, background: active ? "rgba(16,185,129,0.15)" : "rgba(148,163,184,0.08)", color: active ? EMERALD : TEXT_DIM }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search + Count */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: TEXT_MUTED }}>{filteredPartners.length} partners</span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, company..."
          style={{
            width: 280, padding: "7px 12px", borderRadius: 8,
            border: `1px solid ${BORDER}`, background: BG, color: TEXT,
            fontSize: 13, outline: "none",
          }}
        />
      </div>

      {/* Table */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="admin-table" style={{ minWidth: 800 }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Service Areas</th>
                <th>Services</th>
                <th>Status</th>
                <th style={{ width: 90 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPartners.map((p) => {
                const typeColor = TYPE_COLORS[p.member_type] ?? TYPE_COLORS.contractor;
                return (
                  <tr
                    key={p.id}
                    onClick={handleRowClick}
                    style={{ cursor: "pointer", transition: "background 0.1s ease" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(148,163,184,0.04)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
                  >
                    {/* Name + Email */}
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{p.name}</div>
                      {p.company_name && (
                        <div style={{ fontSize: 11, fontWeight: 500, color: TEXT_DIM, marginTop: 1 }}>{p.company_name}</div>
                      )}
                      {p.email && (
                        <div style={{ fontSize: 11, fontWeight: 500, color: TEXT_MUTED, marginTop: 1 }}>{p.email}</div>
                      )}
                    </td>

                    {/* Type */}
                    <td>
                      <span style={{
                        display: "inline-block", padding: "3px 10px", borderRadius: 6,
                        fontSize: 11, fontWeight: 700,
                        background: typeColor.bg, color: typeColor.text,
                      }}>
                        {TYPE_LABELS[p.member_type] ?? p.member_type}
                      </span>
                    </td>

                    {/* Service Areas */}
                    <td>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {p.service_areas.length === 0 ? (
                          <span style={{ fontSize: 12, color: TEXT_DIM }}>—</span>
                        ) : (
                          p.service_areas.slice(0, 2).map((a) => (
                            <span key={a} style={{
                              display: "inline-block", padding: "2px 7px", borderRadius: 5,
                              fontSize: 10, fontWeight: 600,
                              background: "rgba(148,163,184,0.08)", color: TEXT_MUTED,
                              border: "1px solid rgba(148,163,184,0.15)",
                            }}>
                              {a}
                            </span>
                          ))
                        )}
                        {p.service_areas.length > 2 && (
                          <span style={{ fontSize: 10, color: TEXT_DIM, alignSelf: "center" }}>+{p.service_areas.length - 2}</span>
                        )}
                      </div>
                    </td>

                    {/* Services */}
                    <td>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {p.services.length === 0 ? (
                          <span style={{ fontSize: 12, color: TEXT_DIM }}>—</span>
                        ) : (
                          p.services.slice(0, 2).map((s) => (
                            <span key={s} style={{
                              display: "inline-block", padding: "2px 7px", borderRadius: 5,
                              fontSize: 10, fontWeight: 600,
                              background: "rgba(148,163,184,0.08)", color: TEXT_MUTED,
                              border: "1px solid rgba(148,163,184,0.15)",
                            }}>
                              {s}
                            </span>
                          ))
                        )}
                        {p.services.length > 2 && (
                          <span style={{ fontSize: 10, color: TEXT_DIM, alignSelf: "center" }}>+{p.services.length - 2}</span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{
                          width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                          background: p.status === "active" ? EMERALD : TEXT_DIM,
                        }} />
                        <span style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: 500, textTransform: "capitalize" }}>
                          {p.status}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td>
                      <div style={{ display: "flex", gap: 4 }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(p)}
                          title={p.status === "active" ? "Deactivate" : "Activate"}
                          style={{
                            padding: "4px 8px", borderRadius: 6, border: `1px solid ${BORDER}`,
                            background: "transparent", color: TEXT_MUTED, fontSize: 11, fontWeight: 600, cursor: "pointer",
                          }}
                        >
                          {p.status === "active" ? "Pause" : "Activate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemove(p)}
                          title="Remove from network"
                          style={{
                            padding: "4px 8px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)",
                            background: "transparent", color: "#ef4444", fontSize: 11, fontWeight: 600, cursor: "pointer",
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredPartners.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 32, color: TEXT_DIM, fontSize: 13 }}>
                    No partners found. Click &quot;+ Add to Network&quot; to add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <AddNetworkModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => { setShowAddModal(false); setToast("Partner added successfully"); handleRefresh(); }}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
