"use client";

import { useEffect, useState } from "react";
import { LEAF_SS_CONFIG } from "../_data/leafSSConfig";

const STORAGE_KEY = "LEAF_SS_CONFIG_OVERRIDE";

export default function LeafSSConfigEditorPage() {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Load config on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setText(stored);
    } else {
      setText(JSON.stringify(LEAF_SS_CONFIG, null, 2));
    }
  }, []);

  function handleSave() {
    try {
      const parsed = JSON.parse(text);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed, null, 2));
      setError(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e: any) {
      setError(e.message || "Invalid JSON");
    }
  }

  function handleReset() {
    if (!confirm("Reset LEAF SS config to defaults? This cannot be undone.")) return;
    localStorage.removeItem(STORAGE_KEY);
    setText(JSON.stringify(LEAF_SS_CONFIG, null, 2));
    setError(null);
  }

  return (
    <div style={{ padding: 24, maxWidth: 960 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>
        LEAF System Snapshot — Master Config
      </h1>

      <p style={{ marginTop: 8, color: "#666", maxWidth: 760 }}>
        This is the global configuration that controls all LEAF System Snapshot
        ranges, tiers, messaging, and logic. Changes here affect every report
        instantly. Snapshot-specific overrides will layer on top of this.
      </p>

      <div style={{ marginTop: 16 }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          style={{
            width: "100%",
            minHeight: 520,
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontSize: 13,
            lineHeight: 1.5,
            padding: 14,
            borderRadius: 10,
            border: "1px solid #ccc",
          }}
        />
      </div>

      {error && (
        <div
          style={{
            marginTop: 10,
            color: "#b91c1c",
            fontWeight: 700,
          }}
        >
          JSON Error: {error}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 16,
          alignItems: "center",
        }}
      >
        <button
          onClick={handleSave}
          style={{
            padding: "10px 16px",
            borderRadius: 999,
            border: "none",
            background: "#43a419",
            color: "#000",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Save Config
        </button>

        <button
          onClick={handleReset}
          style={{
            padding: "10px 16px",
            borderRadius: 999,
            border: "1px solid #ccc",
            background: "#fff",
            color: "#111",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Reset to Defaults
        </button>

        {saved && (
          <span style={{ color: "#15803d", fontWeight: 800 }}>
            ✓ Saved
          </span>
        )}
      </div>

      <div style={{ marginTop: 20, fontSize: 13, color: "#555" }}>
        <b>Notes:</b>
        <ul style={{ marginTop: 6 }}>
          <li>Edits here override the compiled config.</li>
          <li>No redeploy required.</li>
          <li>Invalid JSON will not save.</li>
          <li>Future versions can persist this to DB.</li>
        </ul>
      </div>
    </div>
  );
}
