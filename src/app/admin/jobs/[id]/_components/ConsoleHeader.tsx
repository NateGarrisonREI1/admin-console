'use client';

import Link from 'next/link';
import { useState } from 'react';
import { prettyRequestKey, prettyResponseStatus } from '../_lib/workflow';
import {
  EllipsisVerticalIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  PencilSquareIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const REI_GREEN = '#43a419';

function taskChip(label: string) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
      {label}
    </span>
  );
}

function statusToneFor(value: string): 'neutral' | 'warn' | 'danger' | 'good' {
  if (value === 'blocked') return 'danger';
  if (value === 'needs_review' || value === 'waiting_on_broker') return 'warn';
  if (value === 'ready' || value === 'delivered') return 'good';
  return 'neutral';
}

function statusBadgeClass(tone: 'neutral' | 'warn' | 'danger' | 'good') {
  if (tone === 'danger') return 'border-red-200 bg-red-50 text-red-700';
  if (tone === 'warn') return 'border-amber-200 bg-amber-50 text-amber-800';
  if (tone === 'good') return 'border-green-200 bg-green-50 text-green-700';
  return 'border-slate-300 bg-white text-slate-800';
}

function statusBadge(label: string, tone: 'neutral' | 'warn' | 'danger' | 'good') {
  return (
    <span
      className={['inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold', statusBadgeClass(tone)].join(
        ' '
      )}
      style={{ whiteSpace: 'nowrap' }}
    >
      {label}
    </span>
  );
}

function mapsHref(address: string) {
  const q = encodeURIComponent(address);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function smsHref(phone: string, body: string) {
  const p = phone.replace(/[^\d+]/g, '');
  return `sms:${p}?&body=${encodeURIComponent(body)}`;
}

function fieldLabel(label: string) {
  return <label className="block text-xs font-bold text-slate-600 mb-1">{label}</label>;
}

function row(label: string, value: React.ReactNode) {
  return (
    <div className="flex justify-between items-center gap-3 text-sm">
      <span className="font-semibold text-slate-500">{label}</span>
      <span className="text-right text-slate-800">{value}</span>
    </div>
  );
}

function s(v: any) {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

export default function ConsoleHeader(props: {
  job: any;
  addr: string;
  outputs: string[];
  wantsSnapshot: boolean;
  jobId: string;
  saveContactsAction: (formData: FormData) => Promise<void>;
  saveNotesAction: (formData: FormData) => Promise<void>;
}) {
  const { job, addr, outputs, wantsSnapshot, jobId, saveContactsAction, saveNotesAction } = props;

  const broker = job?.intake_payload?.broker || {};
  const client = job?.intake_payload?.client || {};
  const brokerNotes = job?.intake_payload?.broker_notes || '';

  const brokerName = broker.name || job?.intake_payload?.broker_name || '—';
  const brokerEmail = broker.email || '';
  const brokerPhone = broker.phone || '';
  const brokerBrokerage = broker.brokerage || '';

  const clientName = client.name || job?.intake_payload?.client_name || '—';
  const clientEmail = client.email || '';
  const clientPhone = client.phone || '';

  const smsTemplate = `REI — quick update on ${addr || 'your property'} (code ${job.confirmation_code || '—'}).`;

  const hasBroker = Boolean(s(brokerName).trim()) || Boolean(s(brokerEmail).trim()) || Boolean(s(brokerPhone).trim());
  const hasClient = Boolean(s(clientName).trim()) || Boolean(s(clientEmail).trim()) || Boolean(s(clientPhone).trim());

  const rawStatus = String(job?.response_status || 'unreviewed');
  const statusLabel = prettyResponseStatus(rawStatus);
  const statusTone = statusToneFor(rawStatus);

  const requested = (outputs || []).map((o) => prettyRequestKey(o)).filter(Boolean);

  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-visible">
      {/* Top bar */}
      <div className="px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          {/* Left: people + address */}
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Broker</div>
              <div className="text-lg font-semibold text-slate-900">{brokerName}</div>

              <span className="text-slate-300">•</span>

              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Client</div>
              <div className="text-lg font-semibold text-slate-900">{clientName}</div>
            </div>

            <div className="mt-2 text-sm text-slate-700 truncate" title={addr || ''}>
              {addr || '—'}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Job ID: <span className="font-mono">{jobId}</span> • Code:{' '}
              <span className="font-mono">{job?.confirmation_code || '—'}</span>
            </div>

            {/* Requested chips */}
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500 mr-1">Requested</span>
              {requested.length ? (
                requested.map((r, idx) => (
                  <span key={`${r}-${idx}`}>{taskChip(r)}</span>
                ))
              ) : (
                <span className="text-xs text-slate-400">—</span>
              )}
            </div>
          </div>

          {/* Right: status + actions */}
          <div className="flex items-center justify-between gap-3 lg:flex-col lg:items-end lg:justify-start">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Status</span>
              {statusBadge(statusLabel, statusTone)}
              <button
                onClick={() => setIsOpen(true)}
                className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-100 transition"
                aria-label="Edit context"
                title="Edit context"
              >
                <EllipsisVerticalIcon className="h-5 w-5 text-slate-600" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/admin/jobs"
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                style={{ textDecoration: 'none' }}
              >
                ← Back
              </Link>

              {wantsSnapshot && (
                <Link
                  href={`/admin/jobs/${jobId}?tab=worksheet`}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
                  style={{ textDecoration: 'none', backgroundColor: REI_GREEN }}
                >
                  Snapshot →
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-100" />

      {/* Optional “micro actions” row (kept empty for now; easy later) */}
      {/* <div className="px-6 py-3 text-xs text-slate-500">…</div> */}

      {/* Side Drawer */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/30 z-50" onClick={() => setIsOpen(false)}>
          <div
            className="fixed top-0 right-0 h-full w-[420px] max-w-[92vw] bg-white shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer header */}
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Context Details</h3>
                <p className="text-xs text-slate-500 mt-0.5">Edit broker/client contacts and notes</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <XMarkIcon className="h-5 w-5 text-slate-700" />
              </button>
            </div>

            <div className="p-4 grid gap-4">
              {/* Property */}
              <div className="rounded-xl border border-slate-200 p-4">
                <h4 className="text-sm font-bold text-slate-700">Property</h4>
                <p className="mt-1 font-semibold text-base truncate" title={addr || ''}>
                  {addr || '—'}
                </p>
                <div className="mt-3 flex flex-wrap gap-3 items-center text-sm">
                  {addr ? (
                    <a
                      href={mapsHref(addr)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 underline decoration-slate-300 hover:text-slate-900"
                    >
                      <MapPinIcon className="h-4 w-4" />
                      Maps
                    </a>
                  ) : null}

                  <Link
                    href="/intake/broker"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 underline decoration-slate-300 hover:text-slate-900"
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                    View intake ↗
                  </Link>

                  <span className="text-slate-500">
                    Code: <code className="font-mono">{job.confirmation_code || '—'}</code>
                  </span>
                </div>
              </div>

              {/* Broker */}
              <div className="rounded-xl border border-slate-200 p-4">
                <h4 className="font-bold text-base text-slate-900 mb-3">Broker</h4>
                <div className="grid gap-2">
                  {row('Name', brokerName || '—')}
                  {row(
                    'Email',
                    brokerEmail ? (
                      <a href={`mailto:${brokerEmail}`} className="flex items-center gap-1 underline hover:text-slate-900">
                        <EnvelopeIcon className="h-4 w-4" />
                        {brokerEmail}
                      </a>
                    ) : (
                      '—'
                    )
                  )}
                  {row(
                    'Phone',
                    brokerPhone ? (
                      <div className="flex items-center gap-2 justify-end flex-wrap">
                        <a href={`tel:${brokerPhone}`} className="flex items-center gap-1 underline hover:text-slate-900">
                          <PhoneIcon className="h-4 w-4" />
                          {brokerPhone}
                        </a>
                        <span className="text-slate-300">•</span>
                        <a href={smsHref(brokerPhone, smsTemplate)} className="underline hover:text-slate-900">
                          Text
                        </a>
                      </div>
                    ) : (
                      '—'
                    )
                  )}
                  {row('Brokerage', brokerBrokerage || '—')}
                </div>
              </div>

              {/* Client */}
              <div className="rounded-xl border border-slate-200 p-4">
                <h4 className="font-bold text-base text-slate-900 mb-3">Client</h4>
                <div className="grid gap-2">
                  {row('Name', clientName || '—')}
                  {row(
                    'Email',
                    clientEmail ? (
                      <a href={`mailto:${clientEmail}`} className="flex items-center gap-1 underline hover:text-slate-900">
                        <EnvelopeIcon className="h-4 w-4" />
                        {clientEmail}
                      </a>
                    ) : (
                      '—'
                    )
                  )}
                  {row(
                    'Phone',
                    clientPhone ? (
                      <div className="flex items-center gap-2 justify-end flex-wrap">
                        <a href={`tel:${clientPhone}`} className="flex items-center gap-1 underline hover:text-slate-900">
                          <PhoneIcon className="h-4 w-4" />
                          {clientPhone}
                        </a>
                        <span className="text-slate-300">•</span>
                        <a href={smsHref(clientPhone, smsTemplate)} className="underline hover:text-slate-900">
                          Text
                        </a>
                      </div>
                    ) : (
                      '—'
                    )
                  )}
                </div>
              </div>

              {/* Edit Contacts Form */}
              <div className="rounded-xl border border-slate-200 p-4">
                <h4 className="font-bold text-base text-slate-900 mb-2">
                  {hasBroker || hasClient ? 'Edit contacts' : 'Add broker/client info'}
                </h4>

                <form action={saveContactsAction} className="mt-3 grid gap-4">
                  <h5 className="text-xs font-bold text-slate-600">Broker</h5>
                  <div className="grid gap-2">
                    <div>
                      {fieldLabel('Broker name')}
                      <input
                        name="broker_name"
                        defaultValue={brokerName}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none bg-white focus:ring-2 focus:ring-offset-1"
                        style={{ boxShadow: 'none', outline: 'none' }}
                        placeholder="John Smith"
                      />
                    </div>

                    <div>
                      {fieldLabel('Broker email')}
                      <input
                        name="broker_email"
                        defaultValue={brokerEmail}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none bg-white focus:ring-2 focus:ring-offset-1"
                        placeholder="john@broker.com"
                        type="email"
                      />
                    </div>

                    <div>
                      {fieldLabel('Broker phone')}
                      <input
                        name="broker_phone"
                        defaultValue={brokerPhone}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none bg-white focus:ring-2 focus:ring-offset-1"
                        placeholder="(503) 555-1234"
                        type="tel"
                      />
                    </div>

                    <div>
                      {fieldLabel('Brokerage')}
                      <input
                        name="broker_brokerage"
                        defaultValue={brokerBrokerage}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none bg-white focus:ring-2 focus:ring-offset-1"
                        placeholder="ABC Realty"
                      />
                    </div>
                  </div>

                  <h5 className="text-xs font-bold text-slate-600">Client</h5>
                  <div className="grid gap-2">
                    <div>
                      {fieldLabel('Client name')}
                      <input
                        name="client_name"
                        defaultValue={clientName}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none bg-white focus:ring-2 focus:ring-offset-1"
                        placeholder="Jane Doe"
                      />
                    </div>

                    <div>
                      {fieldLabel('Client email')}
                      <input
                        name="client_email"
                        defaultValue={clientEmail}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none bg-white focus:ring-2 focus:ring-offset-1"
                        placeholder="jane@email.com"
                        type="email"
                      />
                    </div>

                    <div>
                      {fieldLabel('Client phone')}
                      <input
                        name="client_phone"
                        defaultValue={clientPhone}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none bg-white focus:ring-2 focus:ring-offset-1"
                        placeholder="(503) 555-9876"
                        type="tel"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="submit"
                      className="rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
                      style={{ backgroundColor: REI_GREEN }}
                      onClick={() => setIsOpen(false)}
                    >
                      Save contacts
                    </button>
                  </div>
                </form>
              </div>

              {/* Edit Notes */}
              <div className="rounded-xl border border-slate-200 p-4">
                <h4 className="font-bold text-base text-slate-900 mb-2">Broker Notes</h4>
                <p className="text-sm text-slate-700 whitespace-pre-wrap mb-4">{brokerNotes || '—'}</p>

                <form action={saveNotesAction} className="grid gap-4">
                  <div>
                    {fieldLabel('Edit notes')}
                    <textarea
                      name="broker_notes"
                      defaultValue={brokerNotes}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none bg-white min-h-[110px] focus:ring-2 focus:ring-offset-1"
                      placeholder="Add or edit broker notes here..."
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="submit"
                      className="rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
                      style={{ backgroundColor: REI_GREEN }}
                      onClick={() => setIsOpen(false)}
                    >
                      Save notes
                    </button>
                  </div>
                </form>
              </div>

              {/* small helper */}
              <div className="text-xs text-slate-500 px-1">
                Tip: Use the ellipsis button on the header to reopen this panel anytime.
              </div>
            </div>

            {/* focus ring color override (simple + safe) */}
            <style jsx>{`
              input:focus,
              textarea:focus {
                box-shadow: 0 0 0 3px rgba(67, 164, 25, 0.25) !important;
                border-color: rgba(67, 164, 25, 0.55) !important;
              }
            `}</style>
          </div>
        </div>
      )}
    </div>
  );
}
