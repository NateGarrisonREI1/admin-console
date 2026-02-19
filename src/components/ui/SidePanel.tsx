// src/components/ui/SidePanel.tsx
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type SidePanelProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: "w-1/4" | "w-1/3" | "w-2/5";
};

const WIDTH_MAP: Record<string, string> = {
  "w-1/4": "25%",
  "w-1/3": "33.333%",
  "w-2/5": "40%",
};

export default function SidePanel({ isOpen, onClose, title, children, width = "w-1/3" }: SidePanelProps) {
  const [mounted, setMounted] = useState(false);
  // visible tracks the CSS transition state (true = slid in)
  const [visible, setVisible] = useState(false);

  // Mount portal on first open
  useEffect(() => {
    if (isOpen) setMounted(true);
  }, [isOpen]);

  // Drive the slide animation after mount
  useEffect(() => {
    if (isOpen && mounted) {
      // Small delay so the browser paints the off-screen position first
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    if (!isOpen) {
      setVisible(false);
      // Unmount after the slide-out transition completes
      const t = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(t);
    }
  }, [isOpen, mounted]);

  // Lock body scroll while panel is open
  useEffect(() => {
    if (mounted) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [mounted]);

  if (!mounted) return null;

  const panelWidth = WIDTH_MAP[width] ?? WIDTH_MAP["w-1/3"];

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 9990,
          background: "rgba(0,0,0,0.30)",
          opacity: visible ? 1 : 0,
          transition: "opacity 300ms ease",
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed", right: 0, top: 0, height: "100%", zIndex: 9991,
          width: panelWidth, maxWidth: "90vw",
          background: "#0f172a", borderLeft: "1px solid #334155",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
          display: "flex", flexDirection: "column",
          transform: visible ? "translateX(0)" : "translateX(100%)",
          transition: "transform 300ms ease",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "20px 24px", borderBottom: "1px solid rgba(51,65,85,0.5)",
          flexShrink: 0,
        }}>
          {title && (
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "#f1f5f9", margin: 0 }}>
              {title}
            </h2>
          )}
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none", border: "none", padding: 4,
              color: "#94a3b8", fontSize: 18, cursor: "pointer",
              lineHeight: 1, transition: "color 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#f1f5f9"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#94a3b8"; }}
          >
            {"\u2715"}
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {children}
        </div>
      </div>
    </>,
    document.body,
  );
}
