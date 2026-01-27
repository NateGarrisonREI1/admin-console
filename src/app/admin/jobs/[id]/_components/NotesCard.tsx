"use client";

import { useMemo, useState } from "react";

export default function NotesCard(props: {
  adminNotes: string;
  saveAdminNotes: (formData: FormData) => Promise<void>;
}) {
  const { adminNotes, saveAdminNotes } = props;

  const noteText = (adminNotes ?? "").toString();
  const noteLen = noteText.trim().length;

  // Auto-collapse if notes are long
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
    <div className="admin-card">
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
          <div style={{ fontWeight: 950, display: "flex", alignItems: "center", gap: 10 }}>
            <span>Internal Notes</span>
            <span
              style={{
                fontSize: 12,
                opacity: 0.65,
                padding: "2px 8px",
                borderRadius: 999,
                border: "1px solid rgba(0,0,0,0.08)",
                background: "rgba(0,0,0,0.02)",
                fontWeight: 850,
                whiteSpace: "nowrap",
              }}
              title={`${noteLen} characters`}
            >
              {noteLen ? `${noteLen} chars` : "empty"}
            </span>
          </div>
          <div style={{ marginTop: 6, fontSize: 13, opacity: 0.7 }}>
            Not visible to broker/client.
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="admin-btn"
          style={{
            borderRadius: 999,
            width: "fit-content",
            padding: "6px 10px",
            fontSize: 13,
            fontWeight: 900,
            opacity: 0.95,
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
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.08)",
            background: "rgba(0,0,0,0.02)",
            fontSize: 13,
            lineHeight: "18px",
            opacity: 0.9,
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
            <button className="admin-btn" type="submit" style={{ borderRadius: 999, width: "fit-content" }}>
              Save Notes
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
