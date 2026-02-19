// src/components/ui/FilterableHeader.tsx
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

// ─── Design tokens (match admin dark theme) ─────────────────────────
const BORDER = "#334155";
const TEXT_DIM = "#64748b";
const TEXT_MUTED = "#94a3b8";
const TEXT_SEC = "#cbd5e1";
const TEXT = "#f1f5f9";
const EMERALD = "#10b981";
const POP_BG = "#1e293b";

// ─── Types ──────────────────────────────────────────────────────────

export type SortDir = "asc" | "desc" | null;

export type FilterType = "multi-select" | "date-range" | "search" | "range";

export type OptionColor = {
  bg: string; text: string; border?: string;
  activeBg: string; activeText: string;
};

export type FilterableHeaderProps = {
  label: string;
  /** Filter type – omit for sort-only columns */
  filterType?: FilterType;
  /** For multi-select: available options */
  options?: { value: string; label: string }[];
  /** For multi-select: colored pill rendering per option value */
  optionColors?: Record<string, OptionColor>;
  /** Current filter value (string[] for multi-select, {from,to} for date-range/range, string for search) */
  filterValue?: unknown;
  /** Called when filter value changes */
  onFilterChange?: (value: unknown) => void;
  /** Enable sort controls */
  sortable?: boolean;
  sortDir?: SortDir;
  onSortChange?: (dir: SortDir) => void;
  /** Column alignment */
  align?: "left" | "right" | "center";
  /** Width override for th */
  width?: number | string;
  /** Is this the only open popover? Managed by parent via openColumnId */
  isOpen?: boolean;
  /** Tell parent this header was clicked (so parent can close others) */
  onOpen?: () => void;
  onClose?: () => void;
};

// ─── Main Component ─────────────────────────────────────────────────

export default function FilterableHeader({
  label,
  filterType,
  options,
  optionColors,
  filterValue,
  onFilterChange,
  sortable,
  sortDir,
  onSortChange,
  align = "left",
  width,
  isOpen = false,
  onOpen,
  onClose,
}: FilterableHeaderProps) {
  const thRef = useRef<HTMLTableCellElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [popPos, setPopPos] = useState<{ top: number; left: number } | null>(null);

  const hasActiveFilter = isFilterActive(filterType, filterValue);
  const hasActiveSort = sortDir !== null && sortDir !== undefined;
  const isActive = hasActiveFilter || hasActiveSort;

  // Track client mount for portal
  useEffect(() => { setMounted(true); }, []);

  // Calculate popover position and update on scroll/resize
  useEffect(() => {
    if (!isOpen || !thRef.current) { setPopPos(null); return; }

    function update() {
      if (!thRef.current) return;
      const rect = thRef.current.getBoundingClientRect();
      const popWidth = 220;
      const screenW = window.innerWidth;
      const useRight = align === "right" || (rect.left + popWidth > screenW - 16);

      setPopPos({
        top: rect.bottom + 6,
        left: useRight ? Math.max(8, rect.right - popWidth) : rect.left,
      });
    }

    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [isOpen, align]);

  // Close on outside click — check both the <th> and the portal popover
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (thRef.current?.contains(target)) return;
      if (popRef.current?.contains(target)) return;
      onClose?.();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClose]);

  function handleHeaderClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (isOpen) onClose?.();
    else onOpen?.();
  }

  const sortArrow = sortDir === "asc" ? " ↑" : sortDir === "desc" ? " ↓" : "";

  // Portal popover — rendered at document.body, positioned fixed
  const popover = isOpen && mounted && popPos && createPortal(
    <div
      ref={popRef}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        top: popPos.top,
        left: popPos.left,
        zIndex: 9999,
        background: POP_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
        boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
        padding: 12,
        minWidth: 220,
      }}
    >
      {/* Arrow */}
      <div style={{
        position: "absolute", top: -6, left: 14,
        width: 0, height: 0,
        borderLeft: "6px solid transparent",
        borderRight: "6px solid transparent",
        borderBottom: `6px solid ${BORDER}`,
      }} />
      <div style={{
        position: "absolute", top: -5, left: 14,
        width: 0, height: 0,
        borderLeft: "6px solid transparent",
        borderRight: "6px solid transparent",
        borderBottom: `6px solid ${POP_BG}`,
      }} />

      {/* Sort controls (always shown if sortable) */}
      {sortable && (
        <SortControls sortDir={sortDir} onSortChange={(d) => { onSortChange?.(d); }} filterType={filterType} />
      )}

      {/* Filter controls */}
      {filterType === "multi-select" && (
        <MultiSelectFilter
          options={options ?? []}
          value={(filterValue as string[]) ?? []}
          onChange={(v) => onFilterChange?.(v)}
          optionColors={optionColors}
        />
      )}
      {filterType === "date-range" && (
        <DateRangeFilter
          value={(filterValue as { preset?: string; from?: string; to?: string }) ?? {}}
          onChange={(v) => onFilterChange?.(v)}
        />
      )}
      {filterType === "search" && (
        <SearchFilter
          value={(filterValue as string) ?? ""}
          onChange={(v) => onFilterChange?.(v)}
        />
      )}
      {filterType === "range" && (
        <RangeFilter
          value={(filterValue as { min?: string; max?: string }) ?? {}}
          onChange={(v) => onFilterChange?.(v)}
        />
      )}
    </div>,
    document.body,
  );

  return (
    <>
      <th
        ref={thRef}
        style={{
          position: "relative",
          width,
          textAlign: align,
          cursor: "pointer",
          userSelect: "none",
          whiteSpace: "nowrap",
        }}
        onClick={handleHeaderClick}
      >
        {/* Header label */}
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 11,
          fontWeight: 700,
          color: isActive ? EMERALD : TEXT_DIM,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          transition: "color 0.12s",
        }}>
          {label}{sortArrow}
          {hasActiveFilter && (
            <span style={{
              display: "inline-block", width: 5, height: 5, borderRadius: "50%",
              background: EMERALD, flexShrink: 0,
            }} />
          )}
          <svg width="8" height="5" viewBox="0 0 8 5" fill="none" style={{ flexShrink: 0, opacity: 0.5, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
            <path d="M0.5 0.5L4 4L7.5 0.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </th>
      {popover}
    </>
  );
}

// ─── Helper: is filter active ───────────────────────────────────────

function isFilterActive(type?: FilterType, value?: unknown): boolean {
  if (!type || value === undefined || value === null) return false;
  if (type === "multi-select") {
    return Array.isArray(value) && value.length > 0;
  }
  if (type === "search") {
    return typeof value === "string" && value.trim().length > 0;
  }
  if (type === "date-range") {
    const v = value as { preset?: string; from?: string; to?: string };
    return !!(v.preset || v.from || v.to);
  }
  if (type === "range") {
    const v = value as { min?: string; max?: string };
    return !!(v.min || v.max);
  }
  return false;
}

// ─── Sort Controls ──────────────────────────────────────────────────

function SortControls({ sortDir, onSortChange, filterType }: {
  sortDir?: SortDir;
  onSortChange: (dir: SortDir) => void;
  filterType?: FilterType;
}) {
  const ascLabel = filterType === "date-range" ? "Oldest → Newest"
    : filterType === "range" ? "Low → High"
    : "A → Z";
  const descLabel = filterType === "date-range" ? "Newest → Oldest"
    : filterType === "range" ? "High → Low"
    : "Z → A";

  return (
    <div style={{ marginBottom: filterType ? 8 : 0, paddingBottom: filterType ? 8 : 0, borderBottom: filterType ? `1px solid ${BORDER}` : "none" }}>
      {(["asc", "desc", null] as const).map((dir) => {
        const active = sortDir === dir;
        const lbl = dir === "asc" ? ascLabel : dir === "desc" ? descLabel : "No sort";
        return (
          <button key={String(dir)} type="button" onClick={() => onSortChange(dir)}
            style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "5px 8px", borderRadius: 6, border: "none",
              background: active ? "rgba(16,185,129,0.1)" : "transparent",
              color: active ? EMERALD : TEXT_SEC,
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              transition: "background 0.1s",
            }}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(148,163,184,0.06)"; }}
            onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
          >
            {dir === "asc" && "↑ "}{dir === "desc" && "↓ "}{lbl}
          </button>
        );
      })}
    </div>
  );
}

// ─── Multi-Select Filter ────────────────────────────────────────────

function MultiSelectFilter({ options, value, onChange, optionColors }: {
  options: { value: string; label: string }[];
  value: string[];
  onChange: (v: string[]) => void;
  optionColors?: Record<string, OptionColor>;
}) {
  const [search, setSearch] = useState("");
  const showSearch = !optionColors && options.length > 6;
  const q = search.toLowerCase().trim();
  const filtered = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  const allSelected = value.length === 0; // empty means "all" (no filter)

  function toggle(val: string) {
    if (value.includes(val)) {
      onChange(value.filter((v) => v !== val));
    } else {
      onChange([...value, val]);
    }
  }

  // ── Colored pill mode ──
  if (optionColors) {
    return (
      <div>
        <div style={{ marginBottom: 8 }}>
          <button type="button" onClick={() => onChange([])}
            style={{ background: "none", border: "none", color: allSelected ? EMERALD : TEXT_DIM, fontSize: 11, fontWeight: 700, cursor: "pointer", padding: 0 }}>
            All
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {options.map((opt) => {
            const checked = value.includes(opt.value);
            const c = optionColors[opt.value];
            return (
              <button key={opt.value} type="button" onClick={() => toggle(opt.value)}
                style={{
                  width: "100%", padding: "8px 12px", borderRadius: 8,
                  border: checked ? "1px solid transparent" : `1px solid ${c?.border ?? BORDER}`,
                  background: checked ? (c?.activeBg ?? EMERALD) : (c?.bg ?? "transparent"),
                  color: checked ? (c?.activeText ?? "#fff") : (c?.text ?? TEXT_SEC),
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                  transition: "all 0.12s", textAlign: "left",
                }}>
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Default checkbox mode ──
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <button type="button" onClick={() => onChange([])}
          style={{ background: "none", border: "none", color: allSelected ? EMERALD : TEXT_DIM, fontSize: 11, fontWeight: 700, cursor: "pointer", padding: 0 }}>
          All
        </button>
        {value.length > 0 && (
          <button type="button" onClick={() => onChange([])}
            style={{ background: "none", border: "none", color: TEXT_DIM, fontSize: 11, fontWeight: 600, cursor: "pointer", padding: 0 }}>
            Clear
          </button>
        )}
      </div>
      {showSearch && (
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…" autoFocus
          style={{
            width: "100%", padding: "6px 8px", borderRadius: 6, border: `1px solid ${BORDER}`,
            background: "rgba(15,23,42,0.5)", color: TEXT, fontSize: 12, outline: "none",
            marginBottom: 6, boxSizing: "border-box",
          }}
        />
      )}
      <div style={{ maxHeight: 200, overflowY: "auto" }}>
        {filtered.map((opt) => {
          const checked = value.includes(opt.value);
          return (
            <label key={opt.value} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "4px 6px", borderRadius: 4, cursor: "pointer",
              fontSize: 12, color: checked ? TEXT : TEXT_SEC, fontWeight: checked ? 600 : 500,
              transition: "background 0.1s",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(148,163,184,0.06)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <input type="checkbox" checked={checked} onChange={() => toggle(opt.value)}
                style={{ accentColor: EMERALD, width: 14, height: 14 }} />
              {opt.label}
            </label>
          );
        })}
      </div>
    </div>
  );
}

// ─── Date Range Filter ──────────────────────────────────────────────

const DATE_PRESETS = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "all", label: "All Time" },
];

function DateRangeFilter({ value, onChange }: {
  value: { preset?: string; from?: string; to?: string };
  onChange: (v: { preset?: string; from?: string; to?: string }) => void;
}) {
  const [from, setFrom] = useState(value.from ?? "");
  const [to, setTo] = useState(value.to ?? "");

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
        {DATE_PRESETS.map((p) => {
          const active = value.preset === p.value;
          return (
            <button key={p.value} type="button"
              onClick={() => onChange(p.value === "all" ? {} : { preset: p.value })}
              style={{
                padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                border: `1px solid ${active ? EMERALD : BORDER}`,
                background: active ? "rgba(16,185,129,0.1)" : "transparent",
                color: active ? EMERALD : TEXT_MUTED, cursor: "pointer",
                transition: "all 0.12s",
              }}
            >{p.label}</button>
          );
        })}
      </div>
      <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Custom Range</div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
          style={{
            flex: 1, padding: "5px 6px", borderRadius: 6, border: `1px solid ${BORDER}`,
            background: "rgba(15,23,42,0.5)", color: TEXT, fontSize: 11, outline: "none",
          }} />
        <span style={{ fontSize: 10, color: TEXT_DIM }}>→</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
          style={{
            flex: 1, padding: "5px 6px", borderRadius: 6, border: `1px solid ${BORDER}`,
            background: "rgba(15,23,42,0.5)", color: TEXT, fontSize: 11, outline: "none",
          }} />
      </div>
      <button type="button"
        onClick={() => { if (from || to) onChange({ from: from || undefined, to: to || undefined }); }}
        style={{
          marginTop: 6, width: "100%", padding: "5px 8px", borderRadius: 6,
          border: "none", background: EMERALD, color: "#fff",
          fontSize: 11, fontWeight: 700, cursor: "pointer", opacity: from || to ? 1 : 0.4,
        }}
      >Apply</button>
    </div>
  );
}

// ─── Search Filter ──────────────────────────────────────────────────

function SearchFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [local, setLocal] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedChange = useCallback((v: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(v), 200);
  }, [onChange]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <div style={{ position: "relative" }}>
      <input
        type="text" value={local} autoFocus
        onChange={(e) => { setLocal(e.target.value); debouncedChange(e.target.value); }}
        placeholder="Filter…"
        style={{
          width: "100%", padding: "7px 28px 7px 8px", borderRadius: 6,
          border: `1px solid ${BORDER}`, background: "rgba(15,23,42,0.5)",
          color: TEXT, fontSize: 12, outline: "none", boxSizing: "border-box",
        }}
      />
      {local && (
        <button type="button" onClick={() => { setLocal(""); onChange(""); }}
          style={{
            position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", color: TEXT_DIM, fontSize: 14,
            cursor: "pointer", padding: 0, lineHeight: 1,
          }}>×</button>
      )}
    </div>
  );
}

// ─── Range Filter ───────────────────────────────────────────────────

function RangeFilter({ value, onChange }: {
  value: { min?: string; max?: string };
  onChange: (v: { min?: string; max?: string }) => void;
}) {
  const [min, setMin] = useState(value.min ?? "");
  const [max, setMax] = useState(value.max ?? "");

  function handleApply() {
    onChange({ min: min || undefined, max: max || undefined });
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input type="number" value={min} onChange={(e) => setMin(e.target.value)} placeholder="Min"
          style={{
            flex: 1, padding: "6px 8px", borderRadius: 6, border: `1px solid ${BORDER}`,
            background: "rgba(15,23,42,0.5)", color: TEXT, fontSize: 12, outline: "none", width: 70,
          }} />
        <span style={{ fontSize: 10, color: TEXT_DIM }}>–</span>
        <input type="number" value={max} onChange={(e) => setMax(e.target.value)} placeholder="Max"
          style={{
            flex: 1, padding: "6px 8px", borderRadius: 6, border: `1px solid ${BORDER}`,
            background: "rgba(15,23,42,0.5)", color: TEXT, fontSize: 12, outline: "none", width: 70,
          }} />
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <button type="button" onClick={handleApply}
          style={{
            flex: 1, padding: "5px 8px", borderRadius: 6, border: "none",
            background: EMERALD, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer",
          }}>Apply</button>
        {(value.min || value.max) && (
          <button type="button" onClick={() => { setMin(""); setMax(""); onChange({}); }}
            style={{
              padding: "5px 8px", borderRadius: 6, border: `1px solid ${BORDER}`,
              background: "transparent", color: TEXT_DIM, fontSize: 11, fontWeight: 600, cursor: "pointer",
            }}>Clear</button>
        )}
      </div>
    </div>
  );
}

// ─── Active Filter Bar ──────────────────────────────────────────────

export type ActiveFilter = {
  key: string;
  label: string;
  value: string;
  onClear: () => void;
};

export function ActiveFilterBar({ filters, onClearAll }: {
  filters: ActiveFilter[];
  onClearAll: () => void;
}) {
  if (filters.length === 0) return null;

  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center",
      padding: "8px 14px", borderRadius: 10,
      background: "rgba(30,41,59,0.5)", border: `1px solid ${BORDER}`,
    }}>
      {filters.map((f) => (
        <span key={f.key} style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "3px 10px", borderRadius: 9999, fontSize: 11, fontWeight: 600,
          background: "rgba(51,65,85,0.5)", color: TEXT_SEC,
        }}>
          <span style={{ color: TEXT_DIM }}>{f.label}:</span> {f.value}
          <button type="button" onClick={f.onClear}
            style={{
              background: "none", border: "none", color: TEXT_DIM, fontSize: 13,
              cursor: "pointer", padding: 0, lineHeight: 1, marginLeft: 2,
              transition: "color 0.12s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = TEXT; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = TEXT_DIM; }}
          >×</button>
        </span>
      ))}
      <button type="button" onClick={onClearAll}
        style={{
          background: "none", border: "none", color: TEXT_DIM, fontSize: 11,
          fontWeight: 700, cursor: "pointer", padding: "3px 6px", marginLeft: 4,
          transition: "color 0.12s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = TEXT; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = TEXT_DIM; }}
      >Clear All</button>
    </div>
  );
}
