"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ContractorProfileData } from "../_actions/contractor";
import { updateContractorProfile } from "../_actions/contractor";

// ─── Design Tokens ──────────────────────────────────────────────────
const BG = "#0f172a";
const CARD = "#1e293b";
const BORDER = "#334155";
const TEXT = "#f1f5f9";
const TEXT_SEC = "#cbd5e1";
const TEXT_DIM = "#64748b";
const TEXT_MUTED = "#94a3b8";
const EMERALD = "#10b981";

// ─── Trade definitions ──────────────────────────────────────────────
const ACTIVE_TRADES: {
  value: string;
  label: string;
  accent: string;
  icon: string;
}[] = [
  { value: "hvac", label: "HVAC", accent: "#f97316", icon: "flame" },
  { value: "water_heater", label: "Water Heater", accent: "#3b82f6", icon: "droplet" },
  { value: "solar", label: "Solar", accent: "#eab308", icon: "sun" },
  { value: "electrical", label: "Electrical", accent: "#f59e0b", icon: "zap" },
  { value: "plumbing", label: "Plumbing", accent: "#06b6d4", icon: "wrench" },
  { value: "general_handyman", label: "General Handyman", accent: "#8b5cf6", icon: "wrench" },
];

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

// ─── Step labels (4 steps) ───────────────────────────────────────────
const STEP_LABELS = ["Company", "Services", "Areas", "Payment"];

// ─── Simple SVG icons for trades ────────────────────────────────────
function TradeIcon({ icon, color, size = 28 }: { icon: string; color: string; size?: number }) {
  const s: React.CSSProperties = { width: size, height: size };
  switch (icon) {
    case "flame":
      return (
        <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
      );
    case "droplet":
      return (
        <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
        </svg>
      );
    case "sun":
      return (
        <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      );
    case "zap":
      return (
        <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    case "wrench":
      return (
        <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      );
    default:
      return null;
  }
}

// ─── Checkmark SVG ──────────────────────────────────────────────────
function Checkmark({ size = 16, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ─── Main component ─────────────────────────────────────────────────
export default function OnboardingClient({ profile }: { profile: ContractorProfileData }) {
  const router = useRouter();

  // Step state (4 steps total)
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Company Info
  const [company_name, setCompanyName] = useState(profile.company_name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [email, setEmail] = useState(profile.email ?? "");

  // Step 2: Services
  const [specialties, setSpecialties] = useState<string[]>(profile.system_specialties ?? []);

  // Step 3: Areas
  const [serviceAreas, setServiceAreas] = useState<string[]>(profile.service_zip_codes ?? []);

  // Step 4: Payment
  const [paymentSkipped, setPaymentSkipped] = useState(false);

  // Hover states for buttons
  const [nextHover, setNextHover] = useState(false);
  const [backHover, setBackHover] = useState(false);

  // ─── Validation ─────────────────────────────────────────────────
  function isStepValid(s: number): boolean {
    switch (s) {
      case 1:
        return company_name.trim().length > 0;
      case 2:
        return specialties.length > 0;
      case 3:
        return serviceAreas.length > 0;
      case 4:
        return true; // skip allowed
      default:
        return false;
    }
  }

  // ─── Save step data ─────────────────────────────────────────────
  async function saveStepData(s: number) {
    setSaving(true);
    setError(null);
    try {
      switch (s) {
        case 1:
          await updateContractorProfile({
            company_name: company_name.trim(),
            phone: phone.trim() || null,
            email: email.trim() || null,
          });
          break;
        case 2:
          await updateContractorProfile({
            system_specialties: specialties,
            service_types: specialties,
          });
          break;
        case 3:
          await updateContractorProfile({
            service_zip_codes: serviceAreas,
            service_areas: serviceAreas,
          });
          break;
      }
    } finally {
      setSaving(false);
    }
  }

  // ─── Navigation handlers ────────────────────────────────────────
  async function handleNext() {
    if (!isStepValid(step)) return;
    setError(null);
    try {
      await saveStepData(step);
      if (step < 4) {
        setStep(step + 1);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save. Please try again.");
    }
  }

  async function handleComplete() {
    setSaving(true);
    setError(null);
    try {
      // Final bulk save of all data + mark onboarding complete
      await updateContractorProfile({
        company_name: company_name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        system_specialties: specialties,
        service_types: specialties,
        service_zip_codes: serviceAreas,
        service_areas: serviceAreas,
        onboarding_complete: true,
      });
      router.push("/contractor/dashboard");
    } catch (e) {
      setSaving(false);
      setError(e instanceof Error ? e.message : "Failed to complete setup. Please try again.");
    }
  }

  function handleBack() {
    if (step > 1) {
      setError(null);
      setStep(step - 1);
    }
  }

  // ─── Toggle helpers ─────────────────────────────────────────────
  function toggleSpecialty(val: string) {
    setSpecialties((prev) =>
      prev.includes(val) ? prev.filter((s) => s !== val) : [...prev, val]
    );
  }

  function toggleArea(val: string) {
    setServiceAreas((prev) =>
      prev.includes(val) ? prev.filter((s) => s !== val) : [...prev, val]
    );
  }

  // ─── Input style helper ───────────────────────────────────────────
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
            Let&apos;s get your contractor account set up
          </p>
        </div>

        {/* Step Indicator */}
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            {STEP_LABELS.map((label, i) => {
              const stepNum = i + 1;
              const isActive = stepNum === step;
              const isCompleted = stepNum < step;

              return (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flex: i < STEP_LABELS.length - 1 ? 1 : undefined,
                  }}
                >
                  {/* Circle + Label column */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        fontWeight: 600,
                        border: `2px solid ${isActive || isCompleted ? EMERALD : BORDER}`,
                        background: isActive ? EMERALD : "transparent",
                        color: isActive ? "#fff" : isCompleted ? EMERALD : TEXT_DIM,
                        transition: "all 0.2s ease",
                      }}
                    >
                      {isCompleted ? <Checkmark size={16} color={EMERALD} /> : stepNum}
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: isActive ? EMERALD : isCompleted ? TEXT_SEC : TEXT_DIM,
                        marginTop: 6,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {label}
                    </span>
                  </div>

                  {/* Connecting line */}
                  {i < STEP_LABELS.length - 1 && (
                    <div
                      style={{
                        flex: 1,
                        height: 2,
                        background: isCompleted ? EMERALD : BORDER,
                        marginLeft: 8,
                        marginRight: 8,
                        marginBottom: 22,
                        transition: "background 0.2s ease",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "#fca5a5",
              fontSize: 13,
              fontWeight: 500,
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 16 }}>!</span>
            {error}
          </div>
        )}

        {/* Step Content Card */}
        <div
          style={{
            background: CARD,
            borderRadius: 12,
            padding: 28,
            border: `1px solid ${BORDER}`,
            marginBottom: 24,
          }}
        >
          {/* ─── Step 1: Company Info ─────────────────────────────── */}
          {step === 1 && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: TEXT, margin: 0 }}>
                Company Information
              </h2>
              <p style={{ fontSize: 14, color: TEXT_SEC, marginTop: 4, marginBottom: 24 }}>
                Tell us about your business
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Company Name */}
                <div>
                  <label style={labelStyle}>
                    Company Name <span style={{ color: EMERALD }}>*</span>
                  </label>
                  <input
                    className="admin-input"
                    value={company_name}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Your company name"
                    style={inputStyle}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  {/* Phone */}
                  <div>
                    <label style={labelStyle}>Phone</label>
                    <input
                      className="admin-input"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(555) 123-4567"
                      style={inputStyle}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input
                      className="admin-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      type="email"
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── Step 2: Services ────────────────────────────────── */}
          {step === 2 && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: TEXT, margin: 0 }}>
                Service Types
              </h2>
              <p style={{ fontSize: 14, color: TEXT_SEC, marginTop: 4, marginBottom: 24 }}>
                Select the trades you handle
              </p>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                {ACTIVE_TRADES.map((trade) => {
                  const selected = specialties.includes(trade.value);
                  return (
                    <button
                      key={trade.value}
                      onClick={() => toggleSpecialty(trade.value)}
                      style={{
                        width: 120,
                        height: 100,
                        borderRadius: 10,
                        border: `2px solid ${selected ? EMERALD : BORDER}`,
                        background: selected ? `${EMERALD}15` : BG,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        cursor: "pointer",
                        position: "relative",
                        transition: "all 0.15s ease",
                        padding: 8,
                      }}
                    >
                      {selected && (
                        <div
                          style={{
                            position: "absolute",
                            top: 6,
                            right: 6,
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            background: EMERALD,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Checkmark size={11} color="#fff" />
                        </div>
                      )}
                      <TradeIcon icon={trade.icon} color={selected ? EMERALD : trade.accent} />
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: selected ? EMERALD : TEXT,
                          textAlign: "center",
                          lineHeight: 1.2,
                        }}
                      >
                        {trade.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── Step 3: Service Areas ───────────────────────────── */}
          {step === 3 && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: TEXT, margin: 0 }}>
                Service Areas
              </h2>
              <p style={{ fontSize: 14, color: TEXT_SEC, marginTop: 4, marginBottom: 24 }}>
                Where do you operate?
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {SERVICE_AREAS.map((area) => {
                  const selected = serviceAreas.includes(area);
                  return (
                    <button
                      key={area}
                      onClick={() => toggleArea(area)}
                      style={{
                        padding: "8px 16px",
                        borderRadius: 20,
                        border: `1px solid ${selected ? EMERALD : BORDER}`,
                        background: selected ? EMERALD : CARD,
                        color: selected ? "#fff" : TEXT_MUTED,
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: "pointer",
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

          {/* ─── Step 4: Payment ──────────────────────────────────── */}
          {step === 4 && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: TEXT, margin: 0 }}>
                Payment Method
              </h2>
              <p style={{ fontSize: 14, color: TEXT_SEC, marginTop: 4, marginBottom: 24 }}>
                Add a card for purchasing leads
              </p>

              {/* Placeholder card */}
              <div
                style={{
                  borderRadius: 12,
                  border: `1px dashed ${BORDER}`,
                  background: BG,
                  padding: "40px 24px",
                  textAlign: "center",
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 12,
                    background: CARD,
                    border: `1px solid ${BORDER}`,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                  }}
                >
                  <svg
                    width={28}
                    height={28}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={TEXT_DIM}
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                </div>
                <p style={{ fontSize: 15, fontWeight: 500, color: TEXT_SEC, margin: 0 }}>
                  Stripe payment setup will be integrated here
                </p>
                <p
                  style={{
                    fontSize: 13,
                    color: TEXT_DIM,
                    marginTop: 8,
                    marginBottom: 0,
                  }}
                >
                  You&apos;ll need a payment method before purchasing leads
                </p>
              </div>

              {!paymentSkipped && (
                <button
                  onClick={() => setPaymentSkipped(true)}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "12px 20px",
                    borderRadius: 8,
                    border: `1px solid ${BORDER}`,
                    background: "transparent",
                    color: TEXT_SEC,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.background = `${CARD}`;
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.background = "transparent";
                  }}
                >
                  Skip for Now
                </button>
              )}

              {paymentSkipped && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: 12,
                    borderRadius: 8,
                    background: `${EMERALD}15`,
                    border: `1px solid ${EMERALD}40`,
                  }}
                >
                  <Checkmark size={16} color={EMERALD} />
                  <span style={{ fontSize: 14, fontWeight: 500, color: EMERALD }}>
                    Payment step skipped - you can add a card later in Settings
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {/* Back button */}
          <button
            onClick={handleBack}
            disabled={step === 1 || saving}
            onMouseEnter={() => setBackHover(true)}
            onMouseLeave={() => setBackHover(false)}
            style={{
              padding: "10px 24px",
              borderRadius: 8,
              border: `1px solid ${step === 1 ? BORDER : backHover ? TEXT_SEC : TEXT_DIM}`,
              background: "transparent",
              color: step === 1 ? TEXT_DIM : backHover ? TEXT : TEXT_SEC,
              fontSize: 14,
              fontWeight: 500,
              cursor: step === 1 ? "not-allowed" : "pointer",
              opacity: step === 1 ? 0.4 : 1,
              transition: "all 0.15s ease",
            }}
          >
            Back
          </button>

          {/* Next / Complete button */}
          {step < 4 ? (
            <button
              onClick={handleNext}
              disabled={!isStepValid(step) || saving}
              onMouseEnter={() => setNextHover(true)}
              onMouseLeave={() => setNextHover(false)}
              style={{
                padding: "10px 32px",
                borderRadius: 8,
                border: "none",
                background:
                  !isStepValid(step) || saving
                    ? TEXT_DIM
                    : nextHover
                      ? "#059669"
                      : EMERALD,
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
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
              style={{
                padding: "10px 32px",
                borderRadius: 8,
                border: "none",
                background: saving
                  ? TEXT_DIM
                  : nextHover
                    ? "#059669"
                    : EMERALD,
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
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
