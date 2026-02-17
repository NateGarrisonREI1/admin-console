import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("system_catalog")
      .select("id, name, title")
      .order("name", { ascending: true, nullsFirst: false })
      .limit(500);

    // If system_catalog isn't present in a given env, don't break the UI
    if (error) {
      return NextResponse.json({ systems: [] }, { status: 200 });
    }

    const systems = (data ?? []).map((s: any) => ({
      id: s.id,
      name: String(s.name || s.title || s.id),
    }));

    return NextResponse.json({ systems }, { status: 200 });
  } catch {
    return NextResponse.json({ systems: [] }, { status: 200 });
  }
}
