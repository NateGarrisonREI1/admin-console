"use client";

import { useEffect, useMemo, useState } from "react";

function s(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function dayLabel(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "America/Los_Angeles" });
}
function timeLabel(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/Los_Angeles" });
}

function normalizePreselectKind(raw?: string) {
  const v = s(raw).trim().toLowerCase();
  if (v === "inspection") return "inspection";
  if (v === "hes") return "hes";
  return "";
}

function readRules() {
  const el = document.querySelector("[data-slot-rules]") as HTMLElement | null;
  return {
    days: Number(el?.getAttribute("data-days") || "7"),
    slotMinutes: Number(el?.getAttribute("data-slot-minutes") || "60"),
    startHour: Number(el?.getAttribute("data-start-hour") || "9"),
    endHour: Number(el?.getAttribute("data-end-hour") || "17"),
  };
}

type StartSlot = { startsAt: string; day: string };

function buildStartSlots(): StartSlot[] {
  const { days, slotMinutes, startHour, endHour } = readRules();
  const now = new Date();
  const slots: StartSlot[] = [];

  for (let day = 0; day < days; day++) {
    const base = new Date(now);
    base.setHours(0, 0, 0, 0);
    base.setDate(base.getDate() + day);

    for (let h = startHour; h < endHour; h++) {
      for (let m = 0; m < 60; m += slotMinutes) {
        const start = new Date(base);
        start.setHours(h, m, 0, 0);

        if (start.getTime() < now.getTime() - 5 * 60 * 1000) continue;

        slots.push({
          startsAt: start.toISOString(),
          day: dayLabel(start),
        });
      }
    }
  }
  return slots;
}

function addMinutes(iso: string, minutes: number) {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

function overlapsAny(startIso: string, endIso: string, existing: Array<{ start_at: string; end_at: string }>) {
  const s0 = new Date(startIso).getTime();
  const e0 = new Date(endIso).getTime();
  if (!Number.isFinite(s0) || !Number.isFinite(e0)) return true;

  for (const a of existing || []) {
    if (!a.start_at || !a.end_at) continue;
    const s1 = new Date(a.start_at).getTime();
    const e1 = new Date(a.end_at).getTime();
    if (!Number.isFinite(s1) || !Number.isFinite(e1)) continue;

    // [s0,e0) intersects [s1,e1)
    if (s0 < e1 && e0 > s1) return true;
  }
  return false;
}

type ServiceMode = "inspection" | "hes" | "both";

const DEFAULT_DURATION_MINUTES: Record<ServiceMode, number> = {
  inspection: 180, // 3h
  hes: 120,        // 2h
  both: 300,       // 5h (3+2)
};

const DURATION_OPTIONS = [
  { label: "1 hour", minutes: 60 },
  { label: "2 hours", minutes: 120 },
  { label: "3 hours", minutes: 180 },
  { label: "4 hours", minutes: 240 },
  { label: "5 hours", minutes: 300 },
] as const;

export default function SlotList(props: {
  jobs: any[];
  preselectJobId?: string;
  preselectKind?: string;
  existingScheduled: Array<{ start_at: string; end_at: string }>;
  createAppointmentAction: (formData: FormData) => Promise<void>;
}) {
  const { jobs, preselectJobId, preselectKind, existingScheduled, createAppointmentAction } = props;

  const [selectedJobId, setSelectedJobId] = useState<string>(preselectJobId || "");
  const [mode, setMode] = useState<ServiceMode>("inspection");
  const [durationMins, setDurationMins] = useState<number>(DEFAULT_DURATION_MINUTES.inspection);

  const [assignee, setAssignee] = useState<string>("support@renewableenergyincentives.com");
  const [notes, setNotes] = useState<string>("");

  const [selectedStart, setSelectedStart] = useState<StartSlot | null>(null);

  useEffect(() => {
    if (preselectJobId) setSelectedJobId(preselectJobId);
  }, [preselectJobId]);

  useEffect(() => {
    const k = normalizePreselectKind(preselectKind);
    if (k === "inspection") {
      setMode("inspection");
      setDurationMins((d) => (d ? d : DEFAULT_DURATION_MINUTES.inspection));
    }
    if (k === "hes") {
      setMode("hes");
      setDurationMins((d) => (d ? d : DEFAULT_DURATION_MINUTES.hes));
    }
  }, [preselectKind]);

  // When mode changes, snap duration to that default (but keep it editable after)
  useEffect(() => {
    setDurationMins(DEFAULT_DURATION_MINUTES[mode]);
    setSelectedStart(null); // reduce accidental scheduling mismatch
  }, [mode]);

  const startSlots = useMemo(() => (typeof window === "undefined" ? [] : buildStartSlots()), []);

  const grouped = useMemo(() => {
    const map = new Map<string, StartSlot[]>();
    for (const sl of startSlots) {
      const arr = map.get(sl.day) || [];
      arr.push(sl);
      map.set(sl.day, arr);
    }
    return Array.from(map.entries());
  }, [startSlots]);

  const kind = mode === "both" ? "visit" : mode; // inspection|hes|visit
  const serviceKindsCsv = mode === "both" ? "inspection,hes" : "";

  const selectedEnd = selectedStart ? addMinutes(selectedStart.startsAt, durationMins) : "";
  const canSchedule = Boolean(selectedJobId && selectedStart?.startsAt && selectedEnd && assignee);

  function jobOptionLabel(j: any) {
    const customer = s(j.customer_name).trim();
    const broker = s(j.broker_name).trim();
    const a1 = s(j.address1).trim();
    const city = s(j.city).trim();
    const st = s(j.state).trim();
    const zip = s(j.zip).trim();

    const who = customer && broker ? `${customer} • ${broker}` : customer || broker || "Unnamed customer";
    const where = [a1, [city, st, zip].filter(Boolean).join(" ")].filter(Boolean).join(" — ");
    return `${who}${where ? ` — ${where}` : ""}`;
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* Top controls */}
      <div
        style={{
          display: "grid",
          gap: 10,
          padding: 12,
          borderRadius: 14,
          border: "1px solid rgba(15,23,42,0.10)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 240px 190px", gap: 10 }}>
          <label style={{ display: "grid", gap: 6, fontSize: 12, opacity: 0.85 }}>
            Job
            <select
              className="admin-input"
              value={selectedJobId}
              onChange={(e) => {
                setSelectedJobId(e.target.value);
                setSelectedStart(null);
              }}
              style={{
                borderRadius: 12,
                border: "1px solid rgba(15,23,42,0.14)",
              }}
            >
              <option value="">— Select a job —</option>
              {jobs.map((j: any) => (
                <option key={j.id} value={j.id}>
                  {jobOptionLabel(j)}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 6, fontSize: 12, opacity: 0.85 }}>
            Service
            <select
              className="admin-input"
              value={mode}
              onChange={(e) => setMode(e.target.value as ServiceMode)}
              style={{ borderRadius: 12, border: "1px solid rgba(15,23,42,0.14)" }}
            >
              <option value="inspection">Inspection (3h)</option>
              <option value="hes">HES (2h)</option>
              <option value="both">Both — single visit (5h)</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: 6, fontSize: 12, opacity: 0.85 }}>
            Duration
            <select
              className="admin-input"
              value={String(durationMins)}
              onChange={(e) => {
                setDurationMins(Number(e.target.value));
                setSelectedStart(null);
              }}
              style={{ borderRadius: 12, border: "1px solid rgba(15,23,42,0.14)" }}
              title="Change how long this appointment takes"
            >
              {DURATION_OPTIONS.map((o) => (
                <option key={o.minutes} value={String(o.minutes)}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label style={{ display: "grid", gap: 6, fontSize: 12, opacity: 0.85 }}>
            Assignee
            <input className="admin-input" value={assignee} onChange={(e) => setAssignee(e.target.value)} style={{ borderRadius: 12 }} />
          </label>

          <label style={{ display: "grid", gap: 6, fontSize: 12, opacity: 0.85 }}>
            Notes
            <input
              className="admin-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Gate code, contact notes, special instructions…"
              style={{ borderRadius: 12 }}
            />
          </label>
        </div>

        <div style={{ fontSize: 12, opacity: 0.75, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <span>
            <strong style={{ opacity: 0.95 }}>Selected service:</strong>{" "}
            {mode === "inspection" ? "Inspection" : mode === "hes" ? "HES" : "Both (single visit)"}
          </span>
          <span>
            <strong style={{ opacity: 0.95 }}>Duration:</strong> {Math.round(durationMins / 60)}h
          </span>
          {selectedStart ? (
            <span>
              <strong style={{ opacity: 0.95 }}>Time:</strong>{" "}
              {dayLabel(new Date(selectedStart.startsAt))} • {timeLabel(new Date(selectedStart.startsAt))}–{timeLabel(new Date(selectedEnd))}
            </span>
          ) : (
            <span>Select a start time below.</span>
          )}
        </div>
      </div>

      {/* Slots */}
      <div style={{ display: "grid", gap: 12 }}>
        {grouped.map(([day, daySlots]) => (
          <div key={day} style={{ borderTop: "1px solid rgba(15,23,42,0.10)", paddingTop: 12 }}>
            <div style={{ fontWeight: 950, fontSize: 12, opacity: 0.9 }}>{day}</div>

            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {daySlots.map((sl) => {
                const endAt = addMinutes(sl.startsAt, durationMins);
                const isBlocked = overlapsAny(sl.startsAt, endAt, existingScheduled);
                const isSelected = selectedStart?.startsAt === sl.startsAt;

                const label = `${timeLabel(new Date(sl.startsAt))}–${timeLabel(new Date(endAt))}`;

                return (
                  <button
                    key={sl.startsAt}
                    type="button"
                    disabled={!selectedJobId || isBlocked}
                    onClick={() => setSelectedStart(sl)}
                    className="admin-btn"
                    style={{
                      borderRadius: 999,
                      padding: "7px 10px",
                      fontSize: 12,
                      fontWeight: 950,
                      opacity: !selectedJobId ? 0.35 : isBlocked ? 0.35 : 1,
                      background: isSelected ? "rgba(34,197,94,0.14)" : "transparent",
                      border: isSelected ? "1px solid rgba(34,197,94,0.50)" : "1px solid rgba(15,23,42,0.12)",
                      color: isSelected ? "rgba(34,197,94,0.95)" : undefined,
                    }}
                    title={isBlocked ? "Overlaps an existing appointment" : "Select start time"}
                  >
                    {label}
                    {isBlocked ? " • busy" : ""}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Submit */}
      <form action={createAppointmentAction} style={{ display: "grid", gap: 10 }}>
        <input type="hidden" name="job_id" value={selectedJobId} />
        <input type="hidden" name="start_at" value={selectedStart?.startsAt || ""} />
        <input type="hidden" name="end_at" value={selectedEnd || ""} />
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="service_kinds" value={serviceKindsCsv} />
        <input type="hidden" name="assignee" value={assignee} />
        <input type="hidden" name="notes" value={notes} />

        <button
          type="submit"
          className="admin-btn"
          disabled={!canSchedule}
          style={{
            borderRadius: 14,
            padding: "11px 12px",
            fontWeight: 950,
            opacity: canSchedule ? 1 : 0.55,
            background: canSchedule ? "rgba(34,197,94,0.14)" : undefined,
            border: canSchedule ? "1px solid rgba(34,197,94,0.35)" : undefined,
          }}
        >
          {selectedStart
            ? `Schedule: ${dayLabel(new Date(selectedStart.startsAt))} • ${timeLabel(new Date(selectedStart.startsAt))}–${timeLabel(
                new Date(selectedEnd)
              )}${mode === "both" ? " • (Both)" : ""}`
            : "Schedule selected slot"}
        </button>

        <div style={{ fontSize: 12, opacity: 0.65 }}>
          Saves to <code>admin_job_appointments</code> • The “Needs scheduling” list reads from{" "}
          <code>v_jobs_needing_service_schedule</code>.
        </div>
      </form>
    </div>
  );
}
