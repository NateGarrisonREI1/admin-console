// src/app/(app)/broker/settings/BrokerSettingsClient.tsx
"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  updateBrokerProfile,
  updateReferralCode,
  uploadBrokerLogo,
  removeBrokerLogo,
  type BrokerSettings,
} from "./actions";

// ─── Design tokens ──────────────────────────────────────────────────
const BG = "#0f172a";
const CARD = "#1e293b";
const BORDER = "#334155";
const TEXT = "#f1f5f9";
const TEXT_SEC = "#cbd5e1";
const TEXT_DIM = "#64748b";
const EMERALD = "#10b981";
const EMERALD_BG = "rgba(16,185,129,0.08)";
const EMERALD_BORDER = "rgba(16,185,129,0.25)";
const RED = "#ef4444";

const BASE_URL = "app.renewableenergyincentives.com/request/";

// ─── Helpers ────────────────────────────────────────────────────────

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

// ─── Styles ─────────────────────────────────────────────────────────

const sectionStyle: React.CSSProperties = {
  background: CARD,
  border: `1px solid ${BORDER}`,
  borderRadius: 12,
  padding: 24,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  color: TEXT_DIM,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: 6,
};

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
  fontFamily: "inherit",
};

function btnPrimary(disabled?: boolean): React.CSSProperties {
  return {
    padding: "10px 20px",
    borderRadius: 8,
    border: "none",
    background: EMERALD,
    color: "#fff",
    fontSize: 13,
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: "all 0.15s ease",
  };
}

function btnSecondary(): React.CSSProperties {
  return {
    padding: "10px 20px",
    borderRadius: 8,
    border: `1px solid ${BORDER}`,
    background: "transparent",
    color: TEXT_SEC,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s ease",
  };
}

// ─── Email templates ────────────────────────────────────────────────

function getTemplates(brokerName: string, companyName: string | null, clientLink: string) {
  const company = companyName || "our team";
  return [
    {
      name: "Introduce HES to Your Client",
      description: "Explain what a Home Energy Score is and why it matters",
      subject: "Save Money on Energy Costs — Free Home Analysis",
      body: `Hi,\n\nI wanted to share a resource that can help you understand your home's energy efficiency and find ways to save on utility costs.\n\nA Home Energy Score (HES) assessment identifies where your home loses energy and provides a clear roadmap for improvements. It typically takes about an hour and covers insulation, HVAC, windows, and more.\n\nI've partnered with REI (Renewable Energy Incentives) to make scheduling easy. You can book your assessment directly here:\n${clientLink}\n\nFeel free to reach out if you have any questions.\n\nBest,\n${brokerName}\n${company}`,
    },
    {
      name: "LEAF Report Follow-Up",
      description: "Follow up after a LEAF report has been delivered",
      subject: "Your Home Energy Report is Ready",
      body: `Hi,\n\nGreat news — your LEAF (Local Energy Assessment & Forecast) report is ready! This report includes your Home Energy Score, personalized upgrade recommendations, and estimated savings.\n\nI'd love to walk you through the findings and discuss next steps. The report highlights opportunities that could reduce your energy bills and increase your home's value.\n\nWould you have time for a quick call this week?\n\nBest,\n${brokerName}\n${company}`,
    },
    {
      name: "Schedule Your Assessment",
      description: "Short and direct — send the scheduling link",
      subject: "Schedule Your Home Energy Assessment",
      body: `Hi,\n\nReady to learn how efficient your home is? Use the link below to schedule your Home Energy Assessment at a time that works for you:\n${clientLink}\n\nI'll be involved throughout the process and will share the results with you once complete. The assessment takes about an hour.\n\nLooking forward to it!\n\n${brokerName}\n${company}`,
    },
    {
      name: "Post-Sale Energy Check",
      description: "Suggest an HES after a real estate transaction",
      subject: "Congratulations on Your New Home!",
      body: `Hi,\n\nCongratulations on your new home! As you settle in, I'd recommend scheduling a Home Energy Assessment. It's one of the smartest first steps for any new homeowner.\n\nYou'll get a clear picture of your home's energy performance and actionable recommendations that can save you money from day one.\n\nSchedule here:\n${clientLink}\n\nLet me know if you have any questions — happy to help!\n\nWarm regards,\n${brokerName}\n${company}`,
    },
  ];
}

// ─── Component ──────────────────────────────────────────────────────

export default function BrokerSettingsClient({
  settings,
}: {
  settings: BrokerSettings;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  // ── Profile state ───────────────────────────────────────────────
  const [fullName, setFullName] = useState(settings.fullName);
  const [phone, setPhone] = useState(settings.phone ? formatPhone(settings.phone) : "");
  const [companyName, setCompanyName] = useState(settings.companyName || "");
  const [logoUrl, setLogoUrl] = useState<string | null>(settings.logoUrl);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // ── Client link state ───────────────────────────────────────────
  const [refCode, setRefCode] = useState(settings.referralCode || "");
  const [refCodeDraft, setRefCodeDraft] = useState(settings.referralCode || "");
  const [savingCode, setSavingCode] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [copied, setCopied] = useState(false);

  // ── Email templates state ───────────────────────────────────────
  const [expandedTemplate, setExpandedTemplate] = useState<number | null>(null);
  const [copiedTemplate, setCopiedTemplate] = useState<number | null>(null);

  // ── Preferences state (localStorage) ────────────────────────────
  const [defaultPayer, setDefaultPayer] = useState<string>("broker");
  const [notifyClientRequest, setNotifyClientRequest] = useState(true);
  const [notifyJobStatus, setNotifyJobStatus] = useState(true);
  const [notifyLeafDelivery, setNotifyLeafDelivery] = useState(true);
  const [notifyLeadAlerts, setNotifyLeadAlerts] = useState(true);

  // Load preferences from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("rei_broker_prefs");
      if (saved) {
        const p = JSON.parse(saved);
        if (p.defaultPayer) setDefaultPayer(p.defaultPayer);
        if (typeof p.notifyClientRequest === "boolean") setNotifyClientRequest(p.notifyClientRequest);
        if (typeof p.notifyJobStatus === "boolean") setNotifyJobStatus(p.notifyJobStatus);
        if (typeof p.notifyLeafDelivery === "boolean") setNotifyLeafDelivery(p.notifyLeafDelivery);
        if (typeof p.notifyLeadAlerts === "boolean") setNotifyLeadAlerts(p.notifyLeadAlerts);
      }
    } catch {}
  }, []);

  // ── Handlers ────────────────────────────────────────────────────

  const clientLink = refCode ? `https://${BASE_URL}${refCode}` : "";

  async function handleSaveProfile() {
    setSavingProfile(true);
    const res = await updateBrokerProfile({
      fullName,
      phone: phone.replace(/\D/g, ""),
      companyName,
    });
    setSavingProfile(false);
    if (res.success) {
      showToast("Profile saved");
      router.refresh();
    } else {
      showToast(res.error || "Failed to save", "error");
    }
  }

  async function handleSaveCode() {
    const cleaned = refCodeDraft.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!cleaned || cleaned.length < 3) {
      setCodeError("Code must be at least 3 characters");
      return;
    }
    setSavingCode(true);
    setCodeError("");
    const res = await updateReferralCode(cleaned);
    setSavingCode(false);
    if (res.success) {
      setRefCode(cleaned);
      setRefCodeDraft(cleaned);
      showToast("Referral code updated");
      router.refresh();
    } else {
      setCodeError(res.error || "Failed to update");
    }
  }

  const handleLogoFile = useCallback(async (file: File) => {
    const allowedTypes = ["image/png", "image/jpeg", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      showToast("Only PNG, JPG, and SVG files are accepted", "error");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast("File must be under 2MB", "error");
      return;
    }

    setUploadingLogo(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await uploadBrokerLogo(fd);
    setUploadingLogo(false);

    if (res.success && res.url) {
      setLogoUrl(res.url);
      showToast("Logo uploaded");
      router.refresh();
    } else {
      showToast(res.error || "Upload failed", "error");
    }
  }, [router]);

  async function handleRemoveLogo() {
    setUploadingLogo(true);
    const res = await removeBrokerLogo();
    setUploadingLogo(false);
    if (res.success) {
      setLogoUrl(null);
      showToast("Logo removed");
      router.refresh();
    } else {
      showToast(res.error || "Failed to remove", "error");
    }
  }

  function handleCopyLink() {
    if (!clientLink) return;
    navigator.clipboard.writeText(clientLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSavePreferences() {
    try {
      localStorage.setItem("rei_broker_prefs", JSON.stringify({
        defaultPayer,
        notifyClientRequest,
        notifyJobStatus,
        notifyLeafDelivery,
        notifyLeadAlerts,
      }));
      showToast("Preferences saved");
    } catch {
      showToast("Failed to save preferences", "error");
    }
  }

  const conversionRate =
    settings.referralVisits > 0
      ? ((settings.referralConversions / settings.referralVisits) * 100).toFixed(1)
      : "0";

  const templates = getTemplates(fullName, companyName || null, clientLink);

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Page header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT, margin: "0 0 4px" }}>Settings</h1>
        <p style={{ fontSize: 13, color: TEXT_DIM, margin: 0 }}>Manage your profile, client link, and preferences</p>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
          border: `1px solid ${toast.type === "error" ? "rgba(239,68,68,0.3)" : EMERALD_BORDER}`,
          background: toast.type === "error" ? "rgba(239,68,68,0.08)" : EMERALD_BG,
          color: toast.type === "error" ? RED : EMERALD,
          transition: "all 0.2s ease",
        }}>
          {toast.message}
        </div>
      )}

      {/* ═══ SECTION 1: PROFILE ═══ */}
      <div style={sectionStyle}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: TEXT, margin: "0 0 4px" }}>Profile</h2>
        <p style={{ fontSize: 12, color: TEXT_DIM, margin: "0 0 20px" }}>Your broker identity and branding</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={labelStyle}>Contact Name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Smith"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Company Name</label>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Smith Realty Group"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="(503) 555-1234"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input
              value={settings.email}
              readOnly
              style={{ ...inputStyle, opacity: 0.5, cursor: "not-allowed" }}
            />
            <div style={{ fontSize: 10, color: TEXT_DIM, marginTop: 4 }}>Change via account settings</div>
          </div>
        </div>

        {/* Logo upload */}
        <div style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid ${BORDER}` }}>
          <label style={labelStyle}>Logo</label>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files[0];
                if (file) handleLogoFile(file);
              }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: 100, height: 100, borderRadius: 12,
                border: `2px dashed ${dragOver ? EMERALD : BORDER}`,
                background: dragOver ? EMERALD_BG : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", transition: "all 0.15s ease", flexShrink: 0,
                overflow: "hidden",
              }}
            >
              {uploadingLogo ? (
                <div style={{ fontSize: 12, color: TEXT_DIM }}>Uploading...</div>
              ) : logoUrl ? (
                <img src={logoUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 8 }} />
              ) : (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 24, marginBottom: 2 }}>+</div>
                  <div style={{ fontSize: 10, color: TEXT_DIM }}>Upload</div>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoFile(file);
                e.target.value = "";
              }}
            />

            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                  style={btnSecondary()}
                >
                  Upload Logo
                </button>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    disabled={uploadingLogo}
                    style={{ ...btnSecondary(), color: RED, borderColor: "rgba(239,68,68,0.3)" }}
                  >
                    Remove
                  </button>
                )}
              </div>
              <div style={{ fontSize: 11, color: TEXT_DIM, lineHeight: 1.5 }}>
                PNG, JPG, or SVG — max 2MB<br />
                Shown on your client referral form
              </div>
            </div>
          </div>
        </div>

        {/* Live preview */}
        <div style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid ${BORDER}` }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase",
            letterSpacing: "0.08em", marginBottom: 10,
          }}>
            Preview — What your clients see
          </div>
          <div style={{
            borderRadius: 12, border: `1px solid ${BORDER}`, overflow: "hidden",
            transform: "scale(0.65)", transformOrigin: "top left",
            width: "153.8%", /* 1/0.65 to fill available width after scale */
          }}>
            <div style={{ background: CARD, padding: "28px 24px 20px" }}>
              {/* Mini header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <Image src="/images/rei-logo.png" alt="REI" width={80} height={22} style={{ objectFit: "contain" }} />
                {logoUrl ? (
                  <img src={logoUrl} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: "contain", border: `1px solid ${BORDER}` }} />
                ) : (
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%", background: BG,
                    border: `2px solid ${EMERALD_BORDER}`, display: "grid", placeItems: "center",
                    fontSize: 13, fontWeight: 700, color: EMERALD,
                  }}>
                    {(companyName || fullName || "B").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {/* Mini title */}
              <div style={{ textAlign: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: TEXT, marginBottom: 6 }}>
                  Schedule a Home Energy Assessment
                </div>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "6px 12px", borderRadius: 6,
                  background: EMERALD_BG, border: `1px solid ${BORDER}`,
                  fontSize: 11, fontWeight: 600, color: EMERALD,
                }}>
                  Referred by {fullName || "Broker"}
                  {companyName && <span style={{ color: TEXT_DIM }}>&mdash; {companyName}</span>}
                </div>
              </div>
              {/* Mini progress bar */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ width: "100%", height: 4, borderRadius: 2, background: BORDER }}>
                  <div style={{ width: "16%", height: "100%", borderRadius: 2, background: EMERALD }} />
                </div>
                <div style={{ fontSize: 9, color: TEXT_DIM, textAlign: "right", marginTop: 3 }}>Step 1 of 6</div>
              </div>
              {/* Mini service cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div style={{
                  padding: "12px 10px", borderRadius: 8, border: `2px solid ${EMERALD}`,
                  background: EMERALD_BG, textAlign: "center",
                }}>
                  <div style={{ fontSize: 16, marginBottom: 2 }}>🏠</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: EMERALD }}>HES Assessment</div>
                </div>
                <div style={{
                  padding: "12px 10px", borderRadius: 8, border: `1px solid ${BORDER}`,
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 16, marginBottom: 2 }}>🔍</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_SEC }}>Inspection</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={savingProfile}
            style={btnPrimary(savingProfile)}
          >
            {savingProfile ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* ═══ SECTION 2: CLIENT LINK ═══ */}
      <div style={sectionStyle}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: TEXT, margin: "0 0 4px" }}>Client Link</h2>
        <p style={{ fontSize: 12, color: TEXT_DIM, margin: "0 0 20px" }}>Your personalized referral link for clients</p>

        {/* Current link */}
        {refCode && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Your Link</label>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 14px", borderRadius: 8,
              background: BG, border: `1px solid ${BORDER}`,
            }}>
              <span style={{ flex: 1, fontSize: 13, color: EMERALD, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {BASE_URL}{refCode}
              </span>
            </div>
          </div>
        )}

        {/* Referral code */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Referral Code</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={refCodeDraft}
              onChange={(e) => {
                const v = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                setRefCodeDraft(v);
                setCodeError("");
              }}
              placeholder="your-code"
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              type="button"
              onClick={handleSaveCode}
              disabled={savingCode || refCodeDraft === refCode}
              style={btnPrimary(savingCode || refCodeDraft === refCode)}
            >
              {savingCode ? "Saving..." : "Update Code"}
            </button>
          </div>
          {refCodeDraft && refCodeDraft !== refCode && (
            <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 6 }}>
              Preview: {BASE_URL}<span style={{ color: EMERALD, fontWeight: 600 }}>{refCodeDraft}</span>
            </div>
          )}
          {codeError && (
            <div style={{ fontSize: 12, color: RED, marginTop: 6, fontWeight: 600 }}>{codeError}</div>
          )}
          <div style={{ fontSize: 10, color: TEXT_DIM, marginTop: 6 }}>
            Lowercase letters, numbers, and hyphens only
          </div>
        </div>

        {/* Stats */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12,
          marginBottom: 16, paddingTop: 16, borderTop: `1px solid ${BORDER}`,
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: EMERALD }}>{settings.referralVisits}</div>
            <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 2 }}>Link Visits</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: EMERALD }}>{settings.referralConversions}</div>
            <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 2 }}>Submissions</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: EMERALD }}>{conversionRate}%</div>
            <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 2 }}>Conversion</div>
          </div>
        </div>

        {/* Action buttons */}
        {refCode && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={handleCopyLink}
              style={btnSecondary()}
            >
              {copied ? "Copied!" : "Copy Link"}
            </button>
            <a
              href={`sms:?body=${encodeURIComponent(`Schedule your Home Energy Assessment here: ${clientLink}`)}`}
              style={{ ...btnSecondary(), textDecoration: "none", display: "inline-flex", alignItems: "center" }}
            >
              Text
            </a>
            <a
              href={`mailto:?subject=${encodeURIComponent("Schedule Your Home Energy Assessment")}&body=${encodeURIComponent(`Hi,\n\nUse this link to schedule your Home Energy Assessment:\n${clientLink}\n\nBest,\n${fullName}`)}`}
              style={{ ...btnSecondary(), textDecoration: "none", display: "inline-flex", alignItems: "center" }}
            >
              Email
            </a>
          </div>
        )}
      </div>

      {/* ═══ SECTION 3: EMAIL TEMPLATES ═══ */}
      <div style={sectionStyle}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: TEXT, margin: "0 0 4px" }}>Email Templates</h2>
        <p style={{ fontSize: 12, color: TEXT_DIM, margin: "0 0 20px" }}>Pre-written emails you can copy and send from your own email client</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {templates.map((tpl, i) => {
            const isOpen = expandedTemplate === i;
            return (
              <div key={i} style={{
                borderRadius: 10, border: `1px solid ${isOpen ? EMERALD_BORDER : BORDER}`,
                background: isOpen ? EMERALD_BG : "transparent",
                overflow: "hidden", transition: "all 0.15s ease",
              }}>
                <button
                  type="button"
                  onClick={() => setExpandedTemplate(isOpen ? null : i)}
                  style={{
                    width: "100%", padding: "14px 16px",
                    background: "transparent", border: "none", cursor: "pointer",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    textAlign: "left",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{tpl.name}</div>
                    <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 2 }}>{tpl.description}</div>
                  </div>
                  <span style={{ fontSize: 18, color: TEXT_DIM, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                    ▾
                  </span>
                </button>

                {isOpen && (
                  <div style={{ padding: "0 16px 16px" }}>
                    <div style={{
                      padding: "12px 14px", borderRadius: 8,
                      background: BG, border: `1px solid ${BORDER}`,
                      marginBottom: 12,
                    }}>
                      <div style={{ fontSize: 11, color: TEXT_DIM, marginBottom: 4 }}>Subject:</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 12 }}>{tpl.subject}</div>
                      <div style={{ fontSize: 11, color: TEXT_DIM, marginBottom: 4 }}>Body:</div>
                      <pre style={{
                        fontSize: 12, color: TEXT_SEC, lineHeight: 1.6,
                        whiteSpace: "pre-wrap", wordWrap: "break-word",
                        margin: 0, fontFamily: "inherit",
                      }}>
                        {tpl.body}
                      </pre>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`Subject: ${tpl.subject}\n\n${tpl.body}`);
                          setCopiedTemplate(i);
                          setTimeout(() => setCopiedTemplate(null), 2000);
                        }}
                        style={btnSecondary()}
                      >
                        {copiedTemplate === i ? "Copied!" : "Copy to Clipboard"}
                      </button>
                      <a
                        href={`mailto:?subject=${encodeURIComponent(tpl.subject)}&body=${encodeURIComponent(tpl.body)}`}
                        style={{ ...btnPrimary(), textDecoration: "none", display: "inline-flex", alignItems: "center" }}
                      >
                        Open in Email
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ SECTION 4: PREFERENCES ═══ */}
      <div style={sectionStyle}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: TEXT, margin: "0 0 4px" }}>Preferences</h2>
        <p style={{ fontSize: 12, color: TEXT_DIM, margin: "0 0 20px" }}>Default settings for new requests</p>

        {/* Default payment method */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Default Payment Method</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {([
              { value: "broker", label: "I pay (invoice me)" },
              { value: "homeowner", label: "Homeowner pays" },
              { value: "ask", label: "Ask each time" },
            ] as const).map((opt) => {
              const isActive = defaultPayer === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDefaultPayer(opt.value)}
                  style={{
                    padding: "12px 14px", borderRadius: 8, textAlign: "left",
                    border: `1.5px solid ${isActive ? EMERALD_BORDER : BORDER}`,
                    background: isActive ? EMERALD_BG : "transparent",
                    color: isActive ? EMERALD : TEXT_SEC,
                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notification toggles */}
        <div style={{ paddingTop: 20, borderTop: `1px solid ${BORDER}` }}>
          <label style={labelStyle}>Email Notifications</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <ToggleRow label="New client request (from client link)" checked={notifyClientRequest} onChange={setNotifyClientRequest} />
            <ToggleRow label="Job status updates" checked={notifyJobStatus} onChange={setNotifyJobStatus} />
            <ToggleRow label="LEAF delivery notifications" checked={notifyLeafDelivery} onChange={setNotifyLeafDelivery} />
            <ToggleRow label="Lead marketplace alerts" checked={notifyLeadAlerts} onChange={setNotifyLeadAlerts} />
          </div>
        </div>

        {/* Save preferences */}
        <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={handleSavePreferences}
            style={btnPrimary()}
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Toggle component ───────────────────────────────────────────────

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px", borderRadius: 8,
        border: `1px solid ${BORDER}`, background: "transparent",
        cursor: "pointer", textAlign: "left",
      }}
    >
      <span style={{ fontSize: 13, color: TEXT_SEC }}>{label}</span>
      <div style={{
        width: 40, height: 22, borderRadius: 11,
        background: checked ? EMERALD : BORDER,
        position: "relative", transition: "background 0.2s ease",
        flexShrink: 0,
      }}>
        <div style={{
          width: 18, height: 18, borderRadius: "50%",
          background: "#fff", position: "absolute", top: 2,
          left: checked ? 20 : 2, transition: "left 0.2s ease",
        }} />
      </div>
    </button>
  );
}
