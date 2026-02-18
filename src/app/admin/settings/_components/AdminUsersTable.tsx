// src/app/admin/settings/_components/AdminUsersTable.tsx
"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  UserPlusIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  TrashIcon,
  NoSymbolIcon,
  CheckCircleIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";

import {
  setUserRole,
  adminSetUserStatus,
  adminCreatePasswordLink,
  adminCreateMagicLink,
  adminUpdateUserProfile,
  adminDeleteUser,
  resendInvite,
} from "../_actions/users";
import type { AdminUserRow, AdminListUsersResult } from "../_actions/users";

import AddUserModal from "./AddUserModal";
import UserEditDrawer, { type UserRow } from "./UserEditDrawer";
import { RolePill, StatusPill, type AppRole, type UserStatus } from "./pills";

// ─── Design tokens ──────────────────────────────────────────────────
const CARD = "#1e293b";
const BORDER = "#334155";
const TEXT = "#f1f5f9";
const TEXT_SEC = "#cbd5e1";
const TEXT_MUTED = "#94a3b8";
const TEXT_DIM = "#64748b";
const EMERALD = "#10b981";

// ─── Source labels ──────────────────────────────────────────────────
const SOURCE_LABELS: Record<string, string> = {
  rei_direct: "REI Direct",
  broker_campaign: "Broker Campaign",
  broker_invite: "Broker Invite",
  organic_website: "Organic",
  admin_created: "Admin Created",
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

function userName(r: AdminUserRow): string | null {
  if (r.full_name) return r.full_name;
  const parts = [r.first_name, r.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

function relatedToText(r: AdminUserRow): string {
  switch (r.role) {
    case "admin":
      return "\u2014";
    case "rei_staff":
      return r.staff_type || "Staff";
    case "broker": {
      const networkCount = r.relationships.filter((rel) => rel.relationship_type === "in_broker_network").length;
      return networkCount > 0 ? `Network: ${networkCount} users` : "\u2014";
    }
    case "contractor":
    case "affiliate": {
      const broker = r.relationships.find((rel) => rel.relationship_type === "in_broker_network");
      if (broker) return `In network: ${broker.related_name || broker.related_email || "Broker"}`;
      return "\u2014";
    }
    case "homeowner": {
      if (r.source) {
        if (r.source.source_type === "broker_campaign") return "From campaign";
        if (r.source.source_type === "broker_invite") return "Broker invite";
        if (r.source.source_type === "rei_direct") return "REI Direct";
        if (r.source.source_type === "admin_created") return "Admin created";
      }
      return "Organic";
    }
    default:
      return "\u2014";
  }
}

async function copyToClipboard(text: string) {
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

function exportCsv(rows: AdminUserRow[]) {
  const headers = ["Email", "Name", "Role", "Status", "Source", "Related To", "Created", "Last Sign In"];
  const lines = rows.map((r) => [
    r.email,
    userName(r) || "",
    r.role,
    computeStatus(r),
    r.source ? (SOURCE_LABELS[r.source.source_type] || r.source.source_type) : "Organic",
    relatedToText(r),
    r.created_at || "",
    r.last_sign_in_at || "",
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));

  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `users-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Stat Card ──────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div
      style={{
        background: CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        padding: "14px 16px",
      }}
    >
      <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color, marginTop: 4 }}>
        {value}
      </div>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────

export default function AdminUsersTable(props: {
  data: AdminListUsersResult;
  revalidatePath?: string;
}) {
  const { data } = props;
  const { rows, stats, page, totalPages, total } = data;
  const revalidate = props.revalidatePath ?? "/admin/settings/users";
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filter state (synced with URL)
  const [roleFilter, setRoleFilter] = React.useState(searchParams.get("role") || "all");
  const [statusFilter, setStatusFilter] = React.useState(searchParams.get("status") || "all");
  const [sourceFilter, setSourceFilter] = React.useState(searchParams.get("source") || "all");
  const [search, setSearch] = React.useState(searchParams.get("q") || "");

  const [addModalOpen, setAddModalOpen] = React.useState(false);

  const [editOpen, setEditOpen] = React.useState(false);
  const [editRow, setEditRow] = React.useState<UserRow | null>(null);
  const [busy, setBusy] = React.useState(false);

  const [toast, setToast] = React.useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<string | null>(null);
  const [resendCooldowns, setResendCooldowns] = React.useState<Record<string, boolean>>({});

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleResendInvite(userId: string, email: string) {
    if (resendCooldowns[userId]) return;
    setResendCooldowns((prev) => ({ ...prev, [userId]: true }));
    try {
      const result = await resendInvite(userId);
      if (result.success) {
        showToast(`Invite resent to ${email}`);
      } else {
        showToast(`Failed: ${result.error || "Unknown error"}`);
      }
    } catch (e: unknown) {
      showToast(`Failed: ${e instanceof Error ? e.message : "Unknown error"}`);
    }
    setTimeout(() => {
      setResendCooldowns((prev) => ({ ...prev, [userId]: false }));
    }, 60000);
  }

  function pushFilters(overrides: Record<string, string>) {
    const params = new URLSearchParams();
    const vals = {
      role: roleFilter,
      status: statusFilter,
      source: sourceFilter,
      q: search,
      page: "1",
      ...overrides,
    };
    for (const [k, v] of Object.entries(vals)) {
      if (v && v !== "all" && v !== "1") params.set(k, v);
    }
    router.push(`/admin/settings/users?${params.toString()}`);
  }

  function goPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (p > 1) params.set("page", String(p));
    else params.delete("page");
    router.push(`/admin/settings/users?${params.toString()}`);
  }

  function openEdit(r: AdminUserRow) {
    setEditRow({
      user_id: r.user_id,
      email: r.email,
      role: r.role,
      status: r.status ?? null,
      created_at: r.created_at,
      last_sign_in_at: r.last_sign_in_at,
      first_name: r.first_name ?? null,
      last_name: r.last_name ?? null,
      phone: r.phone ?? null,
      address1: r.address1 ?? null,
      address2: r.address2 ?? null,
      city: r.city ?? null,
      state: r.state ?? null,
      zip: r.zip ?? null,
    });
    setEditOpen(true);
  }

  async function withBusy(fn: () => Promise<void>) {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  }

  async function handleDelete(userId: string) {
    try {
      await adminDeleteUser({ userId, revalidate });
      showToast("User deleted.");
      setConfirmDelete(null);
      router.refresh();
    } catch (e: unknown) {
      showToast(`Delete failed: ${e instanceof Error ? e.message : "Unknown error"}`);
    }
  }

  async function handleToggleStatus(r: AdminUserRow) {
    const current = computeStatus(r);
    const next: UserStatus = current === "disabled" ? "active" : "disabled";
    if (next === "disabled") {
      const ok = window.confirm("Disable this user? They will be blocked from using the app.");
      if (!ok) return;
    }
    await withBusy(async () => {
      await adminSetUserStatus({ userId: r.user_id, status: next, revalidate });
    });
    showToast(next === "disabled" ? "User disabled." : "User enabled.");
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT, margin: 0 }}>Users</h1>
          <p style={{ fontSize: 13, color: TEXT_DIM, margin: "4px 0 0", fontWeight: 500 }}>
            Manage users, assign roles, and track relationships.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => exportCsv(rows)}
            className="admin-btn-secondary"
            style={{ padding: "8px 14px", borderRadius: 10, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}
          >
            <ArrowDownTrayIcon style={{ width: 16, height: 16 }} />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="admin-btn-primary"
            style={{ padding: "8px 16px", borderRadius: 10, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}
          >
            <UserPlusIcon style={{ width: 16, height: 16 }} />
            Add User
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        <StatCard label="Total Users" value={stats.total} color={EMERALD} />
        <StatCard label="Active" value={stats.active} color="#10b981" />
        <StatCard label="Pending" value={stats.pending} color="#38bdf8" />
        <StatCard label="Disabled" value={stats.disabled} color="#f87171" />
        <StatCard label="Admins" value={stats.byRole.admin || 0} color="#10b981" />
        <StatCard label="Brokers" value={stats.byRole.broker || 0} color="#38bdf8" />
        <StatCard label="Contractors" value={stats.byRole.contractor || 0} color="#fbbf24" />
        <StatCard label="Homeowners" value={stats.byRole.homeowner || 0} color="#818cf8" />
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 220px", minWidth: 180 }}>
          <MagnifyingGlassIcon
            style={{ width: 16, height: 16, position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: TEXT_MUTED, pointerEvents: "none" }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && pushFilters({ q: search })}
            placeholder="Search email or name\u2026"
            className="admin-input"
            style={{ paddingLeft: 36 }}
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); pushFilters({ role: e.target.value }); }}
          className="admin-select"
          style={{ minWidth: 150, width: "auto", flex: "0 0 auto" }}
        >
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="rei_staff">REI Staff</option>
          <option value="broker">Broker</option>
          <option value="contractor">Contractor</option>
          <option value="affiliate">Affiliate</option>
          <option value="homeowner">Homeowner</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); pushFilters({ status: e.target.value }); }}
          className="admin-select"
          style={{ minWidth: 140, width: "auto", flex: "0 0 auto" }}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="disabled">Disabled</option>
        </select>

        <select
          value={sourceFilter}
          onChange={(e) => { setSourceFilter(e.target.value); pushFilters({ source: e.target.value }); }}
          className="admin-select"
          style={{ minWidth: 150, width: "auto", flex: "0 0 auto" }}
        >
          <option value="all">All Sources</option>
          <option value="rei_direct">REI Direct</option>
          <option value="broker_campaign">Broker Campaign</option>
          <option value="broker_invite">Broker Invite</option>
          <option value="organic_website">Organic</option>
          <option value="admin_created">Admin Created</option>
        </select>

        {(roleFilter !== "all" || statusFilter !== "all" || sourceFilter !== "all" || search) && (
          <button
            type="button"
            onClick={() => {
              setRoleFilter("all"); setStatusFilter("all"); setSourceFilter("all"); setSearch("");
              router.push("/admin/settings/users");
            }}
            style={{
              padding: "8px 14px", borderRadius: 8, border: `1px solid ${BORDER}`,
              background: "transparent", color: TEXT_MUTED, fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            Clear
          </button>
        )}
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

      {/* Delete confirmation */}
      {confirmDelete && (
        <div style={{
          borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)",
          padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#f87171" }}>
            Permanently delete this user? This cannot be undone.
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => setConfirmDelete(null)}
              className="admin-btn-secondary" style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12 }}>
              Cancel
            </button>
            <button type="button" onClick={() => handleDelete(confirmDelete)}
              className="admin-btn-danger" style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12 }}>
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{
          padding: "10px 16px", borderBottom: `1px solid ${BORDER}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: TEXT_MUTED }}>
            {total} {total === 1 ? "user" : "users"} found
          </span>
          {totalPages > 1 && (
            <span style={{ fontSize: 12, color: TEXT_DIM }}>
              Page {page} of {totalPages}
            </span>
          )}
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="admin-table" style={{ minWidth: 1100 }}>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Related To</th>
                <th>Status</th>
                <th>Source</th>
                <th>Created</th>
                <th>Last Sign In</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "40px 16px", textAlign: "center", color: TEXT_DIM, fontSize: 13 }}>
                    No users found.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const status = computeStatus(r);
                  const name = userName(r);
                  const source = r.source
                    ? (SOURCE_LABELS[r.source.source_type] || r.source.source_type)
                    : "Organic";
                  const related = relatedToText(r);

                  return (
                    <tr
                      key={r.user_id}
                      onClick={() => router.push(`/admin/settings/users/${r.user_id}`)}
                      style={{ cursor: "pointer", transition: "background 0.1s ease" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(148,163,184,0.04)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
                    >
                      {/* User (email + name stacked) */}
                      <td>
                        <div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{r.email}</div>
                        {name && (
                          <div style={{ fontSize: 12, fontWeight: 500, color: TEXT_MUTED, marginTop: 1 }}>{name}</div>
                        )}
                      </td>

                      {/* Role badge */}
                      <td><RolePill role={r.role} /></td>

                      {/* Related To */}
                      <td>
                        <div style={{ fontSize: 12, color: related === "\u2014" ? TEXT_DIM : TEXT_SEC, fontWeight: 500 }}>
                          {related}
                        </div>
                      </td>

                      {/* Status badge */}
                      <td><StatusPill status={status} /></td>

                      {/* Source */}
                      <td>
                        <span style={{
                          display: "inline-block", padding: "3px 8px", borderRadius: 6,
                          fontSize: 11, fontWeight: 600, background: "rgba(148,163,184,0.08)",
                          color: TEXT_MUTED, border: "1px solid rgba(148,163,184,0.15)",
                        }}>
                          {source}
                        </span>
                      </td>

                      {/* Created */}
                      <td style={{ fontSize: 12, color: TEXT_SEC, whiteSpace: "nowrap" }}>{fmtDate(r.created_at)}</td>

                      {/* Last Sign In */}
                      <td style={{ fontSize: 12, color: TEXT_SEC, whiteSpace: "nowrap" }}>{fmtDate(r.last_sign_in_at)}</td>

                      {/* Actions */}
                      <td onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 4 }}>
                          {status === "pending" && (
                            <ActionBtn
                              title={resendCooldowns[r.user_id] ? "Invite sent — wait 60s" : "Resend invite"}
                              onClick={() => handleResendInvite(r.user_id, r.email)}
                            >
                              <EnvelopeIcon style={{
                                width: 15, height: 15,
                                color: resendCooldowns[r.user_id] ? "#475569" : "#38bdf8",
                                opacity: resendCooldowns[r.user_id] ? 0.5 : 1,
                              }} />
                            </ActionBtn>
                          )}
                          <ActionBtn title="Edit user" onClick={() => openEdit(r)}>
                            <PencilSquareIcon style={{ width: 15, height: 15 }} />
                          </ActionBtn>
                          <ActionBtn
                            title={status === "disabled" ? "Enable user" : "Disable user"}
                            onClick={() => handleToggleStatus(r)}
                          >
                            {status === "disabled"
                              ? <CheckCircleIcon style={{ width: 15, height: 15, color: "#10b981" }} />
                              : <NoSymbolIcon style={{ width: 15, height: 15 }} />}
                          </ActionBtn>
                          <ActionBtn title="Delete user" onClick={() => setConfirmDelete(r.user_id)} danger>
                            <TrashIcon style={{ width: 15, height: 15 }} />
                          </ActionBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            padding: "12px 16px", borderTop: `1px solid ${BORDER}`,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontSize: 12, color: TEXT_DIM }}>
              Showing {(page - 1) * data.pageSize + 1}\u2013{Math.min(page * data.pageSize, total)} of {total}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <PaginationBtn disabled={page <= 1} onClick={() => goPage(page - 1)}>
                <ChevronLeftIcon style={{ width: 14, height: 14 }} />
                Prev
              </PaginationBtn>
              <PaginationBtn disabled={page >= totalPages} onClick={() => goPage(page + 1)}>
                Next
                <ChevronRightIcon style={{ width: 14, height: 14 }} />
              </PaginationBtn>
            </div>
          </div>
        )}
      </div>

      {/* Add user modal */}
      <AddUserModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={(msg) => { showToast(msg); router.refresh(); }}
      />

      {/* Edit user drawer */}
      <UserEditDrawer
        open={editOpen}
        row={editRow}
        busy={busy}
        toast={toast}
        onClose={() => setEditOpen(false)}
        onSaveProfile={async (input) => {
          if (!editRow) return;
          await withBusy(async () => {
            await adminUpdateUserProfile({
              userId: input.userId,
              first_name: input.first_name ?? null,
              last_name: input.last_name ?? null,
              phone: input.phone ?? null,
              address1: input.address1 ?? null,
              address2: input.address2 ?? null,
              city: input.city ?? null,
              state: input.state ?? null,
              postal_code: (input.zip ?? null) as string | null,
              revalidate,
            });
          });
          showToast("Profile saved.");
          router.refresh();
        }}
        onSetRole={async ({ userId, role }) => {
          await withBusy(async () => {
            await setUserRole({ userId, role, revalidate });
          });
          showToast("Role updated.");
          router.refresh();
        }}
        onSetStatus={async ({ userId, status }) => {
          if (status === "disabled") {
            const ok = window.confirm("Disable this user? They will be blocked from using the app.");
            if (!ok) return;
          }
          await withBusy(async () => {
            await adminSetUserStatus({ userId, status, revalidate });
          });
          showToast("Status updated.");
          router.refresh();
        }}
        onCopyEmail={async (email) => {
          const ok = await copyToClipboard(email);
          showToast(ok ? "Email copied." : "Copy failed.");
        }}
        onCopyId={async (id) => {
          const ok = await copyToClipboard(id);
          showToast(ok ? "User ID copied." : "Copy failed.");
        }}
        onCopyPasswordLink={async (email) => {
          await withBusy(async () => {
            const res = await adminCreatePasswordLink({ email });
            const ok = await copyToClipboard(res.actionLink);
            showToast(ok ? "Password link copied." : "Link created (copy failed).");
          });
        }}
        onCopyMagicLink={async (email) => {
          await withBusy(async () => {
            const res = await adminCreateMagicLink({ email });
            const ok = await copyToClipboard(res.actionLink);
            showToast(ok ? "Magic link copied." : "Link created (copy failed).");
          });
        }}
      />
    </div>
  );
}

// ─── Small UI helpers ───────────────────────────────────────────────

function ActionBtn({ children, title, onClick, danger }: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        width: 32, height: 32, borderRadius: 8,
        border: `1px solid ${danger ? "rgba(239,68,68,0.25)" : BORDER}`,
        background: "transparent",
        color: danger ? "#f87171" : TEXT_SEC,
        display: "grid", placeItems: "center",
        cursor: "pointer", transition: "all 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger ? "rgba(239,68,68,0.1)" : "rgba(148,163,184,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {children}
    </button>
  );
}

function PaginationBtn({ children, disabled, onClick }: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
        border: `1px solid ${BORDER}`, background: CARD, color: disabled ? TEXT_DIM : TEXT_SEC,
        cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1,
        display: "flex", alignItems: "center", gap: 4,
        transition: "all 0.15s ease",
      }}
    >
      {children}
    </button>
  );
}
