// src/app/admin/settings/_components/pills.tsx
import * as React from "react";

export type AppRole = "admin" | "broker" | "contractor" | "homeowner" | "affiliate";

// pending = invited / not yet signed in
export type UserStatus = "pending" | "active" | "disabled";

type Style = { bg: string; text: string; ring: string; dot?: string };

export const ROLE_STYLES: Record<AppRole, Style> = {
  admin: { bg: "bg-emerald-50", text: "text-emerald-900", ring: "ring-emerald-200", dot: "bg-emerald-500" },
  broker: { bg: "bg-sky-50", text: "text-sky-900", ring: "ring-sky-200", dot: "bg-sky-500" },
  contractor: { bg: "bg-amber-50", text: "text-amber-900", ring: "ring-amber-200", dot: "bg-amber-500" },
  homeowner: { bg: "bg-indigo-50", text: "text-indigo-900", ring: "ring-indigo-200", dot: "bg-indigo-500" },
  affiliate: { bg: "bg-violet-50", text: "text-violet-900", ring: "ring-violet-200", dot: "bg-violet-500" },
};

export const STATUS_STYLES: Record<UserStatus, Style> = {
  pending: { bg: "bg-sky-50", text: "text-sky-900", ring: "ring-sky-200", dot: "bg-sky-500" },
  active: { bg: "bg-emerald-50", text: "text-emerald-900", ring: "ring-emerald-200", dot: "bg-emerald-500" },
  disabled: { bg: "bg-rose-50", text: "text-rose-900", ring: "ring-rose-200", dot: "bg-rose-500" },
};

function titleize(v: string) {
  if (!v) return v;
  return v.slice(0, 1).toUpperCase() + v.slice(1);
}

export function Pill(props: { label: string; style: Style; subtle?: boolean }) {
  const { label, style } = props;
  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-extrabold ring-1",
        style.bg,
        style.text,
        style.ring,
      ].join(" ")}
    >
      {style.dot ? <span className={["h-1.5 w-1.5 rounded-full", style.dot].join(" ")} /> : null}
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
