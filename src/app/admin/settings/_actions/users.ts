// src/app/admin/settings/_actions/users.ts
"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import type { AppRole, UserStatus } from "../_components/pills";

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());
}

async function requireAdmin() {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  const user = data.user;
  if (!user) throw new Error("Not authenticated.");

  const { data: prof, error: pErr } = await supabase
    .from("app_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (pErr) throw new Error(pErr.message);
  if ((prof?.role || "homeowner") !== "admin") throw new Error("Admin only.");
}

/**
 * Used by: src/app/admin/settings/users/page.tsx
 */
export async function adminListUsers(input?: { limit?: number }) {
  await requireAdmin();
  const admin = supabaseAdmin;

  const limit = Math.max(1, Math.min(Number(input?.limit ?? 2000), 5000));

  const { data: listRes, error: listErr } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: limit,
  });
  if (listErr) throw new Error(listErr.message);

  const users = listRes.users ?? [];
  const ids = users.map((u) => u.id).filter(Boolean);

  // NOTE: your app_profiles does NOT have `email`
  const { data: profRows, error: pErr } = await admin
    .from("app_profiles")
    .select("id,role,status,first_name,last_name,phone,address1,address2,city,state,postal_code")
    .in("id", ids);

  if (pErr) throw new Error(pErr.message);

  const profById = new Map((profRows || []).map((p: any) => [p.id, p]));

  const rows = users.map((u) => {
    const p: any = profById.get(u.id) || null;
    return {
      user_id: u.id,
      email: String(u.email || "").toLowerCase(),
      role: (p?.role || "homeowner") as AppRole,

      created_at: (u.created_at as string | null) ?? null,
      last_sign_in_at: (u.last_sign_in_at as string | null) ?? null,

      first_name: p?.first_name ?? null,
      last_name: p?.last_name ?? null,
      phone: p?.phone ?? null,
      address1: p?.address1 ?? null,
      address2: p?.address2 ?? null,
      city: p?.city ?? null,
      state: p?.state ?? null,
      zip: p?.postal_code ?? null,

      status: (p?.status as UserStatus | null) ?? null,
    };
  });

  const roleRank: Record<string, number> = {
    admin: 0,
    broker: 1,
    contractor: 2,
    affiliate: 3,
    homeowner: 4,
  };

  rows.sort((a: any, b: any) => {
    const ra = roleRank[a.role] ?? 99;
    const rb = roleRank[b.role] ?? 99;
    if (ra !== rb) return ra - rb;
    return String(a.email || "").localeCompare(String(b.email || ""));
  });

  return { rows };
}

export async function adminInviteUser(input: {
  email: string;
  role: AppRole;
  profile?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    address1?: string;
    address2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
  };
  revalidate?: string;
}) {
  await requireAdmin();

  const email = String(input.email || "").trim().toLowerCase();
  if (!isValidEmail(email)) throw new Error("Enter a valid email.");

  const admin = supabaseAdmin;

  const { data: listRes, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 2000 });
  if (listErr) throw new Error(listErr.message);

  const existing = listRes.users.find((u) => (u.email || "").toLowerCase() === email);
  let userId = existing?.id;

  if (!userId) {
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    if (cErr) throw new Error(cErr.message);
    userId = created.user?.id;
  }

  if (!userId) throw new Error("Failed to create user.");

  const status: UserStatus = "pending";

  const { error: upErr } = await admin
    .from("app_profiles")
    .upsert(
      {
        id: userId,
        role: input.role,
        status,
        first_name: input.profile?.first_name ?? null,
        last_name: input.profile?.last_name ?? null,
        phone: input.profile?.phone ?? null,
        address1: input.profile?.address1 ?? null,
        address2: input.profile?.address2 ?? null,
        city: input.profile?.city ?? null,
        state: input.profile?.state ?? null,
        postal_code: input.profile?.postal_code ?? null,
      },
      { onConflict: "id" }
    );

  if (upErr) throw new Error(upErr.message);

  if (input.revalidate) revalidatePath(input.revalidate);
  return { ok: true, userId };
}

export async function adminSetUserRole(input: { userId: string; role: AppRole; revalidate?: string }) {
  await requireAdmin();
  const admin = supabaseAdmin;

  const { error } = await admin.from("app_profiles").update({ role: input.role }).eq("id", input.userId);
  if (error) throw new Error(error.message);

  if (input.revalidate) revalidatePath(input.revalidate);
  return { ok: true };
}

/**
 * Soft-disable user in app_profiles (and optionally ban at auth level if supported).
 */
export async function adminSetUserStatus(input: {
  userId: string;
  status: UserStatus; // "active" | "pending" | "disabled"
  revalidate?: string;
}) {
  await requireAdmin();
  const admin = supabaseAdmin;

  const { error } = await admin.from("app_profiles").update({ status: input.status }).eq("id", input.userId);
  if (error) throw new Error(error.message);

  // Optional: try to ban/unban in Supabase Auth (won't throw if unsupported)
  try {
    const authAdmin: any = (admin as any).auth?.admin;
    if (authAdmin?.updateUserById) {
      if (input.status === "disabled") {
        // long ban
        await authAdmin.updateUserById(input.userId, { ban_duration: "87600h" });
      } else {
        await authAdmin.updateUserById(input.userId, { ban_duration: "none" });
      }
    }
  } catch {
    // ignore (profile status still updates)
  }

  if (input.revalidate) revalidatePath(input.revalidate);
  return { ok: true };
}

/**
 * Generates a password setup / reset link you can copy to the user.
 * This is the practical "re-send invite" for accounts created without a password.
 */
export async function adminCreatePasswordLink(input: { email: string }) {
  await requireAdmin();

  const email = String(input.email || "").trim().toLowerCase();
  if (!isValidEmail(email)) throw new Error("Enter a valid email.");

  const admin = supabaseAdmin;

  // generateLink is available on Supabase JS v2 admin auth, but we cast to any for safety.
  const authAdmin: any = (admin as any).auth?.admin;
  if (!authAdmin?.generateLink) throw new Error("Supabase admin.generateLink not available in this build.");

  // recovery => reset password / set password flow
  const { data, error } = await authAdmin.generateLink({
    type: "recovery",
    email,
  });

  if (error) throw new Error(error.message);

  // Supabase returns action_link (and sometimes properties.action_link)
  const actionLink = data?.properties?.action_link || data?.action_link;
  if (!actionLink) throw new Error("No action link returned.");

  return { ok: true, actionLink };
}

/**
 * Optional: Magic link sign-in URL.
 */
export async function adminCreateMagicLink(input: { email: string }) {
  await requireAdmin();

  const email = String(input.email || "").trim().toLowerCase();
  if (!isValidEmail(email)) throw new Error("Enter a valid email.");

  const admin = supabaseAdmin;

  const authAdmin: any = (admin as any).auth?.admin;
  if (!authAdmin?.generateLink) throw new Error("Supabase admin.generateLink not available in this build.");

  const { data, error } = await authAdmin.generateLink({
    type: "magiclink",
    email,
  });

  if (error) throw new Error(error.message);

  const actionLink = data?.properties?.action_link || data?.action_link;
  if (!actionLink) throw new Error("No action link returned.");

  return { ok: true, actionLink };
}

// -----------------------------------------------------------------------------
// Aliases expected by AdminUsersTable.tsx
// -----------------------------------------------------------------------------

export async function inviteUser(input: {
  email: string;
  role: AppRole;
  revalidate?: string;

  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}) {
  return adminInviteUser({
    email: input.email,
    role: input.role,
    revalidate: input.revalidate,
    profile: {
      first_name: input.first_name ?? undefined,
      last_name: input.last_name ?? undefined,
      phone: input.phone ?? undefined,
      address1: input.address1 ?? undefined,
      address2: input.address2 ?? undefined,
      city: input.city ?? undefined,
      state: input.state ?? undefined,
      postal_code: input.zip ?? undefined,
    },
  });
}

export async function setUserRole(input: { userId: string; role: AppRole; revalidate?: string }) {
  return adminSetUserRole(input);
}
export async function adminUpdateUserProfile(input: {
  userId: string;
  // NOTE: your app_profiles does NOT have email (per earlier error)
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  revalidate?: string;
}) {
  await requireAdmin();
  const admin = supabaseAdmin;

  const userId = String(input.userId || "").trim();
  if (!userId) throw new Error("userId is required.");

  const patch: Record<string, any> = {
    first_name: input.first_name ?? null,
    last_name: input.last_name ?? null,
    phone: input.phone ?? null,
    address1: input.address1 ?? null,
    address2: input.address2 ?? null,
    city: input.city ?? null,
    state: input.state ?? null,
    postal_code: input.postal_code ?? null,
  };

  const { error } = await admin.from("app_profiles").update(patch).eq("id", userId);
  if (error) throw new Error(error.message);

  if (input.revalidate) revalidatePath(input.revalidate);
  return { ok: true };
}
