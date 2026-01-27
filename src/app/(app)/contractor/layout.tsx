// src/app/contractor/layout.tsx
import ContractorSidebar from "./_components/ContractorSidebar";

export default function ContractorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <ContractorSidebar />
      <main style={{ flex: 1 }}>
        {children}
      </main>
    </div>
  );
}
