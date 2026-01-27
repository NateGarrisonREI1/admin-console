export function fmtDate(ts?: string | null) {
  try {
    return ts ? new Date(ts).toLocaleString() : "—";
  } catch {
    return "—";
  }
}

export function fmtBytes(n?: number | null) {
  if (n == null) return "—";
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let x = v;
  let i = 0;
  while (x >= 1024 && i < units.length - 1) {
    x /= 1024;
    i++;
  }
  return `${x.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function outputLabel(v: string) {
  if (v === "leaf_snapshot" || v === "snapshot") return "Snapshot";
  if (v === "inspection") return "Inspection";
  if (v === "hes_report" || v === "hes") return "HES";
  return v;
}

export function pillClass(tone: "live" | "later" = "later") {
  return tone === "live" ? "pill-live" : "pill-later";
}


export function mapsHref(address: string) {
  const q = encodeURIComponent(address);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export function smsHref(phone: string, body: string) {
  const p = phone.replace(/[^\d+]/g, "");
  return `sms:${p}?&body=${encodeURIComponent(body)}`;
}

export function ageLabel(createdAt?: string | null) {
  if (!createdAt) return "—";
  const t = new Date(createdAt).getTime();
  if (!Number.isFinite(t)) return "—";
  const ms = Date.now() - t;
  const mins = Math.max(0, Math.floor(ms / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export type ChecklistItem = {
  id: string;
  label: string;
  done?: boolean;
  hint?: string;
};

export function defaultChecklist(opts: {
  wantsSnapshot: boolean;
  wantsInspectionOrHes: boolean;
}) {
  const items: ChecklistItem[] = [];

  // Always
  items.push(
    { id: "review_intake", label: "Review intake details" },
    { id: "validate_address", label: "Validate property address" }
  );

  if (opts.wantsSnapshot) {
    items.push(
      { id: "snapshot_inputs", label: "Confirm snapshot inputs (sqft, systems, assumptions)" },
      { id: "snapshot_build", label: "Build Snapshot Worksheet" },
      { id: "snapshot_generate", label: "Generate deliverable (PDF/Share link)" },
      { id: "snapshot_deliver", label: "Deliver Snapshot to broker/client" }
    );
  }

  if (opts.wantsInspectionOrHes) {
    items.push(
      { id: "schedule", label: "Schedule inspection / HES workflow" },
      { id: "complete", label: "Complete inspection / data collection" },
      { id: "deliver", label: "Deliver inspection/HES output" }
    );
  }

  items.push({ id: "close", label: "Close request" });
  return items;
}

export function normalizeAddr(job: any) {
  return [job.address1, job.address2, job.city, job.state, job.zip]
    .filter(Boolean)
    .join(", ");
}

export function safeObj(v: any): any {
  return v && typeof v === "object" ? v : {};
}

export function ensurePayloadShape(payload: any) {
  const p = safeObj(payload);
  if (!p.console) p.console = {};
  if (!p.console.timeline) p.console.timeline = [];
  if (!p.console.checklist) p.console.checklist = {};
  return p;
}

export function upsertChecklist(payload: any, items: ChecklistItem[]) {
  const p = ensurePayloadShape(payload);
  const map = safeObj(p.console.checklist);
  for (const it of items) {
    const prev = map[it.id];
    map[it.id] = {
      id: it.id,
      label: it.label,
      done: Boolean(prev?.done),
      hint: it.hint || prev?.hint || "",
    };
  }
  p.console.checklist = map;
  return p;
}

export function checklistProgress(payload: any) {
  const p = ensurePayloadShape(payload);
  const map = safeObj(p.console.checklist);
  const items = Object.values(map) as any[];
  if (items.length === 0) return { done: 0, total: 0, pct: 0 };
  const done = items.filter((x) => x?.done).length;
  const total = items.length;
  const pct = Math.round((done / total) * 100);
  return { done, total, pct };
}
