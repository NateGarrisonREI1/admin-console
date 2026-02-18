"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { BrokerContact, CsvImportResult } from "@/types/broker";
import {
  createContactAction,
  importCsvAction,
} from "./actions";

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

const CSV_TEMPLATE_HEADER = "Name,Email,Phone,Address,City,State,Zip,Status,Last Contact Date,Notes";

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

// ─── CSV Parser ──────────────────────────────────────────────────────────────

function parseCsvText(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/ /g, "_"));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? "";
    });
    rows.push(row);
  }
  return rows;
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

function emptyForm(): ContactFormState {
  return {
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "OR",
    zip: "",
    status: "past_customer",
    last_contact_date: "",
    notes: "",
  };
}

// ─── Add Contact Modal ───────────────────────────────────────────────────────

function AddContactModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (addAnother: boolean) => void;
}) {
  const [form, setForm] = useState<ContactFormState>(emptyForm());
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setForm(emptyForm());
      setError("");
    }
  }, [open]);

  function handleSubmit(addAnother: boolean) {
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    setError("");

    startTransition(async () => {
      try {
        await createContactAction({
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
        if (addAnother) {
          setForm(emptyForm());
          setError("");
        }
        onSuccess(addAnother);
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
          <div style={{ fontSize: 16, fontWeight: 900, color: "#f1f5f9" }}>Add Client</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
            Add a new contact to your database.
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
            onClick={() => handleSubmit(true)}
            disabled={pending}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              background: "rgba(16,185,129,0.08)",
              color: "#10b981",
              border: "1px solid rgba(16,185,129,0.30)",
              cursor: pending ? "not-allowed" : "pointer",
              opacity: pending ? 0.6 : 1,
            }}
          >
            {pending ? "Adding..." : "+ Add Another"}
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(false)}
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
            {pending ? "Adding..." : "Add Client"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Import CSV Modal ────────────────────────────────────────────────────────

function ImportCsvModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setParsedRows([]);
      setFileName("");
      setResult(null);
      setError("");
    }
  }, [open]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    setError("");

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCsvText(text);
      if (rows.length === 0) {
        setError("No data rows found in CSV. Make sure the first row is a header.");
        setParsedRows([]);
        return;
      }
      setParsedRows(rows);
    };
    reader.readAsText(file);
  }, []);

  function handleImport() {
    if (parsedRows.length === 0) return;
    setError("");

    const mapped = parsedRows.map((r) => ({
      name: r.name || "",
      email: r.email || undefined,
      phone: r.phone || undefined,
      address: r.address || undefined,
      city: r.city || undefined,
      state: r.state || undefined,
      zip: r.zip || undefined,
      status: r.status || undefined,
      last_contact_date: r.last_contact_date || undefined,
      notes: r.notes || undefined,
    }));

    startTransition(async () => {
      try {
        const res = await importCsvAction(mapped);
        setResult(res);
        onSuccess();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Import failed.");
      }
    });
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE_HEADER + "\n"], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contacts_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!open) return null;

  const previewRows = parsedRows.slice(0, 5);

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
          maxWidth: 600,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 25px 60px rgba(0,0,0,0.55)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px 0" }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: "#f1f5f9" }}>Import Contacts from CSV</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
            Upload a CSV file to bulk-import contacts.
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Download template */}
          <button
            type="button"
            onClick={downloadTemplate}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              background: "rgba(59,130,246,0.08)",
              color: "#3b82f6",
              border: "1px solid rgba(59,130,246,0.25)",
              cursor: "pointer",
              alignSelf: "flex-start",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2v7M4 6.5L7 9.5l3-3" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 11h10" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Download Template
          </button>

          {/* File input */}
          <div>
            <label style={LABEL_STYLE}>CSV File</label>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #334155",
                background: "#1e293b",
                color: "#f1f5f9",
                fontSize: 13,
                boxSizing: "border-box",
              }}
            />
            {fileName && (
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                Selected: {fileName} ({parsedRows.length} rows)
              </div>
            )}
          </div>

          {/* Preview */}
          {previewRows.length > 0 && !result && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                Preview (first {previewRows.length} rows)
              </div>
              <div
                style={{
                  overflowX: "auto",
                  borderRadius: 8,
                  border: "1px solid #334155",
                }}
              >
                <div style={{ minWidth: 500 }}>
                  {/* Header row */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.5fr 2fr 1fr 1fr",
                      gap: 0,
                      padding: "8px 12px",
                      background: "rgba(15,23,42,0.5)",
                      borderBottom: "1px solid #334155",
                    }}
                  >
                    {["Name", "Email", "Phone", "Status"].map((h) => (
                      <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {h}
                      </div>
                    ))}
                  </div>
                  {/* Data rows */}
                  {previewRows.map((row, i) => (
                    <div
                      key={i}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.5fr 2fr 1fr 1fr",
                        gap: 0,
                        padding: "8px 12px",
                        borderBottom: i < previewRows.length - 1 ? "1px solid #1e293b" : "none",
                        background: i % 2 === 0 ? "#0f172a" : "#111827",
                      }}
                    >
                      <div style={{ fontSize: 12, color: "#f1f5f9", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {row.name || "\u2014"}
                      </div>
                      <div style={{ fontSize: 12, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {row.email || "\u2014"}
                      </div>
                      <div style={{ fontSize: 12, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {row.phone || "\u2014"}
                      </div>
                      <div style={{ fontSize: 12, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {row.status || "past_customer"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {parsedRows.length > 5 && (
                <div style={{ fontSize: 11, color: "#475569", marginTop: 6 }}>
                  ...and {parsedRows.length - 5} more rows
                </div>
              )}
            </div>
          )}

          {/* Result */}
          {result && (
            <div
              style={{
                padding: "14px 16px",
                borderRadius: 10,
                background: "rgba(16,185,129,0.06)",
                border: "1px solid rgba(16,185,129,0.20)",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: "#10b981", marginBottom: 6 }}>
                Import Complete
              </div>
              <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.6 }}>
                Imported <strong style={{ color: "#10b981" }}>{result.imported}</strong> contact{result.imported !== 1 ? "s" : ""}
                {result.duplicates > 0 && (
                  <>, Skipped <strong style={{ color: "#f59e0b" }}>{result.duplicates}</strong> duplicate{result.duplicates !== 1 ? "s" : ""}</>
                )}
                {result.invalid > 0 && (
                  <>, <strong style={{ color: "#f87171" }}>{result.invalid}</strong> invalid</>
                )}
              </div>
              {result.errors.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 11, color: "#f87171", lineHeight: 1.5 }}>
                  {result.errors.slice(0, 5).map((err, i) => (
                    <div key={i}>{err}</div>
                  ))}
                  {result.errors.length > 5 && <div>...and {result.errors.length - 5} more errors</div>}
                </div>
              )}
            </div>
          )}

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
            {result ? "Done" : "Cancel"}
          </button>
          {!result && (
            <button
              type="button"
              onClick={handleImport}
              disabled={pending || parsedRows.length === 0}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                background: "rgba(16,185,129,0.12)",
                color: "#10b981",
                border: "1px solid rgba(16,185,129,0.30)",
                cursor: pending || parsedRows.length === 0 ? "not-allowed" : "pointer",
                opacity: pending || parsedRows.length === 0 ? 0.5 : 1,
              }}
            >
              {pending ? "Importing..." : `Import ${parsedRows.length} Contact${parsedRows.length !== 1 ? "s" : ""}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ContactsClient({ contacts }: { contacts: BrokerContact[] }) {
  const router = useRouter();

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Modals
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // Filter contacts
  const filtered = contacts.filter((c) => {
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      (c.phone ?? "").toLowerCase().includes(q) ||
      (c.address ?? "").toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  function handleAddSuccess(addAnother: boolean) {
    if (!addAnother) {
      setAddOpen(false);
    }
    router.refresh();
  }

  function handleImportSuccess() {
    router.refresh();
  }

  // Grid column template for the table
  const gridCols = "2fr 1.5fr 1fr 1fr 100px";

  return (
    <>
      <div style={{ padding: 24 }}>
        {/* ── Header ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: "#f1f5f9", margin: 0, letterSpacing: "-0.01em" }}>
              My Contacts
            </h1>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 24,
                height: 24,
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 700,
                background: "rgba(16,185,129,0.12)",
                color: "#10b981",
                padding: "0 8px",
              }}
            >
              {contacts.length}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              style={{
                padding: "9px 16px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                background: "rgba(59,130,246,0.08)",
                color: "#3b82f6",
                border: "1px solid rgba(59,130,246,0.25)",
                cursor: "pointer",
              }}
            >
              Import CSV
            </button>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              style={{
                padding: "9px 16px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                background: "rgba(16,185,129,0.12)",
                color: "#10b981",
                border: "1px solid rgba(16,185,129,0.30)",
                cursor: "pointer",
              }}
            >
              + Add Client
            </button>
          </div>
        </div>

        {/* ── Filter Bar ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          {/* Status filter */}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {[{ value: "all", label: "All" }, ...STATUS_OPTIONS].map((opt) => {
              const active = statusFilter === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatusFilter(opt.value)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    background: active ? "rgba(16,185,129,0.12)" : "transparent",
                    color: active ? "#10b981" : "#64748b",
                    border: active ? "1px solid rgba(16,185,129,0.30)" : "1px solid #334155",
                    transition: "all 0.15s",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div style={{ marginLeft: "auto", position: "relative" }}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
            >
              <circle cx="6" cy="6" r="4.5" stroke="#475569" strokeWidth="1.5" />
              <path d="M9.5 9.5L12.5 12.5" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contacts..."
              style={{
                ...INPUT_STYLE,
                width: 220,
                paddingLeft: 30,
                background: "#1e293b",
              }}
            />
          </div>
        </div>

        {/* ── Table ── */}
        <div
          style={{
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          {/* Table header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: gridCols,
              gap: 0,
              padding: "11px 20px",
              borderBottom: "1px solid #334155",
              background: "rgba(15,23,42,0.5)",
            }}
          >
            {["Name / Address", "Email / Phone", "Status", "Last Contact", "Actions"].map((h) => (
              <div
                key={h}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  whiteSpace: "nowrap",
                }}
              >
                {h}
              </div>
            ))}
          </div>

          {/* Table body */}
          {filtered.length === 0 ? (
            <div
              style={{
                padding: "56px 24px",
                textAlign: "center",
              }}
            >
              {contacts.length === 0 ? (
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#475569", marginBottom: 6 }}>
                    No contacts yet.
                  </div>
                  <div style={{ fontSize: 13, color: "#334155" }}>
                    Add contacts manually or import from CSV.
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "#475569", fontWeight: 500 }}>
                  No contacts match the current filters.
                </div>
              )}
            </div>
          ) : (
            filtered.map((c, idx) => (
              <div
                key={c.id}
                onClick={() => router.push(`/broker/contacts/${c.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") router.push(`/broker/contacts/${c.id}`);
                }}
                style={{
                  display: "grid",
                  gridTemplateColumns: gridCols,
                  gap: 0,
                  padding: "14px 20px",
                  alignItems: "center",
                  cursor: "pointer",
                  borderBottom: idx < filtered.length - 1 ? "1px solid #1e293b" : "none",
                  background: idx % 2 === 0 ? "#0f172a" : "#111827",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#1a2744";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = idx % 2 === 0 ? "#0f172a" : "#111827";
                }}
              >
                {/* Name / Address */}
                <div style={{ overflow: "hidden" }}>
                  <div
                    style={{
                      fontWeight: 700,
                      color: "#f1f5f9",
                      fontSize: 13,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.name}
                  </div>
                  {(c.address || c.city) && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "#475569",
                        marginTop: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {[c.address, c.city, c.state, c.zip].filter(Boolean).join(", ")}
                    </div>
                  )}
                </div>

                {/* Email / Phone */}
                <div style={{ overflow: "hidden" }}>
                  {c.email && (
                    <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.email}
                    </div>
                  )}
                  {c.phone && (
                    <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>
                      {c.phone}
                    </div>
                  )}
                  {!c.email && !c.phone && (
                    <span style={{ color: "#334155", fontSize: 12 }}>{"\u2014"}</span>
                  )}
                </div>

                {/* Status */}
                <div>
                  <StatusBadge status={c.status} />
                </div>

                {/* Last Contact */}
                <div style={{ fontSize: 12, color: "#94a3b8" }}>
                  {fmtDate(c.last_contact_date)}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/broker/contacts/${c.id}`);
                    }}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 7,
                      fontSize: 11,
                      fontWeight: 600,
                      background: "rgba(16,185,129,0.08)",
                      color: "#10b981",
                      border: "1px solid rgba(16,185,129,0.20)",
                      cursor: "pointer",
                    }}
                  >
                    View
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer count */}
        {filtered.length > 0 && (
          <div style={{ marginTop: 12, fontSize: 12, color: "#475569", fontWeight: 600, textAlign: "right" }}>
            Showing {filtered.length} of {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <AddContactModal open={addOpen} onClose={() => setAddOpen(false)} onSuccess={handleAddSuccess} />
      <ImportCsvModal open={importOpen} onClose={() => setImportOpen(false)} onSuccess={handleImportSuccess} />
    </>
  );
}
