// src/app/(app)/broker/request/BrokerRequestClient.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  fetchServiceAddons,
  submitBrokerRequest,
  type BrokerProfile,
  type BrokerRequestResult,
} from "./actions";
import type { ServiceCategory, ServiceAddon } from "@/app/request/actions";

// ─── Design tokens (dark broker portal theme) ───────────────────────
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

const STEP_LABELS = ["Service", "Size", "Add-Ons", "Property", "Homeowner", "Schedule", "Payment", "Review"];

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

function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "10px 12px",
    fontSize: 14,
    border: `1.5px solid ${hasError ? RED_BORDER : BORDER}`,
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

export default function BrokerRequestClient({
  broker,
  catalog,
  embedded,
  onSuccess,
}: {
  broker: BrokerProfile;
  catalog: ServiceCategory[];
  embedded?: boolean;
  onSuccess?: (referenceId: string) => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BrokerRequestResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Service selection
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedTierId, setSelectedTierId] = useState("");
  const [addons, setAddons] = useState<ServiceAddon[]>([]);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);

  // Property
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("OR");
  const [zip, setZip] = useState("");

  // Homeowner
  const [homeownerPresent, setHomeownerPresent] = useState(true);
  const [hoName, setHoName] = useState("");
  const [hoEmail, setHoEmail] = useState("");
  const [hoPhone, setHoPhone] = useState("");

  // Scheduling
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");

  // Payment
  const [payerType, setPayerType] = useState<"broker" | "homeowner" | "pay_now">("broker");

  // Notes
  const [notes, setNotes] = useState("");

  // Load addons when category changes
  useEffect(() => {
    if (!selectedCategoryId) {
      setAddons([]);
      setSelectedAddonIds([]);
      return;
    }
    setSelectedAddonIds([]);
    fetchServiceAddons(selectedCategoryId).then(setAddons).catch(() => setAddons([]));
  }, [selectedCategoryId]);

  // Reset tier when category changes
  useEffect(() => {
    setSelectedTierId("");
  }, [selectedCategoryId]);

  // Auto-select first category if only one
  useEffect(() => {
    if (catalog.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(catalog[0].categoryId);
    }
  }, [catalog, selectedCategoryId]);

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
        case "hoName":
        case "address":
        case "city":
        case "state":
          if (!value.trim()) err = "This field is required";
          break;
        case "hoEmail":
          if (!EMAIL_RE.test(value.trim())) err = "Valid email required";
          break;
        case "hoPhone":
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

  // Determine the effective next/prev step (skip addons if none)
  function nextStep(from: number): number {
    const next = from + 1;
    // Skip addons step if no addons for this category
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
    if (n <= 8) setStep(n);
  }

  function goBack() {
    const p = prevStep(step);
    if (p >= 1) setStep(p);
  }

  // Auto-advance after card selection (300ms delay)
  function autoAdvance() {
    setTimeout(() => {
      setStep((s) => {
        const n = s + 1;
        // Skip addons if none
        if (n === 3 && addons.length === 0) return 4;
        return n <= 8 ? n : s;
      });
    }, 300);
  }

  // ── Step validity ──────────────────────────────────────────────────

  function isStepValid(s: number): boolean {
    switch (s) {
      case 1: return selectedCategoryId !== "";
      case 2: return selectedTierId !== "";
      case 3: return true; // addons are optional
      case 4:
        return address.trim() !== "" && city.trim() !== "" && state.trim() !== "" && /^\d{5}$/.test(zip.trim());
      case 5:
        if (!homeownerPresent) return true;
        return hoName.trim() !== "" && EMAIL_RE.test(hoEmail.trim()) && hoPhone.replace(/\D/g, "").length === 10;
      case 6:
        return preferredDate !== "" && preferredDate >= tomorrowStr() && preferredTime !== "";
      case 7: return true; // payment has default
      case 8: return true;
      default: return false;
    }
  }

  // ── Success redirect ───────────────────────────────────────────────
  useEffect(() => {
    if (result?.success) {
      if (onSuccess) {
        const timer = setTimeout(() => onSuccess(result.referenceId), 2000);
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => router.push("/broker/schedule"), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [result, router, onSuccess]);

  // ── Submit ─────────────────────────────────────────────────────────
  async function handleSubmit() {
    setSubmitting(true);

    const res = await submitBrokerRequest({
      serviceTierId: selectedTierId,
      addonIds: selectedAddonIds,
      address,
      city,
      state,
      zip,
      homeownerPresent,
      homeownerName: hoName,
      homeownerEmail: hoEmail,
      homeownerPhone: hoPhone.replace(/\D/g, ""),
      preferredDate,
      preferredTime,
      payerType,
      notes,
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
      <div style={{ maxWidth: embedded ? undefined : 540, margin: embedded ? "20px auto" : "60px auto", textAlign: "center" }}>
        <div style={{
          width: 72, height: 72, borderRadius: "50%",
          background: "rgba(16,185,129,0.12)", border: `2px solid ${EMERALD}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px",
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke={EMERALD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: TEXT, margin: "0 0 8px" }}>
          Request Submitted!
        </h2>
        <div style={{
          display: "inline-block", padding: "6px 16px", borderRadius: 8,
          background: EMERALD_BG, border: `1px solid ${EMERALD_BORDER}`,
          fontSize: 15, fontWeight: 700, color: EMERALD, marginBottom: 16,
        }}>
          {result.referenceId}
        </div>
        <p style={{ fontSize: 14, color: TEXT_SEC, lineHeight: 1.6, margin: "0 0 8px" }}>
          Your request has been submitted and will be assigned to an REI assessor.
        </p>
        <p style={{ fontSize: 13, color: TEXT_DIM, lineHeight: 1.5 }}>
          You&apos;ll receive status updates at <strong style={{ color: TEXT_SEC }}>{broker.email}</strong>
        </p>
        {!embedded && (
          <>
            <p style={{ fontSize: 12, color: TEXT_DIM, marginTop: 20 }}>
              Redirecting to your schedule...
            </p>
            <Link
              href="/broker/schedule"
              style={{
                display: "inline-block", marginTop: 8,
                fontSize: 13, fontWeight: 600, color: EMERALD, textDecoration: "none",
              }}
            >
              Go to Schedule {"\u2192"}
            </Link>
          </>
        )}
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

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      {/* Header */}
      {!embedded && (
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT, margin: "0 0 4px" }}>
            Request a Service
          </h1>
          <p style={{ fontSize: 13, color: TEXT_DIM, margin: 0 }}>
            Order an HES Assessment or Home Inspection from REI
          </p>
        </div>
      )}

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

      {/* Step Content Card */}
      <div style={{
        background: CARD, borderRadius: 12, padding: "24px 24px 20px",
        border: `1px solid ${BORDER}`, marginBottom: 20,
      }}>

        {/* ── Step 1: Service ─────────────────────────────────── */}
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
                      padding: "18px 16px",
                      borderRadius: 10,
                      border: isActive ? `2px solid ${EMERALD}` : `1.5px solid ${BORDER}`,
                      background: isActive ? EMERALD_BG : "transparent",
                      cursor: "pointer",
                      textAlign: "center",
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

        {/* ── Step 2: Home Size ───────────────────────────────── */}
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
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "16px 18px",
                      borderRadius: 10,
                      border: isActive ? `2px solid ${EMERALD}` : `1.5px solid ${BORDER}`,
                      background: isActive ? EMERALD_BG : "transparent",
                      cursor: "pointer",
                      textAlign: "left",
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

        {/* ── Step 3: Add-Ons ─────────────────────────────────── */}
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
                      textAlign: "left",
                      transition: "all 0.15s",
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

        {/* ── Step 4: Property ────────────────────────────────── */}
        {step === 4 && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: "0 0 4px" }}>Property Address</h2>
            <p style={{ fontSize: 13, color: TEXT_DIM, margin: "0 0 20px" }}>Where is the property located?</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Street Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onBlur={() => handleBlur("address", address)}
                  placeholder="1205 NW 23rd Ave"
                  style={inputStyle(!!touched.address && !!errors.address)}
                />
                {touched.address && errors.address && <div style={errorTextStyle}>{errors.address}</div>}
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
                  {touched.city && errors.city && <div style={errorTextStyle}>{errors.city}</div>}
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
                  {touched.state && errors.state && <div style={errorTextStyle}>{errors.state}</div>}
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
                  {touched.zip && errors.zip && <div style={errorTextStyle}>{errors.zip}</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 5: Homeowner ───────────────────────────────── */}
        {step === 5 && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: "0 0 4px" }}>Homeowner</h2>
            <p style={{ fontSize: 13, color: TEXT_DIM, margin: "0 0 20px" }}>Will the homeowner be present?</p>

            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              {[
                { value: true, label: "Homeowner present" },
                { value: false, label: "Vacant / no contact" },
              ].map((opt) => {
                const isActive = homeownerPresent === opt.value;
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => setHomeownerPresent(opt.value)}
                    style={{
                      flex: 1,
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: isActive ? `2px solid ${EMERALD}` : `1.5px solid ${BORDER}`,
                      background: isActive ? EMERALD_BG : "transparent",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                      color: isActive ? EMERALD : TEXT_SEC,
                      transition: "all 0.15s ease",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {homeownerPresent && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Homeowner Name</label>
                  <input
                    type="text"
                    value={hoName}
                    onChange={(e) => setHoName(e.target.value)}
                    onBlur={() => handleBlur("hoName", hoName)}
                    placeholder="Jane Smith"
                    style={inputStyle(!!touched.hoName && !!errors.hoName)}
                  />
                  {touched.hoName && errors.hoName && <div style={errorTextStyle}>{errors.hoName}</div>}
                </div>
                <div className="broker-schedule-row">
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input
                      type="email"
                      value={hoEmail}
                      onChange={(e) => setHoEmail(e.target.value)}
                      onBlur={() => handleBlur("hoEmail", hoEmail)}
                      placeholder="jane@email.com"
                      style={inputStyle(!!touched.hoEmail && !!errors.hoEmail)}
                    />
                    {touched.hoEmail && errors.hoEmail && <div style={errorTextStyle}>{errors.hoEmail}</div>}
                  </div>
                  <div>
                    <label style={labelStyle}>Phone</label>
                    <input
                      type="tel"
                      value={hoPhone}
                      onChange={(e) => setHoPhone(formatPhone(e.target.value))}
                      onBlur={() => handleBlur("hoPhone", hoPhone)}
                      placeholder="(503) 555-1234"
                      style={inputStyle(!!touched.hoPhone && !!errors.hoPhone)}
                    />
                    {touched.hoPhone && errors.hoPhone && <div style={errorTextStyle}>{errors.hoPhone}</div>}
                  </div>
                </div>
              </div>
            )}

            {!homeownerPresent && (
              <div style={{
                padding: "12px 16px", borderRadius: 8,
                background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)",
                fontSize: 13, color: "#fbbf24", lineHeight: 1.5,
              }}>
                The property will be treated as vacant. Your contact info will be used for scheduling.
              </div>
            )}
          </div>
        )}

        {/* ── Step 6: Scheduling ──────────────────────────────── */}
        {step === 6 && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: "0 0 4px" }}>Scheduling</h2>
            <p style={{ fontSize: 13, color: TEXT_DIM, margin: "0 0 20px" }}>When works best?</p>

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
                        flex: 1,
                        padding: "12px 14px",
                        borderRadius: 10,
                        border: isActive ? `2px solid ${EMERALD}` : `1.5px solid ${BORDER}`,
                        background: isActive ? EMERALD_BG : "transparent",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 600,
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

        {/* ── Step 7: Payment ─────────────────────────────────── */}
        {step === 7 && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: "0 0 4px" }}>Payment</h2>
            <p style={{ fontSize: 13, color: TEXT_DIM, margin: "0 0 20px" }}>Who pays for this service?</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {([
                { value: "broker" as const, icon: "\uD83D\uDCBC", label: "I\u2019ll pay (invoice me after)", desc: "You\u2019ll receive an invoice after the assessment is complete." },
                { value: "homeowner" as const, icon: "\uD83C\uDFE0", label: "Homeowner pays (invoice them)", desc: "The homeowner will receive the invoice directly." },
                { value: "pay_now" as const, icon: "\uD83D\uDCB3", label: "Pay now (credit card)", desc: "You\u2019ll be directed to pay after submitting this request." },
              ]).map((opt) => {
                const isActive = payerType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setPayerType(opt.value);
                      autoAdvance();
                    }}
                    style={{
                      display: "flex", alignItems: "center", gap: 14,
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
                    <span style={{
                      fontSize: 22, flexShrink: 0, width: 40, height: 40,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      borderRadius: 10, background: isActive ? "rgba(16,185,129,0.12)" : "rgba(100,116,139,0.08)",
                    }}>
                      {opt.icon}
                    </span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: isActive ? EMERALD : TEXT }}>
                        {opt.label}
                      </div>
                      <div style={{ fontSize: 12, color: TEXT_DIM, marginTop: 2 }}>
                        {opt.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Step 8: Review ──────────────────────────────────── */}
        {step === 8 && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: "0 0 4px" }}>Review & Submit</h2>
            <p style={{ fontSize: 13, color: TEXT_DIM, margin: "0 0 20px" }}>Confirm the details below</p>

            {/* Broker info */}
            <div style={{
              padding: "14px 16px", borderRadius: 10,
              background: "rgba(100,116,139,0.06)", border: `1px solid ${BORDER}`,
              marginBottom: 16,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                Your Info
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 11, color: TEXT_DIM }}>Name</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{broker.fullName}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: TEXT_DIM }}>Company</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{broker.companyName || "\u2014"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: TEXT_DIM }}>Email</div>
                  <div style={{ fontSize: 13, color: TEXT_SEC }}>{broker.email}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: TEXT_DIM }}>Phone</div>
                  <div style={{ fontSize: 13, color: TEXT_SEC }}>{broker.phone ? formatPhone(broker.phone) : "\u2014"}</div>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div style={{
              padding: "16px 18px", borderRadius: 10,
              background: "rgba(16,185,129,0.04)", border: `1px solid ${EMERALD_BORDER}`,
              marginBottom: 16,
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
                <div style={{ fontSize: 13, color: TEXT_SEC }}>Service</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, textAlign: "right" }}>
                  {selectedCategory?.categoryName} &mdash; {selectedTier?.sizeLabel}
                </div>

                {address.trim() && (
                  <>
                    <div style={{ fontSize: 13, color: TEXT_SEC }}>Address</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, textAlign: "right" }}>
                      {[address, city, state, zip].filter(Boolean).join(", ")}
                    </div>
                  </>
                )}

                {homeownerPresent && hoName.trim() && (
                  <>
                    <div style={{ fontSize: 13, color: TEXT_SEC }}>Homeowner</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, textAlign: "right" }}>
                      {hoName}
                    </div>
                  </>
                )}

                {!homeownerPresent && (
                  <>
                    <div style={{ fontSize: 13, color: TEXT_SEC }}>Homeowner</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#fbbf24", textAlign: "right" }}>
                      Vacant / no contact
                    </div>
                  </>
                )}

                {preferredDate && (
                  <>
                    <div style={{ fontSize: 13, color: TEXT_SEC }}>Date</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, textAlign: "right" }}>
                      {new Date(preferredDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  </>
                )}

                {preferredTime && (
                  <>
                    <div style={{ fontSize: 13, color: TEXT_SEC }}>Time</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, textAlign: "right" }}>
                      {preferredTime}
                    </div>
                  </>
                )}

                {addons.filter((a) => selectedAddonIds.includes(a.id)).map((a) => (
                  <React.Fragment key={a.id}>
                    <div style={{ fontSize: 13, color: TEXT_SEC }}>{a.name}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, textAlign: "right" }}>
                      +{money(a.price)}
                    </div>
                  </React.Fragment>
                ))}

                <div style={{ gridColumn: "span 2", height: 1, background: BORDER, margin: "4px 0" }} />

                <div style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>Total</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: EMERALD, textAlign: "right" }}>
                  {money(totalPrice)}
                </div>

                <div style={{ fontSize: 12, color: TEXT_DIM }}>Payment</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: TEXT_SEC, textAlign: "right" }}>
                  {payerType === "broker" && "Broker pays (invoice after)"}
                  {payerType === "homeowner" && "Homeowner pays (invoice them)"}
                  {payerType === "pay_now" && "Pay now (credit card)"}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
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
              <div style={{
                padding: "10px 14px", borderRadius: 8, marginTop: 16,
                background: "rgba(239,68,68,0.08)", border: `1px solid ${RED_BORDER}`,
                fontSize: 13, fontWeight: 600, color: RED,
              }}>
                {errors._form}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Navigation Bar ─────────────────────────────────────────── */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        gap: 12, marginBottom: 20,
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

        {step < 8 ? (
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
                ? `Submit Request \u2014 ${money(totalPrice)}`
                : "Submit Request"
            }
          </button>
        )}
      </div>

      {!embedded && step === 8 && (
        <p style={{ fontSize: 12, color: TEXT_DIM, textAlign: "center", lineHeight: 1.5, margin: 0 }}>
          Your request will be assigned to an REI assessor.<br />
          You&apos;ll receive status updates at {broker.email}
        </p>
      )}

      {/* Powered by REI footer */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: 8, marginTop: 16, paddingTop: 16,
        borderTop: `1px solid ${BORDER}`,
        opacity: 0.5,
      }}>
        <span style={{ fontSize: 11, color: TEXT_DIM }}>Powered by</span>
        <img src="/images/rei-logo.png" alt="REI" style={{ height: 16, objectFit: "contain", opacity: 0.7 }} />
      </div>
    </div>
  );
}
