"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { validatePassword } from "@/lib/auth/password";

// ─── Change password ────────────────────────────────────────────────

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean }> {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user?.email) throw new Error("Not authenticated");

  // Validate new password strength
  const check = validatePassword(newPassword, user.email);
  if (!check.valid) {
    throw new Error(check.errors.join(". "));
  }

  // Verify current password by signing in with a temporary client
  const { createClient } = await import("@supabase/supabase-js");
  const tempClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { error: verifyErr } = await tempClient.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (verifyErr) throw new Error("Current password is incorrect");

  // Update password
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);

  return { success: true };
}
