// src/app/admin/settings/_components/AddUserModal.tsx
"use client";

import * as React from "react";
import {
  ShieldCheckIcon,
  WrenchScrewdriverIcon,
  BuildingOffice2Icon,
  HomeIcon,
  UserGroupIcon,
  MagnifyingGlassCircleIcon,
  SunIcon,
  XMarkIcon,
  ArrowLeftIcon,
  CheckIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";
import { adminCreateUser, adminListBrokers } from "../_actions/users";
import type { AppRole } from "./pills";
import { RolePill } from "./pills";

// ─── Design tokens ──────────────────────────────────────────────────
const BG = "#0f172a";
const CARD = "#1e293b";
const BORDER = "#334155";
const TEXT = "#f1f5f9";
const TEXT_SEC = "#cbd5e1";
const TEXT_MUTED = "#94a3b8";
const TEXT_DIM = "#64748b";
const EMERALD = "#10b981";

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: `1px solid ${BORDER}`,
  background: CARD,
  color: TEXT,
  fontSize: 13,
  fontWeight: 500,
  outline: "none",
};

// ─── Constants ──────────────────────────────────────────────────────

const SERVICE_AREAS = [
  "Portland", "Beaverton", "Lake Oswego", "West Linn", "Tigard", "Tualatin",
  "Hillsboro", "Gresham", "Oregon City", "Milwaukie", "Clackamas", "Happy Valley",
  "Salem", "Eugene", "Bend", "Medford", "Corvallis",
];

const CERTIFICATIONS = ["RESNET", "BPI", "NAHI", "InterNACHI", "ICC", "HERS Rater"];

const SERVICE_TYPES = ["HVAC", "Solar", "Electrical", "Plumbing", "Insulation", "Windows", "Roofing", "Water Heater"];

type RoleCard = {
  id: string;
  role: AppRole;
  label: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  staffType?: string;
};

const ROLE_CARDS: RoleCard[] = [
  { id: "admin", role: "admin", label: "REI Admin", description: "Full system access", icon: ShieldCheckIcon },
  { id: "rei_staff_hes", role: "rei_staff", label: "REI Staff (HES)", description: "HES assessor", icon: SunIcon, staffType: "hes_assessor" },
  { id: "rei_staff_inspector", role: "rei_staff", label: "REI Staff (Inspector)", description: "Home inspector", icon: MagnifyingGlassCircleIcon, staffType: "home_inspector" },
  { id: "broker", role: "broker", label: "Broker", description: "Manages network & leads", icon: BuildingOffice2Icon },
  { id: "contractor", role: "contractor", label: "Contractor", description: "Purchases & works leads", icon: WrenchScrewdriverIcon },
  { id: "affiliate_hes", role: "affiliate", label: "Affiliate (HES)", description: "External HES assessor", icon: SunIcon, staffType: "hes_assessor" },
  { id: "affiliate_inspector", role: "affiliate", label: "Affiliate (Inspector)", description: "External inspector", icon: MagnifyingGlassCircleIcon, staffType: "home_inspector" },
  { id: "homeowner", role: "homeowner", label: "Homeowner", description: "Home energy customer", icon: HomeIcon },
];

// ─── Types ──────────────────────────────────────────────────────────

type BrokerOption = { id: string; email: string; name: string | null };

type FormState = {
  selectedCard: RoleCard | null;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  // Role-specific
  certifications: string[];
  serviceAreas: string[];
  serviceTypes: string[];
  brokerNetworkId: string;
  // Homeowner
  address1: string;
  city: string;
  state: string;
  postalCode: string;
  sourceType: string;
  sourceBrokerId: string;
};

const INITIAL_FORM: FormState = {
  selectedCard: null,
  email: "",
  firstName: "",
  lastName: "",
  phone: "",
  certifications: [],
  serviceAreas: [],
  serviceTypes: [],
  brokerNetworkId: "",
  address1: "",
  city: "",
  state: "OR",
  postalCode: "",
  sourceType: "admin_created",
  sourceBrokerId: "",
};

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

// ─── Component ──────────────────────────────────────────────────────

export default function AddUserModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [step, setStep] = React.useState(1);
  const [form, setForm] = React.useState<FormState>(INITIAL_FORM);
  const [brokers, setBrokers] = React.useState<BrokerOption[]>([]);
  const [brokersLoaded, setBrokersLoaded] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const overlayRef = React.useRef<HTMLDivElement>(null);

  // Load brokers when modal opens
  React.useEffect(() => {
    if (!open) return;
    setStep(1);
    setForm(INITIAL_FORM);
    setError(null);
    setBrokersLoaded(false);
    adminListBrokers().then((b) => { setBrokers(b); setBrokersLoaded(true); }).catch(() => setBrokersLoaded(true));
  }, [open]);

  // Escape key
  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const card = form.selectedCard;
  const role = card?.role;

  // ── Step 1: Select Role ──
  function selectRole(c: RoleCard) {
    setForm({ ...INITIAL_FORM, selectedCard: c });
    setError(null);
    setStep(2);
  }

  // ── Step 2 validation ──
  function validateStep2(): string | null {
    if (!form.email.trim()) return "Email is required.";
    if (!isValidEmail(form.email)) return "Enter a valid email address.";
    if (!form.firstName.trim()) return "First name is required.";
    if (!form.lastName.trim()) return "Last name is required.";
    if (role === "homeowner" && !form.address1.trim()) return "Address is required for homeowners.";
    return null;
  }

  function advanceToStep3() {
    const err = validateStep2();
    if (err) { setError(err); return; }
    setError(null);
    setStep(3);
  }

  // ── Submit ──
  async function handleSubmit(sendInvite: boolean) {
    setSubmitting(true);
    setError(null);
    try {
      const result = await adminCreateUser({
        email: form.email.trim().toLowerCase(),
        role: role!,
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        phone: form.phone.trim() || undefined,
        staff_type: card?.staffType || undefined,
        address1: form.address1.trim() || undefined,
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
        postal_code: form.postalCode.trim() || undefined,
        source_type: role === "homeowner" ? form.sourceType : "admin_created",
        source_broker_id: form.sourceBrokerId || undefined,
        broker_network_id: form.brokerNetworkId || undefined,
        sendInvite,
        revalidate: "/admin/settings/users",
      });

      if (result.ok) {
        onSuccess(result.message || (sendInvite ? `Invite sent to ${form.email}` : `User created: ${form.email}`));
        onClose();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create user.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ──
  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 99990,
        background: "rgba(0,0,0,0.60)", backdropFilter: "blur(4px)",
        display: "grid", placeItems: "center", padding: 24,
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Add user"
    >
      <div style={{
        background: BG, border: `1px solid ${BORDER}`, borderRadius: 16,
        width: "100%", maxWidth: 680, maxHeight: "90vh",
        display: "flex", flexDirection: "column",
        boxShadow: "0 30px 80px rgba(0,0,0,0.50)",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: `1px solid ${BORDER}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {step > 1 && (
              <button
                type="button"
                onClick={() => { setStep(step - 1); setError(null); }}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: `1px solid ${BORDER}`,
                  background: "transparent", color: TEXT_SEC, cursor: "pointer",
                  display: "grid", placeItems: "center",
                }}
                aria-label="Go back"
              >
                <ArrowLeftIcon style={{ width: 16, height: 16 }} />
              </button>
            )}
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>Add User</div>
              <div style={{ fontSize: 12, color: TEXT_DIM, fontWeight: 500 }}>
                {step === 1 ? "Select a role" : step === 2 ? "Enter details" : "Review & confirm"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Step indicator */}
            <div style={{ display: "flex", gap: 6 }}>
              {[1, 2, 3].map((s) => (
                <div key={s} style={{
                  width: 24, height: 24, borderRadius: 12,
                  display: "grid", placeItems: "center",
                  fontSize: 11, fontWeight: 700,
                  background: s === step ? EMERALD : s < step ? "rgba(16,185,129,0.2)" : "rgba(148,163,184,0.1)",
                  color: s === step ? "white" : s < step ? EMERALD : TEXT_DIM,
                  border: `1px solid ${s <= step ? "rgba(16,185,129,0.3)" : "transparent"}`,
                }}>
                  {s < step ? <CheckIcon style={{ width: 12, height: 12 }} /> : s}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 8, border: `1px solid ${BORDER}`,
                background: "transparent", color: TEXT_MUTED, cursor: "pointer",
                display: "grid", placeItems: "center",
              }}
              aria-label="Close"
            >
              <XMarkIcon style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          {error && (
            <div style={{
              marginBottom: 16, padding: "10px 14px", borderRadius: 8,
              border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)",
              fontSize: 13, fontWeight: 600, color: "#f87171",
            }}>
              {error}
            </div>
          )}

          {step === 1 && <Step1SelectRole onSelect={selectRole} />}
          {step === 2 && card && (
            <Step2Details form={form} setForm={setForm} card={card} brokers={brokers} brokersLoaded={brokersLoaded} />
          )}
          {step === 3 && card && (
            <Step3Review form={form} card={card} brokers={brokers} />
          )}
        </div>

        {/* Footer */}
        {step >= 2 && (
          <div style={{
            borderTop: `1px solid ${BORDER}`, padding: "14px 20px",
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
          }}>
            <button
              type="button"
              onClick={() => { setStep(step - 1); setError(null); }}
              style={{
                padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: `1px solid ${BORDER}`, background: CARD, color: TEXT_SEC, cursor: "pointer",
              }}
            >
              Back
            </button>

            {step === 2 && (
              <button
                type="button"
                onClick={advanceToStep3}
                className="admin-btn-primary"
                style={{ padding: "9px 20px", borderRadius: 8, fontSize: 13 }}
              >
                Review
              </button>
            )}

            {step === 3 && (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => handleSubmit(false)}
                  disabled={submitting}
                  className="admin-btn-secondary"
                  style={{ padding: "9px 16px", borderRadius: 8, fontSize: 13, opacity: submitting ? 0.5 : 1 }}
                >
                  {submitting ? "Creating\u2026" : "Create User"}
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit(true)}
                  disabled={submitting}
                  className="admin-btn-primary"
                  style={{
                    padding: "9px 16px", borderRadius: 8, fontSize: 13,
                    display: "flex", alignItems: "center", gap: 6,
                    opacity: submitting ? 0.5 : 1,
                  }}
                >
                  <EnvelopeIcon style={{ width: 14, height: 14 }} />
                  {submitting ? "Creating\u2026" : "Create + Send Invite"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Step 1: Role Selection Grid ────────────────────────────────────

function Step1SelectRole({ onSelect }: { onSelect: (c: RoleCard) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
      {ROLE_CARDS.map((c) => {
        const Icon = c.icon;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c)}
            style={{
              padding: "18px 16px", borderRadius: 12,
              border: `1px solid ${BORDER}`, background: CARD,
              cursor: "pointer", textAlign: "left",
              display: "flex", flexDirection: "column", gap: 8,
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = EMERALD;
              e.currentTarget.style.background = "rgba(16,185,129,0.06)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = BORDER;
              e.currentTarget.style.background = CARD;
            }}
          >
            <Icon style={{ width: 24, height: 24, color: EMERALD }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{c.label}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: TEXT_DIM }}>{c.description}</div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Step 2: Details Form ───────────────────────────────────────────

function Step2Details({
  form, setForm, card, brokers, brokersLoaded,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  card: RoleCard;
  brokers: BrokerOption[];
  brokersLoaded: boolean;
}) {
  const role = card.role;
  const upd = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Role badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <RolePill role={role} />
        <span style={{ fontSize: 12, color: TEXT_DIM }}>{card.label}</span>
      </div>

      {/* Base fields */}
      <FieldLabel label="Email *">
        <input value={form.email} onChange={(e) => upd({ email: e.target.value })} placeholder="name@company.com" type="email" autoComplete="email" style={INPUT_STYLE} />
      </FieldLabel>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <FieldLabel label="First Name *">
          <input value={form.firstName} onChange={(e) => upd({ firstName: e.target.value })} placeholder="First" autoComplete="given-name" style={INPUT_STYLE} />
        </FieldLabel>
        <FieldLabel label="Last Name *">
          <input value={form.lastName} onChange={(e) => upd({ lastName: e.target.value })} placeholder="Last" autoComplete="family-name" style={INPUT_STYLE} />
        </FieldLabel>
      </div>

      <FieldLabel label="Phone">
        <input value={form.phone} onChange={(e) => upd({ phone: e.target.value })} placeholder="(555) 555-5555" autoComplete="tel" style={INPUT_STYLE} />
      </FieldLabel>

      {/* ── REI Staff / Affiliate extras ── */}
      {(role === "rei_staff" || role === "affiliate") && (
        <>
          <FieldLabel label="Staff Type">
            <div style={{ ...INPUT_STYLE, background: "rgba(148,163,184,0.06)", color: TEXT_SEC, cursor: "default" }}>
              {card.staffType === "hes_assessor" ? "HES Assessor" : "Home Inspector"} (auto-set)
            </div>
          </FieldLabel>

          <MultiSelect
            label="Certifications"
            options={CERTIFICATIONS}
            selected={form.certifications}
            onChange={(v) => upd({ certifications: v })}
          />

          <MultiSelect
            label="Service Areas"
            options={SERVICE_AREAS}
            selected={form.serviceAreas}
            onChange={(v) => upd({ serviceAreas: v })}
          />
        </>
      )}

      {/* ── Broker extras ── */}
      {role === "broker" && (
        <MultiSelect
          label="Service Areas"
          options={SERVICE_AREAS}
          selected={form.serviceAreas}
          onChange={(v) => upd({ serviceAreas: v })}
        />
      )}

      {/* ── Broker network (contractor/affiliate) ── */}
      {(role === "contractor" || role === "affiliate") && (
        <FieldLabel label="Add to Broker Network (optional)">
          <select
            value={form.brokerNetworkId}
            onChange={(e) => upd({ brokerNetworkId: e.target.value })}
            style={INPUT_STYLE}
          >
            <option value="">None</option>
            {brokersLoaded ? brokers.map((b) => (
              <option key={b.id} value={b.id}>{b.name || b.email}</option>
            )) : <option disabled>Loading brokers...</option>}
          </select>
        </FieldLabel>
      )}

      {/* ── Homeowner extras ── */}
      {role === "homeowner" && (
        <>
          <FieldLabel label="Address *">
            <input value={form.address1} onChange={(e) => upd({ address1: e.target.value })} placeholder="Street address" autoComplete="address-line1" style={INPUT_STYLE} />
          </FieldLabel>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 100px", gap: 10 }}>
            <FieldLabel label="City">
              <input value={form.city} onChange={(e) => upd({ city: e.target.value })} placeholder="City" autoComplete="address-level2" style={INPUT_STYLE} />
            </FieldLabel>
            <FieldLabel label="State">
              <input value={form.state} onChange={(e) => upd({ state: e.target.value })} placeholder="OR" autoComplete="address-level1" style={INPUT_STYLE} />
            </FieldLabel>
            <FieldLabel label="ZIP">
              <input value={form.postalCode} onChange={(e) => upd({ postalCode: e.target.value })} placeholder="97123" autoComplete="postal-code" style={INPUT_STYLE} />
            </FieldLabel>
          </div>

          <FieldLabel label="Source">
            <select value={form.sourceType} onChange={(e) => upd({ sourceType: e.target.value })} style={INPUT_STYLE}>
              <option value="admin_created">Admin Created</option>
              <option value="rei_direct">REI Direct</option>
              <option value="broker_campaign">Broker Campaign</option>
              <option value="organic_website">Organic Website</option>
            </select>
          </FieldLabel>

          {form.sourceType === "broker_campaign" && (
            <FieldLabel label="Source Broker">
              <select value={form.sourceBrokerId} onChange={(e) => upd({ sourceBrokerId: e.target.value })} style={INPUT_STYLE}>
                <option value="">Select broker...</option>
                {brokersLoaded ? brokers.map((b) => (
                  <option key={b.id} value={b.id}>{b.name || b.email}</option>
                )) : <option disabled>Loading...</option>}
              </select>
            </FieldLabel>
          )}
        </>
      )}
    </div>
  );
}

// ─── Step 3: Review ─────────────────────────────────────────────────

function Step3Review({
  form, card, brokers,
}: {
  form: FormState;
  card: RoleCard;
  brokers: BrokerOption[];
}) {
  const role = card.role;
  const broker = brokers.find((b) => b.id === form.brokerNetworkId);
  const sourceBroker = brokers.find((b) => b.id === form.sourceBrokerId);

  const rows: Array<{ label: string; value: string }> = [
    { label: "Role", value: card.label },
    { label: "Email", value: form.email },
    { label: "Name", value: [form.firstName, form.lastName].filter(Boolean).join(" ") },
  ];

  if (form.phone) rows.push({ label: "Phone", value: form.phone });
  if (card.staffType) rows.push({ label: "Staff Type", value: card.staffType === "hes_assessor" ? "HES Assessor" : "Home Inspector" });
  if (form.certifications.length > 0) rows.push({ label: "Certifications", value: form.certifications.join(", ") });
  if (form.serviceAreas.length > 0) rows.push({ label: "Service Areas", value: form.serviceAreas.join(", ") });
  if (form.serviceTypes.length > 0) rows.push({ label: "Service Types", value: form.serviceTypes.join(", ") });
  if (broker) rows.push({ label: "Broker Network", value: broker.name || broker.email });

  if (role === "homeowner") {
    if (form.address1) rows.push({ label: "Address", value: [form.address1, form.city, form.state, form.postalCode].filter(Boolean).join(", ") });
    const sourceLabels: Record<string, string> = { admin_created: "Admin Created", rei_direct: "REI Direct", broker_campaign: "Broker Campaign", organic_website: "Organic" };
    rows.push({ label: "Source", value: sourceLabels[form.sourceType] || form.sourceType });
    if (sourceBroker) rows.push({ label: "Source Broker", value: sourceBroker.name || sourceBroker.email });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <RolePill role={role} />
        <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{card.label}</span>
      </div>

      <div style={{
        background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12,
        overflow: "hidden",
      }}>
        {rows.map((r, i) => (
          <div
            key={r.label}
            style={{
              display: "grid", gridTemplateColumns: "140px 1fr",
              padding: "10px 16px",
              borderBottom: i < rows.length - 1 ? `1px solid rgba(51,65,85,0.5)` : undefined,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {r.label}
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: TEXT_SEC }}>
              {r.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        padding: "12px 14px", borderRadius: 8,
        border: "1px solid rgba(16,185,129,0.2)", background: "rgba(16,185,129,0.06)",
        fontSize: 12, color: TEXT_SEC, fontWeight: 500,
        display: "flex", alignItems: "flex-start", gap: 8,
      }}>
        <EnvelopeIcon style={{ width: 16, height: 16, color: EMERALD, flexShrink: 0, marginTop: 1 }} />
        <div>
          <strong style={{ color: TEXT }}>Create + Send Invite</strong> will send an invite email to <strong style={{ color: TEXT }}>{form.email}</strong> with a magic link to set up their account.
          <br />
          <span style={{ color: TEXT_DIM }}>Or use &quot;Create User&quot; to create the account without sending an email.</span>
        </div>
      </div>
    </div>
  );
}

// ─── Shared sub-components ──────────────────────────────────────────

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function MultiSelect({
  label, options, selected, onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  function toggle(item: string) {
    onChange(selected.includes(item) ? selected.filter((s) => s !== item) : [...selected, item]);
  }

  return (
    <FieldLabel label={label}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {options.map((opt) => {
          const isOn = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              style={{
                padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                border: `1px solid ${isOn ? "rgba(16,185,129,0.3)" : BORDER}`,
                background: isOn ? "rgba(16,185,129,0.12)" : "transparent",
                color: isOn ? EMERALD : TEXT_MUTED,
                cursor: "pointer", transition: "all 0.12s ease",
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </FieldLabel>
  );
}
