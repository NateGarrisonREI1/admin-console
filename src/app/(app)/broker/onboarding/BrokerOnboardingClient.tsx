"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateBrokerOnboarding } from "./actions";
import type { BrokerOnboardingData } from "./actions";

// ─── Design Tokens (match contractor onboarding) ────────────────────
const BG = "#0f172a";
const CARD = "#1e293b";
const BORDER = "#334155";
const TEXT = "#f1f5f9";
const TEXT_SEC = "#cbd5e1";
const TEXT_DIM = "#64748b";
const TEXT_MUTED = "#94a3b8";
const EMERALD = "#10b981";

// ─── Service areas ──────────────────────────────────────────────────
const SERVICE_AREAS = [
  "Portland Metro",
  "Beaverton",
  "Lake Oswego",
  "West Linn",
  "Tigard",
  "Tualatin",
  "Hillsboro",
  "Gresham",
  "Oregon City",
  "Milwaukie",
  "Clackamas",
  "Happy Valley",
  "Salem",
  "Eugene",
  "Bend",
  "Medford",
  "Corvallis",
];

// ─── Brand color presets ────────────────────────────────────────────
const BRAND_COLORS = [
  { value: "#10b981", label: "Emerald" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#8b5cf6", label: "Purple" },
  { value: "#f97316", label: "Orange" },
  { value: "#ef4444", label: "Red" },
  { value: "#eab308", label: "Yellow" },
  { value: "#06b6d4", label: "Cyan" },
  { value: "#ec4899", label: "Pink" },
];

// ─── Step labels ────────────────────────────────────────────────────
const STEP_LABELS = ["Company", "Areas", "Branding"];

// ─── Checkmark SVG ──────────────────────────────────────────────────
function Checkmark({ size = 16, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ─── Main component ─────────────────────────────────────────────────
export default function BrokerOnboardingClient({ profile }: { profile: BrokerOnboardingData }) {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Company Info
  const [companyName, setCompanyName] = useState(profile.company_name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [email, setEmail] = useState(profile.email ?? "");
  const [website, setWebsite] = useState(profile.website ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");

  // Step 2: Service Areas
  const [serviceAreas, setServiceAreas] = useState<string[]>(profile.service_areas ?? []);

  // Step 3: Branding
  const [brandColor, setBrandColor] = useState(profile.brand_color ?? "#10b981");
  const [tagline, setTagline] = useState(profile.tagline ?? "");

  // Hover states
  const [nextHover, setNextHover] = useState(false);
  const [backHover, setBackHover] = useState(false);

  // ─── Validation ─────────────────────────────────────────────────
  function isStepValid(s: number): boolean {
    switch (s) {
      case 1: return companyName.trim().length > 0;
      case 2: return serviceAreas.length > 0;
      case 3: return true;
      default: return false;
    }
  }

  // ─── Save step data ─────────────────────────────────────────────
  async function saveStepData(s: number) {
    setSaving(true);
    setError(null);
    try {
      switch (s) {
        case 1:
          await updateBrokerOnboarding({
            company_name: companyName.trim(),
            phone: phone.trim() || null,
            email: email.trim() || null,
          });
          break;
        case 2:
          await updateBrokerOnboarding({ service_areas: serviceAreas });
          break;
      }
    } finally {
      setSaving(false);
    }
  }

  // ─── Navigation ─────────────────────────────────────────────────
  async function handleNext() {
    if (!isStepValid(step)) return;
    setError(null);
    try {
      await saveStepData(step);
      if (step < 3) setStep(step + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save. Please try again.");
    }
  }

  async function handleComplete() {
    setSaving(true);
    setError(null);
    try {
      await updateBrokerOnboarding({
        company_name: companyName.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        onboarding_complete: true,
      });
      router.push("/broker/dashboard");
    } catch (e) {
      setSaving(false);
      setError(e instanceof Error ? e.message : "Failed to complete setup. Please try again.");
    }
  }

  function handleBack() {
    if (step > 1) { setError(null); setStep(step - 1); }
  }

  function toggleArea(val: string) {
    setServiceAreas((prev) =>
      prev.includes(val) ? prev.filter((s) => s !== val) : [...prev, val]
    );
  }

  // ─── Styles ─────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: `1px solid ${BORDER}`,
    background: BG,
    color: TEXT,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 13,
    fontWeight: 500,
    color: TEXT_SEC,
    marginBottom: 6,
  };

  // ─── Render ─────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: "100vh",
        background: BG,
        display: "flex",
        justifyContent: "center",
        padding: "40px 16px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 680 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: TEXT, margin: 0 }}>
            Welcome to REI
          </h1>
          <p style={{ fontSize: 14, color: TEXT_SEC, marginTop: 6 }}>
            Let&apos;s get your broker account set up
          </p>
        </div>

        {/* Step Indicator */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            {STEP_LABELS.map((label, i) => {
              const stepNum = i + 1;
              const isActive = stepNum === step;
              const isCompleted = stepNum < step;

              return (
                <div key={label} style={{ display: "flex", alignItems: "center", flex: i < STEP_LABELS.length - 1 ? 1 : undefined }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative", zIndex: 1 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, fontWeight: 600,
                      border: `2px solid ${isActive || isCompleted ? EMERALD : BORDER}`,
                      background: isActive ? EMERALD : "transparent",
                      color: isActive ? "#fff" : isCompleted ? EMERALD : TEXT_DIM,
                      transition: "all 0.2s ease",
                    }}>
                      {isCompleted ? <Checkmark size={16} color={EMERALD} /> : stepNum}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 500, color: isActive ? EMERALD : isCompleted ? TEXT_SEC : TEXT_DIM, marginTop: 6, whiteSpace: "nowrap" }}>
                      {label}
                    </span>
                  </div>

                  {i < STEP_LABELS.length - 1 && (
                    <div style={{ flex: 1, height: 2, background: isCompleted ? EMERALD : BORDER, marginLeft: 8, marginRight: 8, marginBottom: 22, transition: "background 0.2s ease" }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div style={{
            padding: "10px 16px", borderRadius: 8,
            background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
            color: "#fca5a5", fontSize: 13, fontWeight: 500, marginBottom: 16,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 16 }}>!</span>
            {error}
          </div>
        )}

        {/* Step Content Card */}
        <div style={{ background: CARD, borderRadius: 12, padding: 28, border: `1px solid ${BORDER}`, marginBottom: 24 }}>

          {/* ─── Step 1: Company Info ─────────────────────────── */}
          {step === 1 && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: TEXT, margin: 0 }}>Company Information</h2>
              <p style={{ fontSize: 14, color: TEXT_SEC, marginTop: 4, marginBottom: 24 }}>Tell us about your brokerage</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Company / Brokerage Name <span style={{ color: EMERALD }}>*</span></label>
                  <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Your company name" style={inputStyle} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Phone</label>
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" type="email" style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Website</label>
                  <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yourcompany.com" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Bio / Description</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell contractors and homeowners about your brokerage..."
                    rows={3}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ─── Step 2: Service Areas ────────────────────────── */}
          {step === 2 && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: TEXT, margin: 0 }}>Service Areas</h2>
              <p style={{ fontSize: 14, color: TEXT_SEC, marginTop: 4, marginBottom: 24 }}>Where does your brokerage operate?</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {SERVICE_AREAS.map((area) => {
                  const selected = serviceAreas.includes(area);
                  return (
                    <button
                      key={area}
                      onClick={() => toggleArea(area)}
                      type="button"
                      style={{
                        padding: "8px 16px", borderRadius: 20,
                        border: `1px solid ${selected ? EMERALD : BORDER}`,
                        background: selected ? EMERALD : CARD,
                        color: selected ? "#fff" : TEXT_MUTED,
                        fontSize: 13, fontWeight: 500, cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {area}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── Step 3: Branding ─────────────────────────────── */}
          {step === 3 && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: TEXT, margin: 0 }}>Branding</h2>
              <p style={{ fontSize: 14, color: TEXT_SEC, marginTop: 4, marginBottom: 24 }}>Customize your broker profile</p>

              {/* Brand color */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Primary Brand Color</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {BRAND_COLORS.map((c) => {
                    const selected = brandColor === c.value;
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setBrandColor(c.value)}
                        title={c.label}
                        style={{
                          width: 40, height: 40, borderRadius: 10,
                          background: c.value,
                          border: selected ? "3px solid #fff" : `2px solid ${BORDER}`,
                          cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all 0.15s ease",
                          boxShadow: selected ? `0 0 12px ${c.value}50` : "none",
                        }}
                      >
                        {selected && <Checkmark size={18} color="#fff" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Logo placeholder */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Company Logo</label>
                <div style={{
                  borderRadius: 12, border: `1px dashed ${BORDER}`, background: BG,
                  padding: "32px 24px", textAlign: "center",
                }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12, background: CARD,
                    border: `1px solid ${BORDER}`, display: "inline-flex",
                    alignItems: "center", justifyContent: "center", marginBottom: 12,
                  }}>
                    <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={TEXT_DIM} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: TEXT_DIM, margin: 0 }}>
                    Logo upload coming soon
                  </p>
                </div>
              </div>

              {/* Tagline */}
              <div>
                <label style={labelStyle}>Tagline</label>
                <input
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Your brokerage tagline..."
                  style={inputStyle}
                />
              </div>
            </div>
          )}
        </div>

        {/* Navigation Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            onClick={handleBack}
            disabled={step === 1 || saving}
            onMouseEnter={() => setBackHover(true)}
            onMouseLeave={() => setBackHover(false)}
            type="button"
            style={{
              padding: "10px 24px", borderRadius: 8,
              border: `1px solid ${step === 1 ? BORDER : backHover ? TEXT_SEC : TEXT_DIM}`,
              background: "transparent",
              color: step === 1 ? TEXT_DIM : backHover ? TEXT : TEXT_SEC,
              fontSize: 14, fontWeight: 500,
              cursor: step === 1 ? "not-allowed" : "pointer",
              opacity: step === 1 ? 0.4 : 1,
              transition: "all 0.15s ease",
            }}
          >
            Back
          </button>

          {step < 3 ? (
            <button
              onClick={handleNext}
              disabled={!isStepValid(step) || saving}
              onMouseEnter={() => setNextHover(true)}
              onMouseLeave={() => setNextHover(false)}
              type="button"
              style={{
                padding: "10px 32px", borderRadius: 8, border: "none",
                background: !isStepValid(step) || saving ? TEXT_DIM : nextHover ? "#059669" : EMERALD,
                color: "#fff", fontSize: 14, fontWeight: 600,
                cursor: !isStepValid(step) || saving ? "not-allowed" : "pointer",
                opacity: !isStepValid(step) ? 0.5 : 1,
                transition: "all 0.15s ease",
              }}
            >
              {saving ? "Saving..." : "Next"}
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={saving}
              onMouseEnter={() => setNextHover(true)}
              onMouseLeave={() => setNextHover(false)}
              type="button"
              style={{
                padding: "10px 32px", borderRadius: 8, border: "none",
                background: saving ? TEXT_DIM : nextHover ? "#059669" : EMERALD,
                color: "#fff", fontSize: 14, fontWeight: 600,
                cursor: saving ? "not-allowed" : "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {saving ? "Completing..." : "Complete Setup"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
