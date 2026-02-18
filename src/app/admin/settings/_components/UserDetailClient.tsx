// src/app/admin/settings/_components/UserDetailClient.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  PencilSquareIcon,
  ClipboardDocumentIcon,
  LinkIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

import {
  adminSetUserStatus,
  adminUpdateUserProfile,
  adminCreatePasswordLink,
  adminCreateMagicLink,
  adminDeleteUser,
  setUserRole,
} from "../_actions/users";
import type { AdminUserDetail, AuditEvent, UserRelationshipDetail } from "../_actions/users";

import { RolePill, StatusPill, ROLE_STYLES, type AppRole, type UserStatus } from "./pills";
import UserRelationshipDiagram from "./UserRelationshipDiagram";
import UserAuditTrail from "./UserAuditTrail";

// ─── Design tokens ──────────────────────────────────────────────────
const CARD = "#1e293b";
const BORDER = "#334155";
const TEXT = "#f1f5f9";
const TEXT_SEC = "#cbd5e1";
const TEXT_DIM = "#64748b";
const TEXT_MUTED = "#94a3b8";
const EMERALD = "#10b981";

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: `1px solid ${BORDER}`,
  background: CARD,
  color: TEXT,
  fontSize: 13,
  fontWeight: 600,
  outline: "none",
};

// ─── Helpers ────────────────────────────────────────────────────────

function fmtDate(v: string | null | undefined) {
  if (!v) return "\u2014";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "\u2014";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function computeStatus(r: { status: UserStatus | null; last_sign_in_at: string | null }): UserStatus {
  if (r.status === "active" || r.status === "pending" || r.status === "disabled") return r.status;
  return r.last_sign_in_at ? "active" : "pending";
}

function userDisplayName(u: AdminUserDetail): string {
  if (u.full_name) return u.full_name;
  const parts = [u.first_name, u.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : u.email;
}

function userInitials(u: AdminUserDetail): string {
  const name = u.full_name || [u.first_name, u.last_name].filter(Boolean).join(" ");
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  return u.email.slice(0, 2).toUpperCase();
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      return true;
    } catch {
      return false;
    }
  }
}

// ─── Source labels ──────────────────────────────────────────────────
const SOURCE_LABELS: Record<string, string> = {
  rei_direct: "REI Direct",
  broker_campaign: "Broker Campaign",
  broker_invite: "Broker Invite",
  organic_website: "Organic",
  admin_created: "Admin Created",
};

// ─── Component ──────────────────────────────────────────────────────

type Props = {
  user: AdminUserDetail;
  auditEvents: AuditEvent[];
  relationships: UserRelationshipDetail[];
};

export default function UserDetailClient({ user, auditEvents, relationships }: Props) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const [editingProfile, setEditingProfile] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  // Profile form
  const [first, setFirst] = React.useState(user.first_name || "");
  const [last, setLast] = React.useState(user.last_name || "");
  const [phone, setPhone] = React.useState(user.phone || "");
  const [a1, setA1] = React.useState(user.address1 || "");
  const [a2, setA2] = React.useState(user.address2 || "");
  const [city, setCity] = React.useState(user.city || "");
  const [state, setState] = React.useState(user.state || "OR");
  const [zip, setZip] = React.useState(user.zip || "");

  // Role/status
  const [role, setRole] = React.useState<AppRole>(user.role);
  const [statusSel, setStatusSel] = React.useState<UserStatus>(computeStatus(user));

  const status = computeStatus(user);
  const displayName = userDisplayName(user);
  const initials = userInitials(user);
  const roleStyle = ROLE_STYLES[user.role];
  const revalidate = `/admin/settings/users/${user.user_id}`;

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function withBusy(fn: () => Promise<void>) {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Back button + page header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          type="button"
          onClick={() => router.push("/admin/settings/users")}
          style={{
            width: 36, height: 36, borderRadius: 10,
            border: `1px solid ${BORDER}`, background: "transparent",
            color: TEXT_SEC, display: "grid", placeItems: "center",
            cursor: "pointer", transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(148,163,184,0.06)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          <ArrowLeftIcon style={{ width: 16, height: 16 }} />
        </button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT, margin: 0 }}>User Detail</h1>
          <p style={{ fontSize: 13, color: TEXT_DIM, margin: "2px 0 0", fontWeight: 500 }}>{user.email}</p>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          borderRadius: 8, border: "1px solid rgba(16,185,129,0.25)", background: "rgba(16,185,129,0.08)",
          padding: "10px 16px", fontSize: 13, fontWeight: 600, color: EMERALD,
        }}>
          {toast}
        </div>
      )}

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, alignItems: "start" }}>
        {/* LEFT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* User header card */}
          <div style={{
            background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20,
            display: "flex", alignItems: "center", gap: 16,
          }}>
            {/* Avatar */}
            <div style={{
              width: 64, height: 64, borderRadius: "50%", flexShrink: 0,
              background: roleStyle?.bg || "rgba(148,163,184,0.12)",
              border: `2px solid ${roleStyle?.tx || TEXT_DIM}`,
              display: "grid", placeItems: "center",
              fontSize: 20, fontWeight: 800, color: roleStyle?.tx || TEXT_DIM,
            }}>
              {initials}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: TEXT }}>{displayName}</div>
              <div style={{ fontSize: 13, color: TEXT_MUTED, marginTop: 2 }}>{user.email}</div>
              <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                <RolePill role={user.role} />
                <StatusPill status={status} />
                {user.source && (
                  <span style={{
                    display: "inline-block", padding: "3px 8px", borderRadius: 6,
                    fontSize: 11, fontWeight: 600, background: "rgba(148,163,184,0.08)",
                    color: TEXT_MUTED, border: "1px solid rgba(148,163,184,0.15)",
                  }}>
                    {SOURCE_LABELS[user.source.source_type] || user.source.source_type}
                  </span>
                )}
              </div>
            </div>

            {/* Quick copy buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
              <SmallBtn onClick={async () => { const ok = await copyToClipboard(user.email); showToast(ok ? "Email copied." : "Copy failed."); }}>
                <ClipboardDocumentIcon style={{ width: 12, height: 12 }} /> Email
              </SmallBtn>
              <SmallBtn onClick={async () => { const ok = await copyToClipboard(user.user_id); showToast(ok ? "ID copied." : "Copy failed."); }}>
                <ClipboardDocumentIcon style={{ width: 12, height: 12 }} /> ID
              </SmallBtn>
            </div>
          </div>

          {/* Account details */}
          <div style={{
            background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Account Details
              </div>
            </div>

            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, fontSize: 12, color: TEXT_SEC }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.05em" }}>Created</div>
                <div style={{ marginTop: 4 }}>{fmtDate(user.created_at)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.05em" }}>Last Sign In</div>
                <div style={{ marginTop: 4 }}>{fmtDate(user.last_sign_in_at)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.05em" }}>Staff Type</div>
                <div style={{ marginTop: 4 }}>{user.staff_type || "\u2014"}</div>
              </div>
            </div>
          </div>

          {/* Editable profile card */}
          <div style={{
            background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Profile
              </div>
              {!editingProfile && (
                <SmallBtn onClick={() => setEditingProfile(true)}>
                  <PencilSquareIcon style={{ width: 12, height: 12 }} /> Edit
                </SmallBtn>
              )}
            </div>

            {editingProfile ? (
              <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM }}>First name</div>
                  <input value={first} onChange={(e) => setFirst(e.target.value)} style={{ ...INPUT_STYLE, marginTop: 4 }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM }}>Last name</div>
                  <input value={last} onChange={(e) => setLast(e.target.value)} style={{ ...INPUT_STYLE, marginTop: 4 }} />
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM }}>Phone</div>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} style={{ ...INPUT_STYLE, marginTop: 4 }} />
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM }}>Address</div>
                  <input value={a1} onChange={(e) => setA1(e.target.value)} placeholder="Address line 1" style={{ ...INPUT_STYLE, marginTop: 4 }} />
                  <input value={a2} onChange={(e) => setA2(e.target.value)} placeholder="Address line 2" style={{ ...INPUT_STYLE, marginTop: 6 }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM }}>City</div>
                  <input value={city} onChange={(e) => setCity(e.target.value)} style={{ ...INPUT_STYLE, marginTop: 4 }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM }}>State</div>
                    <input value={state} onChange={(e) => setState(e.target.value)} style={{ ...INPUT_STYLE, marginTop: 4 }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM }}>ZIP</div>
                    <input value={zip} onChange={(e) => setZip(e.target.value)} style={{ ...INPUT_STYLE, marginTop: 4 }} />
                  </div>
                </div>
                <div style={{ gridColumn: "span 2", display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
                  <button type="button" onClick={() => setEditingProfile(false)}
                    className="admin-btn-secondary" style={{ padding: "8px 14px", borderRadius: 8, fontSize: 12 }}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className="admin-btn-primary"
                    style={{ padding: "8px 14px", borderRadius: 8, fontSize: 12, opacity: busy ? 0.5 : 1 }}
                    onClick={async () => {
                      await withBusy(async () => {
                        await adminUpdateUserProfile({
                          userId: user.user_id, first_name: first, last_name: last,
                          phone, address1: a1, address2: a2, city, state,
                          postal_code: zip, revalidate,
                        });
                      });
                      setEditingProfile(false);
                      showToast("Profile saved.");
                      router.refresh();
                    }}
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 12, color: TEXT_SEC }}>
                <InfoField label="First Name" value={user.first_name} />
                <InfoField label="Last Name" value={user.last_name} />
                <InfoField label="Phone" value={user.phone} span2 />
                <InfoField label="Address" value={[user.address1, user.address2].filter(Boolean).join(", ") || null} span2 />
                <InfoField label="City" value={user.city} />
                <InfoField label="State / ZIP" value={[user.state, user.zip].filter(Boolean).join(" ") || null} />
              </div>
            )}
          </div>

          {/* Role + Status card */}
          <div style={{
            background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20,
            display: "flex", flexDirection: "column", gap: 16,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Role & Status
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, marginBottom: 6 }}>Role</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <select value={role} onChange={(e) => setRole(e.target.value as AppRole)} className="admin-select">
                    <option value="admin">Admin</option>
                    <option value="rei_staff">REI Staff</option>
                    <option value="broker">Broker</option>
                    <option value="contractor">Contractor</option>
                    <option value="affiliate">Affiliate</option>
                    <option value="homeowner">Homeowner</option>
                  </select>
                  <button
                    type="button" disabled={busy || role === user.role}
                    className="admin-btn-primary"
                    style={{ padding: "8px 14px", borderRadius: 8, fontSize: 12, whiteSpace: "nowrap", opacity: (busy || role === user.role) ? 0.5 : 1 }}
                    onClick={async () => {
                      await withBusy(async () => {
                        await setUserRole({ userId: user.user_id, role, revalidate });
                      });
                      showToast("Role updated.");
                      router.refresh();
                    }}
                  >
                    Save
                  </button>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, marginBottom: 6 }}>Status</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <select value={statusSel} onChange={(e) => setStatusSel(e.target.value as UserStatus)} className="admin-select">
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="disabled">Disabled</option>
                  </select>
                  <button
                    type="button" disabled={busy || statusSel === status}
                    className="admin-btn-primary"
                    style={{ padding: "8px 14px", borderRadius: 8, fontSize: 12, whiteSpace: "nowrap", opacity: (busy || statusSel === status) ? 0.5 : 1 }}
                    onClick={async () => {
                      if (statusSel === "disabled") {
                        const ok = window.confirm("Disable this user? They will be blocked from using the app.");
                        if (!ok) return;
                      }
                      await withBusy(async () => {
                        await adminSetUserStatus({ userId: user.user_id, status: statusSel, revalidate });
                      });
                      showToast("Status updated.");
                      router.refresh();
                    }}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Audit trail */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
              Activity
            </div>
            <UserAuditTrail events={auditEvents} />
          </div>

          {/* Danger zone */}
          <div style={{
            background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 12, padding: 20,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#f87171", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Danger Zone
            </div>

            {confirmDelete ? (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#f87171", marginBottom: 10 }}>
                  Permanently delete this user? This removes all auth data, profile, relationships, and sources. This cannot be undone.
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" onClick={() => setConfirmDelete(false)}
                    className="admin-btn-secondary" style={{ padding: "8px 14px", borderRadius: 8, fontSize: 12 }}>
                    Cancel
                  </button>
                  <button
                    type="button" disabled={busy}
                    className="admin-btn-danger"
                    style={{ padding: "8px 14px", borderRadius: 8, fontSize: 12, opacity: busy ? 0.5 : 1 }}
                    onClick={async () => {
                      await withBusy(async () => {
                        await adminDeleteUser({ userId: user.user_id, revalidate: "/admin/settings/users" });
                      });
                      showToast("User deleted.");
                      router.push("/admin/settings/users");
                    }}
                  >
                    <TrashIcon style={{ width: 14, height: 14 }} /> Delete User
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 12, color: TEXT_MUTED }}>
                  Delete this user permanently from the system.
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  style={{
                    padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                    border: "1px solid rgba(239,68,68,0.3)", background: "transparent",
                    color: "#f87171", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <TrashIcon style={{ width: 14, height: 14 }} /> Delete User
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Quick actions */}
          <div style={{
            background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
              Quick Actions
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <ActionButton
                disabled={busy}
                onClick={async () => {
                  await withBusy(async () => {
                    const res = await adminCreatePasswordLink({ email: user.email });
                    const ok = await copyToClipboard(res.actionLink);
                    showToast(ok ? "Password link copied." : "Link created (copy failed).");
                  });
                }}
              >
                <LinkIcon style={{ width: 14, height: 14 }} /> Copy Password Link
              </ActionButton>
              <ActionButton
                disabled={busy}
                onClick={async () => {
                  await withBusy(async () => {
                    const res = await adminCreateMagicLink({ email: user.email });
                    const ok = await copyToClipboard(res.actionLink);
                    showToast(ok ? "Magic link copied." : "Link created (copy failed).");
                  });
                }}
              >
                <LinkIcon style={{ width: 14, height: 14 }} /> Copy Magic Link
              </ActionButton>
              <ActionButton
                disabled={busy}
                onClick={async () => {
                  const ok = await copyToClipboard(user.email);
                  showToast(ok ? "Email copied." : "Copy failed.");
                }}
              >
                <ClipboardDocumentIcon style={{ width: 14, height: 14 }} /> Copy Email
              </ActionButton>
              <ActionButton
                disabled={busy}
                onClick={async () => {
                  const ok = await copyToClipboard(user.user_id);
                  showToast(ok ? "User ID copied." : "Copy failed.");
                }}
              >
                <ClipboardDocumentIcon style={{ width: 14, height: 14 }} /> Copy User ID
              </ActionButton>
            </div>
          </div>

          {/* Relationships diagram */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
              Relationships
            </div>
            <UserRelationshipDiagram
              userId={user.user_id}
              userName={userDisplayName(user)}
              userEmail={user.email}
              userRole={user.role}
              relationships={relationships}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Small helpers ──────────────────────────────────────────────────

function InfoField({ label, value, span2 }: { label: string; value: string | null | undefined; span2?: boolean }) {
  return (
    <div style={span2 ? { gridColumn: "span 2" } : undefined}>
      <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{ marginTop: 4, color: value ? TEXT_SEC : TEXT_DIM }}>
        {value || "\u2014"}
      </div>
    </div>
  );
}

function SmallBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="admin-btn-secondary"
      style={{
        padding: "5px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700,
        display: "flex", alignItems: "center", gap: 4,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

function ActionButton({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        width: "100%", padding: "10px 14px", borderRadius: 8,
        border: `1px solid ${BORDER}`, background: "transparent",
        color: TEXT_SEC, fontSize: 12, fontWeight: 600,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
        display: "flex", alignItems: "center", gap: 8,
        transition: "all 0.15s ease",
        textAlign: "left",
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = "rgba(148,163,184,0.06)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      {children}
    </button>
  );
}
