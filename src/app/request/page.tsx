// Widget-ready: designed to be extracted as embeddable component for renewableenergyincentives.com
"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  submitJobRequest,
  fetchServiceCatalog,
  fetchServiceAddons,
  type SubmitResult,
  type ServiceCategory,
  type ServiceAddon,
} from "./actions";

// ─── Constants ──────────────────────────────────────────────────────

const GREEN = "#10b981";
const GREEN_BG = "rgba(16,185,129,0.08)";
const GREEN_BORDER = "rgba(16,185,129,0.5)";
const RED = "#ef4444";
const RED_BORDER = "rgba(239,68,68,0.5)";
const GREY_TEXT = "#64748b";
const BORDER_DEFAULT = "#d1d5db";

const TIME_OPTIONS = [
  { value: "", label: "Select a time..." },
  { value: "Morning (8am–12pm)", label: "Morning (8am–12pm)" },
  { value: "Afternoon (12–4pm)", label: "Afternoon (12–4pm)" },
  { value: "Flexible", label: "Flexible" },
];

const SOURCE_OPTIONS = [
  { value: "", label: "Select..." },
  { value: "Real Estate Agent", label: "Real Estate Agent" },
  { value: "Utility Company", label: "Utility Company" },
  { value: "Online Search", label: "Online Search" },
  { value: "Friend/Family", label: "Friend/Family" },
  { value: "Other", label: "Other" },
];

// ─── Phone formatter ────────────────────────────────────────────────

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

// ─── Tomorrow date string ───────────────────────────────────────────

function tomorrowStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
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

function inputStyle(hasError: boolean, isValid: boolean): React.CSSProperties {
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
  };
}

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

type Role = "homeowner" | "broker" | null;

export default function RequestPage() {
  const [role, setRole] = useState<Role>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const formRef = useRef<HTMLFormElement>(null);

  // ── Service catalog state ─────────────────────────────────────
  const [catalog, setCatalog] = useState<ServiceCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedTierId, setSelectedTierId] = useState("");
  const [addons, setAddons] = useState<ServiceAddon[]>([]);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);

  useEffect(() => {
    fetchServiceCatalog().then(setCatalog).catch(() => {});
  }, []);

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

  const selectedCategory = catalog.find((c) => c.categoryId === selectedCategoryId);
  const selectedTier = selectedCategory?.tiers.find((t) => t.tierId === selectedTierId);
  const basePrice = selectedTier?.price ?? 0;
  const addonTotal = addons
    .filter((a) => selectedAddonIds.includes(a.id))
    .reduce((sum, a) => sum + a.price, 0);
  const totalPrice = basePrice + addonTotal;

  // ── Field state ─────────────────────────────────────────────
  // Homeowner
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  // Broker
  const [brokerName, setBrokerName] = useState("");
  const [brokerage, setBrokerage] = useState("");
  const [brokerEmail, setBrokerEmail] = useState("");
  const [brokerPhone, setBrokerPhone] = useState("");
  const [homeownerPresent, setHomeownerPresent] = useState(true);
  const [hoName, setHoName] = useState("");
  const [hoEmail, setHoEmail] = useState("");
  const [hoPhone, setHoPhone] = useState("");
  const [payerType, setPayerType] = useState<"broker" | "homeowner">("homeowner");
  // Common
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("OR");
  const [zip, setZip] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");

  // ── Validation on blur ──────────────────────────────────────
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const ZIP_RE = /^\d{5}$/;

  const validateField = useCallback(
    (name: string, value: string) => {
      let err = "";
      switch (name) {
        case "fullName":
        case "brokerName":
        case "brokerage":
        case "hoName":
        case "address":
        case "city":
        case "state":
          if (!value.trim()) err = "This field is required";
          break;
        case "email":
        case "brokerEmail":
        case "hoEmail":
          if (!EMAIL_RE.test(value.trim())) err = "Valid email required";
          break;
        case "phone":
        case "brokerPhone":
        case "hoPhone":
          if (value.replace(/\D/g, "").length !== 10) err = "Valid 10-digit phone required";
          break;
        case "zip":
          if (!ZIP_RE.test(value.trim())) err = "Valid 5-digit zip required";
          break;
        case "preferredDate":
          if (!value) err = "Date is required";
          else if (value < tomorrowStr()) err = "Date must be tomorrow or later";
          break;
        case "preferredTime":
          if (!value) err = "Time preference is required";
          break;
        case "serviceTierId":
          if (!value) err = "Please select a home size";
          break;
      }
      setErrors((prev) => {
        const next = { ...prev };
        if (err) next[name] = err;
        else delete next[name];
        return next;
      });
    },
    []
  );

  const handleBlur = useCallback(
    (name: string, value: string) => {
      setTouched((prev) => ({ ...prev, [name]: true }));
      validateField(name, value);
    },
    [validateField]
  );

  const fieldHasError = (name: string) => touched[name] && !!errors[name];
  const fieldIsValid = (name: string, value: string) => touched[name] && !errors[name] && value.trim().length > 0;

  // ── Auto-select broker pays when vacant ─────────────────────
  const toggleHomeownerPresent = (present: boolean) => {
    setHomeownerPresent(present);
    if (!present) setPayerType("broker");
  };

  // ── Toggle addon ──────────────────────────────────────────────
  const toggleAddon = (id: string) => {
    setSelectedAddonIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // ── Submit ──────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !role) return;

    // Full validation pass
    const allErrors: Record<string, string> = {};

    if (!selectedTierId) allErrors.serviceTierId = "Please select a home size";

    if (role === "homeowner") {
      if (!fullName.trim()) allErrors.fullName = "Name is required";
      if (!EMAIL_RE.test(email.trim())) allErrors.email = "Valid email required";
      if (phone.replace(/\D/g, "").length !== 10) allErrors.phone = "Valid 10-digit phone required";
    } else {
      if (!brokerName.trim()) allErrors.brokerName = "Name is required";
      if (!brokerage.trim()) allErrors.brokerage = "Company is required";
      if (!EMAIL_RE.test(brokerEmail.trim())) allErrors.brokerEmail = "Valid email required";
      if (brokerPhone.replace(/\D/g, "").length !== 10) allErrors.brokerPhone = "Valid 10-digit phone required";
      if (homeownerPresent) {
        if (!hoName.trim()) allErrors.hoName = "Homeowner name is required";
        if (!EMAIL_RE.test(hoEmail.trim())) allErrors.hoEmail = "Valid email required";
        if (hoPhone.replace(/\D/g, "").length !== 10) allErrors.hoPhone = "Valid 10-digit phone required";
      }
      if (!payerType) allErrors.payerType = "Payment selection required";
    }
    if (!address.trim()) allErrors.address = "Address is required";
    if (!city.trim()) allErrors.city = "City is required";
    if (!state.trim()) allErrors.state = "State is required";
    if (!ZIP_RE.test(zip.trim())) allErrors.zip = "Valid 5-digit zip required";
    if (!preferredDate) allErrors.preferredDate = "Date is required";
    else if (preferredDate < tomorrowStr()) allErrors.preferredDate = "Date must be tomorrow or later";
    if (!preferredTime) allErrors.preferredTime = "Time preference is required";

    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      setTouched(
        Object.keys(allErrors).reduce((acc, k) => ({ ...acc, [k]: true }), { ...touched })
      );
      // Scroll to first error
      const firstKey = Object.keys(allErrors)[0];
      const el = document.querySelector(`[data-field="${firstKey}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);
    try {
      const payload =
        role === "homeowner"
          ? {
              role: "homeowner" as const,
              fullName,
              email,
              phone,
              address,
              city,
              state,
              zip,
              preferredDate,
              preferredTime,
              source,
              notes,
              serviceTierId: selectedTierId,
              addonIds: selectedAddonIds,
            }
          : {
              role: "broker" as const,
              brokerName,
              brokerage,
              brokerEmail,
              brokerPhone,
              homeownerPresent,
              homeownerName: hoName,
              homeownerEmail: hoEmail,
              homeownerPhone: hoPhone,
              address,
              city,
              state,
              zip,
              payerType,
              preferredDate,
              preferredTime,
              notes,
              serviceTierId: selectedTierId,
              addonIds: selectedAddonIds,
            };

      const res = await submitJobRequest(payload);
      if (!res.success) {
        setErrors(res.errors);
        setTouched(
          Object.keys(res.errors).reduce((acc, k) => ({ ...acc, [k]: true }), { ...touched })
        );
      }
      setResult(res);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Reset form ──────────────────────────────────────────────
  const resetForm = () => {
    setRole(null);
    setResult(null);
    setErrors({});
    setTouched({});
    setFullName("");
    setEmail("");
    setPhone("");
    setBrokerName("");
    setBrokerage("");
    setBrokerEmail("");
    setBrokerPhone("");
    setHomeownerPresent(true);
    setHoName("");
    setHoEmail("");
    setHoPhone("");
    setPayerType("homeowner");
    setAddress("");
    setCity("");
    setState("OR");
    setZip("");
    setPreferredDate("");
    setPreferredTime("");
    setSource("");
    setNotes("");
    setSelectedCategoryId("");
    setSelectedTierId("");
    setSelectedAddonIds([]);
  };

  // ── Render helpers ──────────────────────────────────────────
  const renderField = (
    name: string,
    label: string,
    value: string,
    onChange: (v: string) => void,
    opts?: {
      type?: string;
      placeholder?: string;
      required?: boolean;
      min?: string;
      maxLength?: number;
      isPhone?: boolean;
      style?: React.CSSProperties;
    }
  ) => {
    const hasErr = fieldHasError(name);
    const isValid = fieldIsValid(name, value);
    return (
      <div data-field={name} style={{ marginBottom: 16, ...(opts?.style ?? {}) }}>
        <label style={labelStyle}>
          {label}
          {opts?.required !== false && <span style={{ color: RED }}> *</span>}
        </label>
        <input
          type={opts?.type ?? "text"}
          value={value}
          onChange={(e) => {
            const v = opts?.isPhone ? formatPhone(e.target.value) : e.target.value;
            onChange(v);
          }}
          onBlur={() => handleBlur(name, value)}
          placeholder={opts?.placeholder}
          min={opts?.min}
          maxLength={opts?.maxLength}
          style={inputStyle(hasErr, isValid)}
        />
        {hasErr && <div style={errorTextStyle}>{errors[name]}</div>}
      </div>
    );
  };

  const renderSelect = (
    name: string,
    label: string,
    value: string,
    onChange: (v: string) => void,
    options: { value: string; label: string }[],
    opts?: { required?: boolean; style?: React.CSSProperties }
  ) => {
    const hasErr = fieldHasError(name);
    const isValid = fieldIsValid(name, value);
    return (
      <div data-field={name} style={{ marginBottom: 16, ...(opts?.style ?? {}) }}>
        <label style={labelStyle}>
          {label}
          {opts?.required !== false && <span style={{ color: RED }}> *</span>}
        </label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => handleBlur(name, value)}
          style={{
            ...inputStyle(hasErr, isValid),
            appearance: "none" as const,
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2394a3b8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 12px center",
            paddingRight: 36,
          }}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {hasErr && <div style={errorTextStyle}>{errors[name]}</div>}
      </div>
    );
  };

  // ── Service selection section (shared between homeowner & broker) ──
  const renderServiceSelection = () => {
    const categoryOptions = [
      { value: "", label: "Select a service..." },
      ...catalog.map((c) => ({ value: c.categoryId, label: c.categoryName })),
    ];
    const tierOptions = [
      { value: "", label: "Select home size..." },
      ...(selectedCategory?.tiers.map((t) => ({
        value: t.tierId,
        label: `${t.sizeLabel} — $${t.price}`,
      })) ?? []),
    ];

    return (
      <>
        <div style={sectionTitleStyle}>Service & Pricing</div>

        {/* Service Type */}
        {renderSelect(
          "serviceCategory",
          "Service Type",
          selectedCategoryId,
          (v) => setSelectedCategoryId(v),
          categoryOptions
        )}

        {/* Home Size (tiers) */}
        {selectedCategoryId && (
          <div data-field="serviceTierId">
            {renderSelect(
              "serviceTierId",
              "Approximate Home Size",
              selectedTierId,
              (v) => setSelectedTierId(v),
              tierOptions
            )}
          </div>
        )}

        {/* Addons (only for categories that have them) */}
        {selectedCategoryId && addons.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>
              Add-On Services <span style={{ fontSize: 11, color: GREY_TEXT, fontWeight: 400 }}>(optional)</span>
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {addons.map((addon) => {
                const checked = selectedAddonIds.includes(addon.id);
                return (
                  <label
                    key={addon.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: `1.5px solid ${checked ? GREEN : BORDER_DEFAULT}`,
                      background: checked ? GREEN_BG : "#fff",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleAddon(addon.id)}
                      style={{ accentColor: GREEN, width: 16, height: 16 }}
                    />
                    <span style={{ flex: 1, fontSize: 14, color: "#334155", fontWeight: checked ? 600 : 400 }}>
                      {addon.name}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: checked ? GREEN : GREY_TEXT }}>
                      +${addon.price}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Pricing callout */}
        {selectedTier && (
          <div
            style={{
              padding: "16px 20px",
              borderRadius: 12,
              border: `2px solid ${GREEN_BORDER}`,
              background: GREEN_BG,
              marginBottom: 24,
            }}
          >
            {selectedAddonIds.length > 0 ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 14, color: "#334155" }}>
                    {selectedCategory?.categoryName} ({selectedTier.sizeLabel.split(" (")[0]})
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#334155" }}>
                    ${basePrice}
                  </span>
                </div>
                {addons
                  .filter((a) => selectedAddonIds.includes(a.id))
                  .map((a) => (
                    <div key={a.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, color: GREY_TEXT }}>+ {a.name}</span>
                      <span style={{ fontSize: 13, color: GREY_TEXT }}>${a.price}</span>
                    </div>
                  ))}
                <div
                  style={{
                    borderTop: `1px solid ${GREEN_BORDER}`,
                    marginTop: 10,
                    paddingTop: 10,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>Total</span>
                  <span style={{ fontSize: 24, fontWeight: 800, color: GREEN }}>${totalPrice}</span>
                </div>
              </>
            ) : (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: "#334155" }}>
                  Your {selectedCategory?.categoryName}
                </span>
                <span style={{ fontSize: 24, fontWeight: 800, color: GREEN }}>${totalPrice}</span>
              </div>
            )}
          </div>
        )}
      </>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // SUCCESS SCREEN
  // ═══════════════════════════════════════════════════════════════
  if (result?.success) {
    const contactEmail =
      role === "homeowner" ? email : homeownerPresent ? hoEmail : brokerEmail;
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f8fafc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <style>{`
          @keyframes checkDraw {
            0% { stroke-dashoffset: 48; }
            100% { stroke-dashoffset: 0; }
          }
          @keyframes circleScale {
            0% { transform: scale(0); opacity: 0; }
            60% { transform: scale(1.15); }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>
        <div style={{ ...cardStyle, textAlign: "center" as const }}>
          {/* Animated checkmark */}
          <div
            style={{
              width: 80,
              height: 80,
              margin: "0 auto 24px",
              borderRadius: "50%",
              background: GREEN_BG,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "circleScale 0.5s ease-out forwards",
            }}
          >
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path
                d="M10 21L17 28L30 13"
                stroke={GREEN}
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="48"
                strokeDashoffset="48"
                style={{ animation: "checkDraw 0.4s 0.3s ease-out forwards" }}
              />
            </svg>
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1e293b", margin: "0 0 8px" }}>
            Your request has been submitted!
          </h2>
          <p style={{ fontSize: 15, color: GREY_TEXT, margin: "0 0 20px" }}>
            We&apos;ll confirm your appointment within 1 business day.
          </p>
          <div
            style={{
              display: "inline-block",
              padding: "10px 20px",
              background: "#f1f5f9",
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 700,
              color: "#334155",
              marginBottom: 16,
            }}
          >
            Reference #: REI-{result.referenceId}
          </div>
          <p style={{ fontSize: 14, color: GREY_TEXT, margin: "0 0 24px" }}>
            {role === "homeowner"
              ? `A confirmation email will be sent to ${contactEmail}`
              : "We'll send confirmation to both you and the homeowner"}
          </p>
          <button
            onClick={resetForm}
            style={{
              background: "none",
              border: "none",
              color: GREEN,
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              textDecoration: "underline",
              padding: 0,
            }}
          >
            Submit Another Request
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // FORM
  // ═══════════════════════════════════════════════════════════════
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        padding: "40px 20px 60px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div style={cardStyle}>
        {/* Logo */}
        <div style={{ textAlign: "center" as const, marginBottom: 24 }}>
          <img
            src="/images/rei-logo.png"
            alt="Renewable Energy Incentives"
            style={{ height: 48, objectFit: "contain" as const }}
          />
        </div>

        {/* Heading */}
        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: "#1e293b",
            textAlign: "center" as const,
            margin: "0 0 6px",
          }}
        >
          Schedule a Home Energy Assessment
        </h1>
        <p
          style={{
            fontSize: 15,
            color: GREY_TEXT,
            textAlign: "center" as const,
            margin: "0 0 32px",
          }}
        >
          Get your Home Energy Score and personalized LEAF energy analysis
        </p>

        {/* ── Step 1: Role Selection ──────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginBottom: role ? 32 : 0,
          }}
        >
          {(
            [
              {
                key: "homeowner" as const,
                icon: "\u{1F3E0}",
                title: "I'm a Homeowner",
                sub: "I want to schedule an assessment for my home",
              },
              {
                key: "broker" as const,
                icon: "\u{1F3E2}",
                title: "I'm a Real Estate Professional",
                sub: "I'm requesting on behalf of a client or property",
              },
            ] as const
          ).map((opt) => {
            const selected = role === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => {
                  setRole(opt.key);
                  setErrors({});
                  setTouched({});
                }}
                style={{
                  padding: "24px 16px",
                  borderRadius: 12,
                  border: `2px solid ${selected ? GREEN : BORDER_DEFAULT}`,
                  background: selected ? GREEN_BG : "#fff",
                  cursor: "pointer",
                  textAlign: "center" as const,
                  transition: "all 0.2s",
                  outline: "none",
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>{opt.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>
                  {opt.title}
                </div>
                <div style={{ fontSize: 13, color: GREY_TEXT }}>{opt.sub}</div>
              </button>
            );
          })}
        </div>

        {/* ── Form ────────────────────────────────────────────── */}
        {role && (
          <form ref={formRef} onSubmit={handleSubmit} noValidate>
            {/* Form-level error */}
            {errors._form && (
              <div
                style={{
                  padding: "12px 16px",
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: 8,
                  color: RED,
                  fontSize: 14,
                  marginBottom: 20,
                }}
              >
                {errors._form}
              </div>
            )}

            {/* ── Service & Pricing (shown first for both roles) ── */}
            {renderServiceSelection()}

            {/* ── Homeowner Form ──────────────────────────────── */}
            {role === "homeowner" && (
              <>
                <div style={sectionTitleStyle}>Your Information</div>
                {renderField("fullName", "Full Name", fullName, setFullName, {
                  placeholder: "Jane Smith",
                })}
                {renderField("email", "Email", email, setEmail, {
                  type: "email",
                  placeholder: "jane@example.com",
                })}
                {renderField("phone", "Phone", phone, setPhone, {
                  type: "tel",
                  placeholder: "(503) 555-1234",
                  isPhone: true,
                })}

                <div style={sectionTitleStyle}>Property Address</div>
                {renderField("address", "Street Address", address, setAddress, {
                  placeholder: "1234 Oak St",
                })}
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
                  {renderField("city", "City", city, setCity, {
                    placeholder: "Portland",
                    style: { marginBottom: 0 },
                  })}
                  {renderField("state", "State", state, setState, {
                    placeholder: "OR",
                    style: { marginBottom: 0 },
                  })}
                  {renderField("zip", "Zip", zip, setZip, {
                    placeholder: "97201",
                    maxLength: 5,
                    style: { marginBottom: 0 },
                  })}
                </div>
                <div style={{ marginBottom: 16 }} />

                <div style={sectionTitleStyle}>Scheduling</div>
                {renderField("preferredDate", "Preferred Date", preferredDate, setPreferredDate, {
                  type: "date",
                  min: tomorrowStr(),
                })}
                {renderSelect("preferredTime", "Preferred Time", preferredTime, setPreferredTime, TIME_OPTIONS)}
                {renderSelect("source", "How did you hear about us?", source, setSource, SOURCE_OPTIONS, {
                  required: false,
                })}
                <div data-field="notes" style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value.slice(0, 500))}
                    placeholder="Any special instructions or access details..."
                    maxLength={500}
                    rows={3}
                    style={{
                      ...inputStyle(false, false),
                      resize: "vertical" as const,
                      minHeight: 72,
                    }}
                  />
                  <div style={{ fontSize: 11, color: GREY_TEXT, textAlign: "right" as const, marginTop: 2 }}>
                    {notes.length}/500
                  </div>
                </div>
              </>
            )}

            {/* ── Broker Form ─────────────────────────────────── */}
            {role === "broker" && (
              <>
                <div style={sectionTitleStyle}>Your Information</div>
                {renderField("brokerName", "Your Name", brokerName, setBrokerName, {
                  placeholder: "Sarah Johnson",
                })}
                {renderField("brokerage", "Brokerage / Company", brokerage, setBrokerage, {
                  placeholder: "ABC Realty",
                })}
                {renderField("brokerEmail", "Your Email", brokerEmail, setBrokerEmail, {
                  type: "email",
                  placeholder: "sarah@abcrealty.com",
                })}
                {renderField("brokerPhone", "Your Phone", brokerPhone, setBrokerPhone, {
                  type: "tel",
                  placeholder: "(503) 555-1234",
                  isPhone: true,
                })}

                {/* Homeowner presence toggle */}
                <div style={{ ...sectionTitleStyle, marginBottom: 12 }}>Property &amp; Homeowner</div>
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  {(
                    [
                      { val: true, label: "Homeowner will be present" },
                      { val: false, label: "Vacant / no homeowner contact" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={String(opt.val)}
                      type="button"
                      onClick={() => toggleHomeownerPresent(opt.val)}
                      style={{
                        flex: 1,
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: `1.5px solid ${homeownerPresent === opt.val ? GREEN : BORDER_DEFAULT}`,
                        background: homeownerPresent === opt.val ? GREEN_BG : "#fff",
                        color: homeownerPresent === opt.val ? GREEN : "#64748b",
                        fontWeight: homeownerPresent === opt.val ? 600 : 400,
                        fontSize: 13,
                        cursor: "pointer",
                        transition: "all 0.2s",
                        outline: "none",
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Homeowner fields — shown only if present */}
                {homeownerPresent && (
                  <>
                    {renderField("hoName", "Homeowner Name", hoName, setHoName, {
                      placeholder: "Jane Smith",
                    })}
                    {renderField("hoEmail", "Homeowner Email", hoEmail, setHoEmail, {
                      type: "email",
                      placeholder: "jane@example.com",
                    })}
                    {renderField("hoPhone", "Homeowner Phone", hoPhone, setHoPhone, {
                      type: "tel",
                      placeholder: "(503) 555-1234",
                      isPhone: true,
                    })}
                  </>
                )}

                {renderField("address", "Property Address", address, setAddress, {
                  placeholder: "1234 Oak St",
                })}
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
                  {renderField("city", "City", city, setCity, {
                    placeholder: "Portland",
                    style: { marginBottom: 0 },
                  })}
                  {renderField("state", "State", state, setState, {
                    placeholder: "OR",
                    style: { marginBottom: 0 },
                  })}
                  {renderField("zip", "Zip", zip, setZip, {
                    placeholder: "97201",
                    maxLength: 5,
                    style: { marginBottom: 0 },
                  })}
                </div>
                <div style={{ marginBottom: 16 }} />

                {/* Payment section */}
                <div style={sectionTitleStyle}>Payment</div>
                {!homeownerPresent ? (
                  <div
                    style={{
                      padding: "10px 14px",
                      background: "#f1f5f9",
                      borderRadius: 8,
                      fontSize: 13,
                      color: GREY_TEXT,
                      marginBottom: 20,
                    }}
                  >
                    Since the property is vacant, the broker will be invoiced.
                  </div>
                ) : (
                  <div data-field="payerType" style={{ marginBottom: 20 }}>
                    <label style={{ ...labelStyle, marginBottom: 10 }}>
                      Who will be paying? <span style={{ color: RED }}>*</span>
                    </label>
                    {(
                      [
                        { val: "broker" as const, label: "I will (broker pays)" },
                        { val: "homeowner" as const, label: "The homeowner will pay" },
                      ] as const
                    ).map((opt) => (
                      <label
                        key={opt.val}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "10px 14px",
                          borderRadius: 8,
                          border: `1.5px solid ${payerType === opt.val ? GREEN : BORDER_DEFAULT}`,
                          background: payerType === opt.val ? GREEN_BG : "#fff",
                          marginBottom: 8,
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                      >
                        <input
                          type="radio"
                          name="payerType"
                          checked={payerType === opt.val}
                          onChange={() => setPayerType(opt.val)}
                          style={{ accentColor: GREEN }}
                        />
                        <span style={{ fontSize: 14, color: "#334155", fontWeight: payerType === opt.val ? 600 : 400 }}>
                          {opt.label}
                        </span>
                      </label>
                    ))}
                    {fieldHasError("payerType") && (
                      <div style={errorTextStyle}>{errors.payerType}</div>
                    )}
                  </div>
                )}

                {/* Scheduling */}
                <div style={sectionTitleStyle}>Scheduling</div>
                {renderField("preferredDate", "Preferred Date", preferredDate, setPreferredDate, {
                  type: "date",
                  min: tomorrowStr(),
                })}
                {renderSelect("preferredTime", "Preferred Time", preferredTime, setPreferredTime, TIME_OPTIONS)}
                <div data-field="notes" style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value.slice(0, 500))}
                    placeholder="Any special instructions or access details..."
                    maxLength={500}
                    rows={3}
                    style={{
                      ...inputStyle(false, false),
                      resize: "vertical" as const,
                      minHeight: 72,
                    }}
                  />
                  <div style={{ fontSize: 11, color: GREY_TEXT, textAlign: "right" as const, marginTop: 2 }}>
                    {notes.length}/500
                  </div>
                </div>
              </>
            )}

            {/* ── Submit Button ────────────────────────────────── */}
            <button
              type="submit"
              disabled={submitting}
              style={{
                width: "100%",
                padding: "14px 24px",
                borderRadius: 10,
                border: "none",
                background: submitting ? "#94a3b8" : GREEN,
                color: "#fff",
                fontSize: 16,
                fontWeight: 700,
                cursor: submitting ? "not-allowed" : "pointer",
                transition: "background 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                marginTop: 8,
              }}
            >
              {submitting && (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  style={{ animation: "spin 1s linear infinite" }}
                >
                  <circle
                    cx="9"
                    cy="9"
                    r="7"
                    stroke="#fff"
                    strokeWidth="2.5"
                    fill="none"
                    strokeDasharray="32"
                    strokeDashoffset="12"
                    strokeLinecap="round"
                  />
                </svg>
              )}
              {submitting ? "Submitting..." : "Request Assessment"}
            </button>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </form>
        )}
      </div>
    </div>
  );
}
