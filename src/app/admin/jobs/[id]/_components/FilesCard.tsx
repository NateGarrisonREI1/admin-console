import { fmtBytes, fmtDate } from "../_lib/console";

export default function FilesCard(props: { files: any[]; signed: Record<string, string> }) {
  const { files, signed } = props;

  return (
    <div className="admin-card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontWeight: 950 }}>Files</div>
        <div style={{ fontSize: 12, opacity: 0.65 }}>Signed links (15 minutes)</div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {files.length === 0 ? (
          <div style={{ fontSize: 13, opacity: 0.7 }}>No files uploaded.</div>
        ) : (
          files.map((f: any) => {
            const url = signed[String(f.id)];
            return (
              <div
                key={f.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 14,
                  padding: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                  alignItems: "center",
                  background: "#fff",
                }}
              >
                <div style={{ minWidth: 220, flex: "1 1 520px" }}>
                  <div style={{ fontWeight: 900, wordBreak: "break-word" }}>{f._name}</div>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 12,
                      opacity: 0.72,
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
                      className="admin-btn"
                      style={{ textDecoration: "none", borderRadius: 999, paddingInline: 12 }}
                    >
                      Download
                    </a>
                  ) : (
                    <span style={{ fontSize: 12, opacity: 0.6 }}>No link</span>
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
