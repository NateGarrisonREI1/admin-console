// src/app/auth/set-password/page.tsx
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import SetPasswordClient from "./SetPasswordClient";

export default async function SetPasswordPage() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data?.user;

  // Not authenticated — send to login
  if (!user) {
    redirect("/login");
  }

  return <SetPasswordClient email={user.email || ""} />;
}
