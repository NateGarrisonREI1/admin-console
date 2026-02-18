"use client";

import { useMemo, useState } from "react";
import { fmtDate } from "../_lib/console";

export default function TimelineCard(props: {
  events: any[];
  addEventAction: (formData: FormData) => Promise<void>;
}) {
  const { events, addEventAction } = props;

  const count = events?.length ?? 0;

  const autoCollapsed = count > 6;
  const [open, setOpen] = useState(!autoCollapsed);

  const preview = useMemo(() => {
    if (!events || events.length === 0) return "No activity yet.";
    const top = events.slice(0, 2);
    const lines = top.map((e: any) => {
      const t = (e?.type || "note").toString().toUpperCase();
      const msg = (e?.message || "—").toString().replace(/\s+/g, " ").trim();
      const short = msg.length > 90 ? msg.slice(0, 90) + "…" : msg;
      return `${t}: ${short}`;
    });
    const more = events.length - top.length;
    return more > 0 ? `${lines.join("\n")}\n+ ${more} more…` : lines.join("\n");
  }, [events]);

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
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9", display: "flex", alignItems: "center", gap: 10 }}>
            <span>Activity Timeline</span>
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
              title={`${count} events`}
            >
              {count ? `${count} events` : "empty"}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>Internal log (for now)</div>
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
          aria-controls="timeline-body"
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
        <div id="timeline-body" style={{ marginTop: 12 }}>
          <form action={addEventAction} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              className="admin-input"
              name="message"
              placeholder="Log note: called broker, requested docs, sent draft, etc."
              style={{ flex: "1 1 420px" }}
            />
            <select className="admin-select" name="type" defaultValue="note" style={{ width: 160 }}>
              <option value="note">note</option>
              <option value="contact">contact</option>
              <option value="delivery">delivery</option>
              <option value="status">status</option>
            </select>
            <button
              className="admin-btn-primary"
              type="submit"
              style={{ borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700 }}
            >
              Add
            </button>
          </form>

          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            {events.length === 0 ? (
              <div style={{ fontSize: 13, color: "#94a3b8" }}>No activity yet.</div>
            ) : (
              events.map((e: any, idx: number) => (
                <div
                  key={`${e.ts || idx}-${idx}`}
                  style={{
                    border: "1px solid #334155",
                    borderRadius: 10,
                    padding: 12,
                    background: "#0f172a",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: "#f1f5f9", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {(e.type || "note").toString().toUpperCase()}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{fmtDate(e.ts)}</div>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 13, color: "#cbd5e1", whiteSpace: "pre-wrap" }}>
                    {e.message || "—"}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
