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

const GREEN = '#43a419';
const GREEN_LIGHT = 'rgba(67,164,25,0.12)';
const GREEN_BORDER = 'rgba(67,164,25,0.30)';

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

    const day = sD.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const sT = sD.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    const eT = eD.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
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
    return <span className={`${base} bg-amber-50 text-amber-800 border-amber-200`}>{label}</span>;
  if (tone === 'info')
    return <span className={`${base} bg-cyan-50 text-cyan-800 border-cyan-200`}>{label}</span>;
  if (tone === 'danger')
    return <span className={`${base} bg-red-50 text-red-800 border-red-200`}>{label}</span>;
  return <span className={`${base} bg-slate-100 text-slate-700 border-slate-200`}>{label}</span>;
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
  const solid =
    'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500';
  const ghost =
    'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 focus:ring-slate-400';

  return (
    <form action={updateResponseStatus}>
      <input type="hidden" name="response_status" value={value} />
      <button
        type="submit"
        className={[
          base,
          variant === 'solid' ? solid : ghost,
          active ? 'ring-2 ring-green-400 ring-offset-2' : '',
        ].join(' ')}
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
    if (currentStatus === 'scheduled') return { text: 'Move to “In Progress” when the visit starts', tone: 'info' as const };
    if (currentStatus === 'in_progress') return { text: 'Finish fieldwork and prep deliverables', tone: 'info' as const };
    if (currentStatus === 'ready') return { text: 'Review and send deliverables', tone: 'good' as const };
    return null;
  }, [currentStatus, isScheduled, wantsInspectionOrHes]);

  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-visible w-full max-w-full min-w-0">
      {/* компакт header */}
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-sm font-semibold text-slate-900">Workflow</div>
              <span className="text-xs text-slate-500">•</span>
              <Pill label={displayStatus} tone={STATUS_TONE[currentStatus] ?? 'neutral'} />
            </div>

            <div className="mt-2 text-sm text-slate-700">
              <span className="font-medium text-slate-900">Next Visit:</span>{' '}
              <span className={isScheduled ? '' : 'text-slate-500'}>{fmtRange(nextAppt?.start_at, nextAppt?.end_at)}</span>
              {isScheduled ? (
                <span className="text-slate-500">
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
                <span className="text-xs text-slate-500 italic">No services requested</span>
              )}
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <Link
              href={`/admin/schedule?job=${job.id}&kind=inspection`}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition"
            >
              {isScheduled ? 'Reschedule' : 'Schedule'} →
            </Link>
          </div>
        </div>
      </div>

      {/* slim stepper */}
      <div className="px-5 py-4">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="font-medium text-slate-900">Progress</span>
          <span>{Math.min(100, Math.max(0, Math.round(progress)))}%</span>
        </div>

        <div className="mt-2 relative">
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
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
                      isPast ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-400 border-slate-200',
                      isActive ? 'ring-2 ring-green-300 ring-offset-2' : '',
                    ].join(' ')}
                  >
                    {i + 1}
                  </div>
                  <div className={['mt-1 text-[11px] text-center', isPast ? 'text-green-700' : 'text-slate-500'].join(' ')}>
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
              <div className="text-sm text-green-800 bg-green-50 border border-green-100 rounded-xl px-3 py-2">
                {guidance.text}
              </div>
            ) : guidance.tone === 'warn' ? (
              <div className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                {guidance.text}
              </div>
            ) : (
              <div className="text-sm text-cyan-800 bg-cyan-50 border border-cyan-100 rounded-xl px-3 py-2">
                {guidance.text}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* compact status controls */}
      {showStatusControls ? (
        <div className="px-5 py-4 border-t border-slate-100">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-900">Set status</div>

            {/* “More” menu for edge statuses */}
            <div className="relative z-50">
              <button
                type="button"
                onClick={() => setMoreOpen(v => !v)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                More
                <span className={moreOpen ? 'rotate-180 transition-transform' : 'transition-transform'}>▾</span>
              </button>

              {moreOpen ? (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-lg p-2 z-50 max-h-[260px] overflow-auto">
                  {(['needs_review', 'waiting_on_broker', 'blocked', 'closed'] as const).map(st => (
                    <form key={st} action={updateResponseStatus}>
                      <input type="hidden" name="response_status" value={st} />
                      <button
                        type="submit"
                        onClick={() => setMoreOpen(false)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-sm text-slate-700"
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

          <div className="mt-3 text-xs text-slate-500">
            Deliverables:{' '}
            <span className="text-slate-700">
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
