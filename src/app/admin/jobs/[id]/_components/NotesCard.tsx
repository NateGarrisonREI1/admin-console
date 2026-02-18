"use client";

import { useMemo, useState } from "react";

export default function NotesCard(props: {
  adminNotes: string;
  saveAdminNotes: (formData: FormData) => Promise<void>;
}) {
  const { adminNotes, saveAdminNotes } = props;

  const noteText = (adminNotes ?? "").toString();
  const noteLen = noteText.trim().length;

  const autoCollapsed = noteLen > 280;
  const [open, setOpen] = useState(!autoCollapsed);

  const preview = useMemo(() => {
    const t = noteText.trim();
    if (!t) return "No notes yet.";
    const oneLine = t.replace(/\s+/g, " ").trim();
    if (oneLine.length <= 160) return oneLine;
    return oneLine.slice(0, 160) + "…";
  }, [noteText]);

  return (
    <div
      style={{
        background: "#1e293b",
        border: "1px solid #334155",
        borderRadius: 12,
        padding: 20,
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9", display: "flex", alignItems: "center", gap: 10 }}>
            <span>Internal Notes</span>
            <span
              style={{
                fontSize: 11,
                color: "#94a3b8",
                padding: "2px 8px",
                borderRadius: 999,
                border: "1px solid #334155",
                background: "rgba(100,116,139,0.10)",
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
              title={`${noteLen} characters`}
            >
              {noteLen ? `${noteLen} chars` : "empty"}
            </span>
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: "#94a3b8" }}>
            Not visible to broker/client.
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="admin-btn-secondary"
          style={{
            borderRadius: 8,
            width: "fit-content",
            padding: "6px 12px",
            fontSize: 12,
            fontWeight: 700,
          }}
          aria-expanded={open}
          aria-controls="admin-notes-body"
        >
          {open ? "Collapse" : "Expand"}
        </button>
      </div>

      {/* Collapsed preview */}
      {!open && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 10,
            border: "1px solid #334155",
            background: "#0f172a",
            fontSize: 13,
            lineHeight: "18px",
            color: "#cbd5e1",
            whiteSpace: "pre-wrap",
          }}
        >
          {preview}
        </div>
      )}

      {/* Expandable body */}
      {open && (
        <div id="admin-notes-body" style={{ marginTop: 12 }}>
          <form action={saveAdminNotes} style={{ display: "grid", gap: 10 }}>
            <textarea
              name="admin_notes"
              defaultValue={adminNotes}
              className="admin-input"
              rows={8}
              placeholder="Internal notes…"
              style={{ resize: "vertical" }}
            />
            <button
              className="admin-btn-primary"
              type="submit"
              style={{ borderRadius: 8, width: "fit-content", padding: "8px 16px", fontSize: 13, fontWeight: 700 }}
            >
              Save Notes
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
