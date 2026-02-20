import { HomeIcon } from "@heroicons/react/24/outline";

export default function MyHomePage() {
  return (
    <div style={{ textAlign: "center", padding: "64px 16px" }}>
      <HomeIcon style={{ width: 48, height: 48, color: "#334155", margin: "0 auto 16px" }} />
      <h1 style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9", marginBottom: 8 }}>
        My Home
      </h1>
      <p style={{ fontSize: 14, color: "#64748b" }}>Coming in 8C</p>
    </div>
  );
}
