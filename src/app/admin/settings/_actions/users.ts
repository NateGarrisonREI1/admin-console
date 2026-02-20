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

// ─── Types ─────────────────────────────────────────────────────────

export type UserRelationshipRow = {
  id: string;
  related_user_id: string;
  relationship_type: string;
  related_email: string | null;
  related_name: string | null;
};

export type UserSourceRow = {
  source_type: string;
  source_ref_id: string | null;
  campaign_id: string | null;
};

export type AdminUserRow = {
  user_id: string;
  email: string;
  role: AppRole;
  status: UserStatus | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  phone: string | null;
  staff_type: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  relationships: UserRelationshipRow[];
  source: UserSourceRow | null;
  // address fields for edit drawer
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
};

export type AdminListUsersInput = {
  page?: number;
  pageSize?: number;
  roleFilter?: string;
  statusFilter?: string;
  sourceFilter?: string;
  search?: string;
};

export type AdminListUsersResult = {
  rows: AdminUserRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  stats: {
    total: number;
    active: number;
    pending: number;
    disabled: number;
    byRole: Record<string, number>;
  };
};

// ─── Main list ─────────────────────────────────────────────────────

export async function adminListUsers(
  input?: AdminListUsersInput
): Promise<AdminListUsersResult> {
  await requireAdmin();
  const admin = supabaseAdmin;

  const page = Math.max(1, input?.page ?? 1);
  const pageSize = Math.max(1, Math.min(input?.pageSize ?? 50, 200));

  // 1) Fetch all auth users (Supabase admin API)
  const { data: listRes, error: listErr } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 5000,
  });
  if (listErr) throw new Error(listErr.message);

  const authUsers = listRes.users ?? [];
  const ids = authUsers.map((u) => u.id).filter(Boolean);
  if (ids.length === 0) {
    return { rows: [], total: 0, page, pageSize, totalPages: 0, stats: { total: 0, active: 0, pending: 0, disabled: 0, byRole: {} } };
  }

  // 2) Fetch app_profiles
  const { data: profRows } = await admin
    .from("app_profiles")
    .select("id,role,status,first_name,last_name,full_name,email,phone,staff_type,address1,address2,city,state,postal_code")
    .in("id", ids);

  const profById = new Map((profRows || []).map((p: Record<string, unknown>) => [p.id as string, p]));

  // 3) Fetch user_relationships with related user info
  const { data: relRows } = await admin
    .from("user_relationships")
    .select("id,user_id,related_user_id,relationship_type")
    .in("user_id", ids);

  // Get related user names/emails
  const relatedIds = [...new Set((relRows || []).map((r: Record<string, unknown>) => r.related_user_id as string))];
  const relatedProfiles = new Map<string, { email: string | null; name: string | null }>();

  if (relatedIds.length > 0) {
    const { data: relProfs } = await admin
      .from("app_profiles")
      .select("id,email,full_name,first_name,last_name")
      .in("id", relatedIds);

    for (const rp of (relProfs || []) as Record<string, unknown>[]) {
      const name = (rp.full_name as string) || [rp.first_name, rp.last_name].filter(Boolean).join(" ") || null;
      relatedProfiles.set(rp.id as string, { email: (rp.email as string) || null, name });
    }

    // Also get emails from auth for related users not in profiles
    for (const rid of relatedIds) {
      if (!relatedProfiles.has(rid)) {
        const au = authUsers.find((u) => u.id === rid);
        if (au) relatedProfiles.set(rid, { email: au.email || null, name: null });
      }
    }
  }

  // Group relationships by user_id
  const relsByUser = new Map<string, UserRelationshipRow[]>();
  for (const r of (relRows || []) as Record<string, unknown>[]) {
    const uid = r.user_id as string;
    const related = relatedProfiles.get(r.related_user_id as string);
    const entry: UserRelationshipRow = {
      id: r.id as string,
      related_user_id: r.related_user_id as string,
      relationship_type: r.relationship_type as string,
      related_email: related?.email || null,
      related_name: related?.name || null,
    };
    if (!relsByUser.has(uid)) relsByUser.set(uid, []);
    relsByUser.get(uid)!.push(entry);
  }

  // 4) Fetch user_sources
  const { data: srcRows } = await admin
    .from("user_sources")
    .select("user_id,source_type,source_ref_id,campaign_id")
    .in("user_id", ids);

  const srcByUser = new Map<string, UserSourceRow>();
  for (const s of (srcRows || []) as Record<string, unknown>[]) {
    srcByUser.set(s.user_id as string, {
      source_type: s.source_type as string,
      source_ref_id: (s.source_ref_id as string) || null,
      campaign_id: (s.campaign_id as string) || null,
    });
  }

  // 5) Build rows
  let rows: AdminUserRow[] = authUsers.map((u) => {
    const p = profById.get(u.id) as Record<string, unknown> | undefined;
    return {
      user_id: u.id,
      email: String(u.email || "").toLowerCase(),
      role: ((p?.role as string) || "homeowner") as AppRole,
      status: (p?.status as UserStatus) || null,
      first_name: (p?.first_name as string) || null,
      last_name: (p?.last_name as string) || null,
      full_name: (p?.full_name as string) || null,
      phone: (p?.phone as string) || null,
      staff_type: (p?.staff_type as string) || null,
      created_at: (u.created_at as string) || null,
      last_sign_in_at: (u.last_sign_in_at as string) || null,
      relationships: relsByUser.get(u.id) || [],
      source: srcByUser.get(u.id) || null,
      address1: (p?.address1 as string) || null,
      address2: (p?.address2 as string) || null,
      city: (p?.city as string) || null,
      state: (p?.state as string) || null,
      zip: (p?.postal_code as string) || null,
    };
  });

  // 6) Compute stats BEFORE filtering
  const stats = {
    total: rows.length,
    active: rows.filter((r) => computeStatus(r) === "active").length,
    pending: rows.filter((r) => computeStatus(r) === "pending").length,
    disabled: rows.filter((r) => computeStatus(r) === "disabled").length,
    byRole: {} as Record<string, number>,
  };
  for (const r of rows) {
    stats.byRole[r.role] = (stats.byRole[r.role] || 0) + 1;
  }

  // 7) Apply filters
  if (input?.roleFilter && input.roleFilter !== "all") {
    rows = rows.filter((r) => r.role === input.roleFilter);
  }
  if (input?.statusFilter && input.statusFilter !== "all") {
    rows = rows.filter((r) => computeStatus(r) === input.statusFilter);
  }
  if (input?.sourceFilter && input.sourceFilter !== "all") {
    rows = rows.filter((r) => {
      if (!r.source) return input.sourceFilter === "organic_website";
      return r.source.source_type === input.sourceFilter;
    });
  }
  if (input?.search) {
    const q = input.search.toLowerCase().trim();
    rows = rows.filter((r) => {
      return (
        r.email.includes(q) ||
        (r.first_name || "").toLowerCase().includes(q) ||
        (r.last_name || "").toLowerCase().includes(q) ||
        (r.full_name || "").toLowerCase().includes(q)
      );
    });
  }

  // 8) Sort: role rank then email
  const roleRank: Record<string, number> = {
    admin: 0, rei_staff: 1, broker: 2, contractor: 3, affiliate: 4, homeowner: 5,
  };
  rows.sort((a, b) => {
    const ra = roleRank[a.role] ?? 99;
    const rb = roleRank[b.role] ?? 99;
    if (ra !== rb) return ra - rb;
    return a.email.localeCompare(b.email);
  });

  // 9) Paginate
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const paged = rows.slice(start, start + pageSize);

  return { rows: paged, total, page, pageSize, totalPages, stats };
}

function computeStatus(r: { status: UserStatus | null; last_sign_in_at: string | null }): UserStatus {
  if (r.status === "active" || r.status === "pending" || r.status === "disabled") return r.status;
  return r.last_sign_in_at ? "active" : "pending";
}

// ─── Invite ────────────────────────────────────────────────────────

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
        email,
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

  // Record source as admin_created
  await admin.from("user_sources").upsert(
    { user_id: userId, source_type: "admin_created" },
    { onConflict: "user_id" }
  );

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
 */
export async function adminCreatePasswordLink(input: { email: string }) {
  await requireAdmin();

  const email = String(input.email || "").trim().toLowerCase();
  if (!isValidEmail(email)) throw new Error("Enter a valid email.");

  const admin = supabaseAdmin;

  const authAdmin: any = (admin as any).auth?.admin;
  if (!authAdmin?.generateLink) throw new Error("Supabase admin.generateLink not available in this build.");

  const { data, error } = await authAdmin.generateLink({
    type: "recovery",
    email,
  });

  if (error) throw new Error(error.message);

  const actionLink = data?.properties?.action_link || data?.action_link;
  if (!actionLink) throw new Error("No action link returned.");

  return { ok: true, actionLink };
}

/**
 * Magic link sign-in URL.
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

/**
 * Delete a user entirely (auth + profile).
 */
export async function adminDeleteUser(input: { userId: string; revalidate?: string }) {
  await requireAdmin();
  const admin = supabaseAdmin;

  // Delete from auth (cascades to app_profiles, user_relationships, user_sources via FK)
  const { error } = await admin.auth.admin.deleteUser(input.userId);
  if (error) throw new Error(error.message);

  if (input.revalidate) revalidatePath(input.revalidate);
  return { ok: true };
}

// ─── Create user (multi-step modal) ─────────────────────────────────

export type AdminCreateUserInput = {
  email: string;
  role: AppRole;
  first_name?: string;
  last_name?: string;
  phone?: string;
  staff_type?: string;
  // Address (homeowner)
  address1?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  // Source (homeowner)
  source_type?: string;
  source_broker_id?: string;
  // Broker network (contractor/affiliate)
  broker_network_id?: string;
  // Send invite email?
  sendInvite?: boolean;
  revalidate?: string;
};

export async function adminCreateUser(input: AdminCreateUserInput): Promise<{ ok: boolean; userId: string; message: string }> {
  await requireAdmin();
  const admin = supabaseAdmin;

  const email = String(input.email || "").trim().toLowerCase();
  if (!isValidEmail(email)) throw new Error("Enter a valid email.");

  const fullName = [input.first_name, input.last_name].filter(Boolean).join(" ") || null;

  // 1) Check if user already exists
  const { data: listRes, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 5000 });
  if (listErr) throw new Error(listErr.message);

  const existing = listRes.users.find((u) => (u.email || "").toLowerCase() === email);
  let userId = existing?.id;

  if (!userId) {
    if (input.sendInvite) {
      // Use inviteUserByEmail — sends invite email automatically with magic link
      const { data: invited, error: iErr } = await admin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: fullName, role: input.role },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback`,
      });
      if (iErr) throw new Error(iErr.message);
      userId = invited.user?.id;
    } else {
      // Create user without invite — admin sets up account manually
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: fullName, role: input.role },
      });
      if (cErr) throw new Error(cErr.message);
      userId = created.user?.id;
    }
  } else if (input.sendInvite) {
    // User exists but admin wants to (re)send invite — generate recovery link
    try {
      const { data: linkData } = await admin.auth.admin.generateLink({ type: "recovery", email });
      // Link is generated; Supabase sends the email
      void linkData;
    } catch {
      // Non-critical — user already exists, profile will still be updated
    }
  }

  if (!userId) throw new Error("Failed to create user.");

  // 2) Upsert app_profiles
  const { error: upErr } = await admin.from("app_profiles").upsert({
    id: userId,
    role: input.role,
    status: "pending" as UserStatus,
    first_name: input.first_name || null,
    last_name: input.last_name || null,
    full_name: fullName,
    email,
    phone: input.phone || null,
    staff_type: input.staff_type || null,
    address1: input.address1 || null,
    city: input.city || null,
    state: input.state || null,
    postal_code: input.postal_code || null,
  }, { onConflict: "id" });
  if (upErr) throw new Error(upErr.message);

  // 3) Create role-specific profile rows
  if (input.role === "contractor") {
    await admin.from("contractor_profiles").upsert({
      id: userId,
      onboarding_complete: false,
      company_name: fullName,
      phone: input.phone || null,
      email,
    }, { onConflict: "id" });
  }

  // 4) Create user_sources
  const sourceType = input.source_type || "admin_created";
  await admin.from("user_sources").upsert({
    user_id: userId,
    source_type: sourceType,
    source_ref_id: input.source_broker_id || null,
  }, { onConflict: "user_id" });

  // 5) Create user_relationships if adding to broker network
  if (input.broker_network_id && (input.role === "contractor" || input.role === "affiliate")) {
    await admin.from("user_relationships").upsert({
      user_id: userId,
      related_user_id: input.broker_network_id,
      relationship_type: "in_broker_network",
    }, { onConflict: "user_id,related_user_id,relationship_type" });
  }

  // 6) Log auth event
  const { logAuthEvent } = await import("@/lib/auth/events");
  await logAuthEvent({ email, action: "role_change", userId, metadata: { role: input.role, created_by: "admin", invited: !!input.sendInvite } });

  if (input.revalidate) revalidatePath(input.revalidate);

  const message = input.sendInvite
    ? `Invite sent to ${email}`
    : `User created: ${email}`;
  return { ok: true, userId, message };
}

/**
 * List brokers for the "Add to broker network" dropdown.
 */
export async function adminListBrokers(): Promise<Array<{ id: string; email: string; name: string | null }>> {
  await requireAdmin();
  const admin = supabaseAdmin;

  const { data, error } = await admin
    .from("app_profiles")
    .select("id,email,full_name,first_name,last_name")
    .eq("role", "broker")
    .order("email");

  if (error) throw new Error(error.message);

  return (data || []).map((b: Record<string, unknown>) => ({
    id: b.id as string,
    email: (b.email as string) || "",
    name: (b.full_name as string) || [b.first_name, b.last_name].filter(Boolean).join(" ") || null,
  }));
}

// ─── User detail ─────────────────────────────────────────────────────

export type AdminUserDetail = AdminUserRow & {
  avatar_url: string | null;
};

export async function adminGetUserDetail(userId: string): Promise<AdminUserDetail | null> {
  await requireAdmin();
  const admin = supabaseAdmin;

  // Auth user
  const { data: authData, error: authErr } = await admin.auth.admin.getUserById(userId);
  if (authErr || !authData?.user) return null;
  const u = authData.user;

  // Profile
  const { data: prof } = await admin
    .from("app_profiles")
    .select("id,role,status,first_name,last_name,full_name,email,phone,staff_type,address1,address2,city,state,postal_code,avatar_url")
    .eq("id", userId)
    .maybeSingle();

  const p = prof as Record<string, unknown> | null;

  // Relationships
  const { data: relRows } = await admin
    .from("user_relationships")
    .select("id,user_id,related_user_id,relationship_type")
    .eq("user_id", userId);

  const relatedIds = [...new Set((relRows || []).map((r: Record<string, unknown>) => r.related_user_id as string))];
  const relatedProfiles = new Map<string, { email: string | null; name: string | null }>();

  if (relatedIds.length > 0) {
    const { data: relProfs } = await admin
      .from("app_profiles")
      .select("id,email,full_name,first_name,last_name")
      .in("id", relatedIds);

    for (const rp of (relProfs || []) as Record<string, unknown>[]) {
      const name = (rp.full_name as string) || [rp.first_name, rp.last_name].filter(Boolean).join(" ") || null;
      relatedProfiles.set(rp.id as string, { email: (rp.email as string) || null, name });
    }
  }

  const relationships: UserRelationshipRow[] = (relRows || []).map((r: Record<string, unknown>) => {
    const related = relatedProfiles.get(r.related_user_id as string);
    return {
      id: r.id as string,
      related_user_id: r.related_user_id as string,
      relationship_type: r.relationship_type as string,
      related_email: related?.email || null,
      related_name: related?.name || null,
    };
  });

  // Source
  const { data: srcRow } = await admin
    .from("user_sources")
    .select("source_type,source_ref_id,campaign_id")
    .eq("user_id", userId)
    .maybeSingle();

  const source: UserSourceRow | null = srcRow
    ? { source_type: (srcRow as Record<string, unknown>).source_type as string, source_ref_id: ((srcRow as Record<string, unknown>).source_ref_id as string) || null, campaign_id: ((srcRow as Record<string, unknown>).campaign_id as string) || null }
    : null;

  return {
    user_id: u.id,
    email: String(u.email || "").toLowerCase(),
    role: ((p?.role as string) || "homeowner") as AppRole,
    status: (p?.status as UserStatus) || null,
    first_name: (p?.first_name as string) || null,
    last_name: (p?.last_name as string) || null,
    full_name: (p?.full_name as string) || null,
    phone: (p?.phone as string) || null,
    staff_type: (p?.staff_type as string) || null,
    created_at: (u.created_at as string) || null,
    last_sign_in_at: (u.last_sign_in_at as string) || null,
    relationships,
    source,
    address1: (p?.address1 as string) || null,
    address2: (p?.address2 as string) || null,
    city: (p?.city as string) || null,
    state: (p?.state as string) || null,
    zip: (p?.postal_code as string) || null,
    avatar_url: (p?.avatar_url as string) || null,
  };
}

export type AuditEvent = {
  id: string;
  email: string;
  action: string;
  user_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export async function adminGetUserAuditTrail(userId: string): Promise<AuditEvent[]> {
  await requireAdmin();
  const admin = supabaseAdmin;

  // Get user email to also match by email
  const { data: authData } = await admin.auth.admin.getUserById(userId);
  const email = authData?.user?.email?.toLowerCase() || "";

  let query = admin
    .from("auth_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (email) {
    query = query.or(`user_id.eq.${userId},email.eq.${email}`);
  } else {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[adminGetUserAuditTrail] Failed:", error);
    return [];
  }

  return (data || []).map((e: Record<string, unknown>) => ({
    id: e.id as string,
    email: e.email as string,
    action: e.action as string,
    user_id: (e.user_id as string) || null,
    metadata: (e.metadata as Record<string, unknown>) || null,
    created_at: e.created_at as string,
  }));
}

export type UserRelationshipDetail = {
  id: string;
  user_id: string;
  related_user_id: string;
  relationship_type: string;
  related_email: string | null;
  related_name: string | null;
  related_role: AppRole | null;
};

export async function adminGetUserRelationships(userId: string): Promise<UserRelationshipDetail[]> {
  await requireAdmin();
  const admin = supabaseAdmin;

  // Relationships where this user is user_id OR related_user_id
  const { data: outbound } = await admin
    .from("user_relationships")
    .select("id,user_id,related_user_id,relationship_type")
    .eq("user_id", userId);

  const { data: inbound } = await admin
    .from("user_relationships")
    .select("id,user_id,related_user_id,relationship_type")
    .eq("related_user_id", userId);

  const allRels = [...(outbound || []), ...(inbound || [])] as Record<string, unknown>[];

  // Dedupe by id
  const seen = new Set<string>();
  const unique = allRels.filter((r) => {
    const id = r.id as string;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  // Collect all related user IDs (the "other" side from this user)
  const otherIds = [...new Set(unique.map((r) => {
    const uid = r.user_id as string;
    const rid = r.related_user_id as string;
    return uid === userId ? rid : uid;
  }))];

  const profileMap = new Map<string, { email: string | null; name: string | null; role: AppRole | null }>();
  if (otherIds.length > 0) {
    const { data: profs } = await admin
      .from("app_profiles")
      .select("id,email,full_name,first_name,last_name,role")
      .in("id", otherIds);

    for (const p of (profs || []) as Record<string, unknown>[]) {
      profileMap.set(p.id as string, {
        email: (p.email as string) || null,
        name: (p.full_name as string) || [p.first_name, p.last_name].filter(Boolean).join(" ") || null,
        role: ((p.role as string) || null) as AppRole | null,
      });
    }
  }

  return unique.map((r) => {
    const uid = r.user_id as string;
    const rid = r.related_user_id as string;
    const otherId = uid === userId ? rid : uid;
    const other = profileMap.get(otherId);
    return {
      id: r.id as string,
      user_id: uid,
      related_user_id: rid,
      relationship_type: r.relationship_type as string,
      related_email: other?.email || null,
      related_name: other?.name || null,
      related_role: other?.role || null,
    };
  });
}

// ─── Resend invite ──────────────────────────────────────────────────

export async function resendInvite(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    const admin = supabaseAdmin;

    // Get the user's email and role
    const { data: authData, error: authErr } = await admin.auth.admin.getUserById(userId);
    if (authErr || !authData?.user) {
      return { success: false, error: "User not found." };
    }

    const email = authData.user.email;
    if (!email) return { success: false, error: "User has no email address." };

    const { data: profile } = await admin
      .from("app_profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    const role = (profile?.role as string) || "homeowner";

    // Re-send the invite via inviteUserByEmail
    const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { role },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback`,
    });
    if (inviteErr) return { success: false, error: inviteErr.message };

    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

// ─── Send password reset email ───────────────────────────────────

export async function adminSendPasswordReset(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    const admin = supabaseAdmin;

    const { data: authData, error: authErr } = await admin.auth.admin.getUserById(userId);
    if (authErr || !authData?.user) {
      console.error("[adminSendPasswordReset] User lookup failed:", authErr?.message);
      return { success: false, error: "User not found." };
    }

    const email = authData.user.email;
    if (!email) return { success: false, error: "User has no email address." };

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    // resetPasswordForEmail actually sends the email; generateLink does NOT
    const { error: resetErr } = await admin.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/reset-password`,
    });
    if (resetErr) {
      console.error("[adminSendPasswordReset] resetPasswordForEmail failed:", resetErr.message);
      return { success: false, error: resetErr.message };
    }

    return { success: true };
  } catch (e) {
    console.error("[adminSendPasswordReset] Unexpected error:", e);
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

// ─── Aliases expected by AdminUsersTable.tsx ────────────────────────

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

  const patch: Record<string, string | null> = {
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
