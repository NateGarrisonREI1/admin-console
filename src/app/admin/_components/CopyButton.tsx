"use client";

import { useState } from "react";

export default function CopyButton({
  value,
  label = "Copy",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="admin-btn"
      style={{ borderRadius: 999, paddingInline: 12 }}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 900);
        } catch {
          // fallback: do nothing
        }
      }}
      title={value}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
