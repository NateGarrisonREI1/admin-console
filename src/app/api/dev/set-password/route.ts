// TODO: Remove before production
// Dev-only utility for setting user passwords without email verification.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "email and password are required" }, { status: 400 });
  }

  const { data: listRes, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 5000 });
  if (listErr) {
    return NextResponse.json({ error: listErr.message }, { status: 500 });
  }

  const user = listRes.users.find((u) => (u.email || "").toLowerCase() === email.toLowerCase().trim());
  if (!user) {
    return NextResponse.json({ error: `No user found with email: ${email}` }, { status: 404 });
  }

  const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
  });

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Also mark app_profiles status as active so they bypass set-password flow
  await supabaseAdmin
    .from("app_profiles")
    .update({ status: "active" })
    .eq("id", user.id);

  return NextResponse.json({ success: true, userId: user.id });
}
