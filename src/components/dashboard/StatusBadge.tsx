"use client";

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  // System lead statuses
  available:    { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200" },
  purchased:    { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200" },
  expired:      { bg: "bg-slate-50",  text: "text-slate-500",  border: "border-slate-200" },
  archived:     { bg: "bg-slate-50",  text: "text-slate-500",  border: "border-slate-200" },

  // Contacted statuses
  new:          { bg: "bg-slate-50",  text: "text-slate-600",  border: "border-slate-200" },
  contacted:    { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200" },
  quoted:       { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200" },
  closed:       { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200" },
  lost:         { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200" },

  // HES request statuses
  pending:             { bg: "bg-slate-50",  text: "text-slate-600",  border: "border-slate-200" },
  assigned_internal:   { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200" },
  assigned_affiliate:  { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  completed:           { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200" },
  cancelled:           { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200" },

  // Work statuses
  "in-progress":       { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200" },

  // Payment
  failed:              { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200" },
  refunded:            { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200" },
};

const LABELS: Record<string, string> = {
  assigned_internal: "Assigned (REI)",
  assigned_affiliate: "Assigned (Affiliate)",
  "in-progress": "In Progress",
};

type StatusBadgeProps = {
  status: string;
  className?: string;
};

export default function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.new;
  const label = LABELS[status] ?? status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style.bg} ${style.text} ${style.border} ${className}`}
    >
      {label}
    </span>
  );
}
