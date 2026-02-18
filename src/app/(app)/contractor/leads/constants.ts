// Shared constants for the leads pages (not "use server" — plain exports)

export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: "Purchased", color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
  contacted: { label: "Contacted", color: "#eab308", bg: "rgba(234,179,8,0.15)" },
  quoted: { label: "Quoted", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  scheduled: { label: "Scheduled", color: "#a855f7", bg: "rgba(168,85,247,0.15)" },
  in_progress: { label: "In Progress", color: "#06b6d4", bg: "rgba(6,182,212,0.15)" },
  closed: { label: "Completed", color: "#10b981", bg: "rgba(16,185,129,0.15)" },
  lost: { label: "Closed - Lost", color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
};

export const PIPELINE_ORDER = ["new", "contacted", "quoted", "scheduled", "in_progress", "closed"];
