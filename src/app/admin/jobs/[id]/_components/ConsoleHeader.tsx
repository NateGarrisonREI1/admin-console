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

type Tone = 'neutral' | 'warn' | 'danger' | 'good';

function taskChip(label: string) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 10px',
        borderRadius: 9999,
        border: '1px solid #475569',
        background: 'rgba(51,65,85,0.5)',
        fontSize: 12,
        fontWeight: 600,
        color: '#cbd5e1',
      }}
    >
      {label}
    </span>
  );
}

function statusToneFor(value: string): Tone {
  if (value === 'blocked') return 'danger';
  if (value === 'needs_review' || value === 'waiting_on_broker') return 'warn';
  if (value === 'ready' || value === 'delivered') return 'good';
  return 'neutral';
}

const TONE_STYLES: Record<Tone, { bg: string; bd: string; tx: string }> = {
  danger: { bg: 'rgba(239,68,68,0.12)', bd: 'rgba(239,68,68,0.30)', tx: '#f87171' },
  warn: { bg: 'rgba(245,158,11,0.12)', bd: 'rgba(245,158,11,0.30)', tx: '#fbbf24' },
  good: { bg: 'rgba(16,185,129,0.12)', bd: 'rgba(16,185,129,0.30)', tx: '#10b981' },
  neutral: { bg: 'rgba(51,65,85,0.5)', bd: '#475569', tx: '#cbd5e1' },
};

function statusBadge(label: string, tone: Tone) {
  const t = TONE_STYLES[tone];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '5px 12px',
        borderRadius: 9999,
        border: `1px solid ${t.bd}`,
        background: t.bg,
        color: t.tx,
        fontSize: 13,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
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
  return (
    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
      {label}
    </label>
  );
}

function detailRow(label: string, value: React.ReactNode) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, fontSize: 13 }}>
      <span style={{ fontWeight: 600, color: '#64748b' }}>{label}</span>
      <span style={{ textAlign: 'right', color: '#f1f5f9' }}>{value}</span>
    </div>
  );
}

function s(v: any) {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #334155',
  background: '#1e293b',
  color: '#f1f5f9',
  fontSize: 13,
  fontWeight: 600,
  outline: 'none',
};

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

  const brokerName = broker.name || job?.intake_payload?.broker_name || '\u2014';
  const brokerEmail = broker.email || '';
  const brokerPhone = broker.phone || '';
  const brokerBrokerage = broker.brokerage || '';

  const clientName = client.name || job?.intake_payload?.client_name || '\u2014';
  const clientEmail = client.email || '';
  const clientPhone = client.phone || '';

  const smsTemplate = `REI \u2014 quick update on ${addr || 'your property'} (code ${job.confirmation_code || '\u2014'}).`;

  const hasBroker = Boolean(s(brokerName).trim()) || Boolean(s(brokerEmail).trim()) || Boolean(s(brokerPhone).trim());
  const hasClient = Boolean(s(clientName).trim()) || Boolean(s(clientEmail).trim()) || Boolean(s(clientPhone).trim());

  const rawStatus = String(job?.response_status || 'unreviewed');
  const statusLabel = prettyResponseStatus(rawStatus);
  const statusTone = statusToneFor(rawStatus);

  const requested = (outputs || []).map((o) => prettyRequestKey(o)).filter(Boolean);

  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, overflow: 'visible' }}>
      {/* Top bar */}
      <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            {/* Left: people + address */}
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Broker</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: '#f1f5f9' }}>{brokerName}</div>

                <span style={{ color: '#475569' }}>{'\u2022'}</span>

                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Client</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: '#f1f5f9' }}>{clientName}</div>
              </div>

              <div style={{ marginTop: 8, fontSize: 14, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={addr || ''}>
                {addr || '\u2014'}
              </div>

              <div style={{ marginTop: 4, fontSize: 12, color: '#64748b' }}>
                Job ID: <span style={{ fontFamily: 'monospace' }}>{jobId}</span> {'\u2022'} Code:{' '}
                <span style={{ fontFamily: 'monospace' }}>{job?.confirmation_code || '\u2014'}</span>
              </div>

              {/* Requested chips */}
              <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 4 }}>Requested</span>
                {requested.length ? (
                  requested.map((r, idx) => (
                    <span key={`${r}-${idx}`}>{taskChip(r)}</span>
                  ))
                ) : (
                  <span style={{ fontSize: 12, color: '#64748b' }}>{'\u2014'}</span>
                )}
              </div>
            </div>

            {/* Right: status + actions */}
            <div className="flex items-center justify-between gap-3 lg:flex-col lg:items-end lg:justify-start">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</span>
                {statusBadge(statusLabel, statusTone)}
                <button
                  onClick={() => setIsOpen(true)}
                  style={{
                    marginLeft: 4,
                    display: 'inline-flex',
                    height: 36,
                    width: 36,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 9999,
                    border: '1px solid #334155',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: '#94a3b8',
                  }}
                  aria-label="Edit context"
                  title="Edit context"
                >
                  <EllipsisVerticalIcon style={{ height: 20, width: 20 }} />
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Link
                  href="/admin/jobs"
                  className="admin-btn-secondary"
                  style={{ textDecoration: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 13 }}
                >
                  {'\u2190'} Back
                </Link>

                {wantsSnapshot && (
                  <Link
                    href={`/admin/jobs/${jobId}?tab=worksheet`}
                    className="admin-btn-primary"
                    style={{ textDecoration: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 13 }}
                  >
                    Snapshot {'\u2192'}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Side Drawer */}
      {isOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.50)', zIndex: 50, backdropFilter: 'blur(4px)' }}
          onClick={() => setIsOpen(false)}
        >
          <div
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              height: '100%',
              width: 420,
              maxWidth: '92vw',
              background: '#0f172a',
              borderLeft: '1px solid #334155',
              boxShadow: '0 30px 80px rgba(0,0,0,0.50)',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer header */}
            <div style={{ padding: 16, borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: 18, color: '#f1f5f9' }}>Context Details</h3>
                <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Edit broker/client contacts and notes</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{ padding: 8, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
              >
                <XMarkIcon style={{ height: 20, width: 20 }} />
              </button>
            </div>

            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Property */}
              <div style={{ borderRadius: 12, border: '1px solid #334155', background: '#1e293b', padding: 16 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8' }}>Property</h4>
                <p style={{ marginTop: 4, fontWeight: 600, fontSize: 15, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={addr || ''}>
                  {addr || '\u2014'}
                </p>
                <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', fontSize: 13 }}>
                  {addr ? (
                    <a
                      href={mapsHref(addr)}
                      target="_blank"
                      rel="noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10b981', textDecoration: 'underline' }}
                    >
                      <MapPinIcon style={{ height: 16, width: 16 }} />
                      Maps
                    </a>
                  ) : null}

                  <Link
                    href="/intake/broker"
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10b981', textDecoration: 'underline' }}
                  >
                    <PencilSquareIcon style={{ height: 16, width: 16 }} />
                    View intake {'\u2197'}
                  </Link>

                  <span style={{ color: '#64748b' }}>
                    Code: <code style={{ fontFamily: 'monospace' }}>{job.confirmation_code || '\u2014'}</code>
                  </span>
                </div>
              </div>

              {/* Broker */}
              <div style={{ borderRadius: 12, border: '1px solid #334155', background: '#1e293b', padding: 16 }}>
                <h4 style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9', marginBottom: 12 }}>Broker</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {detailRow('Name', brokerName || '\u2014')}
                  {detailRow(
                    'Email',
                    brokerEmail ? (
                      <a href={`mailto:${brokerEmail}`} style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10b981', textDecoration: 'underline' }}>
                        <EnvelopeIcon style={{ height: 16, width: 16 }} />
                        {brokerEmail}
                      </a>
                    ) : '\u2014'
                  )}
                  {detailRow(
                    'Phone',
                    brokerPhone ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <a href={`tel:${brokerPhone}`} style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10b981', textDecoration: 'underline' }}>
                          <PhoneIcon style={{ height: 16, width: 16 }} />
                          {brokerPhone}
                        </a>
                        <span style={{ color: '#475569' }}>{'\u2022'}</span>
                        <a href={smsHref(brokerPhone, smsTemplate)} style={{ color: '#10b981', textDecoration: 'underline' }}>
                          Text
                        </a>
                      </div>
                    ) : '\u2014'
                  )}
                  {detailRow('Brokerage', brokerBrokerage || '\u2014')}
                </div>
              </div>

              {/* Client */}
              <div style={{ borderRadius: 12, border: '1px solid #334155', background: '#1e293b', padding: 16 }}>
                <h4 style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9', marginBottom: 12 }}>Client</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {detailRow('Name', clientName || '\u2014')}
                  {detailRow(
                    'Email',
                    clientEmail ? (
                      <a href={`mailto:${clientEmail}`} style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10b981', textDecoration: 'underline' }}>
                        <EnvelopeIcon style={{ height: 16, width: 16 }} />
                        {clientEmail}
                      </a>
                    ) : '\u2014'
                  )}
                  {detailRow(
                    'Phone',
                    clientPhone ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <a href={`tel:${clientPhone}`} style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10b981', textDecoration: 'underline' }}>
                          <PhoneIcon style={{ height: 16, width: 16 }} />
                          {clientPhone}
                        </a>
                        <span style={{ color: '#475569' }}>{'\u2022'}</span>
                        <a href={smsHref(clientPhone, smsTemplate)} style={{ color: '#10b981', textDecoration: 'underline' }}>
                          Text
                        </a>
                      </div>
                    ) : '\u2014'
                  )}
                </div>
              </div>

              {/* Edit Contacts Form */}
              <div style={{ borderRadius: 12, border: '1px solid #334155', background: '#1e293b', padding: 16 }}>
                <h4 style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9', marginBottom: 8 }}>
                  {hasBroker || hasClient ? 'Edit contacts' : 'Add broker/client info'}
                </h4>

                <form action={saveContactsAction} style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Broker</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div>{fieldLabel('Broker name')}<input name="broker_name" defaultValue={brokerName} style={INPUT_STYLE} placeholder="John Smith" /></div>
                    <div>{fieldLabel('Broker email')}<input name="broker_email" defaultValue={brokerEmail} style={INPUT_STYLE} placeholder="john@broker.com" type="email" /></div>
                    <div>{fieldLabel('Broker phone')}<input name="broker_phone" defaultValue={brokerPhone} style={INPUT_STYLE} placeholder="(503) 555-1234" type="tel" /></div>
                    <div>{fieldLabel('Brokerage')}<input name="broker_brokerage" defaultValue={brokerBrokerage} style={INPUT_STYLE} placeholder="ABC Realty" /></div>
                  </div>

                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Client</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div>{fieldLabel('Client name')}<input name="client_name" defaultValue={clientName} style={INPUT_STYLE} placeholder="Jane Doe" /></div>
                    <div>{fieldLabel('Client email')}<input name="client_email" defaultValue={clientEmail} style={INPUT_STYLE} placeholder="jane@email.com" type="email" /></div>
                    <div>{fieldLabel('Client phone')}<input name="client_phone" defaultValue={clientPhone} style={INPUT_STYLE} placeholder="(503) 555-9876" type="tel" /></div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
                    <button
                      type="submit"
                      className="admin-btn-primary"
                      style={{ padding: '10px 16px', borderRadius: 10, fontSize: 13 }}
                      onClick={() => setIsOpen(false)}
                    >
                      Save contacts
                    </button>
                  </div>
                </form>
              </div>

              {/* Edit Notes */}
              <div style={{ borderRadius: 12, border: '1px solid #334155', background: '#1e293b', padding: 16 }}>
                <h4 style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9', marginBottom: 8 }}>Broker Notes</h4>
                <p style={{ fontSize: 13, color: '#94a3b8', whiteSpace: 'pre-wrap', marginBottom: 16 }}>{brokerNotes || '\u2014'}</p>

                <form action={saveNotesAction} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    {fieldLabel('Edit notes')}
                    <textarea
                      name="broker_notes"
                      defaultValue={brokerNotes}
                      className="admin-input"
                      style={{ ...INPUT_STYLE, minHeight: 110, resize: 'vertical' }}
                      placeholder="Add or edit broker notes here..."
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button
                      type="submit"
                      className="admin-btn-primary"
                      style={{ padding: '10px 16px', borderRadius: 10, fontSize: 13 }}
                      onClick={() => setIsOpen(false)}
                    >
                      Save notes
                    </button>
                  </div>
                </form>
              </div>

              <div style={{ fontSize: 11, color: '#64748b', padding: '0 4px' }}>
                Tip: Use the ellipsis button on the header to reopen this panel anytime.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
