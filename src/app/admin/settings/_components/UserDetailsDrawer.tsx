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
    // reset state when opening (keeps it clean if you open/close multiple times)
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
  const sendClass = props.sent ? "bg-emerald-600" : canSend ? "bg-sky-600 hover:bg-sky-700" : "bg-slate-300";

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
    <div className="fixed inset-0 z-[99990]">
      {/* overlay */}
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/20" />

      {/* drawer */}
      <div className="absolute right-0 top-0 flex h-full w-full max-w-[420px] flex-col bg-white shadow-2xl">
        {/* header */}
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <div className="text-sm font-black text-slate-900">{props.title ?? "Add user"}</div>
            <div className="text-xs font-semibold text-slate-500">
              {props.subtitle ?? "Invite a user and assign their role."}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex h-full flex-1 flex-col">
          {/* scrollable body */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="space-y-4">
              {/* Email */}
              <div>
                <label className="text-xs font-extrabold text-slate-600">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  autoComplete="email"
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-200"
                />
              </div>

              {/* Role (dropdown) */}
              <div>
                <label className="text-xs font-extrabold text-slate-600">Role</label>

                <div className="mt-1 flex items-center gap-2">
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as AppRole)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-200"
                  >
                    <option value="admin">Admin</option>
                    <option value="broker">Broker</option>
                    <option value="contractor">Contractor</option>
                    <option value="homeowner">Homeowner</option>
                    <option value="affiliate">Affiliate</option>
                  </select>

                  {/* small visual cue */}
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-black ${roleTone.bg} ${roleTone.text}`}>
                    {role}
                  </span>
                </div>
              </div>

              {/* Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-extrabold text-slate-600">First name</label>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First"
                    autoComplete="given-name"
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-200"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-600">Last name</label>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last"
                    autoComplete="family-name"
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-200"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="text-xs font-extrabold text-slate-600">Phone</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 555-5555"
                  autoComplete="tel"
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-200"
                />
              </div>

              {/* Address */}
              <div>
                <label className="text-xs font-extrabold text-slate-600">Address</label>
                <input
                  value={address1}
                  onChange={(e) => setAddress1(e.target.value)}
                  placeholder="Street address"
                  autoComplete="address-line1"
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-200"
                />
                <input
                  value={address2}
                  onChange={(e) => setAddress2(e.target.value)}
                  placeholder="Apt / suite (optional)"
                  autoComplete="address-line2"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-200"
                />

                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-extrabold text-slate-600">City</label>
                    <input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="City"
                      autoComplete="address-level2"
                      className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-200"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-slate-600">State</label>
                    <input
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="OR"
                      autoComplete="address-level1"
                      className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-200"
                    />
                  </div>
                </div>

                <div className="mt-2">
                  <label className="text-xs font-extrabold text-slate-600">ZIP</label>
                  <input
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    placeholder="97123"
                    autoComplete="postal-code"
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-200"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* sticky footer */}
          <div className="border-t border-slate-100 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={!canSend || props.sent}
                className={[
                  "rounded-2xl px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition",
                  sendClass,
                  props.busy ? "opacity-80" : "",
                ].join(" ")}
                title={!emailOk ? "Enter a valid email" : props.sent ? "Invite sent" : "Send invite"}
              >
                {props.sent ? "Invite sent" : props.busy ? "Sending…" : "Send invite"}
              </button>
            </div>

            <div className="mt-2 text-[11px] font-semibold text-slate-500">
              {props.sent ? "Invite created." : !emailOk ? "Enter a valid email to send." : "Ready to send."}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
