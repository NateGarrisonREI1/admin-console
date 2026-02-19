// src/app/admin/settings/lead-pricing/LeadPricingClient.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PencilSquareIcon,
  TrashIcon,
  PlusIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/20/solid";
import type { LeadPricingConfig } from "@/types/schema";
import {
  updateLeadPricing,
  toggleLeadPricingActive,
  addLeadPricingTier,
  deleteLeadPricingTier,
} from "../../_actions/lead-pricing";

// ─── Design tokens ──────────────────────────────────────────────────
const BG = "#0f172a";
const CARD = "#1e293b";
const BORDER = "#334155";
const TEXT = "#f1f5f9";
const TEXT_SEC = "#cbd5e1";
const TEXT_DIM = "#64748b";
const TEXT_MUTED = "#94a3b8";
const EMERALD = "#10b981";

function fmtPrice(n: number): string {
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ─── Icon Button ────────────────────────────────────────────────────

function IconBtn({
  title,
  onClick,
  hoverColor,
  children,
}: {
  title: string;
  onClick: () => void;
  hoverColor?: string;
  children: React.ReactNode;
}) {
  const defaultColor = TEXT_MUTED;
  const hover = hoverColor ?? TEXT;
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 4,
        color: defaultColor,
        transition: "color 0.15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = hover; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = defaultColor; }}
    >
      {children}
    </button>
  );
}

// ─── Pricing Row ────────────────────────────────────────────────────

function PricingRow({
  row,
  onSaved,
}: {
  row: LeadPricingConfig;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(row.display_name);
  const [minPrice, setMinPrice] = useState(String(row.min_price));
  const [maxPrice, setMaxPrice] = useState(String(row.max_price));
  const [defaultPrice, setDefaultPrice] = useState(String(row.default_price));
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateLeadPricing(row.id, {
        display_name: displayName,
        min_price: parseFloat(minPrice),
        max_price: parseFloat(maxPrice),
        default_price: parseFloat(defaultPrice),
      });
      setEditing(false);
      onSaved();
    } catch (e) {
      alert("Save failed: " + (e instanceof Error ? e.message : "Unknown error"));
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setDisplayName(row.display_name);
    setMinPrice(String(row.min_price));
    setMaxPrice(String(row.max_price));
    setDefaultPrice(String(row.default_price));
    setEditing(false);
  }

  async function handleToggle() {
    await toggleLeadPricingActive(row.id, !row.is_active);
    onSaved();
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${row.display_name}" pricing tier?`)) return;
    await deleteLeadPricingTier(row.id);
    onSaved();
  }

  const inputStyle: React.CSSProperties = {
    background: "#0f172a",
    border: `1px solid ${BORDER}`,
    borderRadius: 6,
    color: TEXT,
    padding: "4px 8px",
    fontSize: 13,
    width: "100%",
    outline: "none",
  };

  const priceInputStyle: React.CSSProperties = {
    ...inputStyle,
    width: 80,
    textAlign: "right",
  };

  if (editing) {
    return (
      <tr>
        <td style={{ padding: "8px 12px" }}>
          <input
            className="admin-input"
            style={inputStyle}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </td>
        <td style={{ padding: "8px 12px" }}>
          <span style={{ color: TEXT_DIM, fontSize: 12 }}>{row.system_type}</span>
        </td>
        <td style={{ padding: "8px 12px", textAlign: "right" }}>
          <input
            className="admin-input"
            style={priceInputStyle}
            type="number"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
          />
        </td>
        <td style={{ padding: "8px 12px", textAlign: "right" }}>
          <input
            className="admin-input"
            style={priceInputStyle}
            type="number"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </td>
        <td style={{ padding: "8px 12px", textAlign: "right" }}>
          <input
            className="admin-input"
            style={priceInputStyle}
            type="number"
            value={defaultPrice}
            onChange={(e) => setDefaultPrice(e.target.value)}
          />
        </td>
        <td style={{ padding: "8px 12px", textAlign: "center" }}>
          <span style={{ color: TEXT_DIM, fontSize: 12 }}>{row.is_active ? "Active" : "Inactive"}</span>
        </td>
        <td style={{ padding: "8px 12px", textAlign: "right" }}>
          <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
            <IconBtn title="Save" onClick={handleSave} hoverColor={EMERALD}>
              <CheckIcon style={{ width: 16, height: 16 }} />
            </IconBtn>
            <IconBtn title="Cancel" onClick={handleCancel} hoverColor="#ef4444">
              <XMarkIcon style={{ width: 16, height: 16 }} />
            </IconBtn>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td style={{ padding: "8px 12px", color: TEXT, fontWeight: 600, fontSize: 13 }}>
        {row.display_name}
      </td>
      <td style={{ padding: "8px 12px", color: TEXT_DIM, fontSize: 12 }}>
        {row.system_type}
      </td>
      <td style={{ padding: "8px 12px", textAlign: "right", color: EMERALD, fontWeight: 600, fontSize: 13 }}>
        {fmtPrice(row.min_price)}
      </td>
      <td style={{ padding: "8px 12px", textAlign: "right", color: EMERALD, fontWeight: 600, fontSize: 13 }}>
        {fmtPrice(row.max_price)}
      </td>
      <td style={{ padding: "8px 12px", textAlign: "right", color: TEXT, fontWeight: 600, fontSize: 13 }}>
        {fmtPrice(row.default_price)}
      </td>
      <td style={{ padding: "8px 12px", textAlign: "center" }}>
        <button
          type="button"
          onClick={handleToggle}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
          title={row.is_active ? "Click to deactivate" : "Click to activate"}
        >
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: row.is_active ? EMERALD : "#475569",
              marginRight: 6,
            }}
          />
          <span style={{ color: row.is_active ? EMERALD : TEXT_DIM, fontSize: 12, fontWeight: 600 }}>
            {row.is_active ? "Active" : "Inactive"}
          </span>
        </button>
      </td>
      <td style={{ padding: "8px 12px", textAlign: "right" }}>
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <IconBtn title="Edit" onClick={() => setEditing(true)}>
            <PencilSquareIcon style={{ width: 16, height: 16 }} />
          </IconBtn>
          <IconBtn title="Delete" onClick={handleDelete} hoverColor="#ef4444">
            <TrashIcon style={{ width: 16, height: 16 }} />
          </IconBtn>
        </div>
      </td>
    </tr>
  );
}

// ─── Add Trade Form ─────────────────────────────────────────────────

function AddTradeForm({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [systemType, setSystemType] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [defaultPrice, setDefaultPrice] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!systemType || !displayName || !minPrice || !maxPrice || !defaultPrice) return;
    setSaving(true);
    try {
      await addLeadPricingTier({
        system_type: systemType,
        display_name: displayName,
        min_price: parseFloat(minPrice),
        max_price: parseFloat(maxPrice),
        default_price: parseFloat(defaultPrice),
      });
      setSystemType("");
      setDisplayName("");
      setMinPrice("");
      setMaxPrice("");
      setDefaultPrice("");
      setOpen(false);
      onSaved();
    } catch (e) {
      alert("Failed: " + (e instanceof Error ? e.message : "Unknown error"));
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: TEXT_MUTED,
          fontSize: 13,
          fontWeight: 600,
          padding: "8px 0",
          transition: "color 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = EMERALD; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = TEXT_MUTED; }}
      >
        <PlusIcon style={{ width: 14, height: 14 }} />
        Add Trade Type
      </button>
    );
  }

  const inputStyle: React.CSSProperties = {
    background: "#0f172a",
    border: `1px solid ${BORDER}`,
    borderRadius: 6,
    color: TEXT,
    padding: "6px 10px",
    fontSize: 13,
    outline: "none",
    flex: 1,
    minWidth: 0,
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        padding: "10px 12px",
        background: "rgba(15,23,42,0.5)",
        borderRadius: 8,
        flexWrap: "wrap",
      }}
    >
      <input
        className="admin-input"
        style={{ ...inputStyle, maxWidth: 120 }}
        placeholder="slug (e.g. roofing)"
        value={systemType}
        onChange={(e) => setSystemType(e.target.value)}
        required
      />
      <input
        className="admin-input"
        style={{ ...inputStyle, maxWidth: 160 }}
        placeholder="Display Name"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        required
      />
      <input
        className="admin-input"
        style={{ ...inputStyle, maxWidth: 80 }}
        type="number"
        placeholder="Min $"
        value={minPrice}
        onChange={(e) => setMinPrice(e.target.value)}
        required
      />
      <input
        className="admin-input"
        style={{ ...inputStyle, maxWidth: 80 }}
        type="number"
        placeholder="Max $"
        value={maxPrice}
        onChange={(e) => setMaxPrice(e.target.value)}
        required
      />
      <input
        className="admin-input"
        style={{ ...inputStyle, maxWidth: 80 }}
        type="number"
        placeholder="Default $"
        value={defaultPrice}
        onChange={(e) => setDefaultPrice(e.target.value)}
        required
      />
      <button
        type="submit"
        disabled={saving}
        style={{
          background: EMERALD,
          color: "#fff",
          border: "none",
          borderRadius: 6,
          padding: "6px 14px",
          fontWeight: 600,
          fontSize: 13,
          cursor: "pointer",
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? "Adding..." : "Add"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        style={{
          background: "none",
          border: `1px solid ${BORDER}`,
          borderRadius: 6,
          padding: "6px 14px",
          color: TEXT_MUTED,
          fontWeight: 600,
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        Cancel
      </button>
    </form>
  );
}

// ─── Main Client ────────────────────────────────────────────────────

export default function LeadPricingClient({ config, embedded }: { config: LeadPricingConfig[]; embedded?: boolean }) {
  const router = useRouter();
  const refresh = () => router.refresh();

  return (
    <div style={embedded ? { maxWidth: 1100 } : { padding: 28, maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      {!embedded && (
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ color: TEXT, fontSize: 22, fontWeight: 700, margin: 0 }}>Lead Pricing</h1>
          <p style={{ color: TEXT_DIM, fontSize: 13, margin: "4px 0 0" }}>
            Set min/max price ranges for each trade type. Brokers and admins post leads within these guardrails.
          </p>
        </div>
      )}

      {/* Table Card */}
      <div
        style={{
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <table className="admin-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ padding: "10px 12px", textAlign: "left", color: TEXT_DIM, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Trade
              </th>
              <th style={{ padding: "10px 12px", textAlign: "left", color: TEXT_DIM, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Slug
              </th>
              <th style={{ padding: "10px 12px", textAlign: "right", color: TEXT_DIM, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Min Price
              </th>
              <th style={{ padding: "10px 12px", textAlign: "right", color: TEXT_DIM, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Max Price
              </th>
              <th style={{ padding: "10px 12px", textAlign: "right", color: TEXT_DIM, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Default
              </th>
              <th style={{ padding: "10px 12px", textAlign: "center", color: TEXT_DIM, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Status
              </th>
              <th style={{ padding: "10px 12px", textAlign: "right", color: TEXT_DIM, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {config.map((row) => (
              <PricingRow key={row.id} row={row} onSaved={refresh} />
            ))}
            {config.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 24, textAlign: "center", color: TEXT_DIM, fontSize: 13 }}>
                  No pricing tiers configured. Add your first trade type below.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Add Trade */}
        <div style={{ padding: "8px 12px", borderTop: `1px solid ${BORDER}` }}>
          <AddTradeForm onSaved={refresh} />
        </div>
      </div>

      {/* Info Card */}
      <div
        style={{
          marginTop: 20,
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          padding: 20,
        }}
      >
        <h3 style={{ color: TEXT_SEC, fontSize: 14, fontWeight: 700, margin: "0 0 8px" }}>
          How Lead Pricing Works
        </h3>
        <ul style={{ color: TEXT_DIM, fontSize: 13, lineHeight: 1.7, margin: 0, paddingLeft: 18 }}>
          <li>When a broker or admin posts a lead, they set a price within the min/max range.</li>
          <li>If a price is set outside the range, it clamps to the nearest boundary.</li>
          <li>Default price is pre-filled when creating new leads.</li>
          <li>Changes only affect new leads — existing leads keep their current price.</li>
          <li>Revenue split: REI 30% / Lead poster 70% (minus 2% service fee).</li>
        </ul>
      </div>
    </div>
  );
}
