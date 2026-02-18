// src/app/(app)/contractor/_components/ContractorShell.tsx
// Kept for backwards compatibility — no longer used by the layout.
// The layout now renders the sidebar + children directly (no gates).
"use client";

import ContractorSidebar from "./ContractorSidebar";

type Props = {
  children: React.ReactNode;
};

export default function ContractorShell({ children }: Props) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0f172a" }}>
      <ContractorSidebar />
      <main style={{ flex: 1, overflow: "auto" }}>
        {children}
      </main>
    </div>
  );
}
