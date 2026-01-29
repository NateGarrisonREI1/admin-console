// src/app/admin/settings/_components/AdminUsersTable.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";


import {
  inviteUser,
  setUserRole,
  adminSetUserStatus,
  adminCreatePasswordLink,
  adminCreateMagicLink,
  adminUpdateUserProfile,
} from "../_actions/users";

import UserDetailsDrawer, { type InvitePayload } from "./UserDetailsDrawer";
import UserEditDrawer, { type UserRow } from "./UserEditDrawer";
import { RolePill, StatusPill, type AppRole, type UserStatus } from "./pills";

type Row = {
  user_id: string;
  email: string;

  role: AppRole;

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

  status?: UserStatus | null;
};

function fmtDate(v: string | null | undefined) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function computeStatus(r: Row): UserStatus {
  if (r.status === "active" || r.status === "pending" || r.status === "disabled") return r.status;
  return r.last_sign_in_at ? "active" : "pending";
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

export default function AdminUsersTable(props: {
  rows: Row[];
  title?: string;
  subtitle?: string;
  defaultRole?: string;
  revalidatePath?: string;
}) {
  const title = props.title ?? "Users (All)";
  const subtitle = props.subtitle ?? "Invite users, assign roles, and filter by account type.";
  const revalidate = props.revalidatePath ?? "/admin/settings/users";
  const router = useRouter()

  const [q, setQ] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<AppRole | "all">("all");

  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [inviteBusy, setInviteBusy] = React.useState(false);
  const [inviteSent, setInviteSent] = React.useState(false);

  const [editOpen, setEditOpen] = React.useState(false);
  const [editRow, setEditRow] = React.useState<UserRow | null>(null);
  const [busy, setBusy] = React.useState(false);

  const [toast, setToast] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    const base = Array.isArray(props.rows) ? props.rows : [];

    return base.filter((r) => {
      const matchesQ =
        !query ||
        r.email.toLowerCase().includes(query) ||
        r.user_id.toLowerCase().includes(query) ||
        r.role.toLowerCase().includes(query);

      const matchesRole = roleFilter === "all" ? true : r.role === roleFilter;
      return matchesQ && matchesRole;
    });
  }, [props.rows, q, roleFilter]);

  async function onSendInvite(payload: InvitePayload) {
    setInviteBusy(true);
    setInviteSent(false);
    setToast(null);

    try {
      await inviteUser({
        email: payload.email,
        role: payload.role,
        revalidate,
        first_name: payload.first_name ?? null,
        last_name: payload.last_name ?? null,
        phone: payload.phone ?? null,
        address1: payload.address1 ?? null,
        address2: payload.address2 ?? null,
        city: payload.city ?? null,
        state: payload.state ?? null,
        zip: payload.zip ?? null,
      } as any);

      setInviteSent(true);
      setToast("Invite created.");
      setTimeout(() => setToast(null), 1500);
      router.refresh();
    } finally {
      setInviteBusy(false);
    }
  }

  function openEdit(r: Row) {
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
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xl font-black text-slate-900">{title}</div>
          <div className="text-sm font-semibold text-slate-500">{subtitle}</div>
        </div>

        <button
          type="button"
          onClick={() => {
            setInviteSent(false);
            setDrawerOpen(true);
          }}
          className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-extrabold text-white shadow-sm transition hover:bg-slate-800"
        >
          + Add user
        </button>
      </div>

      {/* Search + filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[280px] flex-1">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search email, id, role…"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-200"
          />
        </div>

        <div className="min-w-[220px]">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-200"
          >
            <option value="all">All roles</option>
            <option value="admin">Admin</option>
            <option value="broker">Broker</option>
            <option value="contractor">Contractor</option>
            <option value="homeowner">Homeowner</option>
            <option value="affiliate">Affiliate</option>
          </select>
        </div>
      </div>

      {toast ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">
          {toast}
        </div>
      ) : null}

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3 text-sm font-extrabold text-slate-700">
          {filtered.length} {filtered.length === 1 ? "user" : "users"}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[11px] font-black uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Last sign in</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((r) => {
                const status = computeStatus(r);

                return (
                  <tr
                    key={r.user_id}
                    className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60"
                  >
                    <td className="px-4 py-3">
                      <div className="text-sm font-extrabold text-slate-900">{r.email}</div>
                      <div className="text-xs font-semibold text-slate-400">{r.user_id}</div>
                    </td>

                    <td className="px-4 py-3">
                      <RolePill role={r.role} />
                    </td>

                    <td className="px-4 py-3">
                      <StatusPill status={status} />
                    </td>

                    <td className="px-4 py-3 text-sm font-semibold text-slate-700">{fmtDate(r.created_at)}</td>

                    <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                      {fmtDate(r.last_sign_in_at)}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(r)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                        aria-label="Open user"
                        title="Open user"
                      >
                        <span className="text-lg leading-none">⋯</span>
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm font-semibold text-slate-500">
                    No users found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add user drawer */}
      <UserDetailsDrawer
        open={drawerOpen}
        busy={inviteBusy}
        sent={inviteSent}
        onClose={() => setDrawerOpen(false)}
        onSend={onSendInvite}
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
              postal_code: (input.zip ?? null) as any,
              revalidate,
            });
          });
          setToast("Profile saved.");
          setTimeout(() => setToast(null), 1500);
          router.refresh();
        }}
        onSetRole={async ({ userId, role }) => {
          await withBusy(async () => {
            await setUserRole({ userId, role, revalidate });
          });
          setToast("Role updated.");
          setTimeout(() => setToast(null), 1500);
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
          setToast("Status updated.");
          setTimeout(() => setToast(null), 1500);
          router.refresh();
        }}
        onCopyEmail={async (email) => {
          const ok = await copyToClipboard(email);
          setToast(ok ? "Email copied." : "Copy failed.");
          setTimeout(() => setToast(null), 1500);
        }}
        onCopyId={async (id) => {
          const ok = await copyToClipboard(id);
          setToast(ok ? "User ID copied." : "Copy failed.");
          setTimeout(() => setToast(null), 1500);
        }}
        onCopyPasswordLink={async (email) => {
          await withBusy(async () => {
            const res = await adminCreatePasswordLink({ email });
            const ok = await copyToClipboard(res.actionLink);
            setToast(ok ? "Password link copied." : "Link created (copy failed).");
            setTimeout(() => setToast(null), 1800);
          });
        }}
        onCopyMagicLink={async (email) => {
          await withBusy(async () => {
            const res = await adminCreateMagicLink({ email });
            const ok = await copyToClipboard(res.actionLink);
            setToast(ok ? "Magic link copied." : "Link created (copy failed).");
            setTimeout(() => setToast(null), 1800);
          });
        }}
      />
    </div>
  );
}
