# REI Authentication System Audit Report
**Date:** 2026-02-17
**Status:** Complete audit of current auth implementation

---

## 1. AUTH SYSTEM & PROVIDER

**Provider:** Supabase Auth (GoTrue)
**Package:** `@supabase/ssr` (v0.6.1) + `@supabase/supabase-js` (v2.49.4)
**Session type:** Supabase-managed JWT stored in HTTP-only cookies (via `@supabase/ssr` cookie adapter)
**Password storage:** Handled by Supabase Auth (bcrypt internally, never stored in app DB)
**Token refresh:** Automatic via Supabase client SDK

### Supabase Clients

| Client | File | Purpose |
|--------|------|---------|
| `supabaseBrowser()` | `src/lib/supabase/browser.ts` | Client components. Uses anon key + cookies. Respects RLS. |
| `supabaseServer()` | `src/lib/supabase/server.ts` | Server Components, API routes, Server Actions. Async factory, reads cookies. Respects RLS. |
| `supabaseAdmin` | `src/lib/supabase/server.ts` | Singleton. Uses service-role key. **Bypasses all RLS.** Used for admin user management. |

### Environment Variables

| Variable | Present | Notes |
|----------|---------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anon JWT |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role JWT (bypasses RLS) |
| `ADMIN_GATE` | Yes (`open`) | Dev toggle - bypasses AdminShell rendering gate |
| `NEXT_PUBLIC_SITE_URL` | **Missing** | Falls back to `window.location.origin` or `http://localhost:3000` |
| `.env.example` | **Does not exist** | No template for env vars |

---

## 2. DATABASE SCHEMA

### `app_profiles` Table

**Migration:** `supabase/migrations/20260125000001_app_profiles.sql`

```sql
CREATE TYPE public.app_role AS ENUM ('admin','broker','contractor','homeowner','affiliate');

CREATE TABLE public.app_profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        public.app_role NOT NULL DEFAULT 'homeowner',
  status      text,          -- 'active' | 'pending' | 'disabled' (added post-migration)
  first_name  text,          -- added post-migration
  last_name   text,          -- added post-migration
  phone       text,          -- added post-migration
  address1    text,          -- added post-migration
  address2    text,          -- added post-migration
  city        text,          -- added post-migration
  state       text,          -- added post-migration
  postal_code text,          -- added post-migration
  stripe_customer_id text,   -- added by 20260217000015_stripe_columns.sql
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
```

**RLS Policies (on `app_profiles`):**
- `SELECT`: `id = auth.uid()` (own row only)
- `INSERT`: `id = auth.uid()` (own row only)
- `UPDATE`: `id = auth.uid()` (own row only)

**Note:** No `email` column. Email lives only in `auth.users` (Supabase Auth). Accessed via `supabaseAdmin.auth.admin.listUsers()` for admin views.

### Roles That Exist

| Role | Enum Value | In Use |
|------|-----------|--------|
| Admin | `admin` | Yes - full platform control |
| Broker | `broker` | Yes - broker console |
| Contractor | `contractor` | Yes - contractor dashboard, lead marketplace |
| Homeowner | `homeowner` | Yes - default role on first login |
| Affiliate | `affiliate` | Yes (enum exists, dashboard routes exist, but minimal implementation) |

**Missing from spec:** `rei_staff` role is NOT in the enum. The spec calls for it but it doesn't exist yet.

### Other Auth-Related Tables

| Table | Auth Relevance |
|-------|---------------|
| `audit_logs` | Exists - logs admin actions, but NOT login events |
| `broker_console` | Links broker users to their console data |
| `contractor_profiles` | Extended contractor data (company, service types, areas) |
| `payments` | Links to `app_profiles` for purchase tracking |

**No dedicated tables for:** sessions (Supabase handles), user_roles (single role in `app_profiles`), permissions, login attempts, rate limiting.

---

## 3. LOGIN FLOWS

### Current Login Flow (All Roles)

**File:** `src/app/login/LoginForm.tsx`

```
1. User navigates to /login (optionally with ?next=/broker/dashboard)
2. Enters email + password
3. Client calls supabase.auth.signInWithPassword({ email, password })
4. On success: calls supabase.auth.getUser() to confirm session
5. Dynamically imports ensureProfileAndGetRole() from @/lib/auth/role
6. If no app_profiles row exists → creates one (default role: 'homeowner')
7. Determines redirect: safeNextForRole(role, nextParam) ?? rolePrefix(role)
8. router.replace(destination) + router.refresh()
```

**Key behaviors:**
- Single login page for ALL roles (no role selector UI)
- Role determined from `app_profiles.role`, not user choice
- Admins can redirect to any route; non-admins restricted to their portal prefix
- Auth routes (`/login`, `/reset-password`, `/auth/*`) are blocked as redirect targets
- No "Remember me" toggle (Supabase sessions persist by default)
- No loading state indicator beyond button text change

### Password Reset Flow

**Files:** `src/app/reset-password/page.tsx`, `src/app/reset-password/ResetPasswordForm.tsx`

```
Phase 1 (request reset):
1. User enters email on /reset-password
2. Calls supabase.auth.resetPasswordForEmail(email, { redirectTo })
3. Neutral success message shown (prevents email enumeration)
4. Email contains link: /auth/callback?next=/reset-password&code=xxx

Phase 2 (set new password):
1. User clicks email link → hits /auth/callback
2. Supabase exchanges code for session, redirects to /reset-password
3. Supabase fires PASSWORD_RECOVERY auth state event
4. ResetPasswordForm shows password fields
5. User sets new password (min 8 chars)
6. Calls supabase.auth.updateUser({ password })
7. Signs out, redirects to /login after 600ms
```

### Signup Flow

**Does not exist.** No `/signup` or `/register` page. All user creation is admin-initiated via:
- `adminInviteUser()` in `src/app/admin/settings/_actions/users.ts`
- Creates auth user with `email_confirm: true` (no email verification step)
- Creates `app_profiles` row with assigned role + status `"pending"`
- Admin can generate password recovery link or magic link

### Logout Flow

**Files:** `src/app/logout/route.ts`, `ProfileMenu.tsx` (client-side), `AdminAuthButton.tsx` (legacy)

Two patterns exist:
1. **Server-side:** `GET /logout` → `supabase.auth.signOut()` → redirect to `/`
2. **Client-side:** `supabaseBrowser().auth.signOut()` → `router.replace("/login")` (used by ProfileMenu)

---

## 4. PROTECTED ROUTES

### Middleware (`src/middleware.ts`)

**Matcher:** `/admin/:path*`, `/broker/:path*`, `/contractor/:path*`, `/homeowner/:path*`, `/affiliate/:path*`

| Route Pattern | Protection | How |
|--------------|-----------|-----|
| `/login` | Public | Excluded from matcher |
| `/reset-password` | Public | Excluded from matcher |
| `/auth/callback` | Public | Excluded from matcher |
| `/admin/*` | Auth + Admin role | `getUser()` + `rpc("is_admin")` |
| `/broker/*` | Auth only (middleware) | `getUser()` check |
| `/contractor/*` | Auth only (middleware) | `getUser()` check |
| `/homeowner/*` | Auth only (middleware) | `getUser()` check |
| `/affiliate/*` | Auth only (middleware) | `getUser()` check |
| `/api/v1/*` | **Not in middleware matcher** | Protected per-route in handler code |
| `/intake/*` | **No protection** | Public intake forms |
| Static pages | **No protection** | Public |

### Portal Role Enforcement (Layout Layer)

**File:** `src/app/(app)/Layout.tsx`

For `/broker/*`, `/contractor/*`, `/homeowner/*`, `/affiliate/*`:
1. `supabaseServer().auth.getUser()` — redirect to `/login` if not authenticated
2. `ensureProfileAndGetRole()` — get role from `app_profiles`
3. `requirePortalRole(role, portal)` — if role doesn't match portal, redirect to user's own dashboard

**This means:** A contractor CANNOT access `/broker/*` even if they're authenticated. They'll be redirected to `/contractor/dashboard`.

### Admin Route Protection

The admin layout uses `AdminShell` which checks `ADMIN_GATE=open` env var. This is a **development-only gate**, not security. The actual security is in middleware via `rpc("is_admin")`.

### API Route Protection

**File:** `src/app/api/v1/_lib/auth.ts`

Every API route handler calls one of:
- `requireAuth()` — returns 401 if not authenticated
- `requireAdmin()` — returns 403 if not admin
- `requireRole("broker")` — returns 403 if not broker (admins bypass)

Admins can access ANY role-restricted API endpoint (admin acts as superuser).

---

## 5. SESSION MANAGEMENT

| Property | Value |
|----------|-------|
| Session type | Supabase Auth JWT in HTTP-only cookies |
| Session duration | Default Supabase (1 hour access token, refreshed automatically) |
| Refresh token | Yes, managed by Supabase SDK |
| Cookie configuration | Set via `@supabase/ssr` cookie adapter |
| Session invalidation | `supabase.auth.signOut()` (clears cookies + revokes refresh token) |
| Custom session table | **None** - fully managed by Supabase |
| Session timeout config | **Not configured** - uses Supabase defaults |
| Concurrent sessions | Allowed (no limit) |

---

## 6. SECURITY ASSESSMENT

### What's Working Well

| Area | Status | Details |
|------|--------|---------|
| Password hashing | Secure | Handled by Supabase (bcrypt) |
| Session management | Good | JWT + refresh tokens via Supabase |
| CSRF protection | Good | Supabase uses same-site cookies |
| SQL injection | Safe | Supabase client uses parameterized queries |
| Email enumeration | Protected | Password reset shows neutral message |
| Admin API routes | Protected | `requireAdmin()` check on all admin endpoints |
| Role-based API access | Working | `requireRole()` with admin bypass |
| Portal isolation | Working | Layout-level `requirePortalRole()` prevents cross-portal access |
| RLS | Enabled | All tables have RLS policies |
| User disable | Working | `adminSetUserStatus("disabled")` bans user at Supabase Auth level |

### Critical Issues

#### 1. `is_admin()` RPC Function is Missing from Migrations

**Severity: HIGH**

The middleware calls `supabase.rpc("is_admin")` to protect `/admin/*` routes, but **no `CREATE FUNCTION is_admin()` exists in any migration file**. This function was likely created directly in the Supabase dashboard.

**Impact:** If the Supabase project is recreated or migrated, admin route protection breaks entirely. The `ADMIN_GATE=open` workaround only bypasses the UI shell, not the middleware.

**Fix needed:**
```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;
```

#### 2. No Rate Limiting on Login

**Severity: HIGH**

No rate limiting on `signInWithPassword` calls. Supabase has basic built-in rate limiting but no custom app-level protection. No account lockout after failed attempts.

#### 3. Weak Password Requirements

**Severity: MEDIUM**

Password reset enforces only 8-character minimum. No requirements for:
- Uppercase/lowercase mix
- Numbers
- Special characters
- Common password checking

Login form has **zero** password validation (any string accepted).

#### 4. No Audit Logging for Auth Events

**Severity: MEDIUM**

The `audit_logs` table exists but is not used for login events. No logging of:
- Successful logins
- Failed login attempts
- Password changes
- Role changes (admin actions)
- Session creation/destruction

#### 5. `app_profiles` Column Drift

**Severity: MEDIUM**

Columns `status`, `first_name`, `last_name`, `phone`, `address1`, `address2`, `city`, `state`, `postal_code` are used in code but have no corresponding `ALTER TABLE` migration (only `stripe_customer_id` has one). These were likely added via Supabase dashboard.

#### 6. No `NEXT_PUBLIC_SITE_URL` Configured

**Severity: LOW**

Password reset emails use `window.location.origin` as fallback. In production, this should be explicitly set.

#### 7. Portal Middleware Doesn't Check Role

**Severity: LOW**

For `/broker/*`, `/contractor/*`, etc., the middleware only checks authentication (user exists), not authorization (correct role). Role enforcement happens in the `(app)/Layout.tsx` server component. This means the middleware lets any authenticated user through to the layout, which then redirects them.

This works but adds unnecessary server load — a contractor hitting `/broker/dashboard` goes through middleware → layout → redirect, when middleware could reject immediately.

#### 8. No `.env.example` File

**Severity: LOW**

No template documenting required environment variables. New developers must reverse-engineer from code.

---

## 7. FILE LOCATIONS

### Core Auth Files

| File | Purpose |
|------|---------|
| `src/lib/supabase/browser.ts` | Browser Supabase client factory |
| `src/lib/supabase/server.ts` | Server Supabase client + admin client |
| `src/lib/auth/role.ts` | `AppRole` type, `defaultPathForRole()`, `ensureProfileAndGetRole()` |
| `src/lib/auth/requireRole.ts` | `requirePortalRole()` — layout-level portal gate |
| `src/middleware.ts` | Route protection (auth + admin check) |
| `src/app/api/v1/_lib/auth.ts` | API route auth helpers: `requireAuth()`, `requireAdmin()`, `requireRole()` |

### Auth Pages

| File | Purpose |
|------|---------|
| `src/app/login/page.tsx` | Login page (server component shell) |
| `src/app/login/LoginForm.tsx` | Login form (client component) |
| `src/app/reset-password/page.tsx` | Password reset page (server shell) |
| `src/app/reset-password/ResetPasswordForm.tsx` | Password reset form (client component) |
| `src/app/auth/callback/route.ts` | OAuth/PKCE code exchange endpoint |
| `src/app/logout/route.ts` | Server-side sign out |

### Admin User Management

| File | Purpose |
|------|---------|
| `src/app/admin/settings/_actions/users.ts` | All admin user CRUD: invite, set role, set status, generate links |
| `src/app/admin/settings/_components/AdminUsersTable.tsx` | User management UI |
| `src/app/admin/_components/AdminShell.tsx` | `ADMIN_GATE` dev toggle |
| `src/app/admin/_components/AdminAuthButton.tsx` | Legacy sign-out button (no longer imported) |

### Layout Auth

| File | Purpose |
|------|---------|
| `src/app/(app)/Layout.tsx` | Portal auth gate: getUser → ensureProfile → requirePortalRole |
| `src/app/admin/layout.tsx` | Admin layout with ProfileMenu |
| `src/app/(app)/broker/layout.tsx` | Broker layout with ProfileMenu |
| `src/app/(app)/contractor/layout.tsx` | Contractor layout (no auth gate in layout itself) |

### Database

| File | Purpose |
|------|---------|
| `supabase/migrations/20260125000001_app_profiles.sql` | `app_profiles` table + `app_role` enum + RLS policies |
| `supabase/migrations/20260217000015_stripe_columns.sql` | Added `stripe_customer_id` to `app_profiles` |

---

## 8. WHAT EXISTS vs WHAT NEEDS TO BE BUILT

### Exists and Working

| Feature | Status |
|---------|--------|
| Supabase Auth integration | Complete |
| Email/password login | Complete |
| Password reset flow (2-phase) | Complete |
| `app_profiles` table with role enum | Complete |
| 5-role system (admin, broker, contractor, homeowner, affiliate) | Complete |
| Middleware route protection | Complete (with caveats) |
| Layout-level portal role enforcement | Complete |
| API route auth helpers | Complete |
| Admin user management (invite, role, status, password links) | Complete |
| Logout (server + client) | Complete |
| ProfileMenu component (shared) | Complete |
| User disable/ban | Complete |
| RLS on all tables | Complete |

### Missing / Needs Building

| Feature | Priority | Notes |
|---------|----------|-------|
| `is_admin()` migration | **CRITICAL** | Function exists in Supabase but not in migrations. Must add. |
| `rei_staff` role | HIGH | Spec requires it. Need to add to enum + build dashboard. |
| Rate limiting on login | HIGH | No protection against brute force. |
| Audit logging for auth events | HIGH | Login success/failure, role changes, session events. |
| Password strength validation | MEDIUM | Currently only 8-char minimum on reset. None on login. |
| Self-signup flows | MEDIUM | Spec calls for contractor + affiliate self-signup. Currently admin-only invite. |
| Homeowner magic link flow | MEDIUM | Spec describes auto-account creation from campaign links. Not built. |
| Middleware role enforcement | LOW | Currently only checks auth, not role, for portals. |
| Session timeout configuration | LOW | Uses Supabase defaults. May want custom for admin. |
| MFA / 2FA | LOW | Spec mentions as future. Supabase supports it. |
| `.env.example` file | LOW | Developer experience. |
| Migration for profile columns | LOW | `status`, name, address fields need proper migrations. |

---

## 9. RECOMMENDATIONS (Based on Spec)

### Immediate (Week 1)

1. **Add `is_admin()` function migration** — critical for reproducible deployments
2. **Add `rei_staff` to `app_role` enum** — blocking REI team feature
3. **Add migrations for missing `app_profiles` columns** — `status`, `first_name`, `last_name`, `phone`, `address1`, `address2`, `city`, `state`, `postal_code`
4. **Add middleware role checking for portals** — move role check from layout to middleware for `/broker/*`, `/contractor/*`, etc. to reject early
5. **Implement login rate limiting** — track failed attempts, lock after 5 failures for 15 minutes
6. **Add auth audit logging** — log login success/failure/password-change to `audit_logs` table

### Short-term (Week 2-3)

7. **Build self-signup for contractors + affiliates** — `/signup?role=contractor` with approval workflow
8. **Build homeowner magic link flow** — auto-create account from campaign email click
9. **Strengthen password requirements** — 12 chars, mixed case, number, special char
10. **Add email verification for new accounts** — currently `email_confirm: true` skips verification
11. **Build REI Staff dashboard** — `/rei-team/*` routes for HES assessors + inspectors

### Future

12. **MFA/2FA** — especially for admin accounts
13. **Session management UI** — show active sessions, allow revocation
14. **Password expiration** — 90-day rotation for admin accounts
15. **Role switching** — spec mentions users who may have multiple roles

---

## AUTH FLOW DIAGRAM

```
                    ┌─────────────┐
                    │   Browser   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  /login     │ (Public)
                    │  LoginForm  │
                    └──────┬──────┘
                           │ signInWithPassword()
                    ┌──────▼──────┐
                    │  Supabase   │
                    │  Auth       │ Sets JWT cookies
                    └──────┬──────┘
                           │ ensureProfileAndGetRole()
                    ┌──────▼──────┐
                    │ app_profiles│ → role
                    └──────┬──────┘
                           │ redirect by role
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ /admin/* │ │/broker/* │ │/contract │
        └────┬─────┘ └────┬─────┘ └────┬─────┘
             │            │            │
      ┌──────▼──────┐     │            │
      │ middleware:  │     │            │
      │ getUser()   │     │            │
      │ rpc(is_admin)     │            │
      └──────┬──────┘     │            │
             │      ┌─────▼─────┐      │
             │      │middleware: │      │
             │      │getUser()  │◄─────┘
             │      └─────┬─────┘
             │            │
             │      ┌─────▼──────────┐
             │      │ (app)/Layout:  │
             │      │ requirePortal  │
             │      │ Role()         │
             │      └─────┬──────────┘
             │            │
             ▼            ▼
        ┌─────────────────────┐
        │  API routes:        │
        │  requireAuth()      │
        │  requireAdmin()     │
        │  requireRole()      │
        └─────────────────────┘
             │
             ▼
        ┌─────────────────────┐
        │  Supabase DB (RLS)  │
        │  admin OR own-data  │
        └─────────────────────┘
```
