"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteJobInlineButton(props: {
  jobId: string;
  label?: string;
  compact?: boolean;
  redirectTo?: string;
  confirmText?: string;
  className?: string;
}) {
  const {
    jobId,
    label = "Delete",
    compact = true,
    redirectTo = "/admin/jobs",
    confirmText = "Delete this job? This cannot be undone.",
    className,
  } = props;

  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    if (!jobId || loading) return;

    const ok = window.confirm(confirmText);
    if (!ok) return;

    try {
      setLoading(true);
      const res = await fetch("/admin/jobs/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobId }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) {
        console.error("Delete failed:", json);
        alert(json?.error || "Failed to delete job.");
        return;
      }

      // Navigate back and refresh the list
      router.push(redirectTo);
      router.refresh();
    } catch (e) {
      console.error(e);
      alert("Failed to delete job.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={loading}
      className={className || "admin-btn"}
      style={{
        borderRadius: 999,
        textDecoration: "none",
        fontWeight: 900,
        fontSize: compact ? 12 : 13,
        padding: compact ? "6px 10px" : "8px 12px",
        border: "1px solid rgba(239,68,68,0.35)",
        background: "rgba(239,68,68,0.10)",
        color: "rgb(185,28,28)",
        opacity: loading ? 0.6 : 1,
        cursor: loading ? "not-allowed" : "pointer",
      }}
      title="Delete job"
    >
      {loading ? "Deleting…" : label}
    </button>
  );
}
