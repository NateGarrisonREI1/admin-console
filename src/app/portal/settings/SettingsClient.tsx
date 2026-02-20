"use client";

import { useState } from "react";
import type { PortalUser } from "../actions";
import { updateProfile, updatePortalSettings } from "../actions";

// ─── Shared styles ──────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: "#0f172a",
  border: "1px solid rgba(51,65,85,0.5)",
  borderRadius: 12,
  padding: 24,
  marginBottom: 20,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  color: "#94a3b8",
  marginBottom: 4,
  fontWeight: 500,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  fontSize: 16,
  background: "rgba(30,41,59,0.5)",
  border: "1px solid rgba(51,65,85,0.5)",
  borderRadius: 8,
  color: "#fff",
  outline: "none",
  transition: "border-color 0.15s, box-shadow 0.15s",
  minHeight: 44,
  boxSizing: "border-box" as const,
};

const inputReadOnlyStyle: React.CSSProperties = {
  ...inputStyle,
  color: "#64748b",
  cursor: "not-allowed",
  background: "rgba(15,23,42,0.5)",
};

const helperStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#64748b",
  marginTop: 4,
};

const headingStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: "#f1f5f9",
  marginBottom: 4,
};

const subHeadingStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#64748b",
  marginBottom: 20,
};

// ─── Save button component ──────────────────────────────────────────

function SaveButton({
  onClick,
  saving,
  saved,
  error,
}: {
  onClick: () => void;
  saving: boolean;
  saved: boolean;
  error: string | null;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", marginTop: 16 }}>
      <button
        type="button"
        onClick={onClick}
        disabled={saving}
        style={{
          padding: "10px 24px",
          fontSize: 14,
          fontWeight: 600,
          borderRadius: 8,
          border: "none",
          cursor: saving ? "not-allowed" : "pointer",
          background: saved ? "#059669" : "linear-gradient(135deg, #059669, #10b981)",
          color: "#fff",
          transition: "all 0.15s",
          minHeight: 44,
          minWidth: 100,
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Spinner /> Saving...
          </span>
        ) : saved ? (
          "\u2713 Saved"
        ) : (
          "Save"
        )}
      </button>
      {error && (
        <span style={{ fontSize: 12, color: "#f87171", marginTop: 6 }}>{error}</span>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <span
      style={{
        display: "inline-block",
        width: 14,
        height: 14,
        border: "2px solid rgba(255,255,255,0.3)",
        borderTopColor: "#fff",
        borderRadius: "50%",
        animation: "portal-spin 0.6s linear infinite",
      }}
    />
  );
}

// ─── Toggle component ───────────────────────────────────────────────

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 0",
        cursor: "pointer",
        borderBottom: "1px solid rgba(51,65,85,0.3)",
        minHeight: 44,
      }}
    >
      <span style={{ fontSize: 14, color: "#e2e8f0" }}>{label}</span>
      <div
        style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          background: checked ? "#10b981" : "#334155",
          position: "relative",
          transition: "background 0.2s",
          flexShrink: 0,
        }}
        onClick={(e) => {
          e.preventDefault();
          onChange(!checked);
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#fff",
            position: "absolute",
            top: 2,
            left: checked ? 22 : 2,
            transition: "left 0.2s",
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
          }}
        />
      </div>
    </label>
  );
}

// ─── Hook for save state ────────────────────────────────────────────

function useSaveState() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function execute(fn: () => Promise<{ success: boolean; error?: string }>) {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const result = await fn();
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        setError(result.error || "Save failed.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return { saving, saved, error, execute };
}

// ─── Main component ─────────────────────────────────────────────────

export default function SettingsClient({ user }: { user: PortalUser }) {
  // Profile state
  const [fullName, setFullName] = useState(user.full_name || "");
  const [phone, setPhone] = useState(user.phone || "");
  const profileSave = useSaveState();

  // Company state
  const [companyName, setCompanyName] = useState(user.settings.company_name || "");
  const [companyAddress, setCompanyAddress] = useState(user.settings.company_address || "");
  const [companyPhone, setCompanyPhone] = useState(user.settings.company_phone || "");
  const companySave = useSaveState();

  // Invoice state
  const [invoiceEmail, setInvoiceEmail] = useState(user.settings.invoice_reply_email || "");
  const [invoiceFooter, setInvoiceFooter] = useState(user.settings.invoice_footer_text || "");
  const invoiceSave = useSaveState();

  // Schedule state
  const [startTime, setStartTime] = useState(user.settings.schedule_start_time || "08:00");
  const [endTime, setEndTime] = useState(user.settings.schedule_end_time || "17:00");
  const scheduleSave = useSaveState();

  // Notification state
  const [notifNewJob, setNotifNewJob] = useState(user.settings.notification_new_job);
  const [notifReschedule, setNotifReschedule] = useState(user.settings.notification_reschedule);
  const [notifPayment, setNotifPayment] = useState(user.settings.notification_payment);
  const notifSave = useSaveState();

  const initial = (user.full_name || user.email || "U").charAt(0).toUpperCase();
  const roleBadge = getRoleBadge(user.role);

  return (
    <>
      <style>{`
        @keyframes portal-spin {
          to { transform: rotate(360deg); }
        }
        .portal-input:focus {
          border-color: #10b981 !important;
          box-shadow: 0 0 0 3px rgba(16,185,129,0.15) !important;
        }
      `}</style>

      {/* ── Section 1: Profile ── */}
      <div style={cardStyle}>
        <h2 style={headingStyle}>Your Profile</h2>
        <div style={subHeadingStyle}>Manage your personal information</div>

        {/* Avatar */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #059669, #10b981)",
              display: "grid",
              placeItems: "center",
              fontSize: 24,
              fontWeight: 700,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            {initial}
          </div>
          <div>
            <div style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 600 }}>
              {user.full_name || "Set your name"}
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
              Upload photo — coming soon
            </div>
          </div>
        </div>

        {/* Name */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Name</label>
          <input
            className="portal-input"
            style={inputStyle}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
          />
        </div>

        {/* Email (read-only) */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Email</label>
          <input
            style={inputReadOnlyStyle}
            value={user.email || ""}
            readOnly
          />
          <div style={helperStyle}>Login email cannot be changed here</div>
        </div>

        {/* Phone */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Phone</label>
          <input
            className="portal-input"
            style={inputStyle}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 123-4567"
          />
        </div>

        {/* Role */}
        <div style={{ marginBottom: 0 }}>
          <label style={labelStyle}>Role</label>
          <div style={{ padding: "10px 0" }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#10b981",
                background: "rgba(16,185,129,0.12)",
                padding: "4px 12px",
                borderRadius: 9999,
              }}
            >
              {roleBadge}
            </span>
          </div>
        </div>

        <SaveButton
          onClick={() =>
            profileSave.execute(() =>
              updateProfile({ full_name: fullName, phone })
            )
          }
          saving={profileSave.saving}
          saved={profileSave.saved}
          error={profileSave.error}
        />
      </div>

      {/* ── Section 2: Company Info ── */}
      <div style={cardStyle}>
        <h2 style={headingStyle}>Company Info</h2>
        <div style={subHeadingStyle}>Shown on invoices and customer communications</div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Company Name</label>
          <input
            className="portal-input"
            style={inputStyle}
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Your company name"
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Company Address</label>
          <input
            className="portal-input"
            style={inputStyle}
            value={companyAddress}
            onChange={(e) => setCompanyAddress(e.target.value)}
            placeholder="123 Main St, Portland, OR 97201"
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Company Phone</label>
          <input
            className="portal-input"
            style={inputStyle}
            value={companyPhone}
            onChange={(e) => setCompanyPhone(e.target.value)}
            placeholder="(555) 000-0000"
          />
        </div>

        {/* Logo placeholder */}
        <div style={{ marginBottom: 0 }}>
          <label style={labelStyle}>Company Logo</label>
          <div
            style={{
              border: "2px dashed rgba(51,65,85,0.5)",
              borderRadius: 8,
              padding: "24px 16px",
              textAlign: "center",
              color: "#64748b",
              fontSize: 13,
            }}
          >
            Upload logo — coming soon
          </div>
        </div>

        <SaveButton
          onClick={() =>
            companySave.execute(() =>
              updatePortalSettings({
                company_name: companyName || null,
                company_address: companyAddress || null,
                company_phone: companyPhone || null,
              })
            )
          }
          saving={companySave.saving}
          saved={companySave.saved}
          error={companySave.error}
        />
      </div>

      {/* ── Section 3: Invoice Settings ── */}
      <div style={cardStyle}>
        <h2 style={headingStyle}>Invoice Settings</h2>
        <div style={subHeadingStyle}>Customize how your invoices appear to customers</div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Reply-to Email</label>
          <input
            className="portal-input"
            style={inputStyle}
            value={invoiceEmail}
            onChange={(e) => setInvoiceEmail(e.target.value)}
            placeholder={user.email || "you@company.com"}
          />
          <div style={helperStyle}>
            Email address shown on invoices. Defaults to your profile email.
          </div>
        </div>

        <div style={{ marginBottom: 0 }}>
          <label style={labelStyle}>Invoice Footer</label>
          <textarea
            className="portal-input"
            style={{
              ...inputStyle,
              minHeight: 80,
              resize: "vertical",
              fontFamily: "inherit",
            }}
            value={invoiceFooter}
            onChange={(e) => setInvoiceFooter(e.target.value)}
            placeholder="License #12345 | Thank you for your business!"
          />
          <div style={helperStyle}>
            Custom text shown at the bottom of invoices (e.g. license number, thank you message)
          </div>
        </div>

        <SaveButton
          onClick={() =>
            invoiceSave.execute(() =>
              updatePortalSettings({
                invoice_reply_email: invoiceEmail || null,
                invoice_footer_text: invoiceFooter || null,
              })
            )
          }
          saving={invoiceSave.saving}
          saved={invoiceSave.saved}
          error={invoiceSave.error}
        />
      </div>

      {/* ── Section 4: Schedule Preferences ── */}
      <div style={cardStyle}>
        <h2 style={headingStyle}>Schedule Preferences</h2>
        <div style={subHeadingStyle}>Set your default availability window</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Default Start Time</label>
            <input
              className="portal-input"
              type="time"
              style={{
                ...inputStyle,
                colorScheme: "dark",
              }}
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Default End Time</label>
            <input
              className="portal-input"
              type="time"
              style={{
                ...inputStyle,
                colorScheme: "dark",
              }}
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>

        <div style={{ fontSize: 13, color: "#475569", marginBottom: 0 }}>
          Blocked days — coming soon
        </div>

        <SaveButton
          onClick={() =>
            scheduleSave.execute(() =>
              updatePortalSettings({
                schedule_start_time: startTime,
                schedule_end_time: endTime,
              })
            )
          }
          saving={scheduleSave.saving}
          saved={scheduleSave.saved}
          error={scheduleSave.error}
        />
      </div>

      {/* ── Section 5: Notifications ── */}
      <div style={cardStyle}>
        <h2 style={headingStyle}>Notifications</h2>
        <div style={subHeadingStyle}>Choose which email notifications you receive</div>

        <Toggle
          label="New job assigned"
          checked={notifNewJob}
          onChange={setNotifNewJob}
        />
        <Toggle
          label="Job rescheduled"
          checked={notifReschedule}
          onChange={setNotifReschedule}
        />
        <Toggle
          label="Payment received"
          checked={notifPayment}
          onChange={setNotifPayment}
        />

        <SaveButton
          onClick={() =>
            notifSave.execute(() =>
              updatePortalSettings({
                notification_new_job: notifNewJob,
                notification_reschedule: notifReschedule,
                notification_payment: notifPayment,
              })
            )
          }
          saving={notifSave.saving}
          saved={notifSave.saved}
          error={notifSave.error}
        />
      </div>
    </>
  );
}

function getRoleBadge(role: string): string {
  switch (role) {
    case "admin": return "Admin";
    case "rei_staff": return "HES Assessor";
    case "hes_assessor": return "HES Assessor";
    case "inspector": return "Inspector";
    case "field_tech": return "Field Tech";
    case "affiliate": return "Affiliate";
    case "contractor": return "Contractor";
    case "homeowner": return "Homeowner";
    default: return role;
  }
}
