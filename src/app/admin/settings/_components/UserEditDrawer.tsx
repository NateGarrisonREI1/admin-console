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
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

const SAVE_BTN =
  "rounded-2xl bg-emerald-100 px-4 py-2.5 text-sm font-extrabold text-emerald-700 transition hover:bg-emerald-200 disabled:opacity-50";

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
    <div className="fixed inset-0 z-[99990]">
      {/* overlay */}
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/20" />

      {/* drawer */}
      <div className="absolute right-0 top-0 flex h-full w-full max-w-[460px] flex-col bg-white shadow-2xl">
        {/* header */}
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <div className="text-sm font-black text-slate-900">User</div>
            <div className="truncate text-xs font-semibold text-slate-500">{row.email}</div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        {/* body */}
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {props.toast ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">
              {props.toast}
            </div>
          ) : null}

          {/* Summary */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-black uppercase tracking-wide text-slate-500">Account</div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <RolePill role={row.role} />
                  <StatusPill status={computedStatus} />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => props.onCopyEmail(row.email)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-700 hover:bg-slate-50"
                >
                  Copy email
                </button>
                <button
                  type="button"
                  onClick={() => props.onCopyId(row.user_id)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-700 hover:bg-slate-50"
                >
                  Copy ID
                </button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold text-slate-600">
              <div>
                <div className="text-[11px] font-black uppercase tracking-wide text-slate-400">Created</div>
                <div>{fmtDate(row.created_at)}</div>
              </div>
              <div>
                <div className="text-[11px] font-black uppercase tracking-wide text-slate-400">Last sign in</div>
                <div>{fmtDate(row.last_sign_in_at)}</div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={props.busy}
                onClick={() => props.onCopyPasswordLink(row.email)}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
              >
                Copy password link
              </button>
              <button
                type="button"
                disabled={props.busy}
                onClick={() => props.onCopyMagicLink(row.email)}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
              >
                Copy magic link
              </button>

              <button
                type="button"
                disabled={props.busy}
                onClick={() => {
                  const next: UserStatus = isDisabled ? "active" : "disabled";
                  props.onSetStatus({ userId: row.user_id, status: next });
                  setStatusSel(next);
                }}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
              >
                {isDisabled ? "Enable" : "Disable"}
              </button>
            </div>
          </div>

          {/* Role + Status */}
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
            <div>
              <div className="text-xs font-black uppercase tracking-wide text-slate-500">Role</div>
              <div className="mt-2 flex items-center gap-2">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as AppRole)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200"
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
                  className={SAVE_BTN}
                  onClick={() => props.onSetRole({ userId: row.user_id, role })}
                >
                  Save
                </button>
              </div>
            </div>

            <div>
              <div className="text-xs font-black uppercase tracking-wide text-slate-500">Status</div>
              <div className="mt-2 flex items-center gap-2">
                <select
                  value={statusSel}
                  onChange={(e) => setStatusSel(e.target.value as UserStatus)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200"
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="disabled">Disabled</option>
                </select>

                <button
                  type="button"
                  disabled={props.busy}
                  className={SAVE_BTN}
                  onClick={() => props.onSetStatus({ userId: row.user_id, status: statusSel })}
                >
                  Save
                </button>
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-500">
                Pending = invited / hasn’t logged in yet.
              </div>
            </div>
          </div>

          {/* Profile */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-black uppercase tracking-wide text-slate-500">Profile</div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <div className="text-[11px] font-black uppercase tracking-wide text-slate-400">First name</div>
                <input
                  value={first}
                  onChange={(e) => setFirst(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200"
                />
              </div>
              <div>
                <div className="text-[11px] font-black uppercase tracking-wide text-slate-400">Last name</div>
                <input
                  value={last}
                  onChange={(e) => setLast(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div className="col-span-2">
                <div className="text-[11px] font-black uppercase tracking-wide text-slate-400">Phone</div>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div className="col-span-2">
                <div className="text-[11px] font-black uppercase tracking-wide text-slate-400">Address 1</div>
                <input
                  value={a1}
                  onChange={(e) => setA1(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div className="col-span-2">
                <div className="text-[11px] font-black uppercase tracking-wide text-slate-400">Address 2</div>
                <input
                  value={a2}
                  onChange={(e) => setA2(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div>
                <div className="text-[11px] font-black uppercase tracking-wide text-slate-400">City</div>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div>
                <div className="text-[11px] font-black uppercase tracking-wide text-slate-400">State</div>
                <input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div className="col-span-2">
                <div className="text-[11px] font-black uppercase tracking-wide text-slate-400">ZIP</div>
                <input
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                disabled={props.busy}
                className={SAVE_BTN}
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
        <div className="border-t border-slate-100 px-5 py-4">
          <div className="text-[11px] font-bold text-slate-500">
            Tip: Use “Copy password link” for invited users.
          </div>
        </div>
      </div>
    </div>
  );
}
