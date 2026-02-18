// src/app/admin/settings/_components/UserEditDrawer.tsx
"use client";

import * as React from "react";
import type { AppRole, UserStatus } from "./pills";
import { RolePill, StatusPill } from "./pills";

export type UserRow = {
  user_id: string;
  email: string;
  role: AppRole;
  status?: UserStatus | null;

  created_at: string | null;
  last_sign_in_at: string | null;

  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
};

function fmtDate(v: string | null | undefined) {
  if (!v) return "\u2014";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "\u2014";
  return d.toLocaleString();
}

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #334155",
  background: "#1e293b",
  color: "#f1f5f9",
  fontSize: 13,
  fontWeight: 600,
  outline: "none",
};

export default function UserEditDrawer(props: {
  open: boolean;
  row: UserRow | null;
  busy?: boolean;
  toast?: string | null;

  onClose: () => void;

  onSaveProfile: (input: {
    userId: string;
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
    address1?: string | null;
    address2?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
  }) => Promise<void> | void;

  onSetRole: (input: { userId: string; role: AppRole }) => Promise<void> | void;
  onSetStatus: (input: { userId: string; status: UserStatus }) => Promise<void> | void;

  onCopyEmail: (email: string) => Promise<void> | void;
  onCopyId: (id: string) => Promise<void> | void;

  onCopyPasswordLink: (email: string) => Promise<void> | void;
  onCopyMagicLink: (email: string) => Promise<void> | void;
}) {
  const { open, row, onClose } = props;

  const [first, setFirst] = React.useState("");
  const [last, setLast] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [a1, setA1] = React.useState("");
  const [a2, setA2] = React.useState("");
  const [city, setCity] = React.useState("");
  const [state, setState] = React.useState("OR");
  const [zip, setZip] = React.useState("");
  const [role, setRole] = React.useState<AppRole>("homeowner");
  const [statusSel, setStatusSel] = React.useState<UserStatus>("pending");

  React.useEffect(() => {
    if (!open || !row) return;

    setFirst(row.first_name ?? "");
    setLast(row.last_name ?? "");
    setPhone(row.phone ?? "");
    setA1(row.address1 ?? "");
    setA2(row.address2 ?? "");
    setCity(row.city ?? "");
    setState(row.state ?? "OR");
    setZip(row.zip ?? "");
    setRole(row.role ?? "homeowner");

    const computed: UserStatus =
      row.status === "active" || row.status === "pending" || row.status === "disabled"
        ? row.status
        : row.last_sign_in_at
          ? "active"
          : "pending";

    setStatusSel(computed);
  }, [open, row]);

  if (!open || !row) return null;

  const computedStatus: UserStatus =
    row.status === "active" || row.status === "pending" || row.status === "disabled"
      ? row.status
      : row.last_sign_in_at
        ? "active"
        : "pending";

  const isDisabled = computedStatus === "disabled";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99990 }}>
      {/* overlay */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.50)", border: "none", cursor: "default" }}
      />

      {/* drawer */}
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          height: "100%",
          width: "100%",
          maxWidth: 460,
          display: "flex",
          flexDirection: "column",
          background: "#0f172a",
          borderLeft: "1px solid #334155",
          boxShadow: "0 30px 80px rgba(0,0,0,0.50)",
        }}
      >
        {/* header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", borderBottom: "1px solid #334155", padding: "16px 20px" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>User</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {row.email}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="admin-btn-secondary"
            style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, flexShrink: 0 }}
          >
            Close
          </button>
        </div>

        {/* body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {props.toast ? (
            <div
              style={{
                borderRadius: 8,
                border: "1px solid rgba(16,185,129,0.25)",
                background: "rgba(16,185,129,0.08)",
                padding: "10px 16px",
                fontSize: 13,
                fontWeight: 600,
                color: "#10b981",
              }}
            >
              {props.toast}
            </div>
          ) : null}

          {/* Summary */}
          <div style={{ borderRadius: 12, border: "1px solid #334155", background: "#1e293b", padding: 16 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Account
                </div>
                <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                  <RolePill role={row.role} />
                  <StatusPill status={computedStatus} />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <SmallBtn onClick={() => props.onCopyEmail(row.email)}>Copy email</SmallBtn>
                <SmallBtn onClick={() => props.onCopyId(row.user_id)}>Copy ID</SmallBtn>
              </div>
            </div>

            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12, color: "#cbd5e1" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Created
                </div>
                <div style={{ marginTop: 2 }}>{fmtDate(row.created_at)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Last sign in
                </div>
                <div style={{ marginTop: 2 }}>{fmtDate(row.last_sign_in_at)}</div>
              </div>
            </div>

            <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
              <SmallBtn disabled={props.busy} onClick={() => props.onCopyPasswordLink(row.email)}>
                Copy password link
              </SmallBtn>
              <SmallBtn disabled={props.busy} onClick={() => props.onCopyMagicLink(row.email)}>
                Copy magic link
              </SmallBtn>
              <SmallBtn
                disabled={props.busy}
                onClick={() => {
                  const next: UserStatus = isDisabled ? "active" : "disabled";
                  props.onSetStatus({ userId: row.user_id, status: next });
                  setStatusSel(next);
                }}
              >
                {isDisabled ? "Enable" : "Disable"}
              </SmallBtn>
            </div>
          </div>

          {/* Role + Status */}
          <div style={{ borderRadius: 12, border: "1px solid #334155", background: "#1e293b", padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Role
              </div>
              <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as AppRole)}
                  className="admin-select"
                >
                  <option value="admin">Admin</option>
                  <option value="broker">Broker</option>
                  <option value="contractor">Contractor</option>
                  <option value="homeowner">Homeowner</option>
                  <option value="affiliate">Affiliate</option>
                </select>

                <button
                  type="button"
                  disabled={props.busy}
                  className="admin-btn-primary"
                  style={{ padding: "8px 14px", borderRadius: 8, fontSize: 12, whiteSpace: "nowrap", opacity: props.busy ? 0.5 : 1 }}
                  onClick={() => props.onSetRole({ userId: row.user_id, role })}
                >
                  Save
                </button>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Status
              </div>
              <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                <select
                  value={statusSel}
                  onChange={(e) => setStatusSel(e.target.value as UserStatus)}
                  className="admin-select"
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="disabled">Disabled</option>
                </select>

                <button
                  type="button"
                  disabled={props.busy}
                  className="admin-btn-primary"
                  style={{ padding: "8px 14px", borderRadius: 8, fontSize: 12, whiteSpace: "nowrap", opacity: props.busy ? 0.5 : 1 }}
                  onClick={() => props.onSetStatus({ userId: row.user_id, status: statusSel })}
                >
                  Save
                </button>
              </div>
              <div style={{ marginTop: 6, fontSize: 11, fontWeight: 600, color: "#64748b" }}>
                Pending = invited / hasn&apos;t logged in yet.
              </div>
            </div>
          </div>

          {/* Profile */}
          <div style={{ borderRadius: 12, border: "1px solid #334155", background: "#1e293b", padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Profile
            </div>

            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>First name</div>
                <input value={first} onChange={(e) => setFirst(e.target.value)} style={{ ...INPUT_STYLE, marginTop: 4 }} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Last name</div>
                <input value={last} onChange={(e) => setLast(e.target.value)} style={{ ...INPUT_STYLE, marginTop: 4 }} />
              </div>

              <div style={{ gridColumn: "span 2" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Phone</div>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} style={{ ...INPUT_STYLE, marginTop: 4 }} />
              </div>

              <div style={{ gridColumn: "span 2" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Address 1</div>
                <input value={a1} onChange={(e) => setA1(e.target.value)} style={{ ...INPUT_STYLE, marginTop: 4 }} />
              </div>

              <div style={{ gridColumn: "span 2" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Address 2</div>
                <input value={a2} onChange={(e) => setA2(e.target.value)} style={{ ...INPUT_STYLE, marginTop: 4 }} />
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>City</div>
                <input value={city} onChange={(e) => setCity(e.target.value)} style={{ ...INPUT_STYLE, marginTop: 4 }} />
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>State</div>
                <input value={state} onChange={(e) => setState(e.target.value)} style={{ ...INPUT_STYLE, marginTop: 4 }} />
              </div>

              <div style={{ gridColumn: "span 2" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>ZIP</div>
                <input value={zip} onChange={(e) => setZip(e.target.value)} style={{ ...INPUT_STYLE, marginTop: 4 }} />
              </div>
            </div>

            <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                disabled={props.busy}
                className="admin-btn-primary"
                style={{ padding: "8px 14px", borderRadius: 8, fontSize: 12, opacity: props.busy ? 0.5 : 1 }}
                onClick={() =>
                  props.onSaveProfile({
                    userId: row.user_id,
                    first_name: first,
                    last_name: last,
                    phone,
                    address1: a1,
                    address2: a2,
                    city,
                    state,
                    zip,
                  })
                }
              >
                Save profile
              </button>
            </div>
          </div>
        </div>

        {/* footer */}
        <div style={{ borderTop: "1px solid #334155", padding: "12px 20px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>
            Tip: Use &quot;Copy password link&quot; for invited users.
          </div>
        </div>
      </div>
    </div>
  );
}

function SmallBtn(props: { children: React.ReactNode; disabled?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={props.onClick}
      className="admin-btn-secondary"
      style={{
        padding: "6px 10px",
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 700,
        opacity: props.disabled ? 0.5 : 1,
      }}
    >
      {props.children}
    </button>
  );
}
