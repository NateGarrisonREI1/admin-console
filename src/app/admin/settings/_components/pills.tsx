// src/app/admin/settings/_components/pills.tsx
import * as React from "react";

export type AppRole = "admin" | "rei_staff" | "broker" | "contractor" | "homeowner" | "affiliate";

// pending = invited / not yet signed in
export type UserStatus = "pending" | "active" | "disabled";

type Style = { bg: string; tx: string; bd: string };

export const ROLE_STYLES: Record<AppRole, Style> = {
  admin: { bg: "rgba(16,185,129,0.12)", tx: "#10b981", bd: "rgba(16,185,129,0.30)" },
  rei_staff: { bg: "rgba(6,182,212,0.12)", tx: "#06b6d4", bd: "rgba(6,182,212,0.30)" },
  broker: { bg: "rgba(56,189,248,0.12)", tx: "#38bdf8", bd: "rgba(56,189,248,0.30)" },
  contractor: { bg: "rgba(251,191,36,0.12)", tx: "#fbbf24", bd: "rgba(251,191,36,0.30)" },
  homeowner: { bg: "rgba(129,140,248,0.12)", tx: "#818cf8", bd: "rgba(129,140,248,0.30)" },
  affiliate: { bg: "rgba(167,139,250,0.12)", tx: "#a78bfa", bd: "rgba(167,139,250,0.30)" },
};

export const STATUS_STYLES: Record<UserStatus, Style> = {
  pending: { bg: "rgba(56,189,248,0.12)", tx: "#38bdf8", bd: "rgba(56,189,248,0.30)" },
  active: { bg: "rgba(16,185,129,0.12)", tx: "#10b981", bd: "rgba(16,185,129,0.30)" },
  disabled: { bg: "rgba(244,63,94,0.12)", tx: "#fb7185", bd: "rgba(244,63,94,0.30)" },
};

function titleize(v: string) {
  if (!v) return v;
  return v.slice(0, 1).toUpperCase() + v.slice(1);
}

export function Pill(props: { label: string; style: Style }) {
  const { label, style } = props;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 700,
        background: style.bg,
        color: style.tx,
        border: `1px solid ${style.bd}`,
      }}
    >
      {label}
    </span>
  );
}

export function RolePill(props: { role: AppRole }) {
  const role = props.role;
  return <Pill label={titleize(role)} style={ROLE_STYLES[role]} />;
}

export function StatusPill(props: { status: UserStatus }) {
  const s = props.status;
  return <Pill label={titleize(s)} style={STATUS_STYLES[s]} />;
}
