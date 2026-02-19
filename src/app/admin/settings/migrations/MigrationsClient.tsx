// src/app/admin/settings/migrations/MigrationsClient.tsx
"use client";

import { useState } from "react";
import { runMigration } from "../../_actions/migrations";

const CARD = "#1e293b";
const BORDER = "#334155";
const TEXT = "#f1f5f9";
const TEXT_DIM = "#64748b";
const TEXT_MUTED = "#94a3b8";
const EMERALD = "#10b981";

type Props = {
  files: string[];
};

export default function MigrationsClient({ files }: Props) {
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { success: boolean; message: string; details?: string }>>({});

  async function handleRun(filename: string) {
    setRunning(filename);
    try {
      const result = await runMigration(filename);
      setResults((prev) => ({ ...prev, [filename]: result }));
    } catch (e) {
      setResults((prev) => ({
        ...prev,
        [filename]: { success: false, message: e instanceof Error ? e.message : "Unknown error" },
      }));
    } finally {
      setRunning(null);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: TEXT, margin: 0 }}>Database Migrations</h2>
        <p style={{ marginTop: 6, fontSize: 13, color: TEXT_MUTED, lineHeight: 1.45 }}>
          Run SQL migrations against the Supabase database. Use with caution.
        </p>
      </div>

      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "8px 16px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: TEXT_MUTED }}>{files.length} migration files</span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="admin-table" style={{ minWidth: 600 }}>
            <thead>
              <tr>
                <th>Migration File</th>
                <th style={{ width: 120 }}>Status</th>
                <th style={{ width: 100 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => {
                const result = results[file];
                const isRunning = running === file;
                return (
                  <tr key={file}>
                    <td>
                      <span style={{ fontSize: 13, fontWeight: 500, color: TEXT, fontFamily: "monospace" }}>
                        {file}
                      </span>
                    </td>
                    <td>
                      {result ? (
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            background: result.success ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                            color: result.success ? EMERALD : "#ef4444",
                          }}
                        >
                          {result.success ? "Success" : "Error"}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: TEXT_DIM }}>Not run</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleRun(file)}
                        disabled={isRunning}
                        style={{
                          padding: "5px 12px",
                          borderRadius: 6,
                          border: "none",
                          background: isRunning ? TEXT_DIM : EMERALD,
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: isRunning ? "not-allowed" : "pointer",
                          opacity: isRunning ? 0.6 : 1,
                        }}
                      >
                        {isRunning ? "Running..." : "Run"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {files.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ textAlign: "center", padding: 32, color: TEXT_DIM, fontSize: 13 }}>
                    No migration files found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Show error details if any */}
      {Object.entries(results).some(([, r]) => r.details) && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "#ef4444", margin: "0 0 8px" }}>Error Details</h3>
          {Object.entries(results)
            .filter(([, r]) => r.details)
            .map(([file, r]) => (
              <div key={file} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: TEXT_MUTED, fontFamily: "monospace" }}>{file}</div>
                <pre style={{ fontSize: 11, color: "#ef4444", whiteSpace: "pre-wrap", margin: "4px 0 0", lineHeight: 1.4 }}>
                  {r.details}
                </pre>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
