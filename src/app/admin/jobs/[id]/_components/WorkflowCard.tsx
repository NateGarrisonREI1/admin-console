'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { prettyRequestKey } from '../_lib/workflow';

export type JobStatus =
  | 'unreviewed'
  | 'scheduled'
  | 'in_progress'
  | 'ready'
  | 'delivered'
  | 'closed'
  | 'needs_review'
  | 'waiting_on_broker'
  | 'blocked';

const STATUS_DISPLAY: Record<JobStatus, string> = {
  unreviewed: 'New',
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  ready: 'Ready to Send',
  delivered: 'Delivered',
  closed: 'Closed',
  needs_review: 'Needs Review',
  waiting_on_broker: 'Waiting on Broker',
  blocked: 'Blocked',
} as const;

const STATUS_TONE: Record<JobStatus, 'good' | 'warn' | 'info' | 'danger' | 'neutral'> = {
  unreviewed: 'neutral',
  scheduled: 'info',
  in_progress: 'neutral',
  ready: 'good',
  delivered: 'good',
  closed: 'good',
  needs_review: 'warn',
  waiting_on_broker: 'warn',
  blocked: 'danger',
} as const;

const PROGRESS_PERCENT: Partial<Record<JobStatus, number>> = {
  unreviewed: 15,
  scheduled: 35,
  in_progress: 60,
  ready: 85,
  delivered: 100,
  closed: 100,
};

const GREEN = '#10b981';
const GREEN_LIGHT = 'rgba(16,185,129,0.12)';
const GREEN_BORDER = 'rgba(16,185,129,0.30)';

type Appt = {
  id: string;
  job_id: string;
  kind: string;
  status: string | null;
  start_at: string | null;
  end_at: string | null;
  assignee: string | null;
  notes: string | null;
  service_kinds: string[] | null;
};

type ScheduleSummary = {
  next: Appt | null;
  upcoming?: Appt[];
  hasInspectionScheduled: boolean;
  hasHesScheduled: boolean;
  hasVisitScheduled: boolean;
};

type RequestRow = {
  request_key: string;
  status?: string | null;
};

type WorkflowCardProps = {
  job: { id: string; response_status?: string | null; [key: string]: any };
  wantsSnapshot: boolean;
  wantsInspectionOrHes: boolean;
  updateResponseStatus: (formData: FormData) => Promise<void>;
  showStatusControls?: boolean;
  scheduleSummary?: ScheduleSummary;
  requestedRequests?: RequestRow[];
  requestedOutputs?: string[];
};

const s = (v: any): string => (typeof v === 'string' ? v : v == null ? '' : String(v));

const fmtRange = (start?: string | null, end?: string | null): string => {
  if (!start || !end) return 'Not scheduled';
  try {
    const sD = new Date(start);
    const eD = new Date(end);
    if (isNaN(sD.getTime()) || isNaN(eD.getTime())) return 'Invalid date';

    const day = sD.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'America/Los_Angeles',
    });
    const sT = sD.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Los_Angeles' });
    const eT = eD.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Los_Angeles' });
    return `${day} • ${sT}–${eT}`;
  } catch {
    return 'Invalid date';
  }
};

const kindLabel = (a?: Appt | null): string => {
  if (!a) return '—';
  const k = s(a.kind).toLowerCase();

  if (k === 'inspection') return 'Inspection';
  if (k === 'hes') return 'HES';
  if (k === 'visit') {
    const sk = Array.isArray(a.service_kinds) ? a.service_kinds.map(x => s(x).toLowerCase()) : [];
    if (!sk.length) return 'Visit (Multiple)';
    return `Visit (${sk
      .map(x => (x === 'hes' ? 'HES' : x === 'inspection' ? 'Inspection' : x))
      .join(' + ')})`;
  }
  return k.replace(/_/g, ' ');
};

function Pill({
  label,
  tone,
}: {
  label: string;
  tone: 'good' | 'warn' | 'info' | 'danger' | 'neutral';
}) {
  const base = 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border';
  if (tone === 'good') {
    return (
      <span
        className={base}
        style={{
          background: GREEN_LIGHT,
          borderColor: GREEN_BORDER,
          color: GREEN,
        }}
      >
        {label}
      </span>
    );
  }
  if (tone === 'warn')
    return (
      <span
        className={base}
        style={{
          background: 'rgba(251,191,36,0.12)',
          borderColor: 'rgba(251,191,36,0.30)',
          color: '#fbbf24',
        }}
      >
        {label}
      </span>
    );
  if (tone === 'info')
    return (
      <span
        className={base}
        style={{
          background: 'rgba(96,165,250,0.12)',
          borderColor: 'rgba(96,165,250,0.30)',
          color: '#60a5fa',
        }}
      >
        {label}
      </span>
    );
  if (tone === 'danger')
    return (
      <span
        className={base}
        style={{
          background: 'rgba(248,113,113,0.12)',
          borderColor: 'rgba(248,113,113,0.30)',
          color: '#f87171',
        }}
      >
        {label}
      </span>
    );
  return (
    <span
      className={base}
      style={{
        background: 'rgba(100,116,139,0.15)',
        borderColor: 'rgba(100,116,139,0.30)',
        color: '#94a3b8',
      }}
    >
      {label}
    </span>
  );
}

const requestChip = (r: { key: string; status?: string | null }) => {
  const key = s(r.key).toLowerCase();
  const isService = ['inspection', 'hes', 'hes_report'].includes(key);
  const text = prettyRequestKey(key) + (r.status ? ` • ${s(r.status).replace(/_/g, ' ')}` : '');
  return <Pill label={text} tone={isService ? 'info' : 'neutral'} />;
};

function StatusSubmitButton({
  value,
  label,
  active,
  updateResponseStatus,
  variant = 'ghost',
}: {
  value: JobStatus;
  label?: string;
  active: boolean;
  updateResponseStatus: (formData: FormData) => Promise<void>;
  variant?: 'ghost' | 'solid';
}) {
  const base =
    'inline-flex items-center justify-center rounded-lg text-sm font-medium transition px-3 py-2 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60';

  const solidStyle: React.CSSProperties = {
    backgroundColor: '#10b981',
    color: '#ffffff',
  };
  const ghostStyle: React.CSSProperties = {
    backgroundColor: '#1e293b',
    color: '#cbd5e1',
    border: '1px solid #334155',
  };

  const activeRing = active ? 'ring-2 ring-emerald-400/60 ring-offset-2 ring-offset-[#0f172a]' : '';

  return (
    <form action={updateResponseStatus}>
      <input type="hidden" name="response_status" value={value} />
      <button
        type="submit"
        className={[base, activeRing].join(' ')}
        style={variant === 'solid' ? solidStyle : ghostStyle}
      >
        {label ?? STATUS_DISPLAY[value]}
      </button>
    </form>
  );
}

export default function WorkflowCard({
  job,
  wantsSnapshot,
  wantsInspectionOrHes,
  updateResponseStatus,
  showStatusControls = true,
  scheduleSummary,
  requestedRequests,
  requestedOutputs,
}: WorkflowCardProps) {
  const currentStatus = (job.response_status ?? 'unreviewed').toLowerCase() as JobStatus;
  const displayStatus = STATUS_DISPLAY[currentStatus] ?? currentStatus.replace(/_/g, ' ');
  const progress = PROGRESS_PERCENT[currentStatus] ?? 0;

  const serviceList =
    Array.isArray(requestedRequests) && requestedRequests.length
      ? requestedRequests.map(r => ({ key: String(r.request_key), status: r.status ?? null }))
      : (Array.isArray(requestedOutputs) ? requestedOutputs : []).map(k => ({ key: String(k), status: null }));

  const nextAppt = scheduleSummary?.next ?? null;
  const isScheduled = Boolean(nextAppt?.start_at);

  const statusOrder = useMemo(
    () => ['unreviewed', 'scheduled', 'in_progress', 'ready', 'delivered'] as const,
    []
  );

  const currentStepIndex = statusOrder.indexOf(currentStatus as any);

  // lightweight guidance (one line)
  const guidance = useMemo(() => {
    if (!isScheduled && wantsInspectionOrHes) return { text: 'Schedule the visit to move forward', tone: 'warn' as const };
    if (currentStatus === 'scheduled') return { text: 'Move to "In Progress" when the visit starts', tone: 'info' as const };
    if (currentStatus === 'in_progress') return { text: 'Finish fieldwork and prep deliverables', tone: 'info' as const };
    if (currentStatus === 'ready') return { text: 'Review and send deliverables', tone: 'good' as const };
    return null;
  }, [currentStatus, isScheduled, wantsInspectionOrHes]);

  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div
      className="overflow-visible w-full max-w-full min-w-0"
      style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12 }}
    >
      {/* compact header */}
      <div className="px-5 py-4" style={{ borderBottom: '1px solid #334155' }}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>Workflow</div>
              <span className="text-xs" style={{ color: '#94a3b8' }}>•</span>
              <Pill label={displayStatus} tone={STATUS_TONE[currentStatus] ?? 'neutral'} />
            </div>

            <div className="mt-2 text-sm" style={{ color: '#cbd5e1' }}>
              <span className="font-medium" style={{ color: '#f1f5f9' }}>Next Visit:</span>{' '}
              <span style={{ color: isScheduled ? '#cbd5e1' : '#94a3b8' }}>{fmtRange(nextAppt?.start_at, nextAppt?.end_at)}</span>
              {isScheduled ? (
                <span style={{ color: '#94a3b8' }}>
                  {' '}
                  • {kindLabel(nextAppt)} •{' '}
                  {s(nextAppt?.assignee).trim() || 'Unassigned'}
                </span>
              ) : null}
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              {serviceList.length ? (
                serviceList.map((r, i) => <div key={i}>{requestChip(r)}</div>)
              ) : (
                <span className="text-xs italic" style={{ color: '#94a3b8' }}>No services requested</span>
              )}
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <Link
              href={`/admin/schedule?job=${job.id}&kind=inspection`}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-white text-sm font-medium transition"
              style={{ backgroundColor: '#10b981' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#059669')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#10b981')}
            >
              {isScheduled ? 'Reschedule' : 'Schedule'} →
            </Link>
          </div>
        </div>
      </div>

      {/* slim stepper */}
      <div className="px-5 py-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium" style={{ color: '#f1f5f9' }}>Progress</span>
          <span style={{ color: '#94a3b8' }}>{Math.min(100, Math.max(0, Math.round(progress)))}%</span>
        </div>

        <div className="mt-2 relative">
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#334155' }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: GREEN }} />
          </div>

          <div className="mt-3 flex items-center justify-between">
            {statusOrder.map((st, i) => {
              const isPast = currentStepIndex >= i && currentStepIndex !== -1;
              const isActive = currentStepIndex === i;

              return (
                <div key={st} className="flex flex-col items-center flex-1">
                  <div
                    className={[
                      'h-7 w-7 rounded-full border flex items-center justify-center text-xs font-semibold transition',
                      isActive ? 'ring-2 ring-emerald-400/60 ring-offset-2 ring-offset-[#1e293b]' : '',
                    ].join(' ')}
                    style={
                      isPast
                        ? { backgroundColor: '#10b981', color: '#ffffff', borderColor: '#10b981' }
                        : { backgroundColor: 'transparent', color: '#64748b', borderColor: '#334155' }
                    }
                  >
                    {i + 1}
                  </div>
                  <div
                    className="mt-1 text-[11px] text-center"
                    style={{ color: isPast ? '#10b981' : '#94a3b8' }}
                  >
                    {STATUS_DISPLAY[st]}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {guidance ? (
          <div className="mt-3">
            {guidance.tone === 'good' ? (
              <div
                className="text-sm rounded-xl px-3 py-2"
                style={{
                  color: '#10b981',
                  backgroundColor: 'rgba(16,185,129,0.10)',
                  border: '1px solid rgba(16,185,129,0.25)',
                }}
              >
                {guidance.text}
              </div>
            ) : guidance.tone === 'warn' ? (
              <div
                className="text-sm rounded-xl px-3 py-2"
                style={{
                  color: '#fbbf24',
                  backgroundColor: 'rgba(251,191,36,0.10)',
                  border: '1px solid rgba(251,191,36,0.25)',
                }}
              >
                {guidance.text}
              </div>
            ) : (
              <div
                className="text-sm rounded-xl px-3 py-2"
                style={{
                  color: '#60a5fa',
                  backgroundColor: 'rgba(96,165,250,0.10)',
                  border: '1px solid rgba(96,165,250,0.25)',
                }}
              >
                {guidance.text}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* compact status controls */}
      {showStatusControls ? (
        <div className="px-5 py-4" style={{ borderTop: '1px solid #334155' }}>
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>Set status</div>

            {/* "More" menu for edge statuses */}
            <div className="relative z-50">
              <button
                type="button"
                onClick={() => setMoreOpen(v => !v)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: '#1e293b',
                  color: '#cbd5e1',
                  border: '1px solid #334155',
                }}
              >
                More
                <span className={moreOpen ? 'rotate-180 transition-transform' : 'transition-transform'}>▾</span>
              </button>

              {moreOpen ? (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-xl p-2 z-50 max-h-[260px] overflow-auto"
                  style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  }}
                >
                  {(['needs_review', 'waiting_on_broker', 'blocked', 'closed'] as const).map(st => (
                    <form key={st} action={updateResponseStatus}>
                      <input type="hidden" name="response_status" value={st} />
                      <button
                        type="submit"
                        onClick={() => setMoreOpen(false)}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors"
                        style={{ color: '#cbd5e1' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1e293b')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        {STATUS_DISPLAY[st]}
                      </button>
                    </form>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {/* Main 5 statuses as a clean segmented row */}
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusSubmitButton
              value="unreviewed"
              active={currentStatus === 'unreviewed'}
              updateResponseStatus={updateResponseStatus}
              variant={currentStatus === 'unreviewed' ? 'solid' : 'ghost'}
            />
            <StatusSubmitButton
              value="scheduled"
              active={currentStatus === 'scheduled'}
              updateResponseStatus={updateResponseStatus}
              variant={currentStatus === 'scheduled' ? 'solid' : 'ghost'}
            />
            <StatusSubmitButton
              value="in_progress"
              active={currentStatus === 'in_progress'}
              updateResponseStatus={updateResponseStatus}
              variant={currentStatus === 'in_progress' ? 'solid' : 'ghost'}
            />
            <StatusSubmitButton
              value="ready"
              active={currentStatus === 'ready'}
              updateResponseStatus={updateResponseStatus}
              variant={currentStatus === 'ready' ? 'solid' : 'ghost'}
            />
            <StatusSubmitButton
              value="delivered"
              active={currentStatus === 'delivered'}
              updateResponseStatus={updateResponseStatus}
              variant={currentStatus === 'delivered' ? 'solid' : 'ghost'}
            />
          </div>

          <div className="mt-3 text-xs" style={{ color: '#94a3b8' }}>
            Deliverables:{' '}
            <span style={{ color: '#cbd5e1' }}>
              {wantsSnapshot ? 'Snapshot → Deliver' : 'Snapshot: not requested'}
              {' • '}
              {wantsInspectionOrHes
                ? 'Inspection/HES → Schedule → Complete → Deliver'
                : 'Inspection/HES: not requested'}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
