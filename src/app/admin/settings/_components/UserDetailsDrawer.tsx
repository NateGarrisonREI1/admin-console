// src/app/admin/settings/_components/UserDetailsDrawer.tsx
"use client";

import * as React from "react";
import type { AppRole } from "./pills";
import { ROLE_STYLES } from "./pills";

export type InvitePayload = {
  email: string;
  role: AppRole;

  first_name?: string;
  last_name?: string;
  phone?: string;

  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
};

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());
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

export default function UserDetailsDrawer(props: {
  open: boolean;
  title?: string;
  subtitle?: string;
  initial?: Partial<InvitePayload>;
  busy?: boolean;
  sent?: boolean;
  onClose: () => void;
  onSend: (payload: InvitePayload) => Promise<void> | void;
}) {
  const { open, onClose } = props;

  const [email, setEmail] = React.useState(props.initial?.email ?? "");
  const [role, setRole] = React.useState<AppRole>((props.initial?.role as AppRole) ?? "contractor");

  const [firstName, setFirstName] = React.useState(props.initial?.first_name ?? "");
  const [lastName, setLastName] = React.useState(props.initial?.last_name ?? "");
  const [phone, setPhone] = React.useState(props.initial?.phone ?? "");

  const [address1, setAddress1] = React.useState(props.initial?.address1 ?? "");
  const [address2, setAddress2] = React.useState(props.initial?.address2 ?? "");
  const [city, setCity] = React.useState(props.initial?.city ?? "");
  const [state, setState] = React.useState(props.initial?.state ?? "OR");
  const [zip, setZip] = React.useState(props.initial?.zip ?? "");

  React.useEffect(() => {
    if (!open) return;
    setEmail(props.initial?.email ?? "");
    setRole(((props.initial?.role as AppRole) ?? "contractor") as AppRole);

    setFirstName(props.initial?.first_name ?? "");
    setLastName(props.initial?.last_name ?? "");
    setPhone(props.initial?.phone ?? "");

    setAddress1(props.initial?.address1 ?? "");
    setAddress2(props.initial?.address2 ?? "");
    setCity(props.initial?.city ?? "");
    setState(props.initial?.state ?? "OR");
    setZip(props.initial?.zip ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const emailOk = isValidEmail(email);
  const canSend = emailOk && !props.busy;

  if (!open) return null;

  const roleTone = ROLE_STYLES[role];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSend || props.sent) return;

    await props.onSend({
      email: email.trim().toLowerCase(),
      role,
      first_name: firstName || undefined,
      last_name: lastName || undefined,
      phone: phone || undefined,
      address1: address1 || undefined,
      address2: address2 || undefined,
      city: city || undefined,
      state: state || undefined,
      zip: zip || undefined,
    });
  }

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
          maxWidth: 420,
          display: "flex",
          flexDirection: "column",
          background: "#0f172a",
          borderLeft: "1px solid #334155",
          boxShadow: "0 30px 80px rgba(0,0,0,0.50)",
        }}
      >
        {/* header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", borderBottom: "1px solid #334155", padding: "16px 20px" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>
              {props.title ?? "Add user"}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>
              {props.subtitle ?? "Invite a user and assign their role."}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="admin-btn-secondary"
            style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12 }}
          >
            Close
          </button>
        </div>

        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          {/* scrollable body */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Email */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Email
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                autoComplete="email"
                style={{ ...INPUT_STYLE, marginTop: 6 }}
              />
            </div>

            {/* Role */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Role
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
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

                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "4px 10px",
                    borderRadius: 9999,
                    fontSize: 11,
                    fontWeight: 700,
                    background: roleTone.bg,
                    color: roleTone.tx,
                    border: `1px solid ${roleTone.bd}`,
                    whiteSpace: "nowrap",
                  }}
                >
                  {role}
                </span>
              </div>
            </div>

            {/* Name */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  First name
                </label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First"
                  autoComplete="given-name"
                  style={{ ...INPUT_STYLE, marginTop: 6 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Last name
                </label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last"
                  autoComplete="family-name"
                  style={{ ...INPUT_STYLE, marginTop: 6 }}
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Phone
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 555-5555"
                autoComplete="tel"
                style={{ ...INPUT_STYLE, marginTop: 6 }}
              />
            </div>

            {/* Address */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Address
              </label>
              <input
                value={address1}
                onChange={(e) => setAddress1(e.target.value)}
                placeholder="Street address"
                autoComplete="address-line1"
                style={INPUT_STYLE}
              />
              <input
                value={address2}
                onChange={(e) => setAddress2(e.target.value)}
                placeholder="Apt / suite (optional)"
                autoComplete="address-line2"
                style={INPUT_STYLE}
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>City</label>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                    autoComplete="address-level2"
                    style={{ ...INPUT_STYLE, marginTop: 4 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>State</label>
                  <input
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="OR"
                    autoComplete="address-level1"
                    style={{ ...INPUT_STYLE, marginTop: 4 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>ZIP</label>
                <input
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="97123"
                  autoComplete="postal-code"
                  style={{ ...INPUT_STYLE, marginTop: 4 }}
                />
              </div>
            </div>
          </div>

          {/* sticky footer */}
          <div style={{ borderTop: "1px solid #334155", padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <button
                type="button"
                onClick={onClose}
                className="admin-btn-secondary"
                style={{ padding: "10px 16px", borderRadius: 10, fontSize: 13 }}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={!canSend || props.sent}
                className="admin-btn-primary"
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  fontSize: 13,
                  opacity: (!canSend || props.sent) ? 0.5 : 1,
                  background: props.sent ? "#059669" : undefined,
                }}
                title={!emailOk ? "Enter a valid email" : props.sent ? "Invite sent" : "Send invite"}
              >
                {props.sent ? "Invite sent" : props.busy ? "Sending\u2026" : "Send invite"}
              </button>
            </div>

            <div style={{ marginTop: 8, fontSize: 11, fontWeight: 600, color: "#64748b" }}>
              {props.sent ? "Invite created." : !emailOk ? "Enter a valid email to send." : "Ready to send."}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
