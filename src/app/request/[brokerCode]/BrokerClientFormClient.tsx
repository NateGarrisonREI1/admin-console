// src/app/request/[brokerCode]/BrokerClientFormClient.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  fetchServiceAddons,
  submitBrokerClientRequest,
  type BrokerInfo,
  type ClientFormResult,
} from "./actions";
import type { ServiceCategory, ServiceAddon } from "@/app/request/actions";

// ─── Dark theme constants (matches broker portal) ───────────────────
const CARD = "#1e293b";
const BG = "#0f172a";
const BORDER = "#334155";
const TEXT = "#f1f5f9";
const TEXT_SEC = "#cbd5e1";
const TEXT_DIM = "#64748b";
const TEXT_MUTED = "#94a3b8";
const EMERALD = "#10b981";
const EMERALD_BG = "rgba(16,185,129,0.08)";
const EMERALD_BORDER = "rgba(16,185,129,0.3)";
const RED = "#ef4444";
const RED_BORDER = "rgba(239,68,68,0.4)";

const TIME_OPTIONS = [
  { value: "Morning (8am\u201312pm)", label: "Morning" },
  { value: "Afternoon (12\u20134pm)", label: "Afternoon" },
  { value: "Flexible", label: "Flexible" },
];

const STEP_LABELS = ["Service", "Size", "Add-Ons", "Your Info", "Property", "Schedule", "Review"];

// ─── Helpers ────────────────────────────────────────────────────────

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function tomorrowStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function money(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

// ─── Styles ─────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: TEXT_DIM,
  marginBottom: 6,
};

function inputStyle(hasError: boolean, isValid?: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "10px 12px",
    fontSize: 14,
    border: `1.5px solid ${hasError ? RED_BORDER : isValid ? EMERALD_BORDER : BORDER}`,
    borderRadius: 8,
    outline: "none",
    background: BG,
    color: TEXT,
    transition: "border-color 0.2s",
    boxSizing: "border-box" as const,
    fontFamily: "inherit",
  };
}

const errorTextStyle: React.CSSProperties = {
  fontSize: 11,
  color: RED,
  marginTop: 4,
};

// ─── Checkmark SVG ──────────────────────────────────────────────────

function Checkmark({ size = 16, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ─── Component ──────────────────────────────────────────────────────

export default function BrokerClientFormClient({
  broker,
  brokerCode,
  catalog,
}: {
  broker: BrokerInfo;
  brokerCode: string;
  catalog: ServiceCategory[];
}) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ClientFormResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Service
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedTierId, setSelectedTierId] = useState("");
  const [addons, setAddons] = useState<ServiceAddon[]>([]);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);

  // Customer
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Property
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("OR");
  const [zip, setZip] = useState("");

  // Scheduling
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");

  // Notes
  const [notes, setNotes] = useState("");

  // Auto-select first category
  useEffect(() => {
    if (catalog.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(catalog[0].categoryId);
    }
  }, [catalog, selectedCategoryId]);

  // Load addons on category change
  useEffect(() => {
    if (!selectedCategoryId) { setAddons([]); setSelectedAddonIds([]); return; }
    setSelectedAddonIds([]);
    fetchServiceAddons(selectedCategoryId).then(setAddons).catch(() => setAddons([]));
  }, [selectedCategoryId]);

  // Reset tier on category change
  useEffect(() => { setSelectedTierId(""); }, [selectedCategoryId]);

  const selectedCategory = catalog.find((c) => c.categoryId === selectedCategoryId);
  const selectedTier = selectedCategory?.tiers.find((t) => t.tierId === selectedTierId);
  const basePrice = selectedTier?.price ?? 0;
  const addonTotal = addons
    .filter((a) => selectedAddonIds.includes(a.id))
    .reduce((sum, a) => sum + a.price, 0);
  const totalPrice = basePrice + addonTotal;

  // ── Validation ─────────────────────────────────────────────────────
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validateField = useCallback(
    (name: string, value: string) => {
      let err = "";
      switch (name) {
        case "fullName":
        case "address":
        case "city":
        case "state":
          if (!value.trim()) err = "This field is required";
          break;
        case "email":
          if (!EMAIL_RE.test(value.trim())) err = "Valid email required";
          break;
        case "phone":
          if (value.replace(/\D/g, "").length !== 10) err = "Valid 10-digit phone required";
          break;
        case "zip":
          if (!/^\d{5}$/.test(value.trim())) err = "Valid 5-digit zip required";
          break;
        case "preferredDate":
          if (!value) err = "Date is required";
          else if (value < tomorrowStr()) err = "Must be tomorrow or later";
          break;
        case "preferredTime":
          if (!value) err = "Time preference is required";
          break;
      }
      setErrors((prev) => {
        const next = { ...prev };
        if (err) next[name] = err;
        else delete next[name];
        return next;
      });
    },
    [EMAIL_RE],
  );

  function handleBlur(name: string, value: string) {
    setTouched((prev) => ({ ...prev, [name]: true }));
    validateField(name, value);
  }

  function toggleAddon(id: string) {
    setSelectedAddonIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  }

  // ── Step navigation helpers ────────────────────────────────────────

  function nextStep(from: number): number {
    const next = from + 1;
    if (next === 3 && addons.length === 0) return 4;
    return next;
  }

  function prevStep(from: number): number {
    const prev = from - 1;
    if (prev === 3 && addons.length === 0) return 2;
    return prev;
  }

  function goNext() {
    const n = nextStep(step);
    if (n <= 7) setStep(n);
  }

  function goBack() {
    const p = prevStep(step);
    if (p >= 1) setStep(p);
  }

  function autoAdvance() {
    setTimeout(() => {
      setStep((s) => {
        const n = s + 1;
        if (n === 3 && addons.length === 0) return 4;
        return n <= 7 ? n : s;
      });
    }, 300);
  }

  // ── Step validity ──────────────────────────────────────────────────

  function isStepValid(s: number): boolean {
    switch (s) {
      case 1: return selectedCategoryId !== "";
      case 2: return selectedTierId !== "";
      case 3: return true;
      case 4:
        return fullName.trim() !== "" && EMAIL_RE.test(email.trim()) && phone.replace(/\D/g, "").length === 10;
      case 5:
        return address.trim() !== "" && city.trim() !== "" && state.trim() !== "" && /^\d{5}$/.test(zip.trim());
      case 6:
        return preferredDate !== "" && preferredDate >= tomorrowStr() && preferredTime !== "";
      case 7: return true;
      default: return false;
    }
  }

  // ── Submit ─────────────────────────────────────────────────────────
  async function handleSubmit() {
    setSubmitting(true);

    const res = await submitBrokerClientRequest({
      serviceTierId: selectedTierId,
      addonIds: selectedAddonIds,
      fullName,
      email,
      phone: phone.replace(/\D/g, ""),
      address,
      city,
      state,
      zip,
      preferredDate,
      preferredTime,
      notes,
      brokerCode,
    });

    setSubmitting(false);
    setResult(res);
    if (!res.success) {
      setErrors(res.errors);
      const t: Record<string, boolean> = {};
      for (const k of Object.keys(res.errors)) t[k] = true;
      setTouched((prev) => ({ ...prev, ...t }));
    }
  }

  // ── Success screen ─────────────────────────────────────────────────
  if (result?.success) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BG,
          padding: 20,
        }}
      >
        <div style={{
          maxWidth: 480, width: "100%", padding: "40px 32px",
          background: CARD, borderRadius: 16,
          border: `1px solid ${BORDER}`,
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          textAlign: "center",
        }}>
          <div
            style={{
              width: 72, height: 72, borderRadius: "50%",
              background: EMERALD_BG, border: `2px solid ${EMERALD}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke={EMERALD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: TEXT, margin: "0 0 8px" }}>
            You&apos;re All Set!
          </h2>
          <div
            style={{
              display: "inline-block", padding: "6px 16px", borderRadius: 8,
              background: EMERALD_BG, border: `1px solid ${EMERALD_BORDER}`,
              fontSize: 15, fontWeight: 700, color: EMERALD, marginBottom: 16,
            }}
          >
            {result.referenceId}
          </div>
          <p style={{ fontSize: 14, color: TEXT_SEC, lineHeight: 1.6, margin: "0 0 8px" }}>
            REI will contact you to confirm your assessment appointment.
          </p>
          <p style={{ fontSize: 13, color: TEXT_DIM, lineHeight: 1.5 }}>
            A confirmation has been sent to your email.
          </p>
          <div
            style={{
              marginTop: 20, padding: "10px 16px", borderRadius: 8,
              background: "rgba(100,116,139,0.06)", border: `1px solid ${BORDER}`,
              fontSize: 12, color: TEXT_DIM,
            }}
          >
            Powered by REI &mdash; Renewable Energy Incentives
          </div>
        </div>
      </div>
    );
  }

  // ── Visible step labels (filter out Add-Ons if skipped) ────────────
  const visibleSteps: { label: string; stepNum: number }[] = [];
  for (let i = 0; i < STEP_LABELS.length; i++) {
    const num = i + 1;
    if (num === 3 && addons.length === 0) continue;
    visibleSteps.push({ label: STEP_LABELS[i], stepNum: num });
  }

  // ── Form ───────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: "100vh",
        background: BG,
        padding: "40px 16px",
      }}
    >
      <div style={{
        maxWidth: 640, margin: "0 auto", padding: "40px 32px",
        background: CARD, borderRadius: 16,
        border: `1px solid ${BORDER}`,
        boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
      }}>
        {/* Header: REI logo left, broker logo/initials right */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: 20,
          }}>
            <Image
              src="/images/rei-logo.png"
              alt="REI"
              width={100}
              height={28}
              style={{ objectFit: "contain" }}
              priority
            />
            {broker.logoUrl ? (
              <Image
                src={broker.logoUrl}
                alt={broker.companyName || broker.brokerName}
                width={40}
                height={40}
                style={{ objectFit: "contain", borderRadius: 8, border: `1px solid ${BORDER}` }}
              />
            ) : (
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                background: BG, border: `2px solid ${EMERALD_BORDER}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 15, fontWeight: 700, color: EMERALD,
              }}>
                {(broker.companyName || broker.brokerName || "B").charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT, margin: "0 0 10px", textAlign: "center" }}>
            Schedule a Home Energy Assessment
          </h1>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "8px 16px", borderRadius: 8,
                background: "rgba(16,185,129,0.06)", border: `1px solid ${BORDER}`,
                fontSize: 13, fontWeight: 600, color: EMERALD,
              }}
            >
              Referred by {broker.brokerName}
              {broker.companyName && (
                <span style={{ color: TEXT_DIM, fontWeight: 500 }}>
                  &mdash; {broker.companyName}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            width: "100%", height: 6, borderRadius: 3,
            background: BORDER, overflow: "hidden",
          }}>
            <div style={{
              height: "100%", borderRadius: 3,
              background: EMERALD,
              width: `${((visibleSteps.findIndex((v) => v.stepNum === step) + 1) / visibleSteps.length) * 100}%`,
              transition: "width 0.3s ease",
            }} />
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: TEXT_DIM, textAlign: "right" }}>
            Step {visibleSteps.findIndex((v) => v.stepNum === step) + 1} of {visibleSteps.length}
          </div>
        </div>

        {/* Step Content */}
        <div style={{
          borderTop: `1px solid ${BORDER}`, paddingTop: 24, marginBottom: 24,
        }}>

          {/* ── Step 1: Service ─────────────────────────────── */}
          {step === 1 && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: "0 0 4px" }}>What do you need?</h2>
              <p style={{ fontSize: 13, color: TEXT_DIM, margin: "0 0 20px" }}>Select a service type</p>
              <div className="broker-service-grid">
                {catalog.map((cat) => {
                  const isActive = selectedCategoryId === cat.categoryId;
                  const catMin = cat.tiers.length ? Math.min(...cat.tiers.map((t) => t.price)) : 0;
                  const icon = cat.categorySlug === "hes_assessment" ? "\uD83C\uDFE0" : "\uD83D\uDD0D";

                  return (
                    <button
                      key={cat.categoryId}
                      type="button"
                      onClick={() => {
                        setSelectedCategoryId(cat.categoryId);
                        autoAdvance();
                      }}
                      style={{
                        padding: "18px 16px", borderRadius: 10,
                        border: isActive ? `2px solid ${EMERALD}` : `1.5px solid ${BORDER}`,
                        background: isActive ? EMERALD_BG : "transparent",
                        cursor: "pointer", textAlign: "center",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.borderColor = TEXT_DIM;
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.borderColor = BORDER;
                      }}
                    >
                      <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: isActive ? EMERALD : TEXT }}>
                        {cat.categoryName}
                      </div>
                      <div style={{ fontSize: 12, color: TEXT_DIM, marginTop: 4 }}>
                        From {money(catMin)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step 2: Home Size ──────────────────────────── */}
          {step === 2 && selectedCategory && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: "0 0 4px" }}>Home Size</h2>
              <p style={{ fontSize: 13, color: TEXT_DIM, margin: "0 0 20px" }}>Select the approximate square footage</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {selectedCategory.tiers.map((tier) => {
                  const isActive = selectedTierId === tier.tierId;
                  const sqftLabel = tier.sqFtMax
                    ? `${tier.sqFtMin.toLocaleString()} \u2013 ${tier.sqFtMax.toLocaleString()} sq ft`
                    : `${tier.sqFtMin.toLocaleString()}+ sq ft`;

                  return (
                    <button
                      key={tier.tierId}
                      type="button"
                      onClick={() => {
                        setSelectedTierId(tier.tierId);
                        autoAdvance();
                      }}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "16px 18px", borderRadius: 10,
                        border: isActive ? `2px solid ${EMERALD}` : `1.5px solid ${BORDER}`,
                        background: isActive ? EMERALD_BG : "transparent",
                        cursor: "pointer", textAlign: "left",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.borderColor = TEXT_DIM;
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.borderColor = BORDER;
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: isActive ? EMERALD : TEXT }}>
                          {tier.sizeLabel}
                        </div>
                        <div style={{ fontSize: 12, color: TEXT_DIM, marginTop: 2 }}>
                          {sqftLabel}
                        </div>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: isActive ? EMERALD : TEXT_SEC }}>
                        {money(tier.price)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step 3: Add-Ons ────────────────────────────── */}
          {step === 3 && addons.length > 0 && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: "0 0 4px" }}>Add-Ons</h2>
              <p style={{ fontSize: 13, color: TEXT_DIM, margin: "0 0 20px" }}>Select any additional services (optional)</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {addons.map((addon) => {
                  const isChecked = selectedAddonIds.includes(addon.id);
                  return (
                    <button
                      key={addon.id}
                      type="button"
                      onClick={() => toggleAddon(addon.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "14px 16px", borderRadius: 10, cursor: "pointer",
                        border: `1.5px solid ${isChecked ? EMERALD_BORDER : BORDER}`,
                        background: isChecked ? EMERALD_BG : "transparent",
                        textAlign: "left", transition: "all 0.15s",
                      }}
                    >
                      <div style={{
                        width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                        border: `2px solid ${isChecked ? EMERALD : BORDER}`,
                        background: isChecked ? EMERALD : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.15s",
                      }}>
                        {isChecked && <Checkmark size={12} color="#fff" />}
                      </div>
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: TEXT }}>
                        {addon.name}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: TEXT_SEC }}>
                        +{money(addon.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step 4: Your Info ───────────────────────────── */}
          {step === 4 && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: "0 0 4px" }}>Your Info</h2>
              <p style={{ fontSize: 13, color: TEXT_DIM, margin: "0 0 20px" }}>How can we reach you?</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    onBlur={() => handleBlur("fullName", fullName)}
                    placeholder="Jane Smith"
                    style={inputStyle(
                      !!touched.fullName && !!errors.fullName,
                      touched.fullName && !errors.fullName && fullName.trim().length > 0,
                    )}
                  />
                  {touched.fullName && errors.fullName && (
                    <div style={errorTextStyle}>{errors.fullName}</div>
                  )}
                </div>
                <div className="broker-schedule-row">
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => handleBlur("email", email)}
                      placeholder="jane@email.com"
                      style={inputStyle(
                        !!touched.email && !!errors.email,
                        touched.email && !errors.email && email.includes("@"),
                      )}
                    />
                    {touched.email && errors.email && (
                      <div style={errorTextStyle}>{errors.email}</div>
                    )}
                  </div>
                  <div>
                    <label style={labelStyle}>Phone</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      onBlur={() => handleBlur("phone", phone)}
                      placeholder="(503) 555-1234"
                      style={inputStyle(
                        !!touched.phone && !!errors.phone,
                        touched.phone && !errors.phone && phone.replace(/\D/g, "").length === 10,
                      )}
                    />
                    {touched.phone && errors.phone && (
                      <div style={errorTextStyle}>{errors.phone}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 5: Property ────────────────────────────── */}
          {step === 5 && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: "0 0 4px" }}>Property Address</h2>
              <p style={{ fontSize: 13, color: TEXT_DIM, margin: "0 0 20px" }}>Where is the property located?</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    onBlur={() => handleBlur("address", address)}
                    placeholder="1205 NW 23rd Ave"
                    style={inputStyle(!!touched.address && !!errors.address)}
                  />
                  {touched.address && errors.address && (
                    <div style={errorTextStyle}>{errors.address}</div>
                  )}
                </div>
                <div className="broker-property-row">
                  <div>
                    <label style={labelStyle}>City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      onBlur={() => handleBlur("city", city)}
                      placeholder="Portland"
                      style={inputStyle(!!touched.city && !!errors.city)}
                    />
                    {touched.city && errors.city && (
                      <div style={errorTextStyle}>{errors.city}</div>
                    )}
                  </div>
                  <div>
                    <label style={labelStyle}>State</label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      onBlur={() => handleBlur("state", state)}
                      style={inputStyle(!!touched.state && !!errors.state)}
                    />
                    {touched.state && errors.state && (
                      <div style={errorTextStyle}>{errors.state}</div>
                    )}
                  </div>
                  <div>
                    <label style={labelStyle}>Zip</label>
                    <input
                      type="text"
                      value={zip}
                      onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
                      onBlur={() => handleBlur("zip", zip)}
                      placeholder="97210"
                      style={inputStyle(!!touched.zip && !!errors.zip)}
                    />
                    {touched.zip && errors.zip && (
                      <div style={errorTextStyle}>{errors.zip}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 6: Scheduling ──────────────────────────── */}
          {step === 6 && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: "0 0 4px" }}>Scheduling</h2>
              <p style={{ fontSize: 13, color: TEXT_DIM, margin: "0 0 20px" }}>When works best for you?</p>

              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Preferred Date</label>
                <input
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  onBlur={() => handleBlur("preferredDate", preferredDate)}
                  min={tomorrowStr()}
                  style={{
                    ...inputStyle(!!touched.preferredDate && !!errors.preferredDate),
                    colorScheme: "dark",
                  }}
                />
                {touched.preferredDate && errors.preferredDate && (
                  <div style={errorTextStyle}>{errors.preferredDate}</div>
                )}
              </div>

              <div>
                <label style={labelStyle}>Preferred Time</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {TIME_OPTIONS.map((opt) => {
                    const isActive = preferredTime === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setPreferredTime(opt.value);
                          setTouched((prev) => ({ ...prev, preferredTime: true }));
                        }}
                        style={{
                          flex: 1, padding: "12px 14px", borderRadius: 10,
                          border: isActive ? `2px solid ${EMERALD}` : `1.5px solid ${BORDER}`,
                          background: isActive ? EMERALD_BG : "transparent",
                          cursor: "pointer", fontSize: 13, fontWeight: 600,
                          color: isActive ? EMERALD : TEXT_SEC,
                          transition: "all 0.15s ease",
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                {touched.preferredTime && errors.preferredTime && (
                  <div style={errorTextStyle}>{errors.preferredTime}</div>
                )}
              </div>
            </div>
          )}

          {/* ── Step 7: Review ──────────────────────────────── */}
          {step === 7 && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: "0 0 4px" }}>Review & Submit</h2>
              <p style={{ fontSize: 13, color: TEXT_DIM, margin: "0 0 20px" }}>Confirm the details below</p>

              {/* Price callout */}
              {selectedTier && (
                <div
                  style={{
                    padding: "16px 20px", borderRadius: 12,
                    background: EMERALD_BG, border: `1px solid ${EMERALD_BORDER}`,
                    marginBottom: 20,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: TEXT_SEC }}>
                      Your {selectedCategory?.categoryName}
                    </div>
                    <div style={{ fontSize: 12, color: TEXT_DIM, marginTop: 2 }}>
                      {selectedTier.sizeLabel}
                      {selectedAddonIds.length > 0 &&
                        ` + ${selectedAddonIds.length} add-on${selectedAddonIds.length > 1 ? "s" : ""}`}
                    </div>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: EMERALD }}>
                    {money(totalPrice)}
                  </div>
                </div>
              )}

              {/* Summary details */}
              <div style={{
                padding: "16px 18px", borderRadius: 10,
                background: "rgba(100,116,139,0.06)", border: `1px solid ${BORDER}`,
                marginBottom: 20,
              }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
                  <div style={{ fontSize: 13, color: TEXT_DIM }}>Name</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, textAlign: "right" }}>{fullName}</div>

                  <div style={{ fontSize: 13, color: TEXT_DIM }}>Email</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, textAlign: "right" }}>{email}</div>

                  <div style={{ fontSize: 13, color: TEXT_DIM }}>Phone</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, textAlign: "right" }}>{phone}</div>

                  {address.trim() && (
                    <>
                      <div style={{ fontSize: 13, color: TEXT_DIM }}>Address</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, textAlign: "right" }}>
                        {[address, city, state, zip].filter(Boolean).join(", ")}
                      </div>
                    </>
                  )}

                  {preferredDate && (
                    <>
                      <div style={{ fontSize: 13, color: TEXT_DIM }}>Date</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, textAlign: "right" }}>
                        {new Date(preferredDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                    </>
                  )}

                  {preferredTime && (
                    <>
                      <div style={{ fontSize: 13, color: TEXT_DIM }}>Time</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, textAlign: "right" }}>{preferredTime}</div>
                    </>
                  )}

                  {addons.filter((a) => selectedAddonIds.includes(a.id)).length > 0 && (
                    <>
                      <div style={{ gridColumn: "span 2", height: 1, background: BORDER, margin: "4px 0" }} />
                      {addons.filter((a) => selectedAddonIds.includes(a.id)).map((a) => (
                        <React.Fragment key={a.id}>
                          <div style={{ fontSize: 13, color: TEXT_DIM }}>{a.name}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, textAlign: "right" }}>
                            +{money(a.price)}
                          </div>
                        </React.Fragment>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special instructions, access codes, or notes..."
                  rows={3}
                  style={{
                    ...inputStyle(false),
                    resize: "vertical",
                    minHeight: 70,
                  }}
                />
              </div>

              {/* Form error */}
              {errors._form && (
                <div
                  style={{
                    padding: "10px 14px", borderRadius: 8, marginBottom: 16,
                    background: "rgba(239,68,68,0.08)", border: `1px solid ${RED_BORDER}`,
                    fontSize: 13, fontWeight: 600, color: RED,
                  }}
                >
                  {errors._form}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Navigation Bar ─────────────────────────────────────── */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          gap: 12, borderTop: `1px solid ${BORDER}`, paddingTop: 20,
        }}>
          {step > 1 ? (
            <button
              type="button"
              onClick={goBack}
              style={{
                padding: "12px 20px", borderRadius: 10,
                border: `1.5px solid ${BORDER}`, background: "transparent",
                color: TEXT_SEC, fontSize: 14, fontWeight: 600,
                cursor: "pointer", transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = TEXT_DIM; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = BORDER; }}
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 7 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!isStepValid(step)}
              style={{
                padding: "12px 24px", borderRadius: 10,
                border: "none",
                background: isStepValid(step) ? EMERALD : BORDER,
                color: isStepValid(step) ? "#fff" : TEXT_DIM,
                fontSize: 14, fontWeight: 700,
                cursor: isStepValid(step) ? "pointer" : "not-allowed",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (isStepValid(step)) e.currentTarget.style.background = "#059669";
              }}
              onMouseLeave={(e) => {
                if (isStepValid(step)) e.currentTarget.style.background = EMERALD;
              }}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                padding: "12px 28px", borderRadius: 10,
                border: "none", background: EMERALD,
                color: "#fff", fontSize: 14, fontWeight: 700,
                cursor: submitting ? "wait" : "pointer",
                opacity: submitting ? 0.6 : 1,
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.background = "#059669"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = EMERALD; }}
            >
              {submitting
                ? "Submitting..."
                : totalPrice > 0
                  ? `Schedule My Assessment \u2014 ${money(totalPrice)}`
                  : "Schedule My Assessment"
              }
            </button>
          )}
        </div>

        {/* Footer */}
        {step === 7 && (
          <div style={{ textAlign: "center", fontSize: 12, color: TEXT_DIM, lineHeight: 1.5, marginTop: 16 }}>
            Powered by REI &mdash; Renewable Energy Incentives
          </div>
        )}
      </div>
    </div>
  );
}
