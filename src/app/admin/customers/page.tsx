"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";

type Customer = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  created_at?: string;
};

export default function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("customers")
        .select("id,name,email,phone,created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        setError(error.message);
        setRows([]);
      } else {
        setRows((data as Customer[]) ?? []);
      }

      setLoading(false);
    };

    run();
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>Customers</h1>
          <p style={{ marginTop: 8, color: "#555" }}>
            Showing up to 50 most recent records from <code>public.customers</code>
          </p>
        </div>

        <Link
          href="/admin"
          style={{
            alignSelf: "flex-start",
            padding: "10px 12px",
            border: "1px solid #ddd",
            borderRadius: 8,
            textDecoration: "none",
          }}
        >
          ← Back to Admin
        </Link>
      </div>

      <div style={{ marginTop: 16 }}>
        {loading && <p>Loading…</p>}
        {error && (
          <div style={{ padding: 12, border: "1px solid #f3b4b4", borderRadius: 8 }}>
            <strong style={{ color: "#b00020" }}>Supabase error:</strong>{" "}
            <span style={{ color: "#b00020" }}>{error}</span>
            <div style={{ marginTop: 8, color: "#555" }}>
              Double-check your Vercel Environment Variables:
              <ul style={{ marginTop: 8 }}>
                <li>NEXT_PUBLIC_SUPABASE_URL</li>
                <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
              </ul>
            </div>
          </div>
        )}

        {!loading && !error && (
          <div style={{ marginTop: 12, overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                border: "1px solid #eee",
              }}
            >
              <thead>
                <tr>
                  {["Name", "Email", "Phone", "ID"].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "10px 12px",
                        borderBottom: "1px solid #eee",
                        background: "#fafafa",
                        fontWeight: 600,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: "12px" }}>
                      No customers found (table empty or RLS blocking read).
                    </td>
                  </tr>
                ) : (
                  rows.map((c) => (
                    <tr key={c.id}>
                      <td style={{ padding: "10px 12px", borderBottom: "1px solid #f2f2f2" }}>
                        {c.name ?? "—"}
                      </td>
                      <td style={{ padding: "10px 12px", borderBottom: "1px solid #f2f2f2" }}>
                        {c.email ?? "—"}
                      </td>
                      <td style={{ padding: "10px 12px", borderBottom: "1px solid #f2f2f2" }}>
                        {c.phone ?? "—"}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          borderBottom: "1px solid #f2f2f2",
                          fontFamily: "monospace",
                          fontSize: 12,
                        }}
                      >
                        {c.id}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
