// src/components/ui/TimePicker.tsx
"use client";

import React, { useState, useEffect } from "react";

// ─── Constants ──────────────────────────────────────────────────────

const AM_HOURS = [6, 7, 8, 9, 10, 11];
const PM_HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const MINUTES = [0, 15, 30, 45];

const BG = "#0f172a";
const BORDER = "#334155";
const TEXT = "#f1f5f9";
const TEXT_DIM = "#64748b";
const GREEN = "#10b981";
const CARD = "#1e293b";

// ─── Helpers ────────────────────────────────────────────────────────

/** Parse "HH:MM" (24-h) into { hour12, minute, period } */
function parse24(time: string): { hour12: number; minute: number; period: "AM" | "PM" } {
  const [hStr, mStr] = time.split(":");
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return { hour12: 9, minute: 0, period: "AM" };
  const period: "AM" | "PM" = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return { hour12, minute: m, period };
}

/** Convert { hour12, minute, period } → "HH:MM" (24-h) */
function to24(hour12: number, minute: number, period: "AM" | "PM"): string {
  let h = hour12;
  if (period === "AM" && h === 12) h = 0;
  if (period === "PM" && h !== 12) h += 12;
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

// ─── Component ──────────────────────────────────────────────────────

export default function TimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (time: string) => void;
}) {
  const initial = value ? parse24(value) : { hour12: 9, minute: 0, period: "AM" as const };
  const [hour, setHour] = useState(initial.hour12);
  const [minute, setMinute] = useState(initial.minute);
  const [period, setPeriod] = useState<"AM" | "PM">(initial.period);

  // Emit on any change
  useEffect(() => {
    onChange(to24(hour, minute, period));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hour, minute, period]);

  // Set default on mount if empty
  useEffect(() => {
    if (!value) {
      onChange(to24(9, 0, "AM"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hours = period === "AM" ? AM_HOURS : PM_HOURS;

  // If current hour isn't valid for the new period, snap to first valid hour
  useEffect(() => {
    const valid = period === "AM" ? AM_HOURS : PM_HOURS;
    if (!valid.includes(hour)) {
      setHour(valid[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const selectStyle: React.CSSProperties = {
    background: BG,
    border: `1px solid ${BORDER}`,
    borderRadius: 6,
    color: TEXT,
    fontSize: 13,
    padding: "7px 8px",
    outline: "none",
    cursor: "pointer",
    WebkitAppearance: "none",
    MozAppearance: "none",
    appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%2364748b' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 8px center",
    paddingRight: 24,
  };

  const toggleBase: React.CSSProperties = {
    border: "none",
    borderRadius: 5,
    fontSize: 11,
    fontWeight: 700,
    padding: "6px 10px",
    cursor: "pointer",
    transition: "all 0.12s",
    letterSpacing: 0.5,
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {/* Hour */}
      <select
        value={hour}
        onChange={(e) => setHour(parseInt(e.target.value, 10))}
        style={{ ...selectStyle, flex: "0 0 auto", minWidth: 52 }}
      >
        {hours.map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>

      <span style={{ color: TEXT_DIM, fontSize: 14, fontWeight: 700, lineHeight: 1 }}>:</span>

      {/* Minute */}
      <select
        value={minute}
        onChange={(e) => setMinute(parseInt(e.target.value, 10))}
        style={{ ...selectStyle, flex: "0 0 auto", minWidth: 52 }}
      >
        {MINUTES.map((m) => (
          <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
        ))}
      </select>

      {/* AM/PM toggle */}
      <div style={{ display: "flex", gap: 2, marginLeft: 4 }}>
        <button
          type="button"
          onClick={() => setPeriod("AM")}
          style={{
            ...toggleBase,
            background: period === "AM" ? GREEN : CARD,
            color: period === "AM" ? "#fff" : TEXT_DIM,
            borderTopRightRadius: 0,
            borderBottomRightRadius: 0,
          }}
        >AM</button>
        <button
          type="button"
          onClick={() => setPeriod("PM")}
          style={{
            ...toggleBase,
            background: period === "PM" ? GREEN : CARD,
            color: period === "PM" ? "#fff" : TEXT_DIM,
            borderTopLeftRadius: 0,
            borderBottomLeftRadius: 0,
          }}
        >PM</button>
      </div>
    </div>
  );
}
