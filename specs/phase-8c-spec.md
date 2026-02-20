# Phase 8C: LEAF Delivery, CTA Wiring & Homeowner Console

## Executive Summary

Phase 8C connects the LEAF report app to the admin console ecosystem, builds the homeowner portal tab, and creates the LEAF Performance dashboard. When a field tech completes a job and collects payment (Phase 8B), the system delivers a LEAF report link to the homeowner. When the homeowner engages with that report and clicks a CTA, a lead is created and routed to the job board. Every stage of this funnel is tracked and visible in the admin console.

This phase also addresses the **critical architecture decision**: the LEAF app and admin console currently use separate Supabase projects. This spec recommends consolidation and provides a migration path.

---

## 0. Architecture Decision: Supabase Consolidation

### Current State
- **Admin console** (rei-admin): Own Supabase project
- **LEAF app** (leaf-diagnose-sim-2): Own Supabase project, writes to `intake_sessions` table

### The Problem
With separate databases, tracking the LEAF funnel requires cross-database communication — webhooks, API bridges, or dual-writes. Every one of these adds latency, failure points, and maintenance burden. The admin console can't simply query `intake_sessions` to see LEAF engagement.

### Recommendation: Migrate LEAF to Admin's Supabase

The LEAF app's Supabase usage is minimal — one table (`intake_sessions`), one client file (`client.ts`), no auth, no RLS, no edge functions. Migration is straightforward:

1. Create `intake_sessions` table in the admin Supabase project
2. Update LEAF app's `.env` to point to admin Supabase URL + anon key
3. Deploy LEAF app
4. Verify sessions are writing to the shared database
5. Decommission the old LEAF Supabase project

**Migration SQL (run in admin Supabase):**

```sql
CREATE TABLE IF NOT EXISTS intake_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  global_payload JSONB,
  system_payload JSONB,
  current_system TEXT,
  current_mode TEXT,

  -- New columns for admin integration (Phase 8C)
  source TEXT DEFAULT 'organic',          -- 'organic' | 'post_hes' | 'post_inspection' | 'broker' | 'qr_code' | 'website'
  source_job_id UUID,                     -- links to admin_jobs.id if delivered post-service
  source_tech_id UUID,                    -- who delivered it
  source_broker_id UUID,                  -- if came through broker channel

  -- Funnel tracking
  link_opened_at TIMESTAMPTZ,             -- when they first opened the link
  home_info_submitted_at TIMESTAMPTZ,     -- when homeInfoSubmitted flipped to true
  diagnose_viewed_at TIMESTAMPTZ,         -- first time they navigated to Diagnose
  simulate_viewed_at TIMESTAMPTZ,         -- first time they navigated to Simulate
  cta_clicked_at TIMESTAMPTZ,            -- first CTA click
  cta_system TEXT,                        -- which system the CTA was for (hvac, water_heater, etc.)
  cta_recommendation TEXT,                -- specific rec (tuneup, replacement, etc.)

  -- Derived contact info (extracted from global_payload for easy querying)
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  property_zip TEXT,
  property_address TEXT,

  -- Lead conversion
  lead_created BOOLEAN DEFAULT false,
  lead_id UUID,                           -- references contractor_leads.id once created

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sessions_source ON intake_sessions(source);
CREATE INDEX idx_sessions_source_job ON intake_sessions(source_job_id);
CREATE INDEX idx_sessions_cta ON intake_sessions(cta_clicked_at) WHERE cta_clicked_at IS NOT NULL;
CREATE INDEX idx_sessions_funnel ON intake_sessions(home_info_submitted_at) WHERE home_info_submitted_at IS NOT NULL;
CREATE INDEX idx_sessions_email ON intake_sessions(contact_email) WHERE contact_email IS NOT NULL;
```

### LEAF App Changes Required

**`client.ts`** — just env vars, no code change:
```
VITE_SUPABASE_URL=https://[admin-project].supabase.co
VITE_SUPABASE_ANON_KEY=[admin-anon-key]
```

**`session.ts`** — minor changes to support pre-created sessions:
```typescript
// Updated getOrCreateSession
export async function getOrCreateSession() {
  // Check URL for pre-created session (from admin delivery)
  const urlParams = new URLSearchParams(window.location.search);
  const sessionParam = urlParams.get('session');

  if (sessionParam) {
    // Validate it exists in DB
    const { data } = await supabase
      .from("intake_sessions")
      .select("id")
      .eq("id", sessionParam)
      .single();

    if (data) {
      localStorage.setItem(STORAGE_KEY, data.id);

      // Track link opened
      await supabase
        .from("intake_sessions")
        .update({ link_opened_at: new Date().toISOString() })
        .eq("id", data.id)
        .is("link_opened_at", null);  // only set once

      return data.id;
    }
  }

  // Existing flow: check localStorage or create new
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;

  const { data, error } = await supabase
    .from("intake_sessions")
    .insert({ source: 'organic' })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create intake session", error);
    throw error;
  }

  localStorage.setItem(STORAGE_KEY, data.id);
  return data.id;
}
```

**`saveSessionProgress`** — add funnel tracking + contact extraction:
```typescript
export async function saveSessionProgress(payload: {
  global_payload: any;
  system_payload: any;
  current_system: string;
  current_mode: string;
}) {
  const id = localStorage.getItem(STORAGE_KEY);
  if (!id) return;

  const g = payload.global_payload;

  // Build update with funnel tracking
  const update: any = { ...payload, updated_at: new Date().toISOString() };

  // Extract contact info for easy querying
  if (g?.contactName) update.contact_name = g.contactName;
  if (g?.contactEmail) update.contact_email = g.contactEmail;
  if (g?.contactPhone) update.contact_phone = g.contactPhone;
  if (g?.propertyZip || g?.zip) update.property_zip = g.propertyZip || g.zip;

  // Build address string
  const parts = [g?.propertyStreet1, g?.propertyCity, g?.propertyState, g?.propertyZip].filter(Boolean);
  if (parts.length > 1) update.property_address = parts.join(', ');

  // Track home info submission
  if (g?.homeInfoSubmitted) {
    update.home_info_submitted_at = new Date().toISOString();
  }

  // Track mode transitions
  if (payload.current_mode === 'diagnose') {
    update.diagnose_viewed_at = new Date().toISOString();
  } else if (payload.current_mode === 'simulate') {
    update.simulate_viewed_at = new Date().toISOString();
  }

  await supabase
    .from("intake_sessions")
    .update(update)
    .eq("id", id);
}
```

### Alternative: Keep Separate (Not Recommended)

If consolidation isn't feasible immediately, the fallback is:
- LEAF app writes to its own Supabase
- LEAF app also POSTs to an admin API endpoint on key events (home info submitted, CTA clicked)
- Admin console stores LEAF tracking data in its own tables
- Requires CORS setup, API auth, retry logic, and two sources of truth

This is more work and more fragile. Consolidation is strongly recommended.

---

## 1. LEAF Report Delivery Flow

### Trigger: Payment Confirmed (from Phase 8B)

When Stripe webhook confirms payment on a job:

```
Stripe webhook fires
  ↓
Phase 8B handler:
  1. Mark job completed ✅
  2. Record payment ✅
  3. Write activity log ✅
  4. → Call LEAF delivery function (Phase 8C)
```

### LEAF Delivery Function

```typescript
// lib/leafDelivery.ts

export async function deliverLeafReport(jobId: string) {
  // 1. Get job details
  const job = await getJob(jobId);

  // 2. Pre-create intake session with source context
  const { data: session } = await supabase
    .from('intake_sessions')
    .insert({
      source: job.service_type === 'hes_assessment' ? 'post_hes' : 'post_inspection',
      source_job_id: jobId,
      source_tech_id: job.assigned_tech_id,
      // Pre-fill contact info from job
      contact_name: job.customer_name,
      contact_email: job.customer_email,
      contact_phone: job.customer_phone,
      property_zip: job.property_zip,
      property_address: job.property_address,
    })
    .select('id')
    .single();

  // 3. Build LEAF URL
  const leafUrl = buildLeafUrl(session.id, job);

  // 4. Send email with invoice + LEAF link
  await sendLeafDeliveryEmail({
    to: job.customer_email,
    customerName: job.customer_name,
    serviceName: job.service_name,
    amountPaid: job.catalog_total_price,
    leafUrl: leafUrl,
    techName: job.tech_name,
    companyName: job.tech_company_name,
    jobDate: job.completed_at,
  });

  // 5. Update job record
  await supabase
    .from('admin_jobs')
    .update({
      leaf_delivery_status: 'delivered',
      leaf_report_url: leafUrl,
      leaf_session_id: session.id,
    })
    .eq('id', jobId);

  // 6. Activity log
  await logJobActivity(jobId, 'leaf_delivered',
    `LEAF report link sent to ${job.customer_email}`,
    { role: 'system' }
  );
}
```

### Building the LEAF URL

```typescript
function buildLeafUrl(sessionId: string, job: any): string {
  const base = process.env.LEAF_APP_URL; // e.g., https://leaf-diagnose-sim-2.vercel.app
  const params = new URLSearchParams({
    session: sessionId,
  });

  // For post-HES deliveries, skip the "Do you want an HES?" question
  if (job.service_type === 'hes_assessment') {
    params.set('skip_hes', 'true');
  }

  return `${base}/intake?${params.toString()}`;
}
```

### Delivery Email

The email serves double duty — it's the receipt AND the LEAF report delivery.

**Subject:** "Your Home Energy Report is Ready — [Service Name] Complete"

**Content:**
```
Hi [Customer Name],

Thank you for your [HES Assessment / Home Inspection] today.
Your payment of $[amount] has been received.

──────────────────────────────

🏠 Your LEAF Home Energy Report

We've prepared a personalized energy report for your home.
Discover your home's energy profile, get recommendations
tailored to your systems, and see how much you could save.

       [ View Your LEAF Report → ]

──────────────────────────────

Service Details:
  Service: [HES Assessment — Medium Home]
  Address: [1234 Oak St, Portland OR 97201]
  Date: [February 18, 2026]
  Technician: [Braden]
  Amount Paid: $175.00

Questions? Contact us at [company phone] or [company email].

[Company Name]
[Invoice footer text from tech settings]
```

### Universal LEAF Links vs. Delivered Links

| Type | URL | Source | Session Pre-Created? |
|------|-----|--------|---------------------|
| Post-Service Delivery | `leaf-app/intake?session=abc123` | `post_hes` or `post_inspection` | Yes, with job context |
| QR Code (door hanger, event) | `leaf-app/intake?source=qr_code&ref=spring2026` | `qr_code` | No, created on first visit |
| Website Embed | `leaf-app/intake?source=website` | `website` | No, created on first visit |
| Broker Distribution | `leaf-app/intake?source=broker&broker_id=xyz` | `broker` | No, created on first visit |
| Cold / Direct | `leaf-app/intake` | `organic` | No, created on first visit |

The LEAF app reads `source` from URL params and passes it to the session creation. Every LEAF report in the wild is trackable back to its origin.

---

## 2. CTA Wiring (Contact / Schedule Button)

### Current State

The "Contact / Schedule" button on the Simulate page currently fires `alert("Contact / Schedule")`. This is the money button.

### New Behavior

When homeowner clicks "Contact / Schedule" on any system's Simulate page:

```
Homeowner clicks CTA
  ↓
LEAF app:
  1. Show confirmation modal (not alert)
  2. Collect: which service they want, preferred contact method
  3. Write CTA event to intake_sessions
  4. Show success screen
  ↓
Admin console (reads from same Supabase):
  5. Picks up the CTA click
  6. Creates a lead in contractor_leads
  7. Routes to job board / network
```

### CTA Modal (replaces alert)

```
┌─────────────────────────────────────────────┐
│       Get a Professional Estimate           │
│                                             │
│  Based on your HVAC diagnosis, we           │
│  recommend a tune-up + performance          │
│  optimization ($110–$140).                  │
│                                             │
│  We'll connect you with a certified         │
│  contractor in your area.                   │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  Your Info (from home info, pre-filled):    │
│  Name: Maria Garcia                        │
│  Email: maria@email.com                    │
│  Phone: 503-555-1234                       │
│  Address: 1234 Oak St, Portland OR 97201   │
│                                             │
│  Preferred contact:                         │
│  (●) Phone call  ( ) Email  ( ) Text       │
│                                             │
│  [Submit Request]                           │
│                                             │
│  By submitting, you agree to be contacted   │
│  about this service estimate.               │
└─────────────────────────────────────────────┘
```

### CTA Data Write

```typescript
// In LEAF app, on CTA submit
async function handleCtaSubmit(system: SystemKey, recommendation: string, contactPref: string) {
  const sessionId = localStorage.getItem(STORAGE_KEY);
  if (!sessionId) return;

  await supabase
    .from('intake_sessions')
    .update({
      cta_clicked_at: new Date().toISOString(),
      cta_system: system,               // 'hvac', 'water_heater', etc.
      cta_recommendation: recommendation, // 'tuneup', 'replacement', etc.
    })
    .eq('id', sessionId);

  // Also write to a dedicated CTA table for multi-CTA tracking
  await supabase
    .from('leaf_cta_events')
    .insert({
      session_id: sessionId,
      system,
      recommendation,
      contact_preference: contactPref,
      contact_name: globalState.contactName,
      contact_email: globalState.contactEmail,
      contact_phone: globalState.contactPhone,
      property_address: buildAddressString(globalState),
      property_zip: globalState.zip,
    });
}
```

### CTA Events Table

A homeowner might click CTAs on multiple systems (HVAC tune-up AND water heater replacement). Each click is a separate lead opportunity.

```sql
CREATE TABLE IF NOT EXISTS leaf_cta_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  system TEXT NOT NULL,                    -- hvac, water_heater, windows, etc.
  recommendation TEXT,                     -- tuneup, replacement, upgrade, etc.
  contact_preference TEXT DEFAULT 'phone', -- phone, email, text
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  property_address TEXT,
  property_zip TEXT,
  lead_created BOOLEAN DEFAULT false,
  lead_id UUID,                           -- set when admin converts to contractor_leads
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cta_session ON leaf_cta_events(session_id);
CREATE INDEX idx_cta_unconverted ON leaf_cta_events(lead_created) WHERE lead_created = false;
```

### Success Screen (after CTA submit)

```
┌─────────────────────────────────────────────┐
│            ✅ Request Submitted!            │
│                                             │
│  We've received your request for an HVAC    │
│  tune-up estimate. A qualified contractor   │
│  will reach out within 24 hours.            │
│                                             │
│  Request #: REI-2026-0847                   │
│  Service: HVAC Tune-up                      │
│  Contact: Phone call to 503-555-1234        │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  📞 Questions? Call (503) 555-0100          │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  Want to track your request and manage      │
│  your home's energy profile?                │
│                                             │
│  [ Create Your Account → ]                  │
│                                             │
│  [Continue Exploring Your Report]           │
└─────────────────────────────────────────────┘
```

The "Create Your Account" button links to the homeowner portal signup (covered in Section 3).

---

## 3. Homeowner Portal (`/portal/home`)

### Entry Points

1. **Post-CTA**: "Create Your Account" button after submitting a service request
2. **Direct Invite**: Admin sends homeowner an invite to view their LEAF history
3. **Self-Registration**: Homeowner creates account from the LEAF app

### Homeowner Registration

Minimal — just email + password. The system links their account to any existing `intake_sessions` by matching `contact_email`. So if Maria filled out a LEAF report and then signs up with the same email, she immediately sees her report history.

### Homeowner Portal Tabs

**My Home** (default tab)
- Property address (from their LEAF session)
- LEAF Report link: "View your latest report" → opens LEAF app with their session
- Energy score summary (if available from LEAF data)
- Service history: list of services performed (from admin_jobs where customer_email matches)
- Active requests: any pending CTA submissions

**Service Requests**
- Status of each CTA they submitted
- Timeline: Submitted → Contractor Assigned → Estimate Scheduled → Complete
- This maps to the job board / lead routing on the admin side

**Settings**
- Name, email, phone
- Notification preferences (email updates on service requests)
- Address management

### Homeowner View — My Home

```
┌─────────────────────────────────────────────┐
│  🏠 My Home                                │
│  1234 Oak St, Portland OR 97201             │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │  🍃 Your LEAF Energy Report           │  │
│  │                                       │  │
│  │  Last updated: Feb 18, 2026           │  │
│  │  Systems explored: HVAC, Water Heater │  │
│  │                                       │  │
│  │  [ Open Your Report → ]               │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  Service History                            │
│  ─────────────────────────────────────────  │
│  ● Feb 18, 2026 — HES Assessment           │
│    Technician: Braden · $175                │
│    Status: Complete ✅                       │
│                                             │
│  Active Requests                            │
│  ─────────────────────────────────────────  │
│  ● HVAC Tune-up Estimate                   │
│    Submitted: Feb 19, 2026                  │
│    Status: Contractor assigned,             │
│    scheduling in progress                   │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 4. Lead Creation from CTA

### Admin-Side Processing

The admin console needs to process incoming CTA events and convert them to leads. Two approaches:

**Option A: Auto-Convert** — every CTA click immediately creates a `contractor_leads` row. Simplest, but might create low-quality leads if someone is just exploring.

**Option B: Review Queue** — CTA events land in a queue. Admin reviews and converts. More control, but adds manual work.

**Recommendation: Auto-Convert with Source Tagging**

Every CTA creates a lead immediately, but the lead is tagged with its source so pricing and routing can be different:

```typescript
// Runs on a cron or triggered by CTA insert (via Supabase trigger/webhook)
async function convertCtaToLead(ctaEvent: CtaEvent) {
  const lead = await supabase
    .from('contractor_leads')
    .insert({
      homeowner_name: ctaEvent.contact_name,
      homeowner_email: ctaEvent.contact_email,
      homeowner_phone: ctaEvent.contact_phone,
      property_address: ctaEvent.property_address,
      zip_code: ctaEvent.property_zip,
      service_type: ctaEvent.system,          // hvac, water_heater, etc.
      lead_type: ctaEvent.recommendation,     // tuneup, replacement, etc.
      source: 'leaf_cta',
      leaf_session_id: ctaEvent.session_id,
      routing_channel: 'open_market',         // default, admin can override
      contact_preference: ctaEvent.contact_preference,
      status: 'new',
    })
    .select('id')
    .single();

  // Mark CTA as converted
  await supabase
    .from('leaf_cta_events')
    .update({ lead_created: true, lead_id: lead.data.id })
    .eq('id', ctaEvent.id);

  // Mark session
  await supabase
    .from('intake_sessions')
    .update({ lead_created: true, lead_id: lead.data.id })
    .eq('id', ctaEvent.session_id);
}
```

### Lead Quality Signal

LEAF-sourced leads are rich: we have the homeowner's address, system details, symptoms, what recommendation they clicked, their budget posture (`upgradePosture`), and utility bills. This data makes them significantly more valuable than a cold lead. The admin console should display this context on the lead card:

- "Homeowner explored HVAC diagnose + simulate"
- "Selected: Tune-up + performance optimization ($110–$140)"
- "Budget posture: Balanced"
- "Home age: Before 1990 · Size: Under 1,500 sq ft"
- "Utility: Electric + Gas"

---

## 5. LEAF Performance Dashboard (Admin Console)

### New Tab: LEAF Dashboard

Add to admin sidebar under DASHBOARDS section (alongside Contractor, Broker, Homeowner, Affiliate dashboards).

### KPI Cards (Top Row)

| Metric | Description | Source |
|--------|-------------|--------|
| **Total LEAF Reports** | All intake_sessions created | `count(intake_sessions)` |
| **Reports Delivered** | Sessions with source = post_hes or post_inspection | `count WHERE source IN ('post_hes','post_inspection')` |
| **Reports Opened** | Sessions where link_opened_at is not null | `count WHERE link_opened_at IS NOT NULL` |
| **Home Info Completed** | Sessions where home_info_submitted_at is not null | `count WHERE home_info_submitted_at IS NOT NULL` |
| **CTAs Clicked** | Total CTA events | `count(leaf_cta_events)` |
| **Leads Created** | CTA events converted to leads | `count WHERE lead_created = true` |

### Conversion Funnel (Visual)

```
LEAF Reports Sent          247  ████████████████████████████████  100%
  ↓
Link Opened                198  ██████████████████████████        80.2%
  ↓
Home Info Completed        142  ██████████████████                57.5%
  ↓
Diagnose Viewed            118  ███████████████                   47.8%
  ↓
Simulate Viewed             89  ████████████                      36.0%
  ↓
CTA Clicked                 34  █████                             13.8%
  ↓
Lead Converted              31  ████                              12.6%
```

### Source Breakdown Table

| Source | Reports | Opened | Home Info | CTA | Conversion |
|--------|---------|--------|-----------|-----|------------|
| Post-HES | 142 | 128 (90%) | 98 (69%) | 24 (17%) | 16.9% |
| Post-Inspection | 45 | 38 (84%) | 22 (49%) | 6 (13%) | 13.3% |
| QR Code | 31 | 18 (58%) | 12 (39%) | 3 (10%) | 9.7% |
| Website | 22 | 22 (100%) | 8 (36%) | 1 (5%) | 4.5% |
| Broker | 7 | 5 (71%) | 2 (29%) | 0 (0%) | 0% |

### Recent LEAF Activity (Table)

| Date | Homeowner | Source | Status | System | CTA? |
|------|-----------|--------|--------|--------|------|
| Feb 19, 2:30pm | Maria Garcia | Post-HES | Simulate viewed | HVAC | ✅ Tune-up |
| Feb 19, 11:00am | John Smith | Post-HES | Home info done | — | — |
| Feb 18, 4:15pm | Unknown | QR Code | Link opened | — | — |
| Feb 18, 9:00am | Robert Chen | Post-Inspection | CTA clicked | Water Heater | ✅ Replacement |

Clicking a row opens a side panel showing the full session detail: all home info, systems explored, diagnose/simulate data, CTA events, and linked job (if delivered post-service).

### Time-Based Insights

- **Average time from delivery to CTA**: how long does it take homeowners to engage?
- **Day-of-week engagement**: when do homeowners explore their LEAF reports?
- **30-day re-engagement**: how many homeowners come back to their report after initial view?

These help refine email timing and follow-up marketing.

---

## 6. Marketing Touchpoints (from LEAF data)

### Homeowners We Can Market To

Even if a homeowner doesn't click a CTA, if they completed the home info section, we have:
- Name, email, phone, address
- Home size, age, occupancy
- Utility information
- Systems they explored
- Budget posture

This is a warm marketing list. Phase 8C creates the data foundation; actual email campaigns / mailers are a future phase.

### Admin View: LEAF Contacts

In the LEAF Dashboard, a "Contacts" sub-tab:

| Name | Email | ZIP | Home Info | Systems Explored | CTA? | Source | Date |
|------|-------|-----|-----------|-----------------|------|--------|------|
| Maria Garcia | maria@... | 97201 | ✅ | HVAC, Water Heater | ✅ HVAC | Post-HES | Feb 18 |
| John Smith | john@... | 97201 | ✅ | HVAC | — | Post-HES | Feb 19 |
| Robert Chen | robert@... | 97034 | ✅ | Water Heater, Solar | ✅ WH | Post-Insp | Feb 18 |
| — | — | 97209 | ❌ | — | — | QR Code | Feb 18 |

Filterable by: source, CTA status, ZIP, date range, systems explored.

**Export option**: CSV export of contacts for use in email marketing tools, direct mail campaigns.

This respects the funnel — we only market to people who gave us their info (home info section completed). Organic visitors who opened a link but bounced are tracked by count, not by PII.

---

## 7. LEAF App Modifications Summary

### Changes to LEAF App (leaf-diagnose-sim-2 repo)

| File | Change | Impact |
|------|--------|--------|
| `.env` | Point to admin Supabase | Database migration |
| `src/lib/supabase/client.ts` | No code change (reads env) | None |
| `src/lib/supabase/session.ts` | Accept `?session=` URL param, track funnel timestamps | Core integration |
| `src/pages/SimulatePage.tsx` | Replace `alert()` CTA with modal + Supabase write | CTA wiring |
| New: `src/components/CtaModal.tsx` | CTA confirmation modal | New component |
| New: `src/pages/CtaSuccessPage.tsx` | Post-CTA success screen with account creation prompt | New page |
| `src/lib/state.tsx` | No changes to state shape | None |
| `src/app.tsx` | Add route for CTA success page | Minor |

### What Stays the Same

- All existing LEAF functionality (home info, diagnose, simulate, system switching)
- State management and localStorage persistence
- The `useSaveProgress` hook (still writes to `intake_sessions`, just in admin Supabase now)
- The `rules.ts` recommendation engine
- UI/UX for all existing pages

The LEAF app doesn't know or care about the admin console. It just writes to Supabase. The admin console reads those writes.

---

## 8. Database Schema (New Tables)

### intake_sessions (migrated + extended)
See Section 0 for full schema.

### leaf_cta_events (new)
See Section 2 for full schema.

### Columns Added to contractor_leads

```sql
ALTER TABLE contractor_leads ADD COLUMN IF NOT EXISTS leaf_session_id UUID;
ALTER TABLE contractor_leads ADD COLUMN IF NOT EXISTS contact_preference TEXT;
ALTER TABLE contractor_leads ADD COLUMN IF NOT EXISTS lead_quality_data JSONB;
  -- stores extracted LEAF data: home age, size, utility bills, symptoms, etc.
```

---

## 9. Implementation Order

### Phase 8C-1: Supabase Consolidation
1. Create `intake_sessions` table in admin Supabase (with new columns)
2. Create `leaf_cta_events` table
3. Update LEAF app `.env` to point to admin Supabase
4. Update `session.ts` to support `?session=` URL param
5. Update `saveSessionProgress` to extract contact info + track funnel timestamps
6. Deploy LEAF app, verify sessions write to shared DB
7. Decommission old LEAF Supabase project

### Phase 8C-2: LEAF Delivery from Payment
8. Build `deliverLeafReport()` function in admin console
9. Wire it into Stripe webhook handler (from Phase 8B)
10. Build email template (receipt + LEAF link)
11. Test end-to-end: schedule → complete → pay → LEAF delivered

### Phase 8C-3: CTA Wiring
12. Build CTA modal component in LEAF app (replace alert)
13. Build CTA success page in LEAF app
14. Wire CTA submit → Supabase write (intake_sessions + leaf_cta_events)
15. Build lead auto-conversion logic in admin console
16. Test: homeowner clicks CTA → lead appears in admin job board

### Phase 8C-4: LEAF Dashboard
17. Build LEAF Dashboard page in admin console
18. KPI cards with real-time counts from intake_sessions
19. Conversion funnel visualization
20. Source breakdown table
21. Recent LEAF activity table with side panel detail
22. LEAF Contacts sub-tab with CSV export

### Phase 8C-5: Homeowner Portal
23. Build homeowner portal tab in `/portal/home`
24. Homeowner registration flow (link to existing sessions by email)
25. My Home view (LEAF report link, service history, active requests)
26. Service Requests view (CTA submission tracking)
27. Settings tab

---

## 10. Revenue Attribution

The full money loop, tracked end-to-end:

```
REI schedules HES for homebuyer (via broker referral)
  ↓ tracked: admin_jobs.id
Braden performs HES, collects $175 via Stripe
  ↓ tracked: payments table, activity log
LEAF report delivered to homeowner
  ↓ tracked: intake_sessions.source_job_id
Homeowner opens LEAF link (2 days later)
  ↓ tracked: intake_sessions.link_opened_at
Homeowner fills out home info
  ↓ tracked: intake_sessions.home_info_submitted_at
Homeowner explores HVAC diagnose + simulate
  ↓ tracked: intake_sessions.diagnose_viewed_at, simulate_viewed_at
Homeowner clicks "Get Estimate" on HVAC tune-up
  ↓ tracked: leaf_cta_events, intake_sessions.cta_clicked_at
Lead auto-created, routed to job board
  ↓ tracked: contractor_leads (source: leaf_cta)
Contractor buys lead for $45
  ↓ tracked: lead_transactions
REI revenue from one homebuyer: $175 (HES) + $45 (lead) = $220
  + future leads from other systems the homeowner explores later
```

Every dollar is traceable back to the original service, the tech who performed it, the LEAF report that delivered the lead, and the homeowner who engaged.
