import Link from "next/link";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "../../../lib/supabase/admin";
import AvailabilityControls from "./_components/AvailabilityControls";
import SlotList from "./_components/SlotList";

function s(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function fmt(dt?: string | null) {
  if (!dt) return "—";
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return dt;
  }
}

type NeedRow = {
  job_id: string;
  created_at: string | null;
  confirmation_code: string | null;
  requested_outputs: string[] | null;
  response_status: string | null;
  status: string | null;

  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;

  customer_name: string | null;
  broker_name: string | null;

  needs_inspection: boolean | null;
  needs_hes: boolean | null;
  missing_inspection_schedule: boolean | null;
  missing_hes_schedule: boolean | null;
};

type ApptRow = {
  id: string;
  job_id: string;
  kind: string;
  status: string | null;
  start_at: string | null;
  end_at: string | null;
  assignee: string | null;
  notes: string | null;
  service_kinds?: string[] | null;
};

function addr(row: Pick<NeedRow, "address1" | "address2" | "city" | "state" | "zip">) {
  const a1 = s(row.address1).trim();
  const a2 = s(row.address2).trim();
  const city = s(row.city).trim();
  const st = s(row.state).trim();
  const zip = s(row.zip).trim();

  const line = [a1, a2].filter(Boolean).join(", ");
  const csz = [city, st, zip].filter(Boolean).join(" ");
  return [line, csz].filter(Boolean).join(" • ") || "Address TBD";
}

function normalizePreselectKind(raw?: string) {
  const v = s(raw).trim().toLowerCase();
  if (v === "inspection") return "inspection";
  if (v === "hes") return "hes";
  return "inspection";
}

function pill(label: string, tone: "needs" | "scheduled") {
  const isNeeds = tone === "needs";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        borderRadius: 999,
        padding: "4px 10px",
        fontSize: 12,
        fontWeight: 950,
        border: isNeeds ? "1px solid rgba(234,179,8,0.45)" : "1px solid rgba(34,197,94,0.35)",
        background: isNeeds ? "rgba(234,179,8,0.14)" : "rgba(34,197,94,0.12)",
        color: isNeeds ? "rgba(234,179,8,0.95)" : "rgba(34,197,94,0.95)",
        whiteSpace: "nowrap",
      }}
      title={isNeeds ? "Needs scheduling" : "Scheduled"}
    >
      {label}
      <span style={{ opacity: 0.75, fontWeight: 1000 }}>{isNeeds ? "• Needs" : "✓ Scheduled"}</span>
    </span>
  );
}

function displayName(row: NeedRow) {
  const customer = s(row.customer_name).trim();
  const broker = s(row.broker_name).trim();

  if (customer && broker) return `${customer} • ${broker}`;
  if (customer) return customer;
  if (broker) return broker;
  return "Unnamed customer";
}

function tabLink(href: string, active: boolean, label: string) {
  return (
    <Link
      href={href}
      style={{
        textDecoration: "none",
        fontWeight: 950,
        fontSize: 13,
        padding: "8px 12px",
        borderRadius: 999,
        border: active ? "1px solid rgba(34,197,94,0.45)" : "1px solid rgba(15,23,42,0.12)",
        background: active ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.02)",
        color: active ? "rgba(34,197,94,0.95)" : "rgba(148,163,184,0.95)",
      }}
    >
      {label}
    </Link>
  );
}

export default async function SchedulePage(props: {
  searchParams?: { job?: string; kind?: string; tab?: string };
}) {
  const admin = supabaseAdmin();

  const preselectJobId = s(props?.searchParams?.job).trim();
  const preselectKind = normalizePreselectKind(props?.searchParams?.kind);
  const tab = s(props?.searchParams?.tab).trim().toLowerCase() || "scheduler";
  const isScheduledTab = tab === "scheduled";

  // ✅ View contains customer_name + broker_name
  const { data: needRows, error: nErr } = await admin
    .from("v_jobs_needing_service_schedule")
    .select(
      `
      job_id,
      created_at,
      confirmation_code,
      requested_outputs,
      response_status,
      status,
      address1,
      address2,
      city,
      state,
      zip,
      customer_name,
      broker_name,
      needs_inspection,
      needs_hes,
      missing_inspection_schedule,
      missing_hes_schedule
    `
    )
    .order("created_at", { ascending: true })
    .limit(250);

  if (nErr) throw new Error(nErr.message);

  const rows = (needRows ?? []) as NeedRow[];

  const needsAny = rows.filter(
    (r) => Boolean(r.missing_inspection_schedule) || Boolean(r.missing_hes_schedule)
  );

  const jobsForPicker = needsAny.map((r) => ({
    id: r.job_id,
    customer_name: r.customer_name,
    broker_name: r.broker_name,
    address1: r.address1,
    city: r.city,
    state: r.state,
    zip: r.zip,
  }));

  const jobIds = rows.map((r) => r.job_id);
  const nowIso = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data: appts, error: aErr } = await admin
    .from("admin_job_appointments")
    .select("id,job_id,kind,status,start_at,end_at,assignee,notes,service_kinds")
    .in("job_id", jobIds.length ? jobIds : ["00000000-0000-0000-0000-000000000000"])
    .eq("status", "scheduled")
    .gte("start_at", nowIso)
    .order("start_at", { ascending: true });

  if (aErr) throw new Error(aErr.message);

  const apptRows = (appts ?? []) as ApptRow[];

  const jobById = new Map<string, NeedRow>();
  for (const r of rows) jobById.set(r.job_id, r);

  async function createAppointmentAction(formData: FormData) {
    "use server";
    const admin = supabaseAdmin();

    const jobId = s(formData.get("job_id")).trim();
    const startAt = s(formData.get("start_at")).trim();
    const endAt = s(formData.get("end_at")).trim();
    const assignee = s(formData.get("assignee")).trim() || "unassigned";
    const notes = s(formData.get("notes")).trim() || null;

    const kindRaw = s(formData.get("kind")).trim().toLowerCase();
    const kind = kindRaw === "visit" ? "visit" : kindRaw === "hes" ? "hes" : "inspection";

    const serviceKindsCsv = s(formData.get("service_kinds")).trim();
    const service_kinds =
      kind === "visit"
        ? serviceKindsCsv
            .split(",")
            .map((x) => x.trim().toLowerCase())
            .filter((x) => x === "inspection" || x === "hes")
        : null;

    if (!jobId || !startAt || !endAt) return;

    const { error } = await admin.from("admin_job_appointments").insert({
      job_id: jobId,
      start_at: startAt,
      end_at: endAt,
      kind,
      service_kinds,
      assignee,
      notes,
      status: "scheduled",
    });

    if (error) throw new Error(error.message);

    revalidatePath("/admin/schedule");
    revalidatePath("/admin/jobs");
    revalidatePath(`/admin/jobs/${jobId}`);
  }

  async function cancelAppointmentAction(formData: FormData) {
    "use server";
    const admin = supabaseAdmin();

    const apptId = s(formData.get("appt_id")).trim();
    const jobId = s(formData.get("job_id")).trim();
    if (!apptId) return;

    const { error } = await admin.from("admin_job_appointments").update({ status: "canceled" }).eq("id", apptId);
    if (error) throw new Error(error.message);

    revalidatePath("/admin/schedule");
    revalidatePath("/admin/jobs");
    if (jobId) revalidatePath(`/admin/jobs/${jobId}`);
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="admin-card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "grid", gap: 4 }}>
            <div style={{ fontWeight: 950 }}>Scheduling</div>
            <div style={{ fontSize: 12, opacity: 0.65 }}>
              Inspection = 3h • HES = 2h • Both schedules one visit for two tasks
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {tabLink("/admin/schedule", !isScheduledTab, "Scheduler")}
            {tabLink("/admin/schedule?tab=scheduled", isScheduledTab, "Scheduled")}
          </div>
        </div>
      </div>

      {isScheduledTab ? (
        <div className="admin-card" style={{ padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
            <div style={{ fontWeight: 950 }}>Upcoming scheduled</div>
            <div style={{ fontSize: 12, opacity: 0.65 }}>{apptRows.length} upcoming</div>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {apptRows.length === 0 ? (
              <div style={{ fontSize: 13, opacity: 0.7 }}>No scheduled items yet.</div>
            ) : (
              apptRows.slice(0, 200).map((a) => {
                const r = jobById.get(a.job_id);
                const name = r ? displayName(r) : "Job";
                const address = r ? addr(r) : "";

                const kindLabel =
                  a.kind === "visit"
                    ? `Visit (${(a.service_kinds || []).join(" + ") || "multi"})`
                    : a.kind === "hes"
                    ? "HES"
                    : "Inspection";

                return (
                  <div
                    key={a.id}
                    style={{
                      borderRadius: 14,
                      padding: 12,
                      border: "1px solid rgba(15,23,42,0.10)",
                      background: "rgba(255,255,255,0.02)",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ minWidth: 360 }}>
                      <div style={{ fontWeight: 950, fontSize: 13 }}>{name}</div>
                      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                        {fmt(a.start_at)} → {fmt(a.end_at)} • <span style={{ fontWeight: 900 }}>{kindLabel}</span> •{" "}
                        <span style={{ opacity: 0.85 }}>Assignee:</span> <span style={{ fontWeight: 900 }}>{s(a.assignee) || "unassigned"}</span>
                      </div>
                      {address ? <div style={{ marginTop: 6, fontSize: 12, opacity: 0.65 }}>{address}</div> : null}
                    </div>

                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <Link
                        href={`/admin/jobs/${a.job_id}`}
                        style={{ fontSize: 12, fontWeight: 950, textDecoration: "none", opacity: 0.85 }}
                      >
                        Open job →
                      </Link>

                      <form action={cancelAppointmentAction}>
                        <input type="hidden" name="appt_id" value={s(a.id)} />
                        <input type="hidden" name="job_id" value={s(a.job_id)} />
                        <button className="admin-btn" type="submit" style={{ borderRadius: 12, padding: "8px 10px" }}>
                          Cancel
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "520px 1fr", gap: 14, alignItems: "start" }}>
          {/* LEFT: Needs scheduling */}
          <div className="admin-card" style={{ padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
              <div style={{ fontWeight: 950 }}>Needs scheduling</div>
              <div style={{ fontSize: 12, opacity: 0.65 }}>{needsAny.length} jobs</div>
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              {needsAny.slice(0, 160).map((r) => {
                const active = preselectJobId === r.job_id;

                const insTone: "needs" | "scheduled" =
                  r.needs_inspection ? (r.missing_inspection_schedule ? "needs" : "scheduled") : "scheduled";

                const hesTone: "needs" | "scheduled" =
                  r.needs_hes ? (r.missing_hes_schedule ? "needs" : "scheduled") : "scheduled";

                return (
                  <div
                    key={r.job_id}
                    style={{
                      borderRadius: 14,
                      padding: 12,
                      border: active ? "1px solid rgba(34,197,94,0.45)" : "1px solid rgba(15,23,42,0.10)",
                      background: active ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.02)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                      <div style={{ fontWeight: 950, fontSize: 13 }}>{displayName(r)}</div>
                      <Link
                        href={`/admin/jobs/${r.job_id}`}
                        style={{ fontSize: 12, fontWeight: 900, textDecoration: "none", opacity: 0.75 }}
                      >
                        Open →
                      </Link>
                    </div>

                    <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>{addr(r)}</div>

                    <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      {r.needs_inspection ? (
                        <Link href={`/admin/schedule?job=${r.job_id}&kind=inspection`} style={{ textDecoration: "none" }}>
                          {pill("Inspection", insTone)}
                        </Link>
                      ) : null}

                      {r.needs_hes ? (
                        <Link href={`/admin/schedule?job=${r.job_id}&kind=hes`} style={{ textDecoration: "none" }}>
                          {pill("HES", hesTone)}
                        </Link>
                      ) : null}

                      <span style={{ fontSize: 12, opacity: 0.55 }}>Created: {fmt(r.created_at)}</span>
                    </div>
                  </div>
                );
              })}

              {needsAny.length === 0 ? (
                <div style={{ fontSize: 13, opacity: 0.7 }}>Nothing waiting right now.</div>
              ) : null}
            </div>
          </div>

          {/* RIGHT: Pick a time */}
          <div className="admin-card" style={{ padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 950 }}>Pick a time</div>
              <div style={{ fontSize: 12, opacity: 0.65 }}>Click a service pill to preselect job + type.</div>
            </div>

            <div style={{ marginTop: 12 }}>
              <AvailabilityControls />
            </div>

            <div style={{ marginTop: 12 }}>
              <SlotList
                jobs={jobsForPicker}
                preselectJobId={preselectJobId}
                preselectKind={preselectKind}
                createAppointmentAction={createAppointmentAction}
                existingScheduled={apptRows
                  .filter((a) => !!a.start_at && !!a.end_at)
                  .map((a) => ({ start_at: a.start_at as string, end_at: a.end_at as string }))}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
