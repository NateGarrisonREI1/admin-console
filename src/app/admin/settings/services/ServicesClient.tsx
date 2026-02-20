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

// ─── Shared inline styles ───────────────────────────────────────────

const cellPad: React.CSSProperties = { padding: "10px 24px" };

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

// ─── Inline Price Editor ────────────────────────────────────────────

function PriceCell({
  price,
  editing,
  editValue,
  onEditValueChange,
  onSave,
  onCancel,
  saving,
}: {
  price: number;
  editing: boolean;
  editValue: string;
  onEditValueChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  if (!editing) {
    return <span style={{ fontSize: 13, fontWeight: 700, color: EMERALD }}>{fmtPrice(price)}</span>;
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ position: "relative", width: 90 }}>
        <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: TEXT_DIM }}>$</span>
        <input
          type="number"
          value={editValue}
          onChange={(e) => onEditValueChange(e.target.value)}
          className="admin-input"
          style={{ fontSize: 12, padding: "5px 8px 5px 20px", width: "100%", textAlign: "right" }}
        />
      </div>
      <button type="button" onClick={onSave} disabled={saving} style={{ ...inlineBtnSave, opacity: saving ? 0.5 : 1 }}>
        {saving ? "..." : "Save"}
      </button>
      <button type="button" onClick={onCancel} style={inlineBtnCancel}>Cancel</button>
    </div>
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
    } finally { setSaving(false); }
  }

  async function handleToggle() {
    setToggling(true);
    try {
      await toggleServiceActive("tier", tier.id, !tier.is_active);
      onRefresh();
    } finally { setToggling(false); }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${tier.name}"? This cannot be undone.`)) return;
    await deleteServiceTier(tier.id);
    onRefresh();
  }

  return (
    <tr style={{ borderBottom: "1px solid rgba(51,65,85,0.3)" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(51,65,85,0.3)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      <td style={cellPad}>
        <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{tier.name}</span>
      </td>
      <td style={cellPad}>
        <span style={{ fontSize: 12, color: TEXT_MUTED }}>{tier.size_label}</span>
      </td>
      <td style={cellPad}>
        <PriceCell
          price={tier.price} editing={editing} editValue={price}
          onEditValueChange={setPrice} onSave={handleSave}
          onCancel={() => { setEditing(false); setPrice(String(tier.price)); }}
          saving={saving}
        />
      </td>
      <td style={cellPad}>
        <button type="button" onClick={handleToggle} disabled={toggling}
          style={{
            padding: "3px 10px", borderRadius: 9999, fontSize: 10, fontWeight: 700,
            border: "none", cursor: toggling ? "not-allowed" : "pointer",
            background: tier.is_active ? "rgba(16,185,129,0.12)" : "rgba(100,116,139,0.12)",
            color: tier.is_active ? "#10b981" : "#64748b",
          }}
        >
          {tier.is_active ? "Active" : "Inactive"}
        </button>
      </td>
      <td style={{ ...cellPad, textAlign: "right" }}>
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
    } finally { setSaving(false); }
  }

  async function handleToggle() {
    setToggling(true);
    try {
      await toggleServiceActive("addon", addon.id, !addon.is_active);
      onRefresh();
    } finally { setToggling(false); }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${addon.name}"? This cannot be undone.`)) return;
    await deleteServiceAddon(addon.id);
    onRefresh();
  }

  return (
    <tr style={{ borderBottom: "1px solid rgba(51,65,85,0.3)" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(51,65,85,0.3)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      <td style={cellPad}>
        <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{addon.name}</span>
      </td>
      <td style={cellPad}>
        <span style={{ fontSize: 12, color: TEXT_DIM }}>Add-on service</span>
      </td>
      <td style={cellPad}>
        <PriceCell
          price={addon.price} editing={editing} editValue={price}
          onEditValueChange={setPrice} onSave={handleSave}
          onCancel={() => { setEditing(false); setPrice(String(addon.price)); }}
          saving={saving}
        />
      </td>
      <td style={cellPad}>
        <button type="button" onClick={handleToggle} disabled={toggling}
          style={{
            padding: "3px 10px", borderRadius: 9999, fontSize: 10, fontWeight: 700,
            border: "none", cursor: toggling ? "not-allowed" : "pointer",
            background: addon.is_active ? "rgba(16,185,129,0.12)" : "rgba(100,116,139,0.12)",
            color: addon.is_active ? "#10b981" : "#64748b",
          }}
        >
          {addon.is_active ? "Active" : "Inactive"}
        </button>
      </td>
      <td style={{ ...cellPad, textAlign: "right" }}>
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
      setName(""); setSlug(""); setSizeLabel(""); setPrice("");
      onAdded();
    } finally { setSaving(false); }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          background: "none", border: "none", color: EMERALD,
          fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0,
          transition: "opacity 0.12s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8"; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
      >
        <PlusIcon style={{ width: 14, height: 14 }} />
        Add Tier
      </button>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", padding: "4px 0" }}>
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
      setName(""); setSlug(""); setPrice("");
      onAdded();
    } finally { setSaving(false); }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          background: "none", border: "none", color: EMERALD,
          fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0,
          transition: "opacity 0.12s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8"; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
      >
        <PlusIcon style={{ width: 14, height: 14 }} />
        Add Service
      </button>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", padding: "4px 0" }}>
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

// ─── Category Group Rows ────────────────────────────────────────────

function CategoryGroup({ category, onRefresh }: { category: ServiceCatalogCategory; onRefresh: () => void }) {
  const activeTiers = category.tiers.filter((t) => t.is_active);
  const avgPrice = activeTiers.length > 0
    ? activeTiers.reduce((sum, t) => sum + t.price, 0) / activeTiers.length
    : 0;
  const hasAddons = category.addons.length > 0;

  return (
    <>
      {/* Group header */}
      <tr style={{ background: "rgba(30,41,59,0.3)" }}>
        <td colSpan={5} style={{ padding: "12px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: category.is_active ? EMERALD : "#64748b", flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{category.name}</span>
              {category.description && (
                <span style={{ fontSize: 12, color: TEXT_MUTED }}>— {category.description}</span>
              )}
            </div>
            {activeTiers.length > 0 && (
              <span style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: 600 }}>
                Avg: {fmtCurrency(Math.round(avgPrice))}
              </span>
            )}
          </div>
        </td>
      </tr>

      {/* Sub-header: Pricing Tiers (only if addons exist to distinguish) */}
      {hasAddons && category.tiers.length > 0 && (
        <tr style={{ background: "rgba(30,41,59,0.15)" }}>
          <td colSpan={5} style={{ padding: "6px 24px", fontSize: 10, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid rgba(51,65,85,0.3)" }}>
            Pricing Tiers
          </td>
        </tr>
      )}

      {/* Tier data rows */}
      {category.tiers.map((tier) => (
        <TierRow key={tier.id} tier={tier} onRefresh={onRefresh} />
      ))}

      {/* + Add Tier row */}
      <tr>
        <td colSpan={5} style={{ padding: "6px 24px", borderBottom: "1px solid rgba(51,65,85,0.3)" }}>
          <AddTierForm categoryId={category.id} onAdded={onRefresh} />
        </td>
      </tr>

      {/* Sub-header: Add-On Services */}
      {hasAddons && (
        <tr style={{ background: "rgba(30,41,59,0.15)" }}>
          <td colSpan={5} style={{ padding: "6px 24px", fontSize: 10, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid rgba(51,65,85,0.3)" }}>
            Add-On Services
          </td>
        </tr>
      )}

      {/* Addon data rows */}
      {category.addons.map((addon) => (
        <AddonRow key={addon.id} addon={addon} onRefresh={onRefresh} />
      ))}

      {/* + Add Service row */}
      <tr>
        <td colSpan={5} style={{ padding: "6px 24px", borderBottom: `1px solid ${BORDER}` }}>
          <AddAddonForm categoryId={category.id} onAdded={onRefresh} />
        </td>
      </tr>
    </>
  );
}

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

      {catalog.length === 0 ? (
        <div style={{ background: "#1e293b", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 32, textAlign: "center" }}>
          <p style={{ color: TEXT_DIM, fontSize: 13 }}>No service categories found. Run the service catalog migration to seed data.</p>
        </div>
      ) : (
        <div style={{ background: "rgba(30,41,59,0.5)", border: "1px solid rgba(51,65,85,0.5)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: "25%" }} />
                <col style={{ width: "35%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "10%" }} />
              </colgroup>
              <thead>
                <tr style={{ background: "rgba(30,41,59,0.8)", borderBottom: `1px solid ${BORDER}` }}>
                  {[
                    { label: "Service", align: "left" as const },
                    { label: "Size / Description", align: "left" as const },
                    { label: "Price", align: "left" as const },
                    { label: "Status", align: "left" as const },
                    { label: "Actions", align: "right" as const },
                  ].map((col) => (
                    <th key={col.label} style={{
                      padding: "10px 24px", textAlign: col.align,
                      fontSize: 10, fontWeight: 700, color: TEXT_MUTED,
                      textTransform: "uppercase", letterSpacing: "0.06em",
                      whiteSpace: "nowrap",
                    }}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {catalog.map((category) => (
                  <CategoryGroup key={category.id} category={category} onRefresh={handleRefresh} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
