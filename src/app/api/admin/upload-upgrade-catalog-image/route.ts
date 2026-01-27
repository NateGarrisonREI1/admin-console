import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/server"; // you already export supabaseAdmin here

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function extFromMime(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/jpeg") return "jpg";
  return "bin";
}

export async function POST(req: Request) {
  // 1) Must be signed in
  const sb = await supabaseServer();
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // 2) Must be admin
  const { data: isAdmin, error: adminErr } = await sb.rpc("is_admin");
  if (adminErr || !isAdmin) {
    return NextResponse.json({ error: "Not admin" }, { status: 403 });
  }

  // 3) Parse multipart form
  const form = await req.formData();
  const file = form.get("file");
  const upgradeCatalogId = String(form.get("upgrade_catalog_id") || "").trim();

  if (!upgradeCatalogId) {
    return NextResponse.json({ error: "Missing upgrade_catalog_id" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const mime = file.type || "application/octet-stream";
  const ext = extFromMime(mime);

  // 4) Upload with service role (bypasses RLS)
  const path = `upgrade_catalog/${upgradeCatalogId}/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await supabaseAdmin.storage
    .from("upgrade-catalog")
    .upload(path, bytes, {
      contentType: mime,
      upsert: true,
    });

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const { data: pub } = supabaseAdmin.storage.from("upgrade-catalog").getPublicUrl(path);

  return NextResponse.json({
    path,
    publicUrl: pub?.publicUrl || null,
  });
}
