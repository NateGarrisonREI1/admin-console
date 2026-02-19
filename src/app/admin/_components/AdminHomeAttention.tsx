// src/app/admin/_components/AdminHomeAttention.tsx
import Link from "next/link";

type AttentionItem = {
  title: string;
  desc: string;
  href: string;
  tone?: "warn" | "neutral";
};

export default function AdminHomeAttention() {
  // Build-stage: mocked “needs attention”
  const items: AttentionItem[] = [
    {
      title: "Leads expiring soon",
      desc: "4 leads expire within 48 hours — adjust price or re-post details.",
      href: "/admin/contractor-leads",
      tone: "warn",
    },
    {
      title: "Refund requests pending",
      desc: "2 open requests need review (approve/deny).",
      href: "/admin/contractor-leads",
      tone: "warn",
    },
    {
      title: "Jobs waiting on intake details",
      desc: "3 projects missing key fields (address / contact).",
      href: "/admin/schedule",
      tone: "neutral",
    },
  ];

  return (
    <div style={{ border: "1px solid #e5e7eb", background: "white", borderRadius: 16, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 950 }}>Needs attention</div>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
            A short list of things that can block progress.
          </div>
        </div>

        <span style={{ fontSize: 12, fontWeight: 900, opacity: 0.6 }}>Build-stage mock</span>
      </div>

      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((it) => (
          <AttentionRow key={it.title} item={it} />
        ))}
      </div>

      <div style={{ marginTop: 10, fontSize: 11, opacity: 0.6 }}>
        Later: wire this to real queries (expiring leads, open refunds, blocked jobs).
      </div>
    </div>
  );
}

function AttentionRow({ item }: { item: AttentionItem }) {
  const border =
    item.tone === "warn" ? "1px solid rgba(245,158,11,0.28)" : "1px solid #eef2f7";
  const bg = item.tone === "warn" ? "rgba(245,158,11,0.08)" : "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)";

  return (
    <Link
      href={item.href}
      style={{
        textDecoration: "none",
        borderRadius: 14,
        border,
        background: bg,
        padding: 12,
        color: "#111827",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: 950 }}>{item.title}</div>
        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 3 }}>{item.desc}</div>
      </div>

      <div style={{ fontSize: 12, fontWeight: 950, color: "#2f7a12", whiteSpace: "nowrap" }}>
        View →
      </div>
    </Link>
  );
}
