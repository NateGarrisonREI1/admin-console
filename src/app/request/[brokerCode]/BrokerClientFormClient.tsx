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

// ─── Light theme constants (matches /request page) ──────────────────
const GREEN = "#10b981";
const GREEN_BG = "rgba(16,185,129,0.08)";
const GREEN_BORDER = "rgba(16,185,129,0.5)";
const RED = "#ef4444";
const RED_BORDER = "rgba(239,68,68,0.5)";
const GREY_TEXT = "#64748b";
const BORDER_DEFAULT = "#d1d5db";

const TIME_OPTIONS = [
  { value: "", label: "Select a time..." },
  { value: "Morning (8am\u201312pm)", label: "Morning (8am\u201312pm)" },
  { value: "Afternoon (12\u20134pm)", label: "Afternoon (12\u20134pm)" },
  { value: "Flexible", label: "Flexible" },
];

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

const cardStyle: React.CSSProperties = {
  maxWidth: 640,
  margin: "0 auto",
  padding: "40px 32px",
  background: "#fff",
  borderRadius: 16,
  boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#334155",
  marginBottom: 6,
};

function inputStyle(hasError: boolean, isValid?: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "10px 12px",
    fontSize: 15,
    border: `1.5px solid ${hasError ? RED_BORDER : isValid ? GREEN_BORDER : BORDER_DEFAULT}`,
    borderRadius: 8,
    outline: "none",
    background: "#fff",
    color: "#1e293b",
    transition: "border-color 0.2s",
    boxSizing: "border-box" as const,
    fontFamily: "inherit",
  };
}

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  fontSize: 15,
  border: `1.5px solid ${BORDER_DEFAULT}`,
  borderRadius: 8,
  outline: "none",
  background: "#fff",
  color: "#1e293b",
  cursor: "pointer",
  boxSizing: "border-box" as const,
  fontFamily: "inherit",
};

const errorTextStyle: React.CSSProperties = {
  fontSize: 12,
  color: RED,
  marginTop: 4,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  color: "#334155",
  marginBottom: 16,
  marginTop: 8,
};

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

  // Validation
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

  // Submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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

  // ── Success screen ────────────────────────────────────────────────
  if (result?.success) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
          padding: 20,
        }}
      >
        <div style={{ ...cardStyle, textAlign: "center", maxWidth: 480 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: GREEN_BG,
              border: `2px solid ${GREEN}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 13l4 4L19 7"
                stroke={GREEN}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#1e293b",
              margin: "0 0 8px",
            }}
          >
            You&apos;re All Set!
          </h2>
          <div
            style={{
              display: "inline-block",
              padding: "6px 16px",
              borderRadius: 8,
              background: GREEN_BG,
              border: `1px solid ${GREEN_BORDER}`,
              fontSize: 15,
              fontWeight: 700,
              color: GREEN,
              marginBottom: 16,
            }}
          >
            {result.referenceId}
          </div>
          <p
            style={{
              fontSize: 14,
              color: "#475569",
              lineHeight: 1.6,
              margin: "0 0 8px",
            }}
          >
            REI will contact you to confirm your assessment appointment.
          </p>
          <p style={{ fontSize: 13, color: GREY_TEXT, lineHeight: 1.5 }}>
            A confirmation has been sent to your email.
          </p>
          <div
            style={{
              marginTop: 20,
              padding: "10px 16px",
              borderRadius: 8,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              fontSize: 12,
              color: GREY_TEXT,
            }}
          >
            Powered by REI &mdash; Renewable Energy Incentives
          </div>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
        padding: "40px 16px",
      }}
    >
      <div style={cardStyle}>
        {/* Header with logo */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <Image
            src="/images/rei-logo.png"
            alt="REI"
            width={160}
            height={45}
            style={{ objectFit: "contain", marginBottom: 16 }}
            priority
          />
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#1e293b",
              margin: "0 0 8px",
            }}
          >
            Schedule a Home Energy Assessment
          </h1>
          {/* Broker referral banner */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              borderRadius: 8,
              background: GREEN_BG,
              border: `1px solid ${GREEN_BORDER}`,
              fontSize: 13,
              fontWeight: 600,
              color: GREEN,
            }}
          >
            Referred by {broker.brokerName}
            {broker.companyName && (
              <span style={{ color: "#64748b", fontWeight: 500 }}>
                &mdash; {broker.companyName}
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* ── SERVICE ─────────────────────────────────────────── */}
          <div style={{ marginBottom: 28, paddingTop: 8, borderTop: "1px solid #e2e8f0" }}>
            <div style={sectionTitleStyle}>Service</div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginBottom: 16,
              }}
            >
              {catalog.map((cat) => {
                const isActive = selectedCategoryId === cat.categoryId;
                const catMin = cat.tiers.length
                  ? Math.min(...cat.tiers.map((t) => t.price))
                  : 0;
                const icon =
                  cat.categorySlug === "hes_assessment"
                    ? "\uD83C\uDFE0"
                    : "\uD83D\uDD0D";

                return (
                  <button
                    key={cat.categoryId}
                    type="button"
                    onClick={() => setSelectedCategoryId(cat.categoryId)}
                    style={{
                      padding: "18px 16px",
                      borderRadius: 12,
                      border: isActive
                        ? `2px solid ${GREEN}`
                        : `1.5px solid ${BORDER_DEFAULT}`,
                      background: isActive ? GREEN_BG : "#fff",
                      cursor: "pointer",
                      textAlign: "center",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.borderColor = "#94a3b8";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive)
                        e.currentTarget.style.borderColor = BORDER_DEFAULT;
                    }}
                  >
                    <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: isActive ? GREEN : "#1e293b",
                      }}
                    >
                      {cat.categoryName}
                    </div>
                    <div style={{ fontSize: 12, color: GREY_TEXT, marginTop: 4 }}>
                      From {money(catMin)}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Home Size */}
            {selectedCategory && selectedCategory.tiers.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Home Size</label>
                <select
                  value={selectedTierId}
                  onChange={(e) => setSelectedTierId(e.target.value)}
                  style={selectStyle}
                >
                  <option value="">Select a home size...</option>
                  {selectedCategory.tiers.map((t) => (
                    <option key={t.tierId} value={t.tierId}>
                      {t.sizeLabel} &mdash; {money(t.price)}
                    </option>
                  ))}
                </select>
                {touched.serviceTierId && errors.serviceTierId && (
                  <div style={errorTextStyle}>{errors.serviceTierId}</div>
                )}
              </div>
            )}

            {/* Addons */}
            {addons.length > 0 && (
              <div>
                <label style={labelStyle}>Add-Ons</label>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {addons.map((addon) => {
                    const isChecked = selectedAddonIds.includes(addon.id);
                    return (
                      <label
                        key={addon.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "10px 14px",
                          borderRadius: 8,
                          cursor: "pointer",
                          border: `1px solid ${isChecked ? GREEN_BORDER : BORDER_DEFAULT}`,
                          background: isChecked ? GREEN_BG : "#fff",
                          transition: "all 0.15s",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleAddon(addon.id)}
                          style={{ accentColor: GREEN, width: 16, height: 16 }}
                        />
                        <span
                          style={{
                            flex: 1,
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#1e293b",
                          }}
                        >
                          {addon.name}
                        </span>
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "#475569",
                          }}
                        >
                          +{money(addon.price)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── YOUR INFO ──────────────────────────────────────── */}
          <div style={{ marginBottom: 28, paddingTop: 8, borderTop: "1px solid #e2e8f0" }}>
            <div style={sectionTitleStyle}>Your Info</div>
            <div style={{ marginBottom: 14 }}>
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
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
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
                    touched.phone &&
                      !errors.phone &&
                      phone.replace(/\D/g, "").length === 10,
                  )}
                />
                {touched.phone && errors.phone && (
                  <div style={errorTextStyle}>{errors.phone}</div>
                )}
              </div>
            </div>
          </div>

          {/* ── PROPERTY ───────────────────────────────────────── */}
          <div style={{ marginBottom: 28, paddingTop: 8, borderTop: "1px solid #e2e8f0" }}>
            <div style={sectionTitleStyle}>Property</div>
            <div style={{ marginBottom: 14 }}>
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
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 80px 100px",
                gap: 12,
              }}
            >
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
                  onChange={(e) =>
                    setZip(e.target.value.replace(/\D/g, "").slice(0, 5))
                  }
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

          {/* ── SCHEDULING ─────────────────────────────────────── */}
          <div style={{ marginBottom: 28, paddingTop: 8, borderTop: "1px solid #e2e8f0" }}>
            <div style={sectionTitleStyle}>Scheduling</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <div>
                <label style={labelStyle}>Preferred Date</label>
                <input
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  onBlur={() => handleBlur("preferredDate", preferredDate)}
                  min={tomorrowStr()}
                  style={inputStyle(
                    !!touched.preferredDate && !!errors.preferredDate,
                  )}
                />
                {touched.preferredDate && errors.preferredDate && (
                  <div style={errorTextStyle}>{errors.preferredDate}</div>
                )}
              </div>
              <div>
                <label style={labelStyle}>Preferred Time</label>
                <select
                  value={preferredTime}
                  onChange={(e) => {
                    setPreferredTime(e.target.value);
                    handleBlur("preferredTime", e.target.value);
                  }}
                  style={selectStyle}
                >
                  {TIME_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {touched.preferredTime && errors.preferredTime && (
                  <div style={errorTextStyle}>{errors.preferredTime}</div>
                )}
              </div>
            </div>
          </div>

          {/* ── NOTES ──────────────────────────────────────────── */}
          <div style={{ marginBottom: 28, paddingTop: 8, borderTop: "1px solid #e2e8f0" }}>
            <div style={sectionTitleStyle}>Notes (optional)</div>
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

          {/* ── PRICE CALLOUT ──────────────────────────────────── */}
          {selectedTier && (
            <div
              style={{
                padding: "16px 20px",
                borderRadius: 12,
                background: GREEN_BG,
                border: `1px solid ${GREEN_BORDER}`,
                marginBottom: 20,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#334155",
                  }}
                >
                  Your {selectedCategory?.categoryName}
                </div>
                <div style={{ fontSize: 12, color: GREY_TEXT, marginTop: 2 }}>
                  {selectedTier.sizeLabel}
                  {selectedAddonIds.length > 0 &&
                    ` + ${selectedAddonIds.length} add-on${selectedAddonIds.length > 1 ? "s" : ""}`}
                </div>
              </div>
              <div
                style={{ fontSize: 24, fontWeight: 800, color: GREEN }}
              >
                {money(totalPrice)}
              </div>
            </div>
          )}

          {/* Form error */}
          {errors._form && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                marginBottom: 16,
                background: "rgba(239,68,68,0.06)",
                border: `1px solid ${RED_BORDER}`,
                fontSize: 13,
                fontWeight: 600,
                color: RED,
              }}
            >
              {errors._form}
            </div>
          )}

          {/* ── SUBMIT ─────────────────────────────────────────── */}
          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%",
              padding: "14px 24px",
              borderRadius: 10,
              border: "none",
              background: GREEN,
              color: "#fff",
              fontSize: 16,
              fontWeight: 700,
              cursor: submitting ? "wait" : "pointer",
              opacity: submitting ? 0.6 : 1,
              transition: "all 0.15s ease",
              marginBottom: 16,
            }}
            onMouseEnter={(e) => {
              if (!submitting) e.currentTarget.style.background = "#059669";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = GREEN;
            }}
          >
            {submitting
              ? "Submitting..."
              : totalPrice > 0
                ? `Schedule My Assessment \u2014 ${money(totalPrice)}`
                : "Schedule My Assessment"}
          </button>

          {/* Footer */}
          <div
            style={{
              textAlign: "center",
              fontSize: 12,
              color: GREY_TEXT,
              lineHeight: 1.5,
            }}
          >
            Powered by REI &mdash; Renewable Energy Incentives
          </div>
        </form>
      </div>
    </div>
  );
}
