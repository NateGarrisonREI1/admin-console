"use client";

import * as React from "react";
import { clearUpgradeCatalogImage, upsertUpgradeCatalogImage } from "../_actions";

type Media = {
  image_kind: "storage" | "external" | null;
  image_storage_bucket: string | null;
  image_storage_path: string | null;
  image_external_url: string | null;
};

export default function UpgradeCatalogImagePicker(props: {
  upgradeCatalogId: string;
  media: Media;
}) {
  const { upgradeCatalogId, media } = props;

  const [busy, setBusy] = React.useState(false);
  const [externalUrl, setExternalUrl] = React.useState(
    media.image_kind === "external" ? media.image_external_url || "" : ""
  );
  const [err, setErr] = React.useState<string | null>(null);

  const preview = React.useMemo(() => {
    if (media.image_kind === "external" && media.image_external_url) return media.image_external_url;
    if (media.image_kind === "storage" && media.image_storage_bucket && media.image_storage_path) {
      // Public bucket URL pattern
      const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
      return `${base}/storage/v1/object/public/${media.image_storage_bucket}/${media.image_storage_path}`;
    }
    return "";
  }, [media]);

  async function onUpload(file: File) {
    setBusy(true);
    setErr(null);

    try {
      // Upload via server route (admin-gated)
      const fd = new FormData();
      fd.set("upgrade_catalog_id", upgradeCatalogId);
      fd.set("file", file);

      const res = await fetch("/api/admin/upload-upgrade-catalog-image", {
        method: "POST",
        body: fd,
      });

      const json = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(json?.error || "Upload failed");

      // Persist to DB (your existing server action)
      const save = new FormData();
      save.set("upgrade_catalog_id", upgradeCatalogId);
      save.set("kind", "storage");
      save.set("storage_bucket", "upgrade-catalog");
      save.set("storage_path", String(json.path || ""));

      await upsertUpgradeCatalogImage(save);
    } catch (e: any) {
      setErr(e?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveExternal() {
    const url = externalUrl.trim();
    if (!url) return;

    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.set("upgrade_catalog_id", upgradeCatalogId);
      fd.set("kind", "external");
      fd.set("external_url", url);

      await upsertUpgradeCatalogImage(fd);
    } catch (e: any) {
      setErr(e?.message || "Could not save URL");
    } finally {
      setBusy(false);
    }
  }

  async function onRemove() {
    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.set("upgrade_catalog_id", upgradeCatalogId);
      await clearUpgradeCatalogImage(fd);
      setExternalUrl("");
    } catch (e: any) {
      setErr(e?.message || "Could not remove image");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      {err ? (
        <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs font-semibold text-rose-900">
          {err}
        </div>
      ) : null}

      <div className="flex items-start gap-3">
        <div className="h-14 w-14 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[11px] text-slate-400">
              No photo
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-slate-700">Photo</div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUpload(f);
                  e.currentTarget.value = "";
                }}
              />
              {busy ? "Working…" : "Upload"}
            </label>

            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-60"
              onClick={onRemove}
              disabled={busy || (!media.image_kind && !externalUrl.trim())}
            >
              Remove
            </button>
          </div>

          <div className="mt-2">
            <div className="text-[11px] font-semibold text-slate-600">Stock / URL</div>
            <div className="mt-1 flex gap-2">
              <input
                value={externalUrl}
                disabled={busy}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://…"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
              />
              <button
                type="button"
                onClick={onSaveExternal}
                disabled={busy || !externalUrl.trim()}
                className="rounded-lg border border-slate-200 bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                Save
              </button>
            </div>
          </div>

          {media.image_kind ? (
            <div className="mt-2 text-[11px] text-slate-500">
              Current: <span className="font-semibold">{media.image_kind}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
