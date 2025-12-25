import Link from "next/link";

export default function Home() {
  return (
    <main style={{ padding: 24 }}>
      <h1>LEAF System Snapshot</h1>
      <p>Clean slate. App Router is working.</p>

      <Link
        href="/admin"
        style={{
          display: "inline-block",
          marginTop: 16,
          padding: "10px 14px",
          border: "1px solid #000",
          textDecoration: "none",
          fontWeight: 500,
        }}
      >
        Go to Admin
      </Link>
    </main>
  );
}
