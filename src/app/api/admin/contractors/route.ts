import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("app_profiles")
      .select("id, full_name, company_name, email, role")
      .eq("role", "contractor")
      .order("company_name", { ascending: true, nullsFirst: false })
      .limit(500);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const contractors = (data ?? []).map((r: any) => ({
      id: r.id,
      name: String(r.company_name || r.full_name || r.email || r.id),
    }));

    return NextResponse.json({ contractors }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unhandled error" },
      { status: 500 }
    );
  }
}
