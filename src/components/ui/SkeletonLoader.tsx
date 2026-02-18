"use client";

type SkeletonProps = {
  width?: string | number;
  height?: string | number;
  rounded?: "sm" | "md" | "lg" | "full";
  className?: string;
};

const RADIUS = { sm: 4, md: 8, lg: 12, full: 9999 };

export default function SkeletonLoader({
  width = "100%",
  height = 16,
  rounded = "md",
  className = "",
}: SkeletonProps) {
  return (
    <div
      className={className}
      style={{
        width,
        height,
        borderRadius: RADIUS[rounded],
        background: "linear-gradient(90deg, #1e293b 25%, #273548 50%, #1e293b 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite",
      }}
    />
  );
}

export function SkeletonRow() {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 16px" }}>
      <SkeletonLoader width={120} height={14} />
      <SkeletonLoader width={200} height={14} />
      <SkeletonLoader width={80} height={24} rounded="full" />
      <SkeletonLoader width={60} height={14} />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div
      style={{
        background: "#1e293b",
        border: "1px solid #334155",
        borderRadius: 12,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <SkeletonLoader width={100} height={12} />
      <SkeletonLoader width={60} height={28} />
      <SkeletonLoader width={80} height={12} />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div
      style={{
        background: "#1e293b",
        border: "1px solid #334155",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #334155" }}>
        <SkeletonLoader width={200} height={14} />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            borderBottom: i < rows - 1 ? "1px solid rgba(51,65,85,0.5)" : "none",
          }}
        >
          <SkeletonRow />
        </div>
      ))}
    </div>
  );
}
