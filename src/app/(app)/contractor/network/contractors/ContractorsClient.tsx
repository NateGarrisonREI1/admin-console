"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  ContractorsPageData,
  NetworkContact,
  CustomerForReferral,
  ReferralRow,
} from "./actions";
import {
  addNetworkContact,
  updateNetworkContact,
  deleteNetworkContact,
  sendReferral,
} from "./actions";

// ─── Design Tokens ──────────────────────────────────────────────────
const BG = "#0f172a";
const CARD = "#1e293b";
const BORDER = "#334155";
const TEXT = "#f1f5f9";
const TEXT_SEC = "#cbd5e1";
const TEXT_DIM = "#64748b";
const TEXT_MUTED = "#94a3b8";
const EMERALD = "#10b981";

const TRADE_OPTIONS = [
  "HVAC",
  "Solar",
  "Plumbing",
  "Electrical",
  "General",
  "Roofing",
  "Insulation",
  "Other",
];

// ─── Helpers ────────────────────────────────────────────────────────
function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusColor(status: string): { bg: string; text: string } {
  switch (status.toLowerCase()) {
    case "sent":
      return { bg: "rgba(59,130,246,0.15)", text: "#3b82f6" };
    case "accepted":
    case "completed":
      return { bg: "rgba(16,185,129,0.15)", text: EMERALD };
    case "declined":
      return { bg: "rgba(239,68,68,0.15)", text: "#ef4444" };
    default:
      return { bg: "rgba(100,116,139,0.15)", text: TEXT_DIM };
  }
}

// ─── SVG Icons ──────────────────────────────────────────────────────
function ShareIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

// ─── Component ──────────────────────────────────────────────────────
export default function ContractorsClient({
  data,
}: {
  data: ContractorsPageData;
}) {
  const router = useRouter();

  // ── Contact modal state ──────────────────────────────────────────
  const [showContactModal, setShowContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState<NetworkContact | null>(
    null
  );
  const [contactName, setContactName] = useState("");
  const [contactCompany, setContactCompany] = useState("");
  const [contactTrade, setContactTrade] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactNotes, setContactNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // ── Referral modal state ─────────────────────────────────────────
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [selectedContact, setSelectedContact] =
    useState<NetworkContact | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [sendVia, setSendVia] = useState<"email" | "text">("email");
  const [sending, setSending] = useState(false);

  // ── Contact modal helpers ────────────────────────────────────────
  function openAddModal() {
    setEditingContact(null);
    setContactName("");
    setContactCompany("");
    setContactTrade("");
    setContactPhone("");
    setContactEmail("");
    setContactNotes("");
    setShowContactModal(true);
  }

  function openEditModal(c: NetworkContact) {
    setEditingContact(c);
    setContactName(c.contact_name);
    setContactCompany(c.company_name ?? "");
    setContactTrade(c.trade ?? "");
    setContactPhone(c.contact_phone ?? "");
    setContactEmail(c.contact_email ?? "");
    setContactNotes(c.notes ?? "");
    setShowContactModal(true);
  }

  function closeContactModal() {
    setShowContactModal(false);
    setEditingContact(null);
  }

  async function handleSaveContact() {
    if (!contactName.trim()) return;
    setSaving(true);
    try {
      const payload = {
        contact_name: contactName.trim(),
        company_name: contactCompany.trim() || undefined,
        trade: contactTrade || undefined,
        contact_phone: contactPhone.trim() || undefined,
        contact_email: contactEmail.trim() || undefined,
        notes: contactNotes.trim() || undefined,
      };

      if (editingContact) {
        await updateNetworkContact(editingContact.id, {
          contact_name: payload.contact_name,
          company_name: payload.company_name ?? null,
          trade: payload.trade ?? null,
          contact_phone: payload.contact_phone ?? null,
          contact_email: payload.contact_email ?? null,
          notes: payload.notes ?? null,
        });
      } else {
        await addNetworkContact(payload);
      }
      router.refresh();
      closeContactModal();
    } catch {
      // handle silently
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteContact(c: NetworkContact) {
    if (!confirm(`Delete "${c.contact_name}" from your network?`)) return;
    try {
      await deleteNetworkContact(c.id);
      router.refresh();
    } catch {
      // handle silently
    }
  }

  // ── Referral modal helpers ───────────────────────────────────────
  function openReferralModal(c: NetworkContact) {
    setSelectedContact(c);
    setSelectedCustomerId("");
    setJobDesc("");
    setSendVia("email");
    setShowReferralModal(true);
  }

  function closeReferralModal() {
    setShowReferralModal(false);
    setSelectedContact(null);
  }

  function getReferralPreview(): string {
    const customer = data.customers.find(
      (cu: CustomerForReferral) => cu.id === selectedCustomerId
    );
    const contactN = selectedContact?.contact_name ?? "";
    const custName = customer?.homeowner_name ?? "[Customer]";
    const custAddr = customer?.homeowner_address ?? "";
    const custPhone = customer?.homeowner_phone ?? "";
    const desc = jobDesc.trim() || "[Job description]";

    return (
      `Hi ${contactN},\n\n` +
      `I have a customer who could use your help:\n\n` +
      `Name: ${custName}\n` +
      (custAddr ? `Address: ${custAddr}\n` : "") +
      (custPhone ? `Phone: ${custPhone}\n` : "") +
      `\nJob: ${desc}\n\n` +
      `Let me know if you can take this on!`
    );
  }

  async function handleSendReferral() {
    if (!selectedContact || !selectedCustomerId || !jobDesc.trim()) return;
    setSending(true);
    try {
      await sendReferral({
        to_contact_id: selectedContact.id,
        customer_id: selectedCustomerId,
        job_description: jobDesc.trim(),
        sent_via: sendVia,
      });
      router.refresh();
      closeReferralModal();
    } catch {
      // handle silently
    } finally {
      setSending(false);
    }
  }

  // ── Shared styles ────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: BG,
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 13,
    color: TEXT,
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: TEXT_SEC,
    marginBottom: 4,
  };

  const iconBtnStyle: React.CSSProperties = {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 4,
    borderRadius: 4,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const thStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: TEXT_DIM,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    padding: "10px 14px",
    textAlign: "left",
    borderBottom: `1px solid ${BORDER}`,
  };

  const tdStyle: React.CSSProperties = {
    padding: "10px 14px",
    borderBottom: `1px solid ${BORDER}`,
    verticalAlign: "middle",
  };

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div style={{ padding: 28 }}>
      {/* ── Header ──────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            style={{ fontSize: 22, fontWeight: 700, color: TEXT, margin: 0 }}
          >
            My Network
          </h1>
          <p style={{ fontSize: 13, color: TEXT_DIM, margin: "4px 0 0" }}>
            Manage your personal contractor network and send referrals
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          style={{
            backgroundColor: EMERALD,
            color: "#ffffff",
            fontSize: 13,
            fontWeight: 700,
            border: "none",
            borderRadius: 8,
            padding: "9px 18px",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          + Add Contact
        </button>
      </div>

      {/* ── Contacts Table ──────────────────────────────────────── */}
      <div
        style={{
          backgroundColor: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        {data.contacts.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <p style={{ fontSize: 14, color: TEXT_MUTED, margin: 0 }}>
              No contacts yet. Add your first contractor to start building your
              network.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 700,
              }}
            >
              <thead>
                <tr>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Company</th>
                  <th style={thStyle}>Trade</th>
                  <th style={thStyle}>Phone</th>
                  <th style={thStyle}>Email</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.contacts.map((c: NetworkContact) => (
                  <tr key={c.id}>
                    <td style={tdStyle}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: TEXT,
                        }}
                      >
                        {c.contact_name}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 13, color: TEXT_SEC }}>
                        {c.company_name ?? "\u2014"}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {c.trade ? (
                        <span
                          style={{
                            display: "inline-block",
                            fontSize: 11,
                            fontWeight: 600,
                            color: TEXT_SEC,
                            backgroundColor: BORDER,
                            padding: "3px 10px",
                            borderRadius: 999,
                          }}
                        >
                          {c.trade}
                        </span>
                      ) : (
                        <span style={{ fontSize: 13, color: TEXT_DIM }}>
                          {"\u2014"}
                        </span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 13, color: TEXT_SEC }}>
                        {c.contact_phone ?? "\u2014"}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {c.contact_email ? (
                        <a
                          href={`mailto:${c.contact_email}`}
                          style={{
                            fontSize: 13,
                            color: "#3b82f6",
                            textDecoration: "none",
                          }}
                        >
                          {c.contact_email}
                        </a>
                      ) : (
                        <span style={{ fontSize: 13, color: TEXT_DIM }}>
                          {"\u2014"}
                        </span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <div
                        style={{
                          display: "inline-flex",
                          gap: 4,
                          alignItems: "center",
                        }}
                      >
                        <button
                          type="button"
                          title="Send Referral"
                          onClick={() => openReferralModal(c)}
                          style={{ ...iconBtnStyle, color: "#3b82f6" }}
                        >
                          <ShareIcon />
                        </button>
                        <button
                          type="button"
                          title="Edit"
                          onClick={() => openEditModal(c)}
                          style={{ ...iconBtnStyle, color: TEXT_MUTED }}
                        >
                          <PencilIcon />
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          onClick={() => handleDeleteContact(c)}
                          style={{ ...iconBtnStyle, color: "#ef4444" }}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Recent Referrals ────────────────────────────────────── */}
      <div
        style={{
          marginTop: 32,
          backgroundColor: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "16px 20px 0" }}>
          <h2
            style={{ fontSize: 15, fontWeight: 700, color: TEXT, margin: 0 }}
          >
            Recent Referrals
          </h2>
        </div>

        {data.referrals.length === 0 ? (
          <div style={{ padding: "20px 20px 24px" }}>
            <p style={{ fontSize: 13, color: TEXT_MUTED, margin: 0 }}>
              No referrals sent yet.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto", marginTop: 12 }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 650,
              }}
            >
              <thead>
                <tr>
                  <th style={thStyle}>To</th>
                  <th style={thStyle}>Customer</th>
                  <th style={thStyle}>Description</th>
                  <th style={thStyle}>Sent Via</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.referrals.map((r: ReferralRow) => {
                  const sc = statusColor(r.status);
                  return (
                    <tr key={r.id}>
                      <td style={tdStyle}>
                        <span style={{ fontSize: 13, color: TEXT }}>
                          {r.to_contact_name ?? "\u2014"}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: 13, color: TEXT_SEC }}>
                          {r.customer_name}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            fontSize: 13,
                            color: TEXT_SEC,
                            maxWidth: 200,
                            display: "inline-block",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.job_description ?? "\u2014"}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            fontSize: 12,
                            color: TEXT_DIM,
                            textTransform: "capitalize",
                          }}
                        >
                          {r.sent_via}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: 12, color: TEXT_DIM }}>
                          {formatDate(r.sent_at)}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            display: "inline-block",
                            fontSize: 11,
                            fontWeight: 600,
                            color: sc.text,
                            backgroundColor: sc.bg,
                            padding: "3px 10px",
                            borderRadius: 999,
                            textTransform: "capitalize",
                          }}
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add / Edit Contact Modal ────────────────────────────── */}
      {showContactModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeContactModal();
          }}
        >
          <div
            style={{
              backgroundColor: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 12,
              padding: 28,
              width: "100%",
              maxWidth: 480,
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <h2
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: TEXT,
                margin: "0 0 20px",
              }}
            >
              {editingContact ? "Edit Contact" : "Add Contact"}
            </h2>

            {/* Name */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>
                Name <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Full name"
                style={inputStyle}
              />
            </div>

            {/* Company */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Company</label>
              <input
                type="text"
                value={contactCompany}
                onChange={(e) => setContactCompany(e.target.value)}
                placeholder="Company name"
                style={inputStyle}
              />
            </div>

            {/* Trade */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Trade</label>
              <select
                value={contactTrade}
                onChange={(e) => setContactTrade(e.target.value)}
                style={{ ...inputStyle, appearance: "auto" }}
              >
                <option value="">Select trade...</option>
                {TRADE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Phone */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Phone</label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="(555) 123-4567"
                style={inputStyle}
              />
            </div>

            {/* Email */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="email@example.com"
                style={inputStyle}
              />
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Notes</label>
              <textarea
                value={contactNotes}
                onChange={(e) => setContactNotes(e.target.value)}
                placeholder="Any notes about this contact..."
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>

            {/* Buttons */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={closeContactModal}
                style={{
                  backgroundColor: "transparent",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  padding: "8px 18px",
                  fontSize: 13,
                  fontWeight: 600,
                  color: TEXT_SEC,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || !contactName.trim()}
                onClick={handleSaveContact}
                style={{
                  backgroundColor: EMERALD,
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 18px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor:
                    saving || !contactName.trim() ? "not-allowed" : "pointer",
                  opacity: saving || !contactName.trim() ? 0.6 : 1,
                }}
              >
                {saving
                  ? "Saving..."
                  : editingContact
                    ? "Save Changes"
                    : "Add Contact"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Send Referral Modal ─────────────────────────────────── */}
      {showReferralModal && selectedContact && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeReferralModal();
          }}
        >
          <div
            style={{
              backgroundColor: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 12,
              padding: 28,
              width: "100%",
              maxWidth: 520,
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <h2
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: TEXT,
                margin: "0 0 4px",
              }}
            >
              Send Referral
            </h2>
            <p style={{ fontSize: 13, color: TEXT_SEC, margin: "0 0 20px" }}>
              Sending to:{" "}
              <strong style={{ color: TEXT }}>
                {selectedContact.contact_name}
              </strong>
            </p>

            {/* Customer Select */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Customer</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                style={{ ...inputStyle, appearance: "auto" }}
              >
                <option value="">Select a customer...</option>
                {data.customers.map((cu: CustomerForReferral) => (
                  <option key={cu.id} value={cu.id}>
                    {cu.homeowner_name}
                    {cu.homeowner_address
                      ? ` \u2014 ${cu.homeowner_address}`
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Job Description */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Job Description</label>
              <textarea
                value={jobDesc}
                onChange={(e) => setJobDesc(e.target.value)}
                placeholder="Describe the work needed..."
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>

            {/* Send Via Toggle */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Send Via</label>
              <div style={{ display: "flex", gap: 0 }}>
                <button
                  type="button"
                  onClick={() => setSendVia("email")}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    fontSize: 13,
                    fontWeight: 600,
                    border: `1px solid ${BORDER}`,
                    borderRadius: "8px 0 0 8px",
                    cursor: "pointer",
                    backgroundColor:
                      sendVia === "email"
                        ? "rgba(59,130,246,0.15)"
                        : "transparent",
                    color: sendVia === "email" ? "#3b82f6" : TEXT_DIM,
                  }}
                >
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => setSendVia("text")}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    fontSize: 13,
                    fontWeight: 600,
                    border: `1px solid ${BORDER}`,
                    borderLeft: "none",
                    borderRadius: "0 8px 8px 0",
                    cursor: "pointer",
                    backgroundColor:
                      sendVia === "text"
                        ? "rgba(59,130,246,0.15)"
                        : "transparent",
                    color: sendVia === "text" ? "#3b82f6" : TEXT_DIM,
                  }}
                >
                  Text
                </button>
              </div>
            </div>

            {/* Preview */}
            {selectedCustomerId && jobDesc.trim() && (
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Preview</label>
                <div
                  style={{
                    backgroundColor: BG,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 8,
                    padding: 14,
                    fontSize: 12,
                    color: TEXT_SEC,
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {getReferralPreview()}
                </div>
              </div>
            )}

            {/* Buttons */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={closeReferralModal}
                style={{
                  backgroundColor: "transparent",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  padding: "8px 18px",
                  fontSize: 13,
                  fontWeight: 600,
                  color: TEXT_SEC,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  sending || !selectedCustomerId || !jobDesc.trim()
                }
                onClick={handleSendReferral}
                style={{
                  backgroundColor: EMERALD,
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 18px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor:
                    sending || !selectedCustomerId || !jobDesc.trim()
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    sending || !selectedCustomerId || !jobDesc.trim()
                      ? 0.6
                      : 1,
                }}
              >
                {sending ? "Sending..." : "Send Referral"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
