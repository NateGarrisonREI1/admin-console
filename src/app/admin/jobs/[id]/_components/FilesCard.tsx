import { fmtBytes, fmtDate } from "../_lib/console";

export default function FilesCard(props: { files: any[]; signed: Record<string, string> }) {
  const { files, signed } = props;

  return (
    <div
      style={{
        background: "#1e293b",
        border: "1px solid #334155",
        borderRadius: 12,
        padding: 20,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9" }}>Files</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Signed links (15 minutes)</div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {files.length === 0 ? (
          <div style={{ fontSize: 13, color: "#94a3b8" }}>No files uploaded.</div>
        ) : (
          files.map((f: any) => {
            const url = signed[String(f.id)];
            return (
              <div
                key={f.id}
                style={{
                  border: "1px solid #334155",
                  borderRadius: 12,
                  padding: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                  alignItems: "center",
                  background: "#0f172a",
                }}
              >
                <div style={{ minWidth: 220, flex: "1 1 520px" }}>
                  <div style={{ fontWeight: 700, color: "#f1f5f9", wordBreak: "break-word" }}>{f._name}</div>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 12,
                      color: "#94a3b8",
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <span>{f._type || "—"}</span>
                    <span>• {fmtBytes(f._size)}</span>
                    <span>• {fmtDate(f.created_at)}</span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="admin-btn-primary"
                      style={{ textDecoration: "none", borderRadius: 999, paddingInline: 14, paddingBlock: 6, fontSize: 13, fontWeight: 700 }}
                    >
                      Download
                    </a>
                  ) : (
                    <span style={{ fontSize: 12, color: "#64748b" }}>No link</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
