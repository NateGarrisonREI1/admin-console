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

const sectionStyle: React.CSSProperties = {
  background: CARD,
  border: `1px solid ${BORDER}`,
  borderRadius: 12,
  padding: "20px 24px",
  marginBottom: 20,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: TEXT_MUTED,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 16,
};

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

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  fontSize: 14,
  border: `1.5px solid ${BORDER}`,
  borderRadius: 8,
  outline: "none",
  background: BG,
  color: TEXT,
  cursor: "pointer",
  boxSizing: "border-box" as const,
  fontFamily: "inherit",
  WebkitAppearance: "none",
  MozAppearance: "none",
  appearance: "none",
};

const errorTextStyle: React.CSSProperties = {
  fontSize: 11,
  color: RED,
  marginTop: 4,
};

// ─── Component ──────────────────────────────────────────────────────

export default function BrokerRequestClient({
  broker,
  catalog,
}: {
  broker: BrokerProfile;
  catalog: ServiceCategory[];
}) {
  const router = useRouter();
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
  const minPrice = selectedCategory?.tiers.length
    ? Math.min(...selectedCategory.tiers.map((t) => t.price))
    : 0;

  // Validation
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

  // ── Success redirect ──────────────────────────────────────────────
  useEffect(() => {
    if (result?.success) {
      const timer = setTimeout(() => router.push("/broker/schedule"), 3000);
      return () => clearTimeout(timer);
    }
  }, [result, router]);

  // ── Submit ────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
      // Mark all error fields as touched
      const t: Record<string, boolean> = {};
      for (const k of Object.keys(res.errors)) t[k] = true;
      setTouched((prev) => ({ ...prev, ...t }));
    }
  }

  // ── Success screen ────────────────────────────────────────────────
  if (result?.success) {
    return (
      <div style={{ maxWidth: 540, margin: "60px auto", textAlign: "center" }}>
        <div style={{
          width: 72, height: 72, borderRadius: "50%",
          background: "rgba(16,185,129,0.12)", border: `2px solid ${EMERALD}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px",
          animation: "popIn 0.3s ease",
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
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT, margin: "0 0 4px" }}>
          Request a Service
        </h1>
        <p style={{ fontSize: 13, color: TEXT_DIM, margin: 0 }}>
          Order an HES Assessment or Home Inspection from REI
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* ── YOUR INFO ────────────────────────────────────────── */}
        <div style={sectionStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={sectionTitleStyle}>Your Info</div>
            <Link
              href="/broker/settings"
              style={{ fontSize: 12, fontWeight: 600, color: EMERALD, textDecoration: "none" }}
              onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
              onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}
            >
              Edit
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 600 }}>Name</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: TEXT, marginTop: 2 }}>{broker.fullName}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 600 }}>Company</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: TEXT, marginTop: 2 }}>{broker.companyName || "\u2014"}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 600 }}>Email</div>
              <div style={{ fontSize: 13, color: TEXT_SEC, marginTop: 2 }}>{broker.email}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 600 }}>Phone</div>
              <div style={{ fontSize: 13, color: TEXT_SEC, marginTop: 2 }}>{broker.phone ? formatPhone(broker.phone) : "\u2014"}</div>
            </div>
          </div>
        </div>

        {/* ── SERVICE SELECTION ─────────────────────────────────── */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Service</div>

          <div style={{ fontSize: 13, fontWeight: 600, color: TEXT_SEC, marginBottom: 12 }}>
            What do you need?
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            {catalog.map((cat) => {
              const isActive = selectedCategoryId === cat.categoryId;
              const catMin = cat.tiers.length ? Math.min(...cat.tiers.map((t) => t.price)) : 0;
              const icon = cat.categorySlug === "hes_assessment" ? "\uD83C\uDFE0" : "\uD83D\uDD0D";

              return (
                <button
                  key={cat.categoryId}
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.categoryId)}
                  style={{
                    padding: "18px 16px",
                    borderRadius: 10,
                    border: isActive
                      ? `2px solid ${EMERALD}`
                      : `1.5px solid ${BORDER}`,
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
                    {t.sizeLabel} \u2014 {money(t.price)}
                  </option>
                ))}
              </select>
              {touched.serviceTierId && errors.serviceTierId && (
                <div style={errorTextStyle}>{errors.serviceTierId}</div>
              )}
              {selectedTier && (
                <div style={{
                  marginTop: 8, padding: "8px 12px", borderRadius: 8,
                  background: EMERALD_BG, border: `1px solid ${EMERALD_BORDER}`,
                  fontSize: 14, fontWeight: 700, color: EMERALD,
                }}>
                  Base price: {money(selectedTier.price)}
                </div>
              )}
            </div>
          )}

          {/* Addons */}
          {addons.length > 0 && (
            <div>
              <label style={labelStyle}>Add-Ons</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {addons.map((addon) => {
                  const isChecked = selectedAddonIds.includes(addon.id);
                  return (
                    <label
                      key={addon.id}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 14px", borderRadius: 8, cursor: "pointer",
                        border: `1px solid ${isChecked ? EMERALD_BORDER : BORDER}`,
                        background: isChecked ? EMERALD_BG : "transparent",
                        transition: "all 0.15s",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleAddon(addon.id)}
                        style={{ accentColor: EMERALD, width: 16, height: 16 }}
                      />
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: TEXT }}>
                        {addon.name}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: TEXT_SEC }}>
                        +{money(addon.price)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── PROPERTY ─────────────────────────────────────────── */}
        <div style={sectionStyle}>
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
            {touched.address && errors.address && <div style={errorTextStyle}>{errors.address}</div>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 100px", gap: 12 }}>
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

        {/* ── HOMEOWNER ────────────────────────────────────────── */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Homeowner</div>

          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <ToggleButton
              active={homeownerPresent}
              onClick={() => setHomeownerPresent(true)}
              label="Homeowner will be present"
            />
            <ToggleButton
              active={!homeownerPresent}
              onClick={() => setHomeownerPresent(false)}
              label="Vacant / no contact"
            />
          </div>

          {homeownerPresent && (
            <>
              <div style={{ marginBottom: 14 }}>
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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
            </>
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

        {/* ── SCHEDULING ───────────────────────────────────────── */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Scheduling</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
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
              <select
                value={preferredTime}
                onChange={(e) => { setPreferredTime(e.target.value); handleBlur("preferredTime", e.target.value); }}
                style={selectStyle}
              >
                {TIME_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {touched.preferredTime && errors.preferredTime && (
                <div style={errorTextStyle}>{errors.preferredTime}</div>
              )}
            </div>
          </div>
        </div>

        {/* ── PAYMENT ──────────────────────────────────────────── */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Payment</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: TEXT_SEC, marginBottom: 12 }}>
            Who pays?
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <PayerRadio
              value="broker"
              current={payerType}
              onChange={setPayerType}
              label="I\u2019ll pay (invoice me after)"
              desc="You\u2019ll receive an invoice after the assessment is complete."
            />
            <PayerRadio
              value="homeowner"
              current={payerType}
              onChange={setPayerType}
              label="Homeowner pays (invoice them)"
              desc="The homeowner will receive the invoice directly."
            />
            <PayerRadio
              value="pay_now"
              current={payerType}
              onChange={setPayerType}
              label="Pay now (credit card)"
              desc="You\u2019ll be directed to pay after submitting this request."
            />
          </div>
          {touched.payerType && errors.payerType && (
            <div style={errorTextStyle}>{errors.payerType}</div>
          )}
        </div>

        {/* ── NOTES ────────────────────────────────────────────── */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Notes</div>
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

        {/* ── SUMMARY ──────────────────────────────────────────── */}
        {selectedTier && (
          <div style={{
            ...sectionStyle,
            background: "rgba(16,185,129,0.04)",
            border: `1px solid ${EMERALD_BORDER}`,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: EMERALD, marginBottom: 12 }}>
              Summary
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
              <div style={{ fontSize: 13, color: TEXT_SEC }}>Service</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, textAlign: "right" }}>
                {selectedCategory?.categoryName} \u2014 {selectedTier.sizeLabel}
              </div>

              {address.trim() && (
                <>
                  <div style={{ fontSize: 13, color: TEXT_SEC }}>Address</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, textAlign: "right" }}>
                    {[address, city, state].filter(Boolean).join(", ")}
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
        )}

        {/* Form error */}
        {errors._form && (
          <div style={{
            padding: "10px 14px", borderRadius: 8, marginBottom: 16,
            background: "rgba(239,68,68,0.08)", border: `1px solid ${RED_BORDER}`,
            fontSize: 13, fontWeight: 600, color: RED,
          }}>
            {errors._form}
          </div>
        )}

        {/* ── SUBMIT ───────────────────────────────────────────── */}
        <button
          type="submit"
          disabled={submitting}
          style={{
            width: "100%",
            padding: "14px 24px",
            borderRadius: 10,
            border: "none",
            background: EMERALD,
            color: "#fff",
            fontSize: 15,
            fontWeight: 700,
            cursor: submitting ? "wait" : "pointer",
            opacity: submitting ? 0.6 : 1,
            transition: "all 0.15s ease",
            marginBottom: 12,
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

        <p style={{ fontSize: 12, color: TEXT_DIM, textAlign: "center", lineHeight: 1.5, margin: 0 }}>
          Your request will be assigned to an REI assessor.<br />
          You&apos;ll receive status updates at {broker.email}
        </p>
      </form>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────

function ToggleButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: "10px 14px",
        borderRadius: 8,
        border: active ? `2px solid ${EMERALD}` : `1.5px solid ${BORDER}`,
        background: active ? EMERALD_BG : "transparent",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 600,
        color: active ? EMERALD : TEXT_SEC,
        transition: "all 0.15s ease",
      }}
    >
      {label}
    </button>
  );
}

function PayerRadio({
  value,
  current,
  onChange,
  label,
  desc,
}: {
  value: "broker" | "homeowner" | "pay_now";
  current: string;
  onChange: (v: "broker" | "homeowner" | "pay_now") => void;
  label: string;
  desc: string;
}) {
  const isActive = current === value;
  return (
    <label
      style={{
        display: "flex", gap: 12, padding: "12px 14px", borderRadius: 8,
        border: isActive ? `2px solid ${EMERALD}` : `1.5px solid ${BORDER}`,
        background: isActive ? EMERALD_BG : "transparent",
        cursor: "pointer", transition: "all 0.15s",
      }}
    >
      <input
        type="radio"
        name="payerType"
        value={value}
        checked={isActive}
        onChange={() => onChange(value)}
        style={{ accentColor: EMERALD, marginTop: 2 }}
      />
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? EMERALD : TEXT }}>
          {label}
        </div>
        <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 2 }}>
          {desc}
        </div>
      </div>
    </label>
  );
}
