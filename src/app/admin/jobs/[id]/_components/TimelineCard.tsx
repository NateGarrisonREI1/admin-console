"use client";

import { useMemo, useState } from "react";
import { fmtDate } from "../_lib/console";

export default function TimelineCard(props: {
  events: any[];
  addEventAction: (formData: FormData) => Promise<void>;
}) {
  const { events, addEventAction } = props;

  const count = events?.length ?? 0;

  // Auto-collapse if there are lots of events
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
    <div className="admin-card">
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
          <div style={{ fontWeight: 950, display: "flex", alignItems: "center", gap: 10 }}>
            <span>Activity Timeline</span>
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
              title={`${count} events`}
            >
              {count ? `${count} events` : "empty"}
            </span>
          </div>
          <div style={{ fontSize: 12, opacity: 0.65, marginTop: 6 }}>Internal log (for now)</div>
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
        <div id="timeline-body" style={{ marginTop: 12 }}>
          <form action={addEventAction} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              className="admin-input"
              name="message"
              placeholder="Log note: called broker, requested docs, sent draft, etc."
              style={{ flex: "1 1 420px" }}
            />
            <select className="admin-input" name="type" defaultValue="note" style={{ width: 160 }}>
              <option value="note">note</option>
              <option value="contact">contact</option>
              <option value="delivery">delivery</option>
              <option value="status">status</option>
            </select>
            <button className="admin-btn" type="submit" style={{ borderRadius: 999 }}>
              Add
            </button>
          </form>

          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            {events.length === 0 ? (
              <div style={{ fontSize: 13, opacity: 0.7 }}>No activity yet.</div>
            ) : (
              events.map((e: any, idx: number) => (
                <div
                  key={`${e.ts || idx}-${idx}`}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 14,
                    padding: 12,
                    background: "#fff",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 850 }}>{(e.type || "note").toString().toUpperCase()}</div>
                    <div style={{ fontSize: 12, opacity: 0.65 }}>{fmtDate(e.ts)}</div>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 13, opacity: 0.9, whiteSpace: "pre-wrap" }}>
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
