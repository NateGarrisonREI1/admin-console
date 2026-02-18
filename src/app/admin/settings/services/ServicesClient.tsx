// src/app/admin/settings/services/ServicesClient.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PencilSquareIcon,
  TrashIcon,
  PlusIcon,
} from "@heroicons/react/20/solid";
import type { ServiceCatalog, ServiceCatalogCategory } from "../../_actions/services";
import {
  updateServiceTier,
  updateServiceAddon,
  addServiceTier,
  addServiceAddon,
  deleteServiceTier,
  deleteServiceAddon,
  toggleServiceActive,
} from "../../_actions/services";
import type { ServiceTier, ServiceAddon } from "@/types/schema";

// ─── Design tokens ──────────────────────────────────────────────────
const CARD = "#1e293b";
const BORDER = "#334155";
const TEXT = "#f1f5f9";
const TEXT_SEC = "#cbd5e1";
const TEXT_DIM = "#64748b";
const TEXT_MUTED = "#94a3b8";
const EMERALD = "#10b981";

function fmtCurrency(n: number): string {
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtPrice(n: number): string {
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
        color: defaultColor,
        cursor: "pointer",
        padding: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "color 0.12s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = hover; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = defaultColor; }}
    >
      {children}
    </button>
  );
}

// ─── Tier Row ───────────────────────────────────────────────────────

function TierRow({ tier, onRefresh }: { tier: ServiceTier; onRefresh: () => void }) {
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(String(tier.price));
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateServiceTier(tier.id, { price: parseFloat(price) });
      setEditing(false);
      onRefresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle() {
    setToggling(true);
    try {
      await toggleServiceActive("tier", tier.id, !tier.is_active);
      onRefresh();
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${tier.name}"? This cannot be undone.`)) return;
    await deleteServiceTier(tier.id);
    onRefresh();
  }

  return (
    <tr>
      <td>
        <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{tier.name}</span>
      </td>
      <td>
        <span style={{ fontSize: 12, color: TEXT_MUTED }}>{tier.size_label}</span>
      </td>
      <td style={{ textAlign: "right" }}>
        {editing ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
            <div style={{ position: "relative", width: 90 }}>
              <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: TEXT_DIM }}>$</span>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="admin-input"
                style={{ fontSize: 12, padding: "5px 8px 5px 20px", width: "100%", textAlign: "right" }}
              />
            </div>
            <button type="button" onClick={handleSave} disabled={saving} style={{ ...inlineBtnSave, opacity: saving ? 0.5 : 1 }}>
              {saving ? "..." : "Save"}
            </button>
            <button type="button" onClick={() => { setEditing(false); setPrice(String(tier.price)); }} style={inlineBtnCancel}>
              Cancel
            </button>
          </div>
        ) : (
          <span style={{ fontSize: 13, fontWeight: 700, color: EMERALD }}>{fmtPrice(tier.price)}</span>
        )}
      </td>
      <td style={{ textAlign: "center" }}>
        <button
          type="button"
          onClick={handleToggle}
          disabled={toggling}
          style={{
            padding: "3px 10px",
            borderRadius: 9999,
            fontSize: 10,
            fontWeight: 700,
            border: "none",
            cursor: toggling ? "not-allowed" : "pointer",
            background: tier.is_active ? "rgba(16,185,129,0.12)" : "rgba(100,116,139,0.12)",
            color: tier.is_active ? "#10b981" : "#64748b",
          }}
        >
          {tier.is_active ? "Active" : "Inactive"}
        </button>
      </td>
      <td>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
          {!editing && (
            <IconBtn title="Edit price" onClick={() => setEditing(true)}>
              <PencilSquareIcon style={{ width: 15, height: 15 }} />
            </IconBtn>
          )}
          <IconBtn title="Delete tier" onClick={handleDelete} hoverColor="#ef4444">
            <TrashIcon style={{ width: 15, height: 15 }} />
          </IconBtn>
        </div>
      </td>
    </tr>
  );
}

// ─── Addon Row ──────────────────────────────────────────────────────

function AddonRow({ addon, onRefresh }: { addon: ServiceAddon; onRefresh: () => void }) {
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(String(addon.price));
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateServiceAddon(addon.id, { price: parseFloat(price) });
      setEditing(false);
      onRefresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle() {
    setToggling(true);
    try {
      await toggleServiceActive("addon", addon.id, !addon.is_active);
      onRefresh();
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${addon.name}"? This cannot be undone.`)) return;
    await deleteServiceAddon(addon.id);
    onRefresh();
  }

  return (
    <tr>
      <td>
        <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{addon.name}</span>
      </td>
      <td>
        <span style={{ fontSize: 12, color: TEXT_DIM }}>—</span>
      </td>
      <td style={{ textAlign: "right" }}>
        {editing ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
            <div style={{ position: "relative", width: 90 }}>
              <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: TEXT_DIM }}>$</span>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="admin-input"
                style={{ fontSize: 12, padding: "5px 8px 5px 20px", width: "100%", textAlign: "right" }}
              />
            </div>
            <button type="button" onClick={handleSave} disabled={saving} style={{ ...inlineBtnSave, opacity: saving ? 0.5 : 1 }}>
              {saving ? "..." : "Save"}
            </button>
            <button type="button" onClick={() => { setEditing(false); setPrice(String(addon.price)); }} style={inlineBtnCancel}>
              Cancel
            </button>
          </div>
        ) : (
          <span style={{ fontSize: 13, fontWeight: 700, color: EMERALD }}>{fmtPrice(addon.price)}</span>
        )}
      </td>
      <td style={{ textAlign: "center" }}>
        <button
          type="button"
          onClick={handleToggle}
          disabled={toggling}
          style={{
            padding: "3px 10px",
            borderRadius: 9999,
            fontSize: 10,
            fontWeight: 700,
            border: "none",
            cursor: toggling ? "not-allowed" : "pointer",
            background: addon.is_active ? "rgba(16,185,129,0.12)" : "rgba(100,116,139,0.12)",
            color: addon.is_active ? "#10b981" : "#64748b",
          }}
        >
          {addon.is_active ? "Active" : "Inactive"}
        </button>
      </td>
      <td>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
          {!editing && (
            <IconBtn title="Edit price" onClick={() => setEditing(true)}>
              <PencilSquareIcon style={{ width: 15, height: 15 }} />
            </IconBtn>
          )}
          <IconBtn title="Delete add-on" onClick={handleDelete} hoverColor="#ef4444">
            <TrashIcon style={{ width: 15, height: 15 }} />
          </IconBtn>
        </div>
      </td>
    </tr>
  );
}

// ─── Section Header Row ─────────────────────────────────────────────

function SectionHeaderRow({ label, colSpan }: { label: string; colSpan: number }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        style={{
          padding: "8px 12px",
          fontSize: 10,
          fontWeight: 700,
          color: TEXT_DIM,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          background: "#1e293b",
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        {label}
      </td>
    </tr>
  );
}

// ─── Inline Add Row ─────────────────────────────────────────────────

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: "none",
        border: "none",
        color: TEXT_MUTED,
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        padding: "6px 0",
        transition: "color 0.12s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = EMERALD; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = TEXT_MUTED; }}
    >
      <PlusIcon style={{ width: 14, height: 14 }} />
      {label}
    </button>
  );
}

// ─── Add Tier Form ──────────────────────────────────────────────────

function AddTierForm({ categoryId, onAdded }: { categoryId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [sizeLabel, setSizeLabel] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!name.trim() || !slug.trim() || !price) return;
    setSaving(true);
    try {
      await addServiceTier(categoryId, {
        name: name.trim(),
        slug: slug.trim(),
        size_label: sizeLabel.trim() || name.trim(),
        price: parseFloat(price),
      });
      setOpen(false);
      setName("");
      setSlug("");
      setSizeLabel("");
      setPrice("");
      onAdded();
    } finally {
      setSaving(false);
    }
  }

  if (!open) return <AddButton label="Add Tier" onClick={() => setOpen(true)} />;

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", padding: "8px 0" }}>
      <div>
        <label style={fieldLabel}>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="admin-input" style={fieldInput} placeholder="HES - Custom" />
      </div>
      <div>
        <label style={fieldLabel}>Slug</label>
        <input value={slug} onChange={(e) => setSlug(e.target.value)} className="admin-input" style={fieldInput} placeholder="hes-custom" />
      </div>
      <div>
        <label style={fieldLabel}>Size Label</label>
        <input value={sizeLabel} onChange={(e) => setSizeLabel(e.target.value)} className="admin-input" style={fieldInput} placeholder="Custom size" />
      </div>
      <div>
        <label style={fieldLabel}>Price</label>
        <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="admin-input" style={{ ...fieldInput, width: 80 }} placeholder="0" />
      </div>
      <button type="button" onClick={handleSubmit} disabled={saving} style={{ ...inlineBtnSave, opacity: saving ? 0.5 : 1 }}>
        {saving ? "..." : "Add"}
      </button>
      <button type="button" onClick={() => setOpen(false)} style={inlineBtnCancel}>Cancel</button>
    </div>
  );
}

// ─── Add Addon Form ─────────────────────────────────────────────────

function AddAddonForm({ categoryId, onAdded }: { categoryId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!name.trim() || !slug.trim() || !price) return;
    setSaving(true);
    try {
      await addServiceAddon(categoryId, {
        name: name.trim(),
        slug: slug.trim(),
        price: parseFloat(price),
      });
      setOpen(false);
      setName("");
      setSlug("");
      setPrice("");
      onAdded();
    } finally {
      setSaving(false);
    }
  }

  if (!open) return <AddButton label="Add Service" onClick={() => setOpen(true)} />;

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", padding: "8px 0" }}>
      <div>
        <label style={fieldLabel}>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="admin-input" style={fieldInput} placeholder="Service name" />
      </div>
      <div>
        <label style={fieldLabel}>Slug</label>
        <input value={slug} onChange={(e) => setSlug(e.target.value)} className="admin-input" style={fieldInput} placeholder="service-slug" />
      </div>
      <div>
        <label style={fieldLabel}>Price</label>
        <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="admin-input" style={{ ...fieldInput, width: 80 }} />
      </div>
      <button type="button" onClick={handleSubmit} disabled={saving} style={{ ...inlineBtnSave, opacity: saving ? 0.5 : 1 }}>
        {saving ? "..." : "Add"}
      </button>
      <button type="button" onClick={() => setOpen(false)} style={inlineBtnCancel}>Cancel</button>
    </div>
  );
}

// ─── Category Card ──────────────────────────────────────────────────

function CategoryCard({ category, onRefresh }: { category: ServiceCatalogCategory; onRefresh: () => void }) {
  const activeTiers = category.tiers.filter((t) => t.is_active);
  const avgPrice = activeTiers.length > 0
    ? activeTiers.reduce((sum, t) => sum + t.price, 0) / activeTiers.length
    : 0;
  const hasAddons = category.addons.length > 0;

  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: category.is_active ? EMERALD : "#64748b" }} />
          <h2 style={{ fontSize: 15, fontWeight: 700, color: TEXT, margin: 0 }}>{category.name}</h2>
          {category.description && (
            <span style={{ fontSize: 12, color: TEXT_DIM }}>— {category.description}</span>
          )}
        </div>
        {activeTiers.length > 0 && (
          <span style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: 600 }}>
            Avg: {fmtCurrency(Math.round(avgPrice))}
          </span>
        )}
      </div>

      {/* Unified Table */}
      <div style={{ overflowX: "auto" }}>
        <table className="admin-table" style={{ minWidth: 640 }}>
          <thead>
            <tr>
              <th>Service</th>
              <th>Size / Description</th>
              <th style={{ textAlign: "right" }}>Price</th>
              <th style={{ textAlign: "center" }}>Status</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* Tiers section */}
            {hasAddons && category.tiers.length > 0 && (
              <SectionHeaderRow label="Pricing Tiers" colSpan={5} />
            )}
            {category.tiers.map((tier) => (
              <TierRow key={tier.id} tier={tier} onRefresh={onRefresh} />
            ))}

            {/* Add tier button row */}
            <tr>
              <td colSpan={5} style={{ padding: "4px 12px" }}>
                <AddTierForm categoryId={category.id} onAdded={onRefresh} />
              </td>
            </tr>

            {/* Addons section */}
            {hasAddons && (
              <>
                <SectionHeaderRow label="Add-On Services" colSpan={5} />
                {category.addons.map((addon) => (
                  <AddonRow key={addon.id} addon={addon} onRefresh={onRefresh} />
                ))}
                <tr>
                  <td colSpan={5} style={{ padding: "4px 12px" }}>
                    <AddAddonForm categoryId={category.id} onAdded={onRefresh} />
                  </td>
                </tr>
              </>
            )}

            {/* Show addon add even if no addons yet (for HES if needed) */}
            {!hasAddons && (
              <tr>
                <td colSpan={5} style={{ padding: "4px 12px" }}>
                  <AddAddonForm categoryId={category.id} onAdded={onRefresh} />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Shared styles ──────────────────────────────────────────────────

const inlineBtnSave: React.CSSProperties = {
  padding: "5px 12px",
  borderRadius: 6,
  border: "none",
  background: EMERALD,
  color: "#fff",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const inlineBtnCancel: React.CSSProperties = {
  padding: "5px 12px",
  borderRadius: 6,
  border: "none",
  background: "#334155",
  color: TEXT_SEC,
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const fieldLabel: React.CSSProperties = {
  display: "block",
  fontSize: 10,
  color: TEXT_MUTED,
  fontWeight: 600,
  marginBottom: 3,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const fieldInput: React.CSSProperties = {
  fontSize: 12,
  padding: "5px 8px",
  width: 120,
};

// ─── Main Component ─────────────────────────────────────────────────

type Props = { catalog: ServiceCatalog };

export default function ServicesClient({ catalog }: Props) {
  const router = useRouter();

  function handleRefresh() {
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT, margin: 0 }}>Service Catalog</h1>
        <p style={{ fontSize: 13, color: TEXT_DIM, margin: "4px 0 0", fontWeight: 500 }}>
          Manage pricing for HES assessments, inspections, and add-on services.
        </p>
      </div>

      {/* Category cards */}
      {catalog.map((category) => (
        <CategoryCard key={category.id} category={category} onRefresh={handleRefresh} />
      ))}

      {catalog.length === 0 && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 32, textAlign: "center" }}>
          <p style={{ color: TEXT_DIM, fontSize: 13 }}>No service categories found. Run the service catalog migration to seed data.</p>
        </div>
      )}
    </div>
  );
}
