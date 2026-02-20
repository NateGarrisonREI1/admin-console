# Phase 8B: Service Portal, Field Console & Payment Flow

## Executive Summary

Phase 8B builds the `/portal` route — a unified, role-based console for all non-admin users. The first role implemented is the **Field Tech** (HES assessors, inspectors, REI team members), who need a mobile-friendly workspace to manage their daily schedule, complete jobs in the field, collect payment via Stripe, and trigger LEAF report delivery. This phase also introduces the **Activity Log** system (visible in both admin and portal), links the **Schedule → Service Catalog** so all scheduling pulls from catalog pricing, and establishes the portal shell that will later serve affiliates, contractors, brokers, and homeowners.

---

## 1. Portal Architecture

### Route: `/portal`

Single route, role-based content. User logs in → auth checks their role in `app_profiles` → renders the appropriate tab set.

```
/portal
  ├── /portal/schedule        (Field Tech, Affiliate)
  ├── /portal/jobs             (Field Tech)
  ├── /portal/jobs/[id]        (Field Tech — job detail + completion)
  ├── /portal/referrals        (Affiliate — Phase 8C+)
  ├── /portal/commissions      (Affiliate — Phase 8C+)
  ├── /portal/leads            (Contractor — future)
  ├── /portal/home             (Homeowner — Phase 8C)
  ├── /portal/settings         (All roles)
```

### Portal Shell (shared layout)

- **Header**: REI logo, user name + role badge, notification bell, logout
- **Navigation**: Horizontal tab bar (not sidebar — mobile-first). Tabs determined by role.
- **Responsive**: Designed for tablet-first, works on phone and laptop. Touch-friendly tap targets (min 44px).
- **Dark theme**: Matches admin console and LEAF app aesthetic
- **No sidebar**: Unlike admin console. Tabs + cards, optimized for touch.

### Role → Tab Mapping

| Role | Tabs Visible | Default Tab |
|------|-------------|-------------|
| `hes_assessor` | Schedule, Jobs, Settings | Schedule |
| `inspector` | Schedule, Jobs, Settings | Schedule |
| `field_tech` | Schedule, Jobs, Settings | Schedule |
| `affiliate` | Schedule, Referrals, Commissions, Settings | Schedule |
| `contractor` | Leads, Jobs, Settings | Leads |
| `homeowner` | My Home, Settings | My Home |

### Auth + Role Detection

Portal uses the same Supabase auth as admin console. Role comes from `app_profiles.role`. If a user has no role or an unrecognized role, they see a "Contact your administrator" message.

If a user has admin privileges AND a field role, they can toggle between `/admin` and `/portal` via a switcher in the header.

---

## 2. Field Tech Console

This is what Braden sees when he logs in. Three tabs: **Schedule**, **Jobs**, **Settings**.

### 2A. Schedule Tab (`/portal/schedule`)

**Daily view by default** (field techs think in "today"), with ability to switch to week view.

#### Daily View

Date picker at top (defaults to today). Left/right arrows to navigate days.

Jobs listed as time-ordered cards:

```
┌─────────────────────────────────────────────┐
│  ● 9:00 AM — HES Assessment                │
│  John Smith · 1234 Oak St, Portland 97201   │
│  Small Home · $125                          │
│                                             │
│  [Navigate]  [Call]  [Details →]            │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  ● 11:30 AM — HES Assessment               │
│  Maria Garcia · 5678 Pine Ave, Beaverton    │
│  Medium Home · $175                         │
│                                             │
│  [Navigate]  [Call]  [Details →]            │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  ○ 2:00 PM — Home Inspection               │
│  Robert Chen · 9012 Elm Dr, Lake Oswego     │
│  Large Home · $350                          │
│                                             │
│  [Navigate]  [Call]  [Details →]            │
└─────────────────────────────────────────────┘
```

**Card elements:**
- Status dot: green (completed), amber (in progress), white (upcoming), red (overdue)
- Time + service type (from Service Catalog)
- Customer name + address (one line)
- Home size tier + price (from catalog pricing)
- **Navigate**: Opens Apple Maps / Google Maps with address pre-filled
- **Call**: `tel:` link to homeowner phone
- **Details →**: Opens job detail view

#### Week View

Seven-column grid (Mon–Sun), each column shows that day's jobs as compact pills. Tap a pill → opens job detail. Shows job count per day.

#### Empty State

"No jobs scheduled for [date]. Enjoy your day off." with a link to admin contact if they think it's an error.

### 2B. Jobs Tab (`/portal/jobs`)

Filtered list of all jobs assigned to the field tech. Three sub-filters:

- **Upcoming** (default): scheduled, not yet started
- **In Progress**: started but not completed
- **Completed**: finished, payment collected

Same card layout as Schedule but with status-based sorting and filtering. Search bar to find by customer name or address.

### 2C. Job Detail View (`/portal/jobs/[id]`)

Full-screen view when tapping into a job. This is where the field tech spends most of their time during a job.

#### Sections:

**Header**
- Service type + tier (e.g., "HES Assessment — Medium Home")
- Status badge (Scheduled → En Route → In Progress → Completing → Completed)
- Scheduled date/time

**Customer Info Card**
- Name, phone (tap to call), email (tap to email)
- Full address with Navigate button (opens native maps)
- Notes from scheduling (e.g., "Gate code: 1234", "Dog in backyard")

**Job Actions** (contextual based on status)

| Status | Available Actions |
|--------|------------------|
| Scheduled | "I'm On My Way" (sets En Route) |
| En Route | "I've Arrived" (sets In Progress, timestamps arrival) |
| In Progress | "Complete Job" (opens payment flow) |
| Completing | Payment in progress — shows Stripe status |
| Completed | View receipt, LEAF delivery status |

**Service Details Card**
- Service from catalog: name, description, tier
- Add-ons if applicable (Radon Testing, etc.)
- Price breakdown: base service + add-ons = total
- This is read-only for the field tech — set during scheduling

**Activity Log** (see Section 4 below)
- Full timeline of everything that's happened on this job
- Visible to field tech so they can answer customer questions about status

**Job Notes**
- Field tech can add notes during the job
- Text input + optional photo attachment (e.g., photo of equipment, issue found)
- Notes are visible in admin console and persist on the job record

#### Job Status Flow

```
Scheduled
  ↓  "I'm On My Way" (tech taps)
En Route
  ↓  "I've Arrived" (tech taps)
In Progress
  ↓  "Complete Job" (tech taps)
  ↓  → Payment flow opens
Completing
  ↓  Stripe payment confirmed (webhook)
Completed
  ↓  LEAF report link sent automatically
Delivered
```

Each transition writes to the Activity Log with timestamp + actor.

### 2D. Settings Tab (`/portal/settings`)

Field tech can manage their profile and preferences.

**Profile Section**
- Name, phone, email (from app_profiles, editable)
- Profile photo (upload/change)
- Company name / title

**Company Info**
- Company logo (used on invoices)
- Company address
- Company phone

**Notifications**
- Email notifications on/off: new job assigned, job rescheduled, payment received
- Push notification preferences (future, when mobile app exists)

**Invoice Settings**
- Reply-to email for invoices (default: their profile email)
- Custom footer text on invoices (optional)

**Schedule Preferences**
- Default start time (e.g., 8:00 AM)
- Default end time (e.g., 5:00 PM)
- Blocked days (mark days unavailable)
- Service area / max drive distance (informational, admin still controls assignments)

---

## 3. Stripe Payment Flow (Job Completion)

### Approach: Stripe Payment Links

When the field tech taps "Complete Job," the system generates a Stripe Payment Link with the exact amount from the service catalog. The tech either shows the link/QR to the customer or texts it to them. Payment is confirmed via Stripe webhook.

### Flow

```
Tech taps "Complete Job"
  ↓
System generates Stripe Payment Link
  - Amount: from service catalog (base + add-ons)
  - Description: "HES Assessment — Medium Home"
  - Customer email: pre-filled from job record
  - Metadata: { job_id, tech_id, service_id, admin_org_id }
  ↓
Tech sees payment screen with options:
  [Show QR Code]  — customer scans with their phone
  [Text Link]     — sends SMS with payment link to customer phone
  [Email Invoice] — sends email with payment link (backup option)
  ↓
Customer pays on their device
  ↓
Stripe webhook fires → hits admin console API route
  ↓
Webhook handler:
  1. Marks job as "Completed"
  2. Records payment in payments table
  3. Writes Activity Log entry: "Payment of $175 collected via Stripe"
  4. Triggers LEAF report delivery (see Phase 8C)
  5. Sends receipt to customer email
  6. Updates portal UI in real-time (or on next poll)
```

### Payment Link Generation

```typescript
// POST /api/stripe/create-payment-link
// Called when tech taps "Complete Job"

const paymentLink = await stripe.paymentLinks.create({
  line_items: [{
    price_data: {
      currency: 'usd',
      product_data: {
        name: `${serviceName} — ${tierName}`,
        description: `Service at ${jobAddress}`,
      },
      unit_amount: totalCents, // from service catalog
    },
    quantity: 1,
  }],
  metadata: {
    job_id: job.id,
    tech_id: techProfile.id,
    service_type: job.service_type,
    customer_email: job.customer_email,
  },
  after_completion: {
    type: 'redirect',
    redirect: { url: `${baseUrl}/payment/success?job_id=${job.id}` }
  }
});
```

### Webhook Handler

```typescript
// POST /api/stripe/webhook
// Stripe sends checkout.session.completed event

// 1. Verify webhook signature
// 2. Extract job_id from metadata
// 3. Update job status → 'completed'
// 4. Create payment record
// 5. Write activity log entry
// 6. Trigger LEAF delivery (Phase 8C — for now, just mark as ready)
// 7. Send receipt email to customer
```

### Payment Screen UI (on tech's device)

```
┌─────────────────────────────────────────────┐
│          Complete Job & Collect Payment      │
│                                             │
│  Service: HES Assessment — Medium Home      │
│  Customer: Maria Garcia                     │
│  Amount: $175.00                            │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │                                     │    │
│  │         [QR CODE HERE]              │    │
│  │                                     │    │
│  │   Customer scans to pay             │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ── or ──                                   │
│                                             │
│  [📱 Text Payment Link]                     │
│  [📧 Email Invoice]                         │
│                                             │
│  ─────────────────────────────────────────  │
│  ⏳ Waiting for payment...                  │
│     Auto-updates when payment is received   │
│                                             │
│  [Cancel — Go Back]                         │
└─────────────────────────────────────────────┘
```

Once payment is received, the screen auto-updates to:

```
┌─────────────────────────────────────────────┐
│           ✅ Payment Received!              │
│                                             │
│  $175.00 paid by Maria Garcia               │
│  Receipt sent to maria@email.com            │
│  LEAF report delivery: Queued               │
│                                             │
│  [View Receipt]  [Next Job →]               │
└─────────────────────────────────────────────┘
```

### Stripe Setup Requirements

- Stripe account connected (API keys in env vars)
- Webhook endpoint registered in Stripe dashboard
- Stripe Customer objects created per homeowner (for receipt tracking)
- No Stripe Connect needed initially (REI is the sole merchant)

---

## 4. Activity Log System

Every job has a timeline of events. This is the single source of truth for "what happened and when" on any job. Visible in both the admin console and the portal.

### Data Model

```sql
CREATE TABLE IF NOT EXISTS job_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL,               -- references admin_jobs.id
  actor_id UUID,                      -- who did it (user ID, null for system)
  actor_name TEXT,                     -- display name at time of action
  actor_role TEXT,                     -- 'admin' | 'field_tech' | 'system' | 'customer'
  action TEXT NOT NULL,                -- machine-readable action type
  title TEXT NOT NULL,                 -- human-readable title
  details JSONB,                      -- optional structured data
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activity_log_job ON job_activity_log(job_id);
CREATE INDEX idx_activity_log_created ON job_activity_log(created_at);
```

### Action Types

| Action | Title Example | Actor | Trigger |
|--------|--------------|-------|---------|
| `job_created` | "Job scheduled" | admin | Schedule Service modal |
| `job_rescheduled` | "Rescheduled from Jan 15 to Jan 18" | admin | Edit schedule |
| `tech_assigned` | "Assigned to Braden" | admin | Tech assignment |
| `tech_en_route` | "Braden is on the way" | field_tech | "I'm On My Way" tap |
| `tech_arrived` | "Braden arrived on site" | field_tech | "I've Arrived" tap |
| `job_started` | "Job in progress" | field_tech | Auto on arrival |
| `note_added` | "Field note added" | field_tech | Tech adds note |
| `photo_added` | "Photo added" | field_tech | Tech uploads photo |
| `payment_initiated` | "Payment link sent ($175)" | field_tech | Complete Job tap |
| `payment_received` | "Payment received ($175 via Stripe)" | system | Stripe webhook |
| `invoice_sent` | "Invoice emailed to maria@email.com" | system | Post-payment |
| `leaf_queued` | "LEAF report delivery queued" | system | Post-payment |
| `leaf_delivered` | "LEAF report link sent to maria@email.com" | system | Email sent |
| `job_completed` | "Job completed" | system | Payment confirmed |
| `customer_contacted` | "Called customer" | field_tech | Manual log |
| `job_cancelled` | "Job cancelled: homeowner no-show" | admin | Cancel action |
| `refund_issued` | "Refund of $175 issued" | admin | Refund action |

### Activity Log UI (in job detail — both admin and portal)

```
Activity Log
─────────────────────────────────────────
● Feb 18, 2:15 PM — Payment received ($175 via Stripe)
    System

● Feb 18, 2:14 PM — Payment link sent ($175)
    Braden

● Feb 18, 12:30 PM — Braden arrived on site
    Braden

● Feb 18, 12:05 PM — Braden is on the way
    Braden

● Feb 17, 3:00 PM — Rescheduled from Feb 17 to Feb 18
    Sarah (Admin) · "Homeowner requested afternoon slot"

● Feb 15, 10:00 AM — Assigned to Braden
    Sarah (Admin)

● Feb 15, 9:45 AM — Job scheduled
    Sarah (Admin)
─────────────────────────────────────────
```

Newest entries at top. Each entry shows: timestamp, title, actor name, optional detail text.

### Admin Console Integration

The Activity Log appears in the admin Schedule page's job side panel. When you click a job in the admin console, the side panel shows all job details PLUS the activity log at the bottom. This replaces any existing status display with the full timeline.

### Writing to the Log

Every server action that modifies a job should write to the activity log. Create a utility:

```typescript
// lib/activityLog.ts
export async function logJobActivity(
  jobId: string,
  action: string,
  title: string,
  actor?: { id: string; name: string; role: string },
  details?: Record<string, any>
) {
  await supabase.from('job_activity_log').insert({
    job_id: jobId,
    actor_id: actor?.id ?? null,
    actor_name: actor?.name ?? 'System',
    actor_role: actor?.role ?? 'system',
    action,
    title,
    details: details ?? null,
  });
}
```

---

## 5. Schedule → Service Catalog Link

### Current Problem

The Schedule Service modal has manual fields for service type, pricing, etc. This should pull directly from the Service Catalog so prices are always consistent and services are always up to date.

### Solution

When admin opens Schedule Service modal:

1. **Step 1: Pick Service** — dropdown or card selector showing services from `service_categories` table
   - HES Assessment
   - Home Inspection
   - (any future services added to catalog)

2. **Step 2: Pick Tier** — based on selected service, show tiers from `service_tiers` table
   - Small Home (Under 1,500 sq ft) — $125
   - Medium Home (1,500–3,000 sq ft) — $175
   - Large Home (3,000+ sq ft) — $250
   - Price auto-fills from catalog

3. **Step 3: Add-Ons** — optional add-ons from `service_addons` table
   - Radon Testing — $50
   - Thermal Imaging — $75
   - (checkboxes, prices from catalog)

4. **Step 4: Total** — auto-calculated
   - Base: $175 (Medium Home HES)
   - Add-on: $50 (Radon Testing)
   - **Total: $225**

5. **Step 5: Schedule Details** — date, time, assigned tech, customer info, notes

### Data Flow

```
Service Catalog (source of truth)
  ↓
Schedule Service Modal (reads catalog, creates job)
  ↓
admin_jobs table (stores service_category_id, service_tier_id, addon_ids[], total_price)
  ↓
Portal Schedule Card (displays service name, tier, price from job record)
  ↓
Stripe Payment Link (amount = total_price from job record)
```

### Schema Updates to admin_jobs

```sql
ALTER TABLE admin_jobs ADD COLUMN IF NOT EXISTS service_category_id UUID;
ALTER TABLE admin_jobs ADD COLUMN IF NOT EXISTS service_tier_id UUID;
ALTER TABLE admin_jobs ADD COLUMN IF NOT EXISTS addon_ids UUID[];
ALTER TABLE admin_jobs ADD COLUMN IF NOT EXISTS catalog_base_price NUMERIC(10,2);
ALTER TABLE admin_jobs ADD COLUMN IF NOT EXISTS catalog_addon_total NUMERIC(10,2);
ALTER TABLE admin_jobs ADD COLUMN IF NOT EXISTS catalog_total_price NUMERIC(10,2);
ALTER TABLE admin_jobs ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE admin_jobs ADD COLUMN IF NOT EXISTS payment_id TEXT;
ALTER TABLE admin_jobs ADD COLUMN IF NOT EXISTS stripe_payment_link_id TEXT;
ALTER TABLE admin_jobs ADD COLUMN IF NOT EXISTS leaf_delivery_status TEXT DEFAULT 'not_applicable';
ALTER TABLE admin_jobs ADD COLUMN IF NOT EXISTS leaf_report_url TEXT;
```

---

## 6. Database Schema (New Tables + Changes)

### New Tables

```sql
-- Activity log (see Section 4)
CREATE TABLE IF NOT EXISTS job_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL,
  actor_id UUID,
  actor_name TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  title TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activity_log_job ON job_activity_log(job_id);
CREATE INDEX idx_activity_log_created ON job_activity_log(created_at);

-- Portal user settings (extends app_profiles)
-- Field tech settings, invoice prefs, schedule prefs
CREATE TABLE IF NOT EXISTS portal_user_settings (
  user_id UUID PRIMARY KEY,
  company_name TEXT,
  company_address TEXT,
  company_phone TEXT,
  company_logo_url TEXT,
  invoice_reply_email TEXT,
  invoice_footer_text TEXT,
  schedule_start_time TIME DEFAULT '08:00',
  schedule_end_time TIME DEFAULT '17:00',
  blocked_days TEXT[],
  notification_new_job BOOLEAN DEFAULT true,
  notification_reschedule BOOLEAN DEFAULT true,
  notification_payment BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Columns Added to admin_jobs

```sql
-- Service catalog linkage
ALTER TABLE admin_jobs ADD COLUMN IF NOT EXISTS service_category_id UUID;
ALTER TABLE admin_jobs ADD COLUMN IF NOT EXISTS service_tier_id UUID;
ALTER TABLE admin_jobs ADD COLUMN IF NOT EXISTS addon_ids UUID[];
ALTER TABLE admin_jobs ADD COLUMN IF NOT EXISTS catalog_base_price NUMERIC(10,2);
ALTER TABLE admin_jobs ADD COLUMN IF NOT EXISTS catalog_addon_total NUMERIC(10,2);
ALTER TABLE admin_jobs ADD COLUMN IF NOT EXISTS catalog_total_price NUMERIC(10,2);

-- Payment tracking
ALTER TABLE admin_jobs ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE admin_jobs ADD COLUMN IF NOT EXISTS payment_id TEXT;
ALTER TABLE admin_jobs ADD COLUMN IF NOT EXISTS stripe_payment_link_id TEXT;
ALTER TABLE admin_jobs ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;

-- LEAF delivery tracking
ALTER TABLE admin_jobs ADD COLUMN IF NOT EXISTS leaf_delivery_status TEXT DEFAULT 'not_applicable';
ALTER TABLE admin_jobs ADD COLUMN IF NOT EXISTS leaf_report_url TEXT;
ALTER TABLE admin_jobs ADD COLUMN IF NOT EXISTS leaf_session_id UUID;

-- Field tech tracking
ALTER TABLE admin_jobs ADD COLUMN IF NOT EXISTS tech_en_route_at TIMESTAMPTZ;
ALTER TABLE admin_jobs ADD COLUMN IF NOT EXISTS tech_arrived_at TIMESTAMPTZ;
ALTER TABLE admin_jobs ADD COLUMN IF NOT EXISTS job_started_at TIMESTAMPTZ;
ALTER TABLE admin_jobs ADD COLUMN IF NOT EXISTS job_completed_at TIMESTAMPTZ;
ALTER TABLE admin_jobs ADD COLUMN IF NOT EXISTS payment_received_at TIMESTAMPTZ;
```

---

## 7. API Routes (New)

### Portal Data

```
GET  /api/portal/schedule?date=2026-02-19&tech_id=xxx
     Returns jobs for a specific date assigned to the tech

GET  /api/portal/jobs?tech_id=xxx&status=upcoming|in_progress|completed
     Returns filtered job list for tech

GET  /api/portal/jobs/[id]
     Returns full job detail including activity log

POST /api/portal/jobs/[id]/status
     Updates job status (en_route, arrived, in_progress)
     Writes activity log entry

POST /api/portal/jobs/[id]/note
     Adds a field note to the job

GET  /api/portal/settings
     Returns portal_user_settings for current user

POST /api/portal/settings
     Updates portal_user_settings
```

### Stripe

```
POST /api/stripe/create-payment-link
     Generates Stripe Payment Link for job completion
     Body: { job_id }
     Returns: { url, qr_code_url }

POST /api/stripe/webhook
     Receives Stripe events (checkout.session.completed, etc.)
     Updates job status, records payment, triggers LEAF delivery

GET  /api/stripe/payment-status/[job_id]
     Polls payment status (for real-time UI update on tech's device)
```

### SMS (for texting payment link)

```
POST /api/sms/send-payment-link
     Sends payment link via SMS to customer
     Body: { job_id, phone_number }
     Uses Twilio or similar
```

---

## 8. Implementation Order

### Phase 8B-1: Foundation
1. Create `/portal` route with layout shell + auth + role detection
2. Create `portal_user_settings` table
3. Create `job_activity_log` table
4. Add columns to `admin_jobs`
5. Build Settings tab (profile, company info, invoice settings)

### Phase 8B-2: Schedule + Service Catalog
6. Refactor Schedule Service modal to pull from Service Catalog
7. Store service_category_id, tier_id, addon_ids, prices on admin_jobs
8. Build portal Schedule tab (daily + week view)
9. Build portal Jobs tab (list with filters)

### Phase 8B-3: Job Detail + Field Flow
10. Build Job Detail view with all sections
11. Implement status transitions (en route → arrived → in progress → complete)
12. Build Activity Log component (shared between admin + portal)
13. Wire Activity Log into admin Schedule side panel
14. Add field notes + photo upload

### Phase 8B-4: Stripe Payment
15. Set up Stripe integration (API keys, webhook endpoint)
16. Build payment link generation endpoint
17. Build payment screen UI (QR code, text link, email invoice)
18. Build Stripe webhook handler
19. Wire payment confirmation → job completion → LEAF delivery trigger
20. Build real-time payment status polling

### Phase 8B-5: Polish + Testing
21. Responsive testing (tablet, phone, laptop)
22. Dark theme consistency
23. Empty states, error handling, offline resilience
24. Navigation (maps integration) testing on mobile
25. End-to-end flow test: schedule → assign → field work → payment → completion

---

## 9. LEAF Delivery Trigger (Stub for Phase 8C)

Phase 8B builds everything up to the moment of payment. When payment is confirmed:

1. Job status → completed ✅
2. Payment recorded ✅
3. Activity log updated ✅
4. **LEAF delivery triggered** → Phase 8C handles this

For now, 8B sets `leaf_delivery_status = 'queued'` on the job record. Phase 8C will implement:
- Generating the LEAF report URL (with source context — "post-HES, skip HES question")
- Sending the email with invoice + LEAF link
- Tracking the funnel (opened → home info submitted → diagnose viewed → CTA clicked)
- LEAF Performance dashboard in admin console

---

## 10. Technical Notes

### Tablet-First Design Principles
- Minimum touch target: 44x44px
- Cards over tables (tables don't work well on portrait tablet)
- Swipe gestures for navigating between days (schedule)
- Large, clear action buttons for field use (gloved hands, outdoor glare)
- High contrast text (min 4.5:1 ratio)

### Offline Considerations (Future)
- Phase 8B assumes connectivity. Jobs load from server on each view.
- Future enhancement: cache today's jobs in localStorage, queue status updates if offline, sync when reconnected.
- Service workers and PWA manifest can be added later for "install to home screen" on tablets.

### Stripe Environment
- Development: Stripe test mode (test API keys)
- Production: Stripe live mode
- Webhook secret stored in env var `STRIPE_WEBHOOK_SECRET`
- Payment links auto-expire after 24 hours

### Shared Components
- `ActivityLog` component: used in both `/admin` job side panel and `/portal/jobs/[id]`
- `ServiceCatalogPicker` component: used in Schedule Service modal (replaces manual fields)
- `JobStatusBadge` component: consistent status display across admin and portal
