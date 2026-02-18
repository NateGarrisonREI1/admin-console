// src/app/(app)/contractor/profile/ProfileClient.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PencilSquareIcon, CheckIcon, XMarkIcon } from "@heroicons/react/20/solid";
import type { ContractorProfileData } from "../_actions/contractor";
import { updateContractorProfile } from "../_actions/contractor";

// ─── Design tokens ──────────────────────────────────────────────────
const CARD = "#1e293b";
const BORDER = "#334155";
const TEXT = "#f1f5f9";
const TEXT_SEC = "#cbd5e1";
const TEXT_DIM = "#64748b";
const TEXT_MUTED = "#94a3b8";
const EMERALD = "#10b981";

const TRADES = [
  { value: "hvac", label: "HVAC" },
  { value: "water_heater", label: "Water Heater" },
  { value: "solar", label: "Solar" },
  { value: "electrical", label: "Electrical" },
  { value: "plumbing", label: "Plumbing" },
];

const AREAS = [
  "Portland Metro", "Beaverton", "Lake Oswego", "West Linn", "Tigard",
  "Tualatin", "Hillsboro", "Gresham", "Oregon City", "Milwaukie",
  "Clackamas", "Happy Valley", "Salem", "Eugene", "Bend", "Medford", "Corvallis",
];

const CERT_MAP: Record<string, string[]> = {
  hvac: ["EPA 608", "NATE Certified", "HVAC Excellence"],
  water_heater: ["Licensed Plumber", "Gas Fitting License"],
  solar: ["NABCEP", "Solar PV Installer"],
  electrical: ["Licensed Electrician", "Master Electrician"],
  plumbing: ["Licensed Plumber", "Master Plumber", "Backflow Certified"],
};

// ─── Helpers ────────────────────────────────────────────────────────

function computeCompleteness(p: ContractorProfileData): number {
  let filled = 0;
  let total = 5;
  if (p.company_name) filled++;
  if (p.phone || p.email) filled++;
  if (p.system_specialties.length > 0) filled++;
  if (p.service_zip_codes.length > 0) filled++;
  if (p.stripe_customer_id) filled++;
  return Math.round((filled / total) * 100);
}

function Pill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "6px 14px",
        borderRadius: 20,
        border: `1px solid ${active ? EMERALD : BORDER}`,
        background: active ? "rgba(16,185,129,0.15)" : "transparent",
        color: active ? EMERALD : TEXT_MUTED,
        fontSize: 12,
        fontWeight: 600,
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.15s ease",
      }}
    >
      {label}
    </button>
  );
}

function IconBtn({
  title,
  onClick,
  hoverColor,
  children,
}: {
  title: string;
  onClick: () => void;
  hoverColor?: string;
  children: React.ReactNode;
}) {
  const defaultColor = TEXT_MUTED;
  const hover = hoverColor ?? TEXT;
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 4,
        color: defaultColor,
        transition: "color 0.15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = hover; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = defaultColor; }}
    >
      {children}
    </button>
  );
}

// ─── Section Components ─────────────────────────────────────────────

function CompanyInfoSection({
  profile,
  onSaved,
}: {
  profile: ContractorProfileData;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [companyName, setCompanyName] = useState(profile.company_name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [email, setEmail] = useState(profile.email ?? "");
  const [license, setLicense] = useState(profile.license_number ?? "");
  const [website, setWebsite] = useState(profile.website ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const result = await updateContractorProfile({
        company_name: companyName || null,
        phone: phone || null,
        email: email || null,
        license_number: license || null,
        website: website || null,
      });
      if (!result.success) throw new Error(result.error || "Save failed");
      setEditing(false);
      onSaved();
    } catch (e) {
      alert("Save failed: " + (e instanceof Error ? e.message : "Unknown"));
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    background: "#0f172a",
    border: `1px solid ${BORDER}`,
    borderRadius: 6,
    color: TEXT,
    padding: "8px 12px",
    fontSize: 13,
    width: "100%",
    outline: "none",
  };

  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ color: TEXT, fontSize: 15, fontWeight: 700, margin: 0 }}>Company Information</h3>
        {!editing ? (
          <IconBtn title="Edit" onClick={() => setEditing(true)}>
            <PencilSquareIcon style={{ width: 16, height: 16 }} />
          </IconBtn>
        ) : (
          <div style={{ display: "flex", gap: 4 }}>
            <IconBtn title="Save" onClick={handleSave} hoverColor={EMERALD}>
              <CheckIcon style={{ width: 16, height: 16 }} />
            </IconBtn>
            <IconBtn title="Cancel" onClick={() => setEditing(false)} hoverColor="#ef4444">
              <XMarkIcon style={{ width: 16, height: 16 }} />
            </IconBtn>
          </div>
        )}
      </div>

      {editing ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 600, marginBottom: 4, display: "block" }}>Company Name</label>
            <input className="admin-input" style={inputStyle} value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 600, marginBottom: 4, display: "block" }}>Phone</label>
            <input className="admin-input" style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 600, marginBottom: 4, display: "block" }}>Email</label>
            <input className="admin-input" style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 600, marginBottom: 4, display: "block" }}>License Number</label>
            <input className="admin-input" style={inputStyle} value={license} onChange={(e) => setLicense(e.target.value)} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 600, marginBottom: 4, display: "block" }}>Website</label>
            <input className="admin-input" style={inputStyle} value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            ["Company Name", profile.company_name],
            ["Phone", profile.phone],
            ["Email", profile.email],
            ["License", profile.license_number],
            ["Website", profile.website],
          ].map(([label, val]) => (
            <div key={label as string}>
              <div style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 600, marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 13, color: val ? TEXT_SEC : TEXT_DIM }}>{(val as string) || "—"}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ServicesSection({
  profile,
  onSaved,
}: {
  profile: ContractorProfileData;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<string[]>(profile.system_specialties);
  const [saving, setSaving] = useState(false);

  function toggle(val: string) {
    setSelected((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const result = await updateContractorProfile({ system_specialties: selected });
      if (!result.success) throw new Error(result.error || "Save failed");
      setEditing(false);
      onSaved();
    } catch (e) {
      alert("Save failed: " + (e instanceof Error ? e.message : "Unknown"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ color: TEXT, fontSize: 15, fontWeight: 700, margin: 0 }}>Services</h3>
        {!editing ? (
          <IconBtn title="Edit" onClick={() => setEditing(true)}>
            <PencilSquareIcon style={{ width: 16, height: 16 }} />
          </IconBtn>
        ) : (
          <div style={{ display: "flex", gap: 4 }}>
            <IconBtn title="Save" onClick={handleSave} hoverColor={EMERALD}>
              <CheckIcon style={{ width: 16, height: 16 }} />
            </IconBtn>
            <IconBtn title="Cancel" onClick={() => { setSelected(profile.system_specialties); setEditing(false); }} hoverColor="#ef4444">
              <XMarkIcon style={{ width: 16, height: 16 }} />
            </IconBtn>
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {TRADES.map((t) => (
          <Pill
            key={t.value}
            label={t.label}
            active={editing ? selected.includes(t.value) : profile.system_specialties.includes(t.value)}
            onClick={editing ? () => toggle(t.value) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function AreasSection({
  profile,
  onSaved,
}: {
  profile: ContractorProfileData;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<string[]>(profile.service_zip_codes);
  const [saving, setSaving] = useState(false);

  function toggle(val: string) {
    setSelected((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const result = await updateContractorProfile({ service_zip_codes: selected });
      if (!result.success) throw new Error(result.error || "Save failed");
      setEditing(false);
      onSaved();
    } catch (e) {
      alert("Save failed: " + (e instanceof Error ? e.message : "Unknown"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ color: TEXT, fontSize: 15, fontWeight: 700, margin: 0 }}>Service Areas</h3>
        {!editing ? (
          <IconBtn title="Edit" onClick={() => setEditing(true)}>
            <PencilSquareIcon style={{ width: 16, height: 16 }} />
          </IconBtn>
        ) : (
          <div style={{ display: "flex", gap: 4 }}>
            <IconBtn title="Save" onClick={handleSave} hoverColor={EMERALD}>
              <CheckIcon style={{ width: 16, height: 16 }} />
            </IconBtn>
            <IconBtn title="Cancel" onClick={() => { setSelected(profile.service_zip_codes); setEditing(false); }} hoverColor="#ef4444">
              <XMarkIcon style={{ width: 16, height: 16 }} />
            </IconBtn>
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {AREAS.map((a) => (
          <Pill
            key={a}
            label={a}
            active={editing ? selected.includes(a) : profile.service_zip_codes.includes(a)}
            onClick={editing ? () => toggle(a) : undefined}
          />
        ))}
      </div>
      {(editing ? selected : profile.service_zip_codes).length === 0 && (
        <div style={{ color: TEXT_DIM, fontSize: 12, marginTop: 8 }}>No service areas selected.</div>
      )}
    </div>
  );
}

function CertificationsSection({ profile }: { profile: ContractorProfileData }) {
  const availableCerts: string[] = [];
  for (const spec of profile.system_specialties) {
    for (const cert of CERT_MAP[spec] ?? []) {
      if (!availableCerts.includes(cert)) availableCerts.push(cert);
    }
  }

  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
      <h3 style={{ color: TEXT, fontSize: 15, fontWeight: 700, margin: "0 0 16px" }}>Certifications</h3>
      {availableCerts.length === 0 ? (
        <div style={{ color: TEXT_DIM, fontSize: 13 }}>Select service types to see available certifications.</div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {availableCerts.map((c) => (
            <Pill key={c} label={c} active={false} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export default function ProfileClient({ profile }: { profile: ContractorProfileData }) {
  const router = useRouter();
  const refresh = () => router.refresh();
  const completeness = computeCompleteness(profile);

  return (
    <div style={{ padding: 28 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: TEXT, fontSize: 22, fontWeight: 700, margin: 0 }}>Profile</h1>
        <p style={{ color: TEXT_DIM, fontSize: 13, margin: "4px 0 0" }}>
          Manage your business information and service preferences.
        </p>
      </div>

      {/* Completeness Bar */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ color: TEXT_SEC, fontSize: 13, fontWeight: 600 }}>Profile Completeness</span>
          <span style={{ color: completeness === 100 ? EMERALD : TEXT_MUTED, fontSize: 13, fontWeight: 700 }}>
            {completeness}%
          </span>
        </div>
        <div style={{ width: "100%", height: 6, borderRadius: 3, background: "#0f172a" }}>
          <div
            style={{
              width: `${completeness}%`,
              height: "100%",
              borderRadius: 3,
              background: completeness === 100 ? EMERALD : "#3b82f6",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      {/* Sections */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <CompanyInfoSection profile={profile} onSaved={refresh} />
        <ServicesSection profile={profile} onSaved={refresh} />
        <AreasSection profile={profile} onSaved={refresh} />
        <CertificationsSection profile={profile} />
      </div>
    </div>
  );
}
