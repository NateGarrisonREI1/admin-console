// src/app/(app)/broker/network/NetworkClient.tsx
"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Broker, BrokerContractor, ProviderType } from "@/types/broker";
import { addContractor, updateContractor, removeContractor, brokerInviteContractor } from "./actions";
import type { PendingInvite } from "./actions";

// ─── Provider Tab Config ─────────────────────────────────────────────────────

type TabConfig = {
  key: ProviderType;
  label: string;
  accent: string;
  addLabel: string;
  addDesc: string;
  namePlaceholder: string;
  nameLabel: string;
  showServiceTypes: boolean;
  showLeadCost: boolean;
  showCommission: boolean;
  showServiceAreas: boolean;
  showCertifications: boolean;
  certLabel: string;
  icon: "contractor" | "hes" | "inspector";
};

const TABS: TabConfig[] = [
  {
    key: "contractor",
    label: "Contractors",
    accent: "#8b5cf6",
    addLabel: "+ Add Contractor",
    addDesc: "Add a contractor to your service provider network",
    namePlaceholder: "Contractor or company name",
    nameLabel: "Contractor Name",
    showServiceTypes: true,
    showLeadCost: true,
    showCommission: true,
    showServiceAreas: true,
    showCertifications: false,
    certLabel: "",
    icon: "contractor",
  },
  {
    key: "hes_assessor",
    label: "HES Assessors",
    accent: "#10b981",
    addLabel: "+ Add HES Assessor",
    addDesc: "Add a certified Home Energy Score assessor",
    namePlaceholder: "Assessor name or company",
    nameLabel: "Assessor Name",
    showServiceTypes: false,
    showLeadCost: false,
    showCommission: false,
    showServiceAreas: true,
    showCertifications: true,
    certLabel: "HES Certifications",
    icon: "hes",
  },
  {
    key: "inspector",
    label: "Home Inspectors",
    accent: "#f59e0b",
    addLabel: "+ Add Home Inspector",
    addDesc: "Add a licensed home inspector to your network",
    namePlaceholder: "Inspector name or company",
    nameLabel: "Inspector Name",
    showServiceTypes: false,
    showLeadCost: false,
    showCommission: false,
    showServiceAreas: true,
    showCertifications: true,
    certLabel: "Inspector Licenses",
    icon: "inspector",
  },
];

// ─── Constants ───────────────────────────────────────────────────────────────

const ALL_SERVICE_TYPES = [
  { value: "hvac", label: "HVAC" },
  { value: "solar", label: "Solar" },
  { value: "water_heater", label: "Water Heater" },
  { value: "electrical", label: "Electrical" },
  { value: "insulation", label: "Insulation" },
  { value: "plumbing", label: "Plumbing" },
];

const SERVICE_TYPE_LABELS: Record<string, string> = {
  hvac: "HVAC",
  solar: "Solar",
  water_heater: "Water Heater",
  electrical: "Electrical",
  insulation: "Insulation",
  plumbing: "Plumbing",
};

const HES_CERT_OPTIONS = [
  { value: "doe_hes", label: "DOE HES Certified" },
  { value: "bpi", label: "BPI Certified" },
  { value: "resnet", label: "RESNET HERS Rater" },
  { value: "energy_star", label: "ENERGY STAR Verifier" },
];

const INSPECTOR_CERT_OPTIONS = [
  { value: "ashi", label: "ASHI Certified" },
  { value: "internachi", label: "InterNACHI Certified" },
  { value: "state_licensed", label: "State Licensed" },
  { value: "radon", label: "Radon Certified" },
  { value: "mold", label: "Mold Inspection" },
];

// ─── Styles ──────────────────────────────────────────────────────────────────

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #334155",
  background: "#1e293b",
  color: "#f1f5f9",
  fontSize: 13,
  fontWeight: 500,
  outline: "none",
  boxSizing: "border-box",
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  display: "block",
  marginBottom: 6,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtCurrency(val: number | null | undefined): string {
  if (val == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);
}

function fmtPercent(val: number | null | undefined): string {
  if (val == null) return "—";
  return `${val}%`;
}

function getStatusStyle(status: string): React.CSSProperties {
  switch (status) {
    case "active":
      return { background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)" };
    case "paused":
      return { background: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)" };
    case "removed":
      return { background: "rgba(248,113,113,0.12)", color: "#f87171", border: "1px solid rgba(248,113,113,0.25)" };
    default:
      return { background: "rgba(148,163,184,0.12)", color: "#94a3b8", border: "1px solid rgba(148,163,184,0.25)" };
  }
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
        textTransform: "capitalize",
        ...getStatusStyle(status),
      }}
    >
      {status}
    </span>
  );
}

function ServiceTypePill({ label, color }: { label: string; color?: string }) {
  const c = color ?? "#a78bfa";
  const bg = color ? `${color}1e` : "rgba(139,92,246,0.12)";
  const border = color ? `${color}40` : "rgba(139,92,246,0.25)";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 600,
        background: bg,
        color: c,
        border: `1px solid ${border}`,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

// ─── Tab Icon SVGs ───────────────────────────────────────────────────────────

function TabIcon({ type, color }: { type: TabConfig["icon"]; color: string }) {
  if (type === "contractor") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M13 7a3 3 0 11-6 0 3 3 0 016 0zM4 17a6 6 0 0112 0" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M16 8v4M14 10h4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "hes") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="4" width="14" height="12" rx="2" stroke={color} strokeWidth="1.8" />
        <path d="M7 8h6M7 11h4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="14" cy="11" r="1" fill={color} />
      </svg>
    );
  }
  // inspector
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M4 10l3 3 6-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="2" y="3" width="16" height="14" rx="3" stroke={color} strokeWidth="1.8" />
    </svg>
  );
}

// ─── Form State ──────────────────────────────────────────────────────────────

type ProviderFormState = {
  contractor_name: string;
  contractor_email: string;
  contractor_phone: string;
  provider_type: ProviderType;
  service_types: string[];
  service_areas: string[];
  lead_cost_override: string;
  commission_split_override: string;
  status: string;
  notes: string;
};

function emptyForm(providerType: ProviderType): ProviderFormState {
  return {
    contractor_name: "",
    contractor_email: "",
    contractor_phone: "",
    provider_type: providerType,
    service_types: [],
    service_areas: [],
    lead_cost_override: "",
    commission_split_override: "",
    status: "active",
    notes: "",
  };
}

function formFromContractor(c: BrokerContractor): ProviderFormState {
  return {
    contractor_name: c.contractor_name,
    contractor_email: c.contractor_email ?? "",
    contractor_phone: c.contractor_phone ?? "",
    provider_type: c.provider_type ?? "contractor",
    service_types: c.service_types ?? [],
    service_areas: c.service_areas ?? [],
    lead_cost_override: c.lead_cost_override != null ? String(c.lead_cost_override) : "",
    commission_split_override: c.commission_split_override != null ? String(c.commission_split_override) : "",
    status: c.status,
    notes: c.notes ?? "",
  };
}

// ─── Provider Modal ──────────────────────────────────────────────────────────

type ModalMode = "add" | "edit";

function ProviderModal({
  open,
  mode,
  tabConfig,
  initialContractor,
  defaultLeadCost,
  defaultCommission,
  onClose,
  onSuccess,
}: {
  open: boolean;
  mode: ModalMode;
  tabConfig: TabConfig;
  initialContractor: BrokerContractor | null;
  defaultLeadCost: number;
  defaultCommission: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<ProviderFormState>(emptyForm(tabConfig.key));
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initialContractor) {
      setForm(formFromContractor(initialContractor));
    } else {
      setForm(emptyForm(tabConfig.key));
    }
    setError("");
  }, [open, mode, initialContractor, tabConfig.key]);

  const certOptions = tabConfig.key === "hes_assessor" ? HES_CERT_OPTIONS : INSPECTOR_CERT_OPTIONS;

  function toggleServiceType(value: string) {
    setForm((prev) => ({
      ...prev,
      service_types: prev.service_types.includes(value)
        ? prev.service_types.filter((s) => s !== value)
        : [...prev.service_types, value],
    }));
  }

  function toggleServiceArea(value: string) {
    setForm((prev) => ({
      ...prev,
      service_areas: prev.service_areas.includes(value)
        ? prev.service_areas.filter((s) => s !== value)
        : [...prev.service_areas, value],
    }));
  }

  function handleSubmit() {
    if (!form.contractor_name.trim()) {
      setError(`${tabConfig.nameLabel} is required.`);
      return;
    }
    setError("");

    const leadCost = form.lead_cost_override.trim() ? parseFloat(form.lead_cost_override) : null;
    const commission = form.commission_split_override.trim() ? parseFloat(form.commission_split_override) : null;

    if (leadCost !== null && isNaN(leadCost)) {
      setError("Lead cost must be a valid number.");
      return;
    }
    if (commission !== null && (isNaN(commission) || commission < 0 || commission > 100)) {
      setError("Commission % must be between 0 and 100.");
      return;
    }

    startTransition(async () => {
      try {
        if (mode === "add") {
          await addContractor({
            contractor_name: form.contractor_name.trim(),
            contractor_email: form.contractor_email.trim(),
            contractor_phone: form.contractor_phone.trim(),
            provider_type: tabConfig.key,
            service_types: form.service_types,
            service_areas: form.service_areas,
            lead_cost_override: leadCost,
            commission_split_override: commission,
            notes: form.notes.trim(),
          });
        } else if (mode === "edit" && initialContractor) {
          await updateContractor({
            id: initialContractor.id,
            contractor_name: form.contractor_name.trim(),
            contractor_email: form.contractor_email.trim(),
            contractor_phone: form.contractor_phone.trim(),
            provider_type: tabConfig.key,
            service_types: form.service_types,
            service_areas: form.service_areas,
            lead_cost_override: leadCost,
            commission_split_override: commission,
            status: form.status,
            notes: form.notes.trim(),
          });
        }
        onSuccess();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "An error occurred. Please try again.");
      }
    });
  }

  if (!open) return null;

  const isEdit = mode === "edit";
  const title = isEdit ? `Edit ${tabConfig.label.replace(/s$/, "")}` : tabConfig.addLabel.replace("+ ", "");
  const subtitle = isEdit
    ? `Update details for this ${tabConfig.label.toLowerCase().replace(/s$/, "")}.`
    : `Add a new ${tabConfig.label.toLowerCase().replace(/s$/, "")} to your network.`;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99990 }}>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", border: "none", cursor: "default" }}
      />

      {/* Drawer panel */}
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          height: "100%",
          width: "100%",
          maxWidth: 460,
          display: "flex",
          flexDirection: "column",
          background: "#0f172a",
          borderLeft: "1px solid #334155",
          boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            borderBottom: "1px solid #334155",
            padding: "16px 20px",
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>{title}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#64748b", marginTop: 2 }}>{subtitle}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="admin-btn-secondary"
            style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, flexShrink: 0 }}
          >
            Close
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Name */}
          <div>
            <label style={LABEL_STYLE}>{tabConfig.nameLabel} <span style={{ color: "#f87171" }}>*</span></label>
            <input
              value={form.contractor_name}
              onChange={(e) => setForm((p) => ({ ...p, contractor_name: e.target.value }))}
              placeholder={tabConfig.namePlaceholder}
              style={INPUT_STYLE}
              className="admin-input"
            />
          </div>

          {/* Email + Phone */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={LABEL_STYLE}>Email</label>
              <input
                type="email"
                value={form.contractor_email}
                onChange={(e) => setForm((p) => ({ ...p, contractor_email: e.target.value }))}
                placeholder="email@example.com"
                style={INPUT_STYLE}
                className="admin-input"
              />
            </div>
            <div>
              <label style={LABEL_STYLE}>Phone</label>
              <input
                type="tel"
                value={form.contractor_phone}
                onChange={(e) => setForm((p) => ({ ...p, contractor_phone: e.target.value }))}
                placeholder="(555) 555-5555"
                style={INPUT_STYLE}
                className="admin-input"
              />
            </div>
          </div>

          {/* Service Types (contractors only) */}
          {tabConfig.showServiceTypes && (
            <div>
              <label style={LABEL_STYLE}>Service Types</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                {ALL_SERVICE_TYPES.map(({ value, label }) => {
                  const checked = form.service_types.includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleServiceType(value)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 12px",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        background: checked ? `${tabConfig.accent}2e` : "rgba(30,41,59,0.8)",
                        color: checked ? tabConfig.accent : "#64748b",
                        border: checked ? `1px solid ${tabConfig.accent}59` : "1px solid #334155",
                      }}
                    >
                      <span
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 4,
                          border: checked ? `2px solid ${tabConfig.accent}` : "2px solid #475569",
                          background: checked ? tabConfig.accent : "transparent",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {checked && (
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                            <path d="M1 4l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Certifications/Licenses (HES and Inspectors) */}
          {tabConfig.showCertifications && (
            <div>
              <label style={LABEL_STYLE}>{tabConfig.certLabel}</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                {certOptions.map(({ value, label }) => {
                  const checked = form.service_types.includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleServiceType(value)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 12px",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        background: checked ? `${tabConfig.accent}2e` : "rgba(30,41,59,0.8)",
                        color: checked ? tabConfig.accent : "#64748b",
                        border: checked ? `1px solid ${tabConfig.accent}59` : "1px solid #334155",
                      }}
                    >
                      <span
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 4,
                          border: checked ? `2px solid ${tabConfig.accent}` : "2px solid #475569",
                          background: checked ? tabConfig.accent : "transparent",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {checked && (
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                            <path d="M1 4l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Service Areas (all types) */}
          {tabConfig.showServiceAreas && (
            <div>
              <label style={LABEL_STYLE}>Service Areas</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                {["Portland Metro", "Salem", "Eugene", "Bend", "Medford", "Corvallis"].map((area) => {
                  const checked = form.service_areas.includes(area);
                  return (
                    <button
                      key={area}
                      type="button"
                      onClick={() => toggleServiceArea(area)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 12px",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        background: checked ? "rgba(6,182,212,0.18)" : "rgba(30,41,59,0.8)",
                        color: checked ? "#06b6d4" : "#64748b",
                        border: checked ? "1px solid rgba(6,182,212,0.35)" : "1px solid #334155",
                      }}
                    >
                      <span
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 4,
                          border: checked ? "2px solid #06b6d4" : "2px solid #475569",
                          background: checked ? "#06b6d4" : "transparent",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {checked && (
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                            <path d="M1 4l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      {area}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Lead Cost + Commission (contractors only) */}
          {tabConfig.showLeadCost && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={LABEL_STYLE}>Lead Cost ($)</label>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#64748b",
                      fontSize: 13,
                      fontWeight: 600,
                      pointerEvents: "none",
                    }}
                  >
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.lead_cost_override}
                    onChange={(e) => setForm((p) => ({ ...p, lead_cost_override: e.target.value }))}
                    placeholder={String(defaultLeadCost)}
                    style={{ ...INPUT_STYLE, paddingLeft: 24 }}
                    className="admin-input"
                  />
                </div>
                <div style={{ fontSize: 10, color: "#475569", marginTop: 4 }}>
                  Default: {fmtCurrency(defaultLeadCost)}
                </div>
              </div>
              <div>
                <label style={LABEL_STYLE}>Commission %</label>
                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={form.commission_split_override}
                    onChange={(e) => setForm((p) => ({ ...p, commission_split_override: e.target.value }))}
                    placeholder={String(defaultCommission)}
                    style={{ ...INPUT_STYLE, paddingRight: 28 }}
                    className="admin-input"
                  />
                  <span
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#64748b",
                      fontSize: 13,
                      fontWeight: 600,
                      pointerEvents: "none",
                    }}
                  >
                    %
                  </span>
                </div>
                <div style={{ fontSize: 10, color: "#475569", marginTop: 4 }}>
                  Default: {defaultCommission}%
                </div>
              </div>
            </div>
          )}

          {/* Status (edit only) */}
          {isEdit && (
            <div>
              <label style={LABEL_STYLE}>Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                style={INPUT_STYLE}
                className="admin-select"
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="removed">Removed</option>
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label style={LABEL_STYLE}>Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              rows={3}
              placeholder={`Optional notes about this ${tabConfig.label.toLowerCase().replace(/s$/, "")}...`}
              style={{ ...INPUT_STYLE, resize: "vertical", minHeight: 72, lineHeight: 1.5 }}
              className="admin-input"
            />
          </div>

          {error && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                background: "rgba(248,113,113,0.1)",
                border: "1px solid rgba(248,113,113,0.25)",
                color: "#f87171",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Footer — large visible buttons */}
        <div
          style={{
            borderTop: "1px solid #334155",
            padding: "16px 20px",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: "12px 16px",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                background: "#334155",
                color: "#cbd5e1",
                border: "1px solid #475569",
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#3d4f68"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#334155"; }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={pending}
              style={{
                flex: 1,
                padding: "12px 16px",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                background: pending ? `${tabConfig.accent}66` : tabConfig.accent,
                color: "#fff",
                border: "none",
                cursor: pending ? "not-allowed" : "pointer",
                opacity: pending ? 0.7 : 1,
                transition: "background 0.15s, opacity 0.15s",
              }}
            >
              {pending
                ? (isEdit ? "Saving..." : "Adding...")
                : isEdit
                  ? "Save Changes"
                  : tabConfig.addLabel.replace("+ ", "")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Confirm Remove Dialog ───────────────────────────────────────────────────

function ConfirmRemoveDialog({
  open,
  providerName,
  providerLabel,
  onClose,
  onConfirm,
  pending,
}: {
  open: boolean;
  providerName: string;
  providerLabel: string;
  onClose: () => void;
  onConfirm: () => void;
  pending: boolean;
}) {
  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99995, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.60)", border: "none", cursor: "default" }}
      />
      <div
        style={{
          position: "relative",
          background: "#0f172a",
          border: "1px solid #334155",
          borderRadius: 16,
          padding: "28px 28px 24px",
          maxWidth: 380,
          width: "90%",
          boxShadow: "0 25px 60px rgba(0,0,0,0.55)",
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", marginBottom: 8 }}>
          Remove {providerLabel}
        </div>
        <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6, marginBottom: 24 }}>
          Are you sure you want to remove{" "}
          <span style={{ color: "#f1f5f9", fontWeight: 600 }}>{providerName}</span> from your
          network? Their status will be set to &quot;removed&quot; and they will no longer receive leads.
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 18px",
              borderRadius: 9,
              fontSize: 13,
              fontWeight: 600,
              background: "#334155",
              color: "#cbd5e1",
              border: "1px solid #475569",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            style={{
              padding: "10px 18px",
              borderRadius: 9,
              fontSize: 13,
              fontWeight: 600,
              background: pending ? "rgba(248,113,113,0.3)" : "rgba(248,113,113,0.15)",
              color: "#f87171",
              border: "1px solid rgba(248,113,113,0.35)",
              cursor: pending ? "not-allowed" : "pointer",
              opacity: pending ? 0.7 : 1,
            }}
          >
            {pending ? "Removing..." : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Invite Contractor Modal ─────────────────────────────────────────────────

const TRADE_OPTIONS = [
  { value: "hvac", label: "HVAC" },
  { value: "water_heater", label: "Water Heater" },
  { value: "solar", label: "Solar" },
  { value: "electrical", label: "Electrical" },
  { value: "plumbing", label: "Plumbing" },
  { value: "general_handyman", label: "General Handyman" },
];

function InviteContractorModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [trade, setTrade] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setEmail("");
    setFullName("");
    setCompanyName("");
    setTrade("");
    setPhone("");
    setError("");
  }, [open]);

  function handleSubmit() {
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setError("");

    startTransition(async () => {
      try {
        const result = await brokerInviteContractor({
          email: email.trim(),
          full_name: fullName.trim() || undefined,
          company_name: companyName.trim() || undefined,
          trade: trade || undefined,
          phone: phone.trim() || undefined,
        });
        onSuccess(result.message);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to send invite.");
      }
    });
  }

  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99990 }}>
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", border: "none", cursor: "default" }}
      />
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          height: "100%",
          width: "100%",
          maxWidth: 440,
          display: "flex",
          flexDirection: "column",
          background: "#0f172a",
          borderLeft: "1px solid #334155",
          boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", borderBottom: "1px solid #334155", padding: "16px 20px", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>Invite Contractor</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#64748b", marginTop: 2 }}>Send an invite to join your broker network</div>
          </div>
          <button type="button" onClick={onClose} className="admin-btn-secondary" style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, flexShrink: 0 }}>
            Close
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={LABEL_STYLE}>Email <span style={{ color: "#f87171" }}>*</span></label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contractor@email.com" type="email" style={INPUT_STYLE} className="admin-input" />
          </div>
          <div>
            <label style={LABEL_STYLE}>Full Name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" style={INPUT_STYLE} className="admin-input" />
          </div>
          <div>
            <label style={LABEL_STYLE}>Company Name</label>
            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="ACME Heating & Cooling" style={INPUT_STYLE} className="admin-input" />
          </div>
          <div>
            <label style={LABEL_STYLE}>Trade / Specialty</label>
            <select value={trade} onChange={(e) => setTrade(e.target.value)} style={INPUT_STYLE} className="admin-select">
              <option value="">Select trade...</option>
              {TRADE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={LABEL_STYLE}>Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 555-5555" type="tel" style={INPUT_STYLE} className="admin-input" />
          </div>

          {/* Invite info */}
          <div style={{
            padding: "12px 14px", borderRadius: 8,
            border: "1px solid rgba(16,185,129,0.2)", background: "rgba(16,185,129,0.06)",
            fontSize: 12, color: "#cbd5e1", fontWeight: 500,
          }}>
            An invite email will be sent to the contractor with a magic link to set up their account and complete onboarding.
          </div>

          {error && (
            <div style={{
              padding: "10px 14px", borderRadius: 8,
              background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)",
              color: "#f87171", fontSize: 12, fontWeight: 600,
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ borderTop: "1px solid #334155", padding: "16px 20px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: "12px 16px", borderRadius: 10, fontSize: 14, fontWeight: 600,
                background: "#334155", color: "#cbd5e1", border: "1px solid #475569", cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#3d4f68"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#334155"; }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={pending}
              style={{
                flex: 1, padding: "12px 16px", borderRadius: 10, fontSize: 14, fontWeight: 700,
                background: pending ? "rgba(16,185,129,0.4)" : "#10b981",
                color: "#fff", border: "none",
                cursor: pending ? "not-allowed" : "pointer",
                opacity: pending ? 0.7 : 1,
                transition: "background 0.15s, opacity 0.15s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              {pending ? "Sending..." : "Send Invite"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Pending Invites Section ────────────────────────────────────────────────

function PendingInvitesSection({ invites }: { invites: PendingInvite[] }) {
  if (invites.length === 0) return null;

  const pendingCount = invites.filter((i) => i.status === "pending").length;
  const activeCount = invites.filter((i) => i.status === "active").length;

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>
          Invited Contractors
        </h3>
        {pendingCount > 0 && (
          <span style={{
            display: "inline-flex", alignItems: "center", padding: "2px 8px",
            borderRadius: 9999, fontSize: 11, fontWeight: 700,
            background: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)",
          }}>
            {pendingCount} pending
          </span>
        )}
        {activeCount > 0 && (
          <span style={{
            display: "inline-flex", alignItems: "center", padding: "2px 8px",
            borderRadius: 9999, fontSize: 11, fontWeight: 700,
            background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)",
          }}>
            {activeCount} active
          </span>
        )}
      </div>

      <div style={{
        background: "#1e293b", border: "1px solid #334155", borderRadius: 12, overflow: "hidden",
      }}>
        {invites.map((inv, i) => (
          <div
            key={inv.id}
            style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "12px 16px",
              borderBottom: i < invites.length - 1 ? "1px solid rgba(51,65,85,0.5)" : undefined,
            }}
          >
            {/* Avatar placeholder */}
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: inv.status === "active" ? "rgba(16,185,129,0.12)" : "rgba(251,191,36,0.12)",
              border: `1px solid ${inv.status === "active" ? "rgba(16,185,129,0.25)" : "rgba(251,191,36,0.25)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700, flexShrink: 0,
              color: inv.status === "active" ? "#10b981" : "#fbbf24",
            }}>
              {(inv.name || inv.email)[0].toUpperCase()}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>
                {inv.name || inv.email}
              </div>
              <div style={{ fontSize: 12, color: "#64748b", display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span>{inv.email}</span>
                {inv.trade && <span style={{ color: "#475569" }}>| {inv.trade}</span>}
                {inv.invited_at && (
                  <span style={{ color: "#475569" }}>
                    | Invited {new Date(inv.invited_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {/* Status badge */}
            <span style={{
              display: "inline-flex", alignItems: "center", padding: "3px 10px",
              borderRadius: 9999, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
              ...(inv.status === "active"
                ? { background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)" }
                : { background: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)" }),
            }}>
              {inv.status === "active" ? "Active" : "Pending"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function NetworkClient({
  broker,
  contractors,
  pendingInvites = [],
}: {
  broker: Broker;
  contractors: BrokerContractor[];
  pendingInvites?: PendingInvite[];
}) {
  const router = useRouter();

  // Active tab
  const [activeTab, setActiveTab] = useState<ProviderType>("contractor");
  const currentTabConfig = TABS.find((t) => t.key === activeTab)!;

  // Filters
  const [serviceFilter, setServiceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("add");
  const [editTarget, setEditTarget] = useState<BrokerContractor | null>(null);

  // Remove dialog state
  const [removeTarget, setRemoveTarget] = useState<BrokerContractor | null>(null);
  const [removePending, startRemoveTransition] = useTransition();

  // Invite modal state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // Reset filters when switching tabs
  useEffect(() => {
    setServiceFilter("all");
    setStatusFilter("active");
  }, [activeTab]);

  function openAddModal() {
    setModalMode("add");
    setEditTarget(null);
    setModalOpen(true);
  }

  function openEditModal(c: BrokerContractor) {
    setModalMode("edit");
    setEditTarget(c);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  function handleModalSuccess() {
    setModalOpen(false);
    router.refresh();
  }

  function openRemoveDialog(c: BrokerContractor) {
    setRemoveTarget(c);
  }

  function closeRemoveDialog() {
    setRemoveTarget(null);
  }

  function handleConfirmRemove() {
    if (!removeTarget) return;
    startRemoveTransition(async () => {
      try {
        await removeContractor({ id: removeTarget.id });
        setRemoveTarget(null);
        router.refresh();
      } catch {
        // silently fail
      }
    });
  }

  const defaultLeadCost = broker.default_hvac_price ?? 0;
  const defaultCommission = broker.commission_split_percent ?? 30;

  // Filter by current tab's provider type
  const tabProviders = contractors.filter((c) => (c.provider_type ?? "contractor") === activeTab);

  // Apply filters
  const filtered = tabProviders.filter((c) => {
    const matchesStatus = statusFilter === "all" ? true : c.status === statusFilter;
    const matchesService =
      serviceFilter === "all"
        ? true
        : c.service_types.includes(serviceFilter);
    return matchesStatus && matchesService;
  });

  const totalActive = tabProviders.filter((c) => c.status === "active").length;
  const totalPaused = tabProviders.filter((c) => c.status === "paused").length;

  // Counts by provider type for tab badges
  const countByType: Record<ProviderType, number> = {
    contractor: contractors.filter((c) => (c.provider_type ?? "contractor") === "contractor").length,
    hes_assessor: contractors.filter((c) => c.provider_type === "hes_assessor").length,
    inspector: contractors.filter((c) => c.provider_type === "inspector").length,
  };

  // Certification/service labels for the current tab
  const certLabelMap: Record<string, string> = {};
  for (const opt of [...HES_CERT_OPTIONS, ...INSPECTOR_CERT_OPTIONS]) {
    certLabelMap[opt.value] = opt.label;
  }

  // Which columns to show
  const showLeadCols = currentTabConfig.showLeadCost;
  const colHeaders = ["Name", "Contact"];
  if (currentTabConfig.showServiceTypes) colHeaders.push("Service Types");
  if (currentTabConfig.showCertifications) colHeaders.push(currentTabConfig.certLabel);
  if (currentTabConfig.showServiceAreas) colHeaders.push("Service Areas");
  if (showLeadCols) colHeaders.push("Lead Cost", "Commission");
  colHeaders.push("Status", "Actions");

  return (
    <>
      <div style={{ padding: 24 }}>
        {/* ── Header ── */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", margin: 0, letterSpacing: "-0.01em" }}>
            My Service Provider Network
          </h1>
          <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0", fontWeight: 500 }}>
            Manage your contractors, HES assessors, and home inspectors.
          </p>
        </div>

        {/* ── Tabs ── */}
        <div
          style={{
            display: "flex",
            gap: 4,
            borderBottom: "1px solid #334155",
            marginBottom: 20,
          }}
        >
          {TABS.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 18px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  background: "transparent",
                  border: "none",
                  borderBottom: isActive ? `2px solid ${tab.accent}` : "2px solid transparent",
                  color: isActive ? tab.accent : "#64748b",
                  transition: "all 0.15s",
                  marginBottom: -1,
                }}
              >
                <TabIcon type={tab.icon} color={isActive ? tab.accent : "#64748b"} />
                {tab.label}
                {countByType[tab.key] > 0 && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: 20,
                      height: 20,
                      borderRadius: 10,
                      fontSize: 11,
                      fontWeight: 700,
                      background: isActive ? `${tab.accent}22` : "rgba(100,116,139,0.15)",
                      color: isActive ? tab.accent : "#64748b",
                      padding: "0 6px",
                    }}
                  >
                    {countByType[tab.key]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Success Toast ── */}
        {inviteSuccess && (
          <div style={{
            marginBottom: 16, padding: "10px 16px", borderRadius: 8,
            background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)",
            color: "#10b981", fontSize: 13, fontWeight: 600,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span>{inviteSuccess}</span>
            <button
              type="button"
              onClick={() => setInviteSuccess(null)}
              style={{ background: "none", border: "none", color: "#10b981", cursor: "pointer", fontSize: 16, padding: 0 }}
            >
              &times;
            </button>
          </div>
        )}

        {/* ── Quick Actions ── */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={openAddModal}
            style={{
              background: `linear-gradient(135deg, ${currentTabConfig.accent}14, ${currentTabConfig.accent}06)`,
              border: `1px solid ${currentTabConfig.accent}44`,
              borderRadius: 12,
              padding: "20px 24px",
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              alignItems: "flex-start",
              gap: 16,
              flex: 1,
              minWidth: 280,
              maxWidth: 420,
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = `0 8px 24px ${currentTabConfig.accent}1a`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <span
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: `${currentTabConfig.accent}1a`,
                border: `1px solid ${currentTabConfig.accent}44`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <TabIcon type={currentTabConfig.icon} color={currentTabConfig.accent} />
            </span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: currentTabConfig.accent }}>
                {currentTabConfig.addLabel}
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, lineHeight: 1.4 }}>
                {currentTabConfig.addDesc}
              </div>
            </div>
          </button>

          {activeTab === "contractor" && (
            <button
              type="button"
              onClick={() => setInviteModalOpen(true)}
              style={{
                background: "linear-gradient(135deg, rgba(16,185,129,0.14), rgba(16,185,129,0.06))",
                border: "1px solid rgba(16,185,129,0.44)",
                borderRadius: 12,
                padding: "20px 24px",
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                alignItems: "flex-start",
                gap: 16,
                flex: 1,
                minWidth: 280,
                maxWidth: 420,
                transition: "transform 0.15s, box-shadow 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(16,185,129,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <span style={{
                width: 40, height: 40, borderRadius: 10,
                background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.44)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#10b981" }}>
                  Invite Contractor
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, lineHeight: 1.4 }}>
                  Send an email invite to join your network
                </div>
              </div>
            </button>
          )}
        </div>

        {/* ── Pending Invites ── */}
        {activeTab === "contractor" && <PendingInvitesSection invites={pendingInvites} />}

        {/* ── KPI Summary ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12,
            marginBottom: 24,
          }}
        >
          {[
            { label: `Total ${currentTabConfig.label}`, value: tabProviders.length },
            { label: "Active", value: totalActive, color: "#10b981" },
            { label: "Paused", value: totalPaused, color: "#fbbf24" },
            ...(showLeadCols
              ? [
                  { label: "Default Lead Cost", value: fmtCurrency(defaultLeadCost) },
                  { label: "Default Commission", value: fmtPercent(defaultCommission) },
                ]
              : []),
          ].map(({ label, value, color }) => (
            <div
              key={label}
              style={{
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: 12,
                padding: "14px 16px",
              }}
            >
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                {label}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: color ?? "#f1f5f9" }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* ── Filter Bar ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          {/* Service filter only for contractors */}
          {currentTabConfig.showServiceTypes && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginRight: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Service
              </label>
              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="admin-select"
                style={{
                  padding: "7px 12px",
                  borderRadius: 8,
                  border: "1px solid #334155",
                  background: "#1e293b",
                  color: "#f1f5f9",
                  fontSize: 12,
                  fontWeight: 600,
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="all">All Services</option>
                {ALL_SERVICE_TYPES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginRight: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="admin-select"
              style={{
                padding: "7px 12px",
                borderRadius: 8,
                border: "1px solid #334155",
                background: "#1e293b",
                color: "#f1f5f9",
                fontSize: 12,
                fontWeight: 600,
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="removed">Removed</option>
            </select>
          </div>

          <div style={{ marginLeft: "auto", fontSize: 12, color: "#475569", fontWeight: 600 }}>
            {filtered.length} {currentTabConfig.label.toLowerCase()}{filtered.length === 1 ? "" : ""}
          </div>
        </div>

        {/* ── Table ── */}
        <div
          style={{
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #334155", background: "rgba(15,23,42,0.5)" }}>
                  {colHeaders.map((col, i) => (
                    <th
                      key={col}
                      style={{
                        padding: "11px 16px",
                        textAlign: i === colHeaders.length - 1 ? "right" : "left",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#64748b",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={colHeaders.length}
                      style={{
                        padding: "48px 24px",
                        textAlign: "center",
                        color: "#475569",
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                    >
                      {tabProviders.length === 0
                        ? `No ${currentTabConfig.label.toLowerCase()} in your network yet. Click "${currentTabConfig.addLabel}" to get started.`
                        : `No ${currentTabConfig.label.toLowerCase()} match the current filters.`}
                    </td>
                  </tr>
                ) : (
                  filtered.map((c, idx) => (
                    <tr
                      key={c.id}
                      style={{
                        background: idx % 2 === 0 ? "#0f172a" : "#111827",
                        borderBottom: "1px solid #1e293b",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.background = "#1a2744";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.background =
                          idx % 2 === 0 ? "#0f172a" : "#111827";
                      }}
                    >
                      {/* Name */}
                      <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                        <div style={{ fontWeight: 700, color: "#f1f5f9", fontSize: 13 }}>
                          {c.contractor_name}
                        </div>
                        {c.notes && (
                          <div
                            style={{
                              fontSize: 11,
                              color: "#475569",
                              marginTop: 2,
                              maxWidth: 200,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={c.notes}
                          >
                            {c.notes}
                          </div>
                        )}
                      </td>

                      {/* Contact */}
                      <td style={{ padding: "12px 16px" }}>
                        {c.contractor_email && (
                          <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 500 }}>
                            {c.contractor_email}
                          </div>
                        )}
                        {c.contractor_phone && (
                          <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>
                            {c.contractor_phone}
                          </div>
                        )}
                        {!c.contractor_email && !c.contractor_phone && (
                          <span style={{ color: "#334155", fontSize: 12 }}>—</span>
                        )}
                      </td>

                      {/* Service Types (contractors) */}
                      {currentTabConfig.showServiceTypes && (
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {c.service_types.length === 0 ? (
                              <span style={{ color: "#334155", fontSize: 12 }}>—</span>
                            ) : (
                              c.service_types.map((st) => (
                                <ServiceTypePill
                                  key={st}
                                  label={SERVICE_TYPE_LABELS[st] ?? st}
                                  color={currentTabConfig.accent}
                                />
                              ))
                            )}
                          </div>
                        </td>
                      )}

                      {/* Certifications (HES/Inspector) */}
                      {currentTabConfig.showCertifications && (
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {c.service_types.length === 0 ? (
                              <span style={{ color: "#334155", fontSize: 12 }}>—</span>
                            ) : (
                              c.service_types.map((st) => (
                                <ServiceTypePill
                                  key={st}
                                  label={certLabelMap[st] ?? st}
                                  color={currentTabConfig.accent}
                                />
                              ))
                            )}
                          </div>
                        </td>
                      )}

                      {/* Service Areas */}
                      {currentTabConfig.showServiceAreas && (
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {(c.service_areas ?? []).length === 0 ? (
                              <span style={{ color: "#334155", fontSize: 12 }}>—</span>
                            ) : (
                              c.service_areas.map((area) => (
                                <ServiceTypePill key={area} label={area} color="#06b6d4" />
                              ))
                            )}
                          </div>
                        </td>
                      )}

                      {/* Lead Cost (contractors) */}
                      {showLeadCols && (
                        <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                          {c.lead_cost_override != null ? (
                            <div>
                              <span style={{ color: "#f1f5f9", fontWeight: 600 }}>
                                {fmtCurrency(c.lead_cost_override)}
                              </span>
                              <span style={{ fontSize: 10, color: "#475569", marginLeft: 4 }}>override</span>
                            </div>
                          ) : (
                            <div>
                              <span style={{ color: "#64748b" }}>{fmtCurrency(defaultLeadCost)}</span>
                              <span style={{ fontSize: 10, color: "#334155", marginLeft: 4 }}>default</span>
                            </div>
                          )}
                        </td>
                      )}

                      {/* Commission (contractors) */}
                      {showLeadCols && (
                        <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                          {c.commission_split_override != null ? (
                            <div>
                              <span style={{ color: "#f1f5f9", fontWeight: 600 }}>
                                {fmtPercent(c.commission_split_override)}
                              </span>
                              <span style={{ fontSize: 10, color: "#475569", marginLeft: 4 }}>override</span>
                            </div>
                          ) : (
                            <div>
                              <span style={{ color: "#64748b" }}>{fmtPercent(defaultCommission)}</span>
                              <span style={{ fontSize: 10, color: "#334155", marginLeft: 4 }}>default</span>
                            </div>
                          )}
                        </td>
                      )}

                      {/* Status */}
                      <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                        <StatusPill status={c.status} />
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "12px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => openEditModal(c)}
                            className="admin-btn-secondary"
                            style={{
                              padding: "5px 12px",
                              borderRadius: 7,
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            Edit
                          </button>
                          {c.status !== "removed" && (
                            <button
                              type="button"
                              onClick={() => openRemoveDialog(c)}
                              style={{
                                padding: "5px 12px",
                                borderRadius: 7,
                                fontSize: 11,
                                fontWeight: 600,
                                background: "rgba(248,113,113,0.08)",
                                color: "#f87171",
                                border: "1px solid rgba(248,113,113,0.2)",
                                cursor: "pointer",
                              }}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Provider Modal ── */}
      <ProviderModal
        open={modalOpen}
        mode={modalMode}
        tabConfig={currentTabConfig}
        initialContractor={editTarget}
        defaultLeadCost={defaultLeadCost}
        defaultCommission={defaultCommission}
        onClose={closeModal}
        onSuccess={handleModalSuccess}
      />

      {/* ── Confirm Remove Dialog ── */}
      <ConfirmRemoveDialog
        open={removeTarget !== null}
        providerName={removeTarget?.contractor_name ?? ""}
        providerLabel={currentTabConfig.label.replace(/s$/, "")}
        onClose={closeRemoveDialog}
        onConfirm={handleConfirmRemove}
        pending={removePending}
      />

      {/* ── Invite Contractor Modal ── */}
      <InviteContractorModal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        onSuccess={(msg) => {
          setInviteSuccess(msg);
          setInviteModalOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
