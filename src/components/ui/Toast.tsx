"use client";

import { createContext, useCallback, useContext, useState } from "react";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
  dismissing?: boolean;
};

type ToastCtx = {
  toast: (type: ToastType, message: string, description?: string) => void;
  success: (message: string, description?: string) => void;
  error: (message: string, description?: string) => void;
};

const ToastContext = createContext<ToastCtx>({
  toast: () => {},
  success: () => {},
  error: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

const COLORS: Record<ToastType, { bg: string; border: string; accent: string; icon: string }> = {
  success: {
    bg: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.25)",
    accent: "#10b981",
    icon: "\u2713",
  },
  error: {
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.25)",
    accent: "#ef4444",
    icon: "\u2717",
  },
  info: {
    bg: "rgba(59,130,246,0.12)",
    border: "rgba(59,130,246,0.25)",
    accent: "#3b82f6",
    icon: "i",
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, dismissing: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 150);
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, description?: string) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, type, message, description }]);

      if (type === "success" || type === "info") {
        setTimeout(() => dismiss(id), 5000);
      }
    },
    [dismiss]
  );

  const ctx: ToastCtx = {
    toast: addToast,
    success: (msg, desc) => addToast("success", msg, desc),
    error: (msg, desc) => addToast("error", msg, desc),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}

      {/* Toast container */}
      <div
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          zIndex: 99999,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxWidth: 380,
        }}
      >
        {toasts.map((t) => {
          const c = COLORS[t.type];
          return (
            <div
              key={t.id}
              style={{
                background: "#0f172a",
                border: `1px solid ${c.border}`,
                borderLeft: `4px solid ${c.accent}`,
                borderRadius: 8,
                padding: "12px 16px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                animation: t.dismissing ? "toast-out 150ms ease-in forwards" : "toast-in 200ms ease-out",
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: c.bg,
                  color: c.accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {c.icon}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>
                  {t.message}
                </div>
                {t.description && (
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                    {t.description}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#64748b",
                  cursor: "pointer",
                  fontSize: 14,
                  padding: 2,
                  lineHeight: 1,
                }}
              >
                {"\u2715"}
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
