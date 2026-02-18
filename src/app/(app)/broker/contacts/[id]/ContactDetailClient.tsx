"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { BrokerContact, CampaignRecipient } from "@/types/broker";
import { updateContactDetailAction, deleteContactDetailAction } from "./actions";

// ─── Constants ───────────────────────────────────────────────────────────────

type ContactStatus = "past_customer" | "current_listing" | "potential_buyer" | "referral" | "other";

const STATUS_OPTIONS: { value: ContactStatus; label: string }[] = [
  { value: "past_customer", label: "Past Customer" },
  { value: "current_listing", label: "Current Listing" },
  { value: "potential_buyer", label: "Potential Buyer" },
  { value: "referral", label: "Referral" },
  { value: "other", label: "Other" },
];

const STATUS_LABELS: Record<string, string> = {
  past_customer: "Past Customer",
  current_listing: "Current Listing",
  potential_buyer: "Potential Buyer",
  referral: "Referral",
  other: "Other",
};

function getStatusBadgeStyle(status: string): React.CSSProperties {
  switch (status) {
    case "past_customer":
      return { background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)" };
    case "current_listing":
      return { background: "rgba(59,130,246,0.12)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.25)" };
    case "potential_buyer":
      return { background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" };
    case "referral":
      return { background: "rgba(139,92,246,0.12)", color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.25)" };
    default:
      return { background: "rgba(148,163,184,0.12)", color: "#94a3b8", border: "1px solid rgba(148,163,184,0.25)" };
  }
}

const RECIPIENT_STATUS_LABELS: Record<string, string> = {
  queued: "Queued",
  sent: "Sent",
  delivered: "Delivered",
  opened: "Opened",
  clicked: "Clicked",
  completed: "Completed",
  hes_requested: "HES Requested",
};

function getRecipientStatusStyle(status: string): React.CSSProperties {
  switch (status) {
    case "sent":
    case "delivered":
      return { background: "rgba(59,130,246,0.12)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.25)" };
    case "opened":
    case "clicked":
      return { background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" };
    case "completed":
      return { background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)" };
    case "hes_requested":
      return { background: "rgba(139,92,246,0.12)", color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.25)" };
    default:
      return { background: "rgba(148,163,184,0.12)", color: "#94a3b8", border: "1px solid rgba(148,163,184,0.25)" };
  }
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #334155",
  background: "#1e293b",
  color: "#f1f5f9",
  fontSize: 13,
  fontWeight: 500,
  outline: "none",
  boxSizing: "border-box",
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  display: "block",
  marginBottom: 6,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d: string | null): string {
  if (!d) return "\u2014";
  try {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return d;
  }
}

function fmtDateTime(d: string | null): string {
  if (!d) return "\u2014";
  try {
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return d;
  }
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
        ...getStatusBadgeStyle(status),
      }}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function RecipientStatusBadge({ status }: { status: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
        ...getRecipientStatusStyle(status),
      }}
    >
      {RECIPIENT_STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ─── Form State ──────────────────────────────────────────────────────────────

type ContactFormState = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  status: string;
  last_contact_date: string;
  notes: string;
};

function formFromContact(c: BrokerContact): ContactFormState {
  return {
    name: c.name,
    email: c.email ?? "",
    phone: c.phone ?? "",
    address: c.address ?? "",
    city: c.city ?? "",
    state: c.state ?? "OR",
    zip: c.zip ?? "",
    status: c.status,
    last_contact_date: c.last_contact_date ? c.last_contact_date.split("T")[0] : "",
    notes: c.notes ?? "",
  };
}

// ─── Edit Modal ──────────────────────────────────────────────────────────────

function EditContactModal({
  open,
  contact,
  onClose,
  onSuccess,
}: {
  open: boolean;
  contact: BrokerContact;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<ContactFormState>(formFromContact(contact));
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setForm(formFromContact(contact));
      setError("");
    }
  }, [open, contact]);

  function handleSubmit() {
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    setError("");

    startTransition(async () => {
      try {
        await updateContactDetailAction(contact.id, {
          name: form.name.trim(),
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          address: form.address.trim() || undefined,
          city: form.city.trim() || undefined,
          state: form.state.trim() || "OR",
          zip: form.zip.trim() || undefined,
          status: form.status,
          last_contact_date: form.last_contact_date || undefined,
          notes: form.notes.trim() || undefined,
        });
        onSuccess();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "An error occurred.");
      }
    });
  }

  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50 }}>
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.60)", border: "none", cursor: "default" }}
      />
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "#0f172a",
          border: "1px solid #334155",
          borderRadius: 12,
          width: "90%",
          maxWidth: 500,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 25px 60px rgba(0,0,0,0.55)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px 0" }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: "#f1f5f9" }}>Edit Contact</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
            Update contact details.
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Name */}
          <div>
            <label style={LABEL_STYLE}>
              Name <span style={{ color: "#f87171" }}>*</span>
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Full name"
              style={INPUT_STYLE}
            />
          </div>

          {/* Email + Phone */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={LABEL_STYLE}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="email@example.com"
                style={INPUT_STYLE}
              />
            </div>
            <div>
              <label style={LABEL_STYLE}>Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="(555) 555-5555"
                style={INPUT_STYLE}
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label style={LABEL_STYLE}>Address</label>
            <input
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              placeholder="Street address"
              style={INPUT_STYLE}
            />
          </div>

          {/* City, State, Zip */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
            <div>
              <label style={LABEL_STYLE}>City</label>
              <input
                value={form.city}
                onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                placeholder="City"
                style={INPUT_STYLE}
              />
            </div>
            <div>
              <label style={LABEL_STYLE}>State</label>
              <input
                value={form.state}
                onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}
                placeholder="OR"
                style={INPUT_STYLE}
              />
            </div>
            <div>
              <label style={LABEL_STYLE}>Zip</label>
              <input
                value={form.zip}
                onChange={(e) => setForm((p) => ({ ...p, zip: e.target.value }))}
                placeholder="97201"
                style={INPUT_STYLE}
              />
            </div>
          </div>

          {/* Status + Last Contact Date */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={LABEL_STYLE}>Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                style={INPUT_STYLE}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={LABEL_STYLE}>Last Contact Date</label>
              <input
                type="date"
                value={form.last_contact_date}
                onChange={(e) => setForm((p) => ({ ...p, last_contact_date: e.target.value }))}
                style={INPUT_STYLE}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={LABEL_STYLE}>Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              rows={3}
              placeholder="Optional notes..."
              style={{ ...INPUT_STYLE, resize: "vertical", minHeight: 64, lineHeight: 1.5 }}
            />
          </div>

          {error && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                background: "rgba(248,113,113,0.1)",
                border: "1px solid rgba(248,113,113,0.25)",
                color: "#f87171",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "0 24px 20px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              background: "#334155",
              color: "#cbd5e1",
              border: "1px solid #475569",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={pending}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              background: "rgba(16,185,129,0.12)",
              color: "#10b981",
              border: "1px solid rgba(16,185,129,0.30)",
              cursor: pending ? "not-allowed" : "pointer",
              opacity: pending ? 0.6 : 1,
            }}
          >
            {pending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirmation ─────────────────────────────────────────────────────

function DeleteConfirmDialog({
  open,
  contactName,
  onClose,
  onConfirm,
  pending,
}: {
  open: boolean;
  contactName: string;
  onClose: () => void;
  onConfirm: () => void;
  pending: boolean;
}) {
  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 55, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.60)", border: "none", cursor: "default" }}
      />
      <div
        style={{
          position: "relative",
          background: "#0f172a",
          border: "1px solid #334155",
          borderRadius: 16,
          padding: "28px 28px 24px",
          maxWidth: 380,
          width: "90%",
          boxShadow: "0 25px 60px rgba(0,0,0,0.55)",
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", marginBottom: 8 }}>
          Delete Contact
        </div>
        <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6, marginBottom: 24 }}>
          Are you sure you want to permanently delete{" "}
          <span style={{ color: "#f1f5f9", fontWeight: 600 }}>{contactName}</span>?
          This action cannot be undone.
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 18px",
              borderRadius: 9,
              fontSize: 13,
              fontWeight: 600,
              background: "#334155",
              color: "#cbd5e1",
              border: "1px solid #475569",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            style={{
              padding: "10px 18px",
              borderRadius: 9,
              fontSize: 13,
              fontWeight: 600,
              background: pending ? "rgba(248,113,113,0.3)" : "rgba(248,113,113,0.15)",
              color: "#f87171",
              border: "1px solid rgba(248,113,113,0.35)",
              cursor: pending ? "not-allowed" : "pointer",
              opacity: pending ? 0.7 : 1,
            }}
          >
            {pending ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Info Row Helper ─────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0", borderBottom: "1px solid #1e293b" }}>
      <div style={{ width: 130, flexShrink: 0, fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", paddingTop: 1 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: "#f1f5f9", lineHeight: 1.5 }}>
        {value || <span style={{ color: "#334155" }}>{"\u2014"}</span>}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ContactDetailClient({
  contact,
  history,
}: {
  contact: BrokerContact;
  history: CampaignRecipient[];
}) {
  const router = useRouter();

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePending, startDeleteTransition] = useTransition();

  function handleEditSuccess() {
    setEditOpen(false);
    router.refresh();
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      try {
        await deleteContactDetailAction(contact.id);
      } catch {
        // redirect happens in action; if error, silently fail
      }
    });
  }

  const addressParts = [contact.address, contact.city, contact.state, contact.zip].filter(Boolean);
  const fullAddress = addressParts.length > 0 ? addressParts.join(", ") : null;

  return (
    <>
      <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
        {/* Back link */}
        <Link
          href="/broker/contacts"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            color: "#64748b",
            textDecoration: "none",
            marginBottom: 20,
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#94a3b8"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#64748b"; }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Contacts
        </Link>

        {/* ── Contact Header ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Avatar */}
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "rgba(16,185,129,0.12)",
                border: "1px solid rgba(16,185,129,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                fontWeight: 900,
                color: "#10b981",
                flexShrink: 0,
              }}
            >
              {contact.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: "#f1f5f9", margin: 0, letterSpacing: "-0.01em" }}>
                {contact.name}
              </h1>
              <div style={{ marginTop: 4 }}>
                <StatusBadge status={contact.status} />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              style={{
                padding: "9px 16px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                background: "rgba(16,185,129,0.08)",
                color: "#10b981",
                border: "1px solid rgba(16,185,129,0.25)",
                cursor: "pointer",
              }}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              style={{
                padding: "9px 16px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                background: "rgba(248,113,113,0.08)",
                color: "#f87171",
                border: "1px solid rgba(248,113,113,0.20)",
                cursor: "pointer",
              }}
            >
              Delete
            </button>
          </div>
        </div>

        {/* ── Content Grid ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Contact Info Card */}
          <div
            style={{
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: 16,
              padding: "20px 24px",
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 900,
                color: "#f1f5f9",
                marginBottom: 16,
                paddingBottom: 12,
                borderBottom: "1px solid #334155",
              }}
            >
              Contact Information
            </div>
            <InfoRow label="Email" value={contact.email} />
            <InfoRow label="Phone" value={contact.phone} />
            <InfoRow label="Address" value={fullAddress} />
            <InfoRow label="Status" value={<StatusBadge status={contact.status} />} />
            <InfoRow label="Last Contact" value={fmtDate(contact.last_contact_date)} />
            <InfoRow label="Source" value={
              <span style={{ textTransform: "capitalize" }}>{contact.source.replace(/_/g, " ")}</span>
            } />
            <InfoRow
              label="Notes"
              value={
                contact.notes ? (
                  <div style={{ whiteSpace: "pre-wrap", color: "#cbd5e1" }}>{contact.notes}</div>
                ) : null
              }
            />
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0" }}>
              <div style={{ width: 130, flexShrink: 0, fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", paddingTop: 1 }}>
                Added
              </div>
              <div style={{ fontSize: 13, color: "#94a3b8" }}>
                {fmtDate(contact.created_at)}
              </div>
            </div>
          </div>

          {/* Communication History Card */}
          <div
            style={{
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: 16,
              padding: "20px 24px",
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 900,
                color: "#f1f5f9",
                marginBottom: 16,
                paddingBottom: 12,
                borderBottom: "1px solid #334155",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              Communication History
              {history.length > 0 && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 20,
                    height: 20,
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 700,
                    background: "rgba(59,130,246,0.12)",
                    color: "#3b82f6",
                    padding: "0 6px",
                  }}
                >
                  {history.length}
                </span>
              )}
            </div>

            {history.length === 0 ? (
              <div style={{ padding: "32px 0", textAlign: "center" }}>
                <div style={{ fontSize: 13, color: "#475569", fontWeight: 500 }}>
                  No campaign history yet.
                </div>
                <div style={{ fontSize: 12, color: "#334155", marginTop: 4 }}>
                  This contact has not been included in any campaigns.
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {history.map((r, idx) => {
                  // The campaign is joined on the recipient row
                  const campaign = (r as unknown as Record<string, unknown>).campaign as
                    | { name: string; sent_date: string | null }
                    | null
                    | undefined;
                  return (
                    <div
                      key={r.id}
                      style={{
                        padding: "12px 0",
                        borderBottom: idx < history.length - 1 ? "1px solid #1e293b" : "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <div style={{ overflow: "hidden" }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#f1f5f9",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {campaign?.name ?? "Unknown Campaign"}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                          {fmtDateTime(r.sent_at ?? campaign?.sent_date ?? r.created_at)}
                        </div>
                      </div>
                      <RecipientStatusBadge status={r.status} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      <EditContactModal
        open={editOpen}
        contact={contact}
        onClose={() => setEditOpen(false)}
        onSuccess={handleEditSuccess}
      />
      <DeleteConfirmDialog
        open={deleteOpen}
        contactName={contact.name}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        pending={deletePending}
      />
    </>
  );
}
