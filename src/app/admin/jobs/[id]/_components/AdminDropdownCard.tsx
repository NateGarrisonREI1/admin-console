"use client";

import { useEffect, useState } from "react";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

type Props = {
  title: string;
  subtitle?: string | null;

  /** Right-side content in the GREEN header bar */
  headerRight?: React.ReactNode;

  /** Label shown on the LIGHT-GREEN toggle row */
  toggleLabel?: string;

  defaultOpen?: boolean;
  storageKey?: string;

  children: React.ReactNode;
};

export default function AdminDropdownCard({
  title,
  subtitle,
  headerRight,
  toggleLabel = "Toggle Section",
  defaultOpen = true,
  storageKey,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw === "open") setOpen(true);
      if (raw === "closed") setOpen(false);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, open ? "open" : "closed");
    } catch {}
  }, [open, storageKey]);

  return (
    <section className="rounded-xl overflow-hidden border bg-white">
      {/* REI GREEN HEADER BAR */}
      <div
        className="px-5 py-4 text-white"
        style={{
          background:
            "linear-gradient(180deg, #4fb423 0%, #3a8f18 100%)",
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-base font-semibold leading-6">
              {title}
            </div>
            {subtitle ? (
              <div className="mt-1 text-xs text-white/80">
                {subtitle}
              </div>
            ) : null}
          </div>

          {headerRight ? (
            <div className="shrink-0">{headerRight}</div>
          ) : null}
        </div>
      </div>

      {/* LIGHT GREEN TOGGLE ROW */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cx(
          "w-full flex items-center justify-between gap-3 px-5 py-3 text-left",
          "bg-[#ecf6e6] hover:bg-[#e3f1db]",
          "border-t border-[#cfe6bf]"
        )}
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-[#2f6f12]">
          {toggleLabel}
        </span>
        <span
          className={cx(
            "text-[#2f6f12] transition-transform select-none",
            open && "rotate-180"
          )}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>

      {/* BODY */}
      {open ? <div className="bg-white">{children}</div> : null}
    </section>
  );
}
