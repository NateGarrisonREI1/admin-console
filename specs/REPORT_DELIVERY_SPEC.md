# REI Report Delivery System & LEAF Distribution
## specs/REPORT_DELIVERY_SPEC.md
## February 20, 2026 (Updated)

---

## Overview

The report delivery system is how HES reports and LEAF energy analyses reach homeowners. It's used by THREE different types of users, each with a tailored experience:

1. **Admin / Back Office** — full control, all options, manages in-house jobs
2. **Tech / Assessor (in-network)** — field or office delivery, LEAF tier selection
3. **Broker (out-of-network jobs)** — simplified upload + send when their HES guy isn't in the REI network

All three share the same core component (`ReportDeliveryModal`) but render different sections based on who is using it and the job's network status.

LEAF is NEVER auto-attached to any email. It is always a deliberate choice by the sender.

---

## The LEAF Ecosystem

### LEAF Report Tiers

| Tier | Description | Who Can Send | Cost to Homeowner | REI Revenue |
|------|-------------|-------------|-------------------|-------------|
| `none` | No LEAF included | Anyone | Free | — |
| `basic` | Blank/minimal LEAF — homeowner fills in their own data | Anyone | Free | — |
| `full` | Pre-filled LEAF — 90% of fields populated from HES data via web extension | Paid subscribers only | Set by affiliate (e.g. $200) | 10% developer cut |

### Who Sends What

| Sender | HES Report | Basic LEAF | Full LEAF |
|--------|-----------|------------|-----------|
| REI In-House Tech / Admin | ✅ Always | ✅ Optional | ✅ If subscribed (REI is always subscribed) |
| HES Affiliate (free tier) | ✅ Their own | ✅ Optional | ❌ Not available |
| HES Affiliate (paid subscriber) | ✅ Their own | ✅ Optional | ✅ Optional — their upsell product |
| Broker (in-network job) | ❌ Assessor handles | ❌ Assessor handles | ❌ Assessor handles |
| Broker (out-of-network job) | ✅ Uploads themselves | ✅ Optional | ❌ Never |

### Key Rule: No Double LEAF

If a job has an in-network assessor, the assessor controls LEAF distribution. The broker does NOT get a delivery option for that job — they just monitor status and receive the HES report copy for RMLS.

The broker's delivery panel ONLY appears on out-of-network jobs where no in-network assessor is handling delivery.

---

## The Three Funnels

### Funnel A: Broker Marketing → Lead Generation
```
Broker sends campaign email with basic LEAF link
  → Homeowner opens LEAF, explores energy data
  → Homeowner clicks CTA "Get a Home Energy Score"
  → leaf_cta_events table captures the click
  → Job request enters system as 'pending' (links to original LEAF session)
  → HES assessor assigned, does the work
  → Report delivered (assessor chooses LEAF inclusion via Delivery Modal)
```

**LEAF's role here:** Marketing hook. Generates leads. Basic tier only.

### Funnel B: Direct Homeowner Request
```
Homeowner finds /request form (organic, referral, utility program, etc.)
  → Submits request → 'pending' job
  → HES assessor does the work
  → Report delivered via Delivery Modal
  → Assessor can include basic LEAF as value-add
```

**LEAF's role here:** Free value-add that differentiates REI from competitors.

### Funnel C: Affiliate LEAF Upsell
```
HES assessor (paid subscriber) finishes assessment
  → Web extension captured data during DOE/GBR entry (future)
  → Full LEAF is pre-populated with real assessment data
  → Assessor offers full LEAF to homeowner as add-on ($200, or their custom price)
  → Homeowner pays (through platform or direct — TBD)
  → Assessor sends HES report + full LEAF via Delivery Modal
  → REI takes 10% developer cut of the LEAF sale
```

**LEAF's role here:** Premium product. Revenue for affiliate + REI.

### Funnel D: Broker Out-of-Network Recovery
```
Broker uses their own HES guy (not in REI network)
  → HES done off-platform, assessor emails broker the PDF
  → Broker logs into dashboard → "Log Out-of-Network Job"
  → Broker uploads HES PDF via drag & drop
  → Broker attaches basic LEAF
  → Broker sends to homeowner via Broker Delivery Panel
  → Lead kickback tracking activates for broker
  → REI gets LEAF distribution + potential lead flow
```

**LEAF's role here:** Lead recovery tool. Broker retains kickback eligibility.

---

## Delivery Modal — Three Variants

The delivery modal is ONE component (`ReportDeliveryModal.tsx`) with a `variant` prop that controls which sections render.

### Variant Comparison

| Section | Admin/Back Office | Tech/Assessor (Portal) | Broker (Out-of-Network) |
|---------|------------------|----------------------|------------------------|
| HES Report | Read-only (already uploaded) | Upload or read-only | **Upload via drag & drop** |
| LEAF Tier | None / Basic / Full | None / Basic / Full (if subscribed) | None / Basic only |
| Full LEAF Upsell | ✅ If subscriber | ✅ If subscriber | ❌ Never |
| Payment Section | Full (paid/unpaid/invoiced) | Full | ❌ Hidden (broker handles payment with their HES guy separately) |
| Invoice Options | Send with invoice / Send free | Send with invoice / Send free | ❌ Hidden |
| Receipt Attachment | ✅ Optional | ✅ Optional | ❌ Hidden |
| Recipients | Homeowner ✓ + Broker ✓ | Homeowner ✓ + Broker ✓ | Homeowner only (broker already has the report) |
| Broker Copy Note | "Broker receives HES only" | "Broker receives HES only" | N/A |
| Status Transitions | Full lifecycle control | Updates to 'delivered' | Sets to 'delivered' only |
| Email Template | Context-dependent (see matrix) | Context-dependent | `report_delivery_broker_sent` |
| Email Preview | ✅ Full preview | ✅ Full preview | ✅ Simplified preview |
| Network Badge | Shows in-network/out-of-network | Shows in-network | Shows out-of-network |
| Invite Nudge | ❌ | ❌ | ✅ "Invite [HES guy] to REI Network" |

---

## Variant A: Admin / Back Office Delivery Modal

### Trigger
"Send Reports" button in admin schedule side panel → opens modal.

### Prerequisites
- Job status: `report_ready` or later
- HES report PDF uploaded (`hes_report_url` exists)
- If not met: button disabled with tooltip

### Layout

```
┌──────────────────────────────────────────────────────┐
│  📤 Prepare Report Delivery                     [X]  │
│                                                      │
│  ── DOCUMENTS ──────────────────────────────────────  │
│                                                      │
│  📄 HES Report                                       │
│  ✅ Attached: HES-Report-31303NWTurel.pdf            │
│  [Preview]                                           │
│                                                      │
│  🌿 LEAF Energy Report                               │
│  ○ Don't include LEAF                                │
│  ● Include Basic LEAF (free)                         │
│  ○ Include Full LEAF — $[amount]    ← only if        │
│    sender is paid subscriber                         │
│                                                      │
│  LEAF Link: https://leaf-diagnose-sim-2.vercel...    │
│  [Auto-generated from intake session if available]   │
│  [Or paste custom URL]                               │
│                                                      │
│  ── PAYMENT ────────────────────────────────────────  │
│                                                      │
│  Status: ✅ Paid ($150 on 02/20/26)                  │
│  ☐ Attach payment receipt PDF                        │
│                                                      │
│  ── OR if unpaid ──                                  │
│                                                      │
│  Status: ⏳ Unpaid                                   │
│  ● Send report + include invoice (payment required)  │
│  ○ Send report without invoice (report is free)      │
│  Invoice amount: $[pre-filled from job amount]       │
│                                                      │
│  ── RECIPIENTS ─────────────────────────────────────  │
│                                                      │
│  ✅ Homeowner: Sarah Chen (sarah@email.com)          │
│  ✅ Broker: Marcus Webb (marcus@kw.com)              │
│     ↳ Broker receives: HES report only               │
│       (LEAF controlled by assessor)                  │
│                                                      │
│  ── FULL LEAF UPSELL (subscriber only) ─────────────  │
│  (This section only appears for paid subscribers)     │
│                                                      │
│  💰 Full LEAF Pricing                                │
│  Your price: $[editable, default from profile]       │
│  REI developer fee (10%): $[calculated]              │
│  You earn: $[calculated]                             │
│                                                      │
│  ── PREVIEW & SEND ─────────────────────────────────  │
│                                                      │
│  📧 Email Preview                                    │
│  [Shows rendered email with actual content]           │
│  Template: [auto-selected based on choices above]    │
│                                                      │
│  ┌────────────────┐  ┌─────────────────────────┐     │
│  │ Cancel         │  │ ✅ Send to 2 recipients  │     │
│  └────────────────┘  └─────────────────────────┘     │
└──────────────────────────────────────────────────────┘
```

---

## Variant B: Tech / Assessor Portal Delivery Modal

Same as Admin but accessed from the tech portal job detail view. Differences:

- Tech may need to upload the HES PDF first (if not yet uploaded)
- Full LEAF option only visible if tech's profile has premium subscription
- Tech cannot change payment status (that's admin territory)
- Payment section is read-only (shows status but no invoice controls)

---

## Variant C: Broker Delivery Panel (Out-of-Network Jobs)

This is the critical addition. When a broker uses an HES assessor who isn't in the REI network, the broker becomes the delivery person. This panel is embedded directly in the broker dashboard job card — not a separate modal.

### When It Appears
- Job has `network_status = 'out_of_network'`
- Job status is `pending_delivery` (logged by broker, work done off-platform)
- The broker is the only person who can deliver for this job

### When It Does NOT Appear
- Job has `network_status = 'in_network'` — assessor handles delivery
- Broker sees read-only status updates instead

### Layout (Embedded in Job Card)

```
┌─────────────────────────────────────────────────────────┐
│ ⚠️ OUT-OF-NETWORK                              02/25/26 │
│                                                         │
│ 📍 8829 SE Division, Portland, OR 97266                 │
│ 🏠 HES Assessment                                      │
│                                                         │
│ Assessor: Joe's Energy (not in REI network)             │
│                                                         │
│ 🌿 LEAF: ⚠️ Awaiting your delivery                     │
│ 📊 Leads: Inactive until LEAF is sent                   │
│                                                         │
│ ┌─────────────────────────────────────────────────┐     │
│ │  📤 DELIVER REPORTS                             │     │
│ │                                                 │     │
│ │  ── STEP 1: HES REPORT ──────────────────────── │     │
│ │                                                 │     │
│ │  ┌──────────────────────────────────────────┐   │     │
│ │  │                                          │   │     │
│ │  │  📄 Drag & drop your HES report PDF      │   │     │
│ │  │     or click to browse                   │   │     │
│ │  │                                          │   │     │
│ │  │  Accepted: .pdf (max 25MB)               │   │     │
│ │  └──────────────────────────────────────────┘   │     │
│ │                                                 │     │
│ │  [After upload:]                                │     │
│ │  📄 HES-Report-8829-SE-Division.pdf ✅ Uploaded │     │
│ │  [Preview] [Remove]                             │     │
│ │                                                 │     │
│ │  ── STEP 2: LEAF ENERGY REPORT ──────────────── │     │
│ │                                                 │     │
│ │  ● Include Basic LEAF (free)                    │     │
│ │    Homeowner gets energy dashboard              │     │
│ │    Leads tracked to you for kickbacks           │     │
│ │                                                 │     │
│ │  ○ Don't include LEAF                           │     │
│ │    No energy analysis. No lead tracking.        │     │
│ │                                                 │     │
│ │  [If basic selected:]                           │     │
│ │  🌿 Auto-generated: leaf.rei.com/report/abc123  │     │
│ │                                                 │     │
│ │  ── STEP 3: HOMEOWNER ──────────────────────── │     │
│ │                                                 │     │
│ │  Name: Sarah Chen                               │     │
│ │  Email: sarah.chen@gmail.com [✏️ Edit]          │     │
│ │                                                 │     │
│ │  ── PREVIEW ──────────────────────────────────  │     │
│ │                                                 │     │
│ │  📧 [Preview what homeowner will receive]       │     │
│ │                                                 │     │
│ │  ┌──────────┐  ┌────────────────────────┐      │     │
│ │  │ Cancel   │  │ ✅ Send to Sarah Chen  │      │     │
│ │  └──────────┘  └────────────────────────┘      │     │
│ └─────────────────────────────────────────────────┘     │
│                                                         │
│ 💡 Invite Joe to join REI Network →                     │
│    Next time, Joe handles delivery automatically        │
└─────────────────────────────────────────────────────────┘
```

### What's Different from Admin/Tech Modal

| Feature | Admin/Tech Modal | Broker Delivery Panel |
|---------|-----------------|----------------------|
| Location | Modal overlay | Inline in job card |
| HES report | Already uploaded (read-only) | **Broker uploads via drag & drop** |
| LEAF options | None / Basic / Full | **None / Basic only** |
| Full LEAF upsell | Available for subscribers | **Never shown** |
| Payment section | Full control (paid/unpaid/invoice) | **Hidden entirely** — broker handles payment with their HES guy outside REI |
| Receipt attachment | Optional checkbox | **Not available** |
| Invoice options | Send with/without invoice | **Not available** |
| Recipients | Homeowner + Broker (checkboxes) | **Homeowner only** — broker already has the report |
| Status control | Full lifecycle transitions | **Only: pending_delivery → delivered** |
| Email template | Varies by context | **Always: `report_delivery_broker_sent`** |
| Network nudge | Not shown | **"Invite [HES guy] to REI Network"** |
| Lead kickback info | Not shown | **Shown: "Leads tracked to you for kickbacks"** |

### After Broker Sends

1. HES PDF uploaded to Supabase Storage: `job-files/reports/hes/{jobId}/HES-Report.pdf`
2. `hes_report_url` saved on job record
3. LEAF session created/linked with `originating_broker_id`
4. `leaf_report_url` saved on job record (if LEAF included)
5. Email sent to homeowner via `report_delivery_broker_sent` template
6. Job status: `pending_delivery` → `delivered`
7. `delivered_by: 'broker'` saved on job record
8. `leaf_tier: 'basic'` or `'none'` saved
9. `reports_sent_at` timestamp saved
10. Activity logged: `broker_delivered_reports` with full details
11. Lead kickback tracking activated (if LEAF was included)
12. Broker dashboard card changes to "Self-Managed ✅" state

### Job Card After Delivery

```
┌─────────────────────────────────────────────────────────┐
│ 🟡 SELF-MANAGED                                02/25/26 │
│                                                         │
│ 📍 8829 SE Division, Portland, OR 97266                 │
│ 🏠 HES Assessment                                      │
│                                                         │
│ Assessor: Joe's Energy (not in REI network)             │
│ Delivered by: You (02/25/26 at 3:42 PM)                 │
│                                                         │
│ 🌿 LEAF: ✅ Basic — sent on 02/25/26                    │
│ 📊 Leads: ✅ 3 views, 1 CTA click                      │
│                                                         │
│ [View Report] [View LEAF Analytics] [Download PDF]      │
│                                                         │
│ 💡 Invite Joe to REI Network → Save time next job       │
└─────────────────────────────────────────────────────────┘
```

---

## In-Network Job — Broker's View (Read-Only)

When the job IS in-network, the broker does NOT see a delivery panel. They see a read-only monitoring view with status updates:

```
┌─────────────────────────────────────────────────────────┐
│ ✅ IN-NETWORK                                  02/23/26 │
│                                                         │
│ 📍 1205 NW 23rd Ave, Portland, OR 97210                 │
│ 🏠 HES Assessment — Medium ($150)                      │
│                                                         │
│ Assessor: Nate Garrison — REI Certified                 │
│                                                         │
│ ●━━●━━●━━●━━○━━○━━○                                    │
│         ← On Site    Field Done →                       │
│                                                         │
│ 🌿 LEAF: Will be delivered by assessor                  │
│ 📊 Leads: Tracking will activate on delivery            │
│ 💰 Payment: Paid ($150)                                 │
│                                                         │
│ [View Details]  [Download Report ↓] (when delivered)    │
└─────────────────────────────────────────────────────────┘
```

No upload. No send button. No LEAF controls. The assessor handles everything. The broker just watches the dots fill in.

---

## Email Template Matrix

The template used depends on WHO is sending and WHAT is included:

### In-Network Delivery (Admin/Tech sends)

| HES | LEAF | Payment Status | Template | Recipient(s) |
|-----|------|---------------|----------|-------------|
| ✅ | None | Paid | `report_delivery` | Homeowner |
| ✅ | Basic | Paid | `report_delivery` + LEAF section | Homeowner |
| ✅ | Full | Paid | `report_delivery` + premium LEAF section | Homeowner |
| ✅ | None | Unpaid + Invoice | `report_delivery_invoice` | Homeowner |
| ✅ | Basic | Unpaid + Invoice | `report_delivery_invoice` + LEAF section | Homeowner |
| ✅ | None | Unpaid + Free | `report_delivery_free` | Homeowner |
| ✅ | Any | Any | `report_delivery_broker` | Broker (HES only, no LEAF unless assessor chose to include) |

### Out-of-Network Delivery (Broker sends)

| HES | LEAF | Template | Recipient |
|-----|------|----------|-----------|
| ✅ | None | `report_delivery_broker_sent` (no LEAF section) | Homeowner |
| ✅ | Basic | `report_delivery_broker_sent` (with LEAF section) | Homeowner |

### New Templates Needed

| Template Key | When Used | Variables |
|-------------|-----------|-----------|
| `report_delivery_invoice` | In-network: report sent with invoice | {{customer_name}}, {{service_name}}, {{hes_report_url}}, {{leaf_report_url}}, {{leaf_section}}, {{payment_link}}, {{amount}} |
| `report_delivery_free` | In-network: report sent free (comp/warranty) | {{customer_name}}, {{service_name}}, {{hes_report_url}}, {{leaf_report_url}}, {{leaf_section}} |
| `report_delivery_broker_sent` | Out-of-network: broker sends to homeowner | {{customer_name}}, {{broker_name}}, {{broker_company}}, {{hes_report_url}}, {{leaf_report_url}}, {{leaf_section}} |
| `leaf_upsell_invoice` | Full LEAF offered as add-on (future) | {{customer_name}}, {{leaf_report_url}}, {{amount}}, {{payment_link}}, {{assessor_name}} |

### Updated Existing Templates

| Template Key | Change |
|-------------|--------|
| `report_delivery` | Add conditional {{leaf_section}} — rendered HTML or empty string |
| `report_delivery_broker` | Same {{leaf_section}} conditional. Broker always gets HES. LEAF only if assessor included it. |

---

## Modal Behavior Details

### Document Section (all variants)
- HES Report:
  - Admin/Tech: read-only, shows attached PDF filename. Preview opens in new tab.
  - Broker: drag & drop upload zone. After upload: shows filename + Preview/Remove buttons.
- LEAF tier radio buttons:
  - `none` — always available
  - `basic` — always available. Uses `leaf_report_url` if exists, or generates new LEAF session link.
  - `full` — only visible for Admin/Tech AND sender has `leaf_subscription_tier = 'premium'`. **NEVER shown to brokers.**
- LEAF link auto-population: if `intake_sessions` has a session for this customer, auto-populate. Otherwise show text input to paste URL.
- LEAF link is always editable.

### Payment Section (Admin/Tech only — HIDDEN for brokers)
- `payment_status = 'paid'`: green confirmation + optional receipt checkbox
- `payment_status = 'unpaid'`: two options:
  - Send with invoice (creates Stripe payment link)
  - Send free (comp, warranty, etc.)
- `payment_status = 'invoiced'`: "Invoice sent on [date]. Awaiting payment." + resend option

### Recipients Section
- Admin/Tech: checkboxes for homeowner + broker (pre-checked based on job data)
  - Broker note: "Broker receives HES report only (LEAF controlled by assessor)"
  - If vacant/no homeowner: broker only
- Broker: homeowner only (broker already has the report — they uploaded it)

### Full LEAF Upsell Section (Admin/Tech subscribers only — HIDDEN for brokers)
- Only visible when sender is premium subscriber AND selects "Include Full LEAF"
- Price field: editable, defaults to profile's saved LEAF price
- Auto-calculates: REI 10% cut + affiliate net earnings
- If homeowner hasn't paid for full LEAF: "Send" creates Stripe checkout for LEAF amount

### Preview Section (all variants)
- Shows rendered email with actual content
- Template auto-selected based on variant + options
- Send button shows recipient count: "Send to 2 recipients" or "Send to Sarah Chen"
- Disabled until HES report is confirmed attached

### On Send (all variants)
1. Sends emails to all checked recipients using appropriate template
2. If Full LEAF selected + unpaid: creates Stripe checkout
3. Updates job record:
   - `reports_sent_at` = now
   - `leaf_tier` = selected tier
   - `leaf_price` = amount (if full)
   - `leaf_revenue_split` = JSONB (if full)
   - `status` → `delivered`
   - `delivered_by` = `'assessor'` | `'broker'` | `'admin'`
4. Logs to `job_activity_log`: `reports_delivered` with full payload
5. If broker-originated LEAF: activates lead kickback tracking
6. Closes modal/panel, refreshes view

---

## Database Changes

### Now (8C Scope)

```sql
-- LEAF tracking on jobs
ALTER TABLE hes_schedule ADD COLUMN IF NOT EXISTS leaf_tier TEXT DEFAULT 'none';
-- Values: 'none', 'basic', 'full'
ALTER TABLE hes_schedule ADD COLUMN IF NOT EXISTS leaf_price NUMERIC;
ALTER TABLE hes_schedule ADD COLUMN IF NOT EXISTS leaf_revenue_split JSONB;
-- { affiliate_amount: 180, rei_cut: 20, total: 200 }

-- Network + delivery tracking
ALTER TABLE hes_schedule ADD COLUMN IF NOT EXISTS network_status TEXT DEFAULT 'in_network';
-- Values: 'in_network', 'out_of_network', 'self_managed'
ALTER TABLE hes_schedule ADD COLUMN IF NOT EXISTS delivered_by TEXT;
-- Values: 'assessor', 'broker', 'admin'
ALTER TABLE hes_schedule ADD COLUMN IF NOT EXISTS external_assessor_name TEXT;
ALTER TABLE hes_schedule ADD COLUMN IF NOT EXISTS external_assessor_email TEXT;
ALTER TABLE hes_schedule ADD COLUMN IF NOT EXISTS external_assessor_company TEXT;

-- Same for inspector_schedule
ALTER TABLE inspector_schedule ADD COLUMN IF NOT EXISTS leaf_tier TEXT DEFAULT 'none';
ALTER TABLE inspector_schedule ADD COLUMN IF NOT EXISTS leaf_price NUMERIC;
ALTER TABLE inspector_schedule ADD COLUMN IF NOT EXISTS leaf_revenue_split JSONB;
ALTER TABLE inspector_schedule ADD COLUMN IF NOT EXISTS network_status TEXT DEFAULT 'in_network';
ALTER TABLE inspector_schedule ADD COLUMN IF NOT EXISTS delivered_by TEXT;
ALTER TABLE inspector_schedule ADD COLUMN IF NOT EXISTS external_assessor_name TEXT;
ALTER TABLE inspector_schedule ADD COLUMN IF NOT EXISTS external_assessor_email TEXT;
ALTER TABLE inspector_schedule ADD COLUMN IF NOT EXISTS external_assessor_company TEXT;

-- Status constraint update (add pending_delivery)
ALTER TABLE hes_schedule DROP CONSTRAINT IF EXISTS hes_schedule_status_check;
ALTER TABLE hes_schedule ADD CONSTRAINT hes_schedule_status_check CHECK (
  status IN (
    'pending', 'scheduled', 'en_route', 'on_site', 'field_complete',
    'processing', 'report_ready', 'delivered', 'completed',
    'in_progress', 'cancelled', 'archived', 'rescheduled',
    'pending_delivery'
  )
);

ALTER TABLE inspector_schedule DROP CONSTRAINT IF EXISTS inspector_schedule_status_check;
ALTER TABLE inspector_schedule ADD CONSTRAINT inspector_schedule_status_check CHECK (
  status IN (
    'pending', 'scheduled', 'en_route', 'on_site', 'field_complete',
    'processing', 'report_ready', 'delivered', 'completed',
    'in_progress', 'cancelled', 'archived', 'rescheduled',
    'pending_delivery'
  )
);
```

### Later (Post 8C — Affiliate Subscription System)

```sql
-- Affiliate profiles / subscription management
CREATE TABLE IF NOT EXISTS affiliate_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES app_profiles(id),
  company_name TEXT,
  leaf_subscription_tier TEXT DEFAULT 'none',       -- 'none', 'basic', 'premium'
  leaf_subscription_status TEXT DEFAULT 'inactive', -- 'active', 'inactive', 'past_due'
  leaf_default_price NUMERIC DEFAULT 200.00,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  subscription_started_at TIMESTAMPTZ,
  subscription_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- LEAF sales tracking (for revenue split)
CREATE TABLE IF NOT EXISTS leaf_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL,
  job_type TEXT NOT NULL,                -- 'hes' or 'inspection'
  affiliate_id UUID REFERENCES affiliate_profiles(id),
  homeowner_email TEXT,
  leaf_tier TEXT NOT NULL,               -- 'full'
  sale_price NUMERIC NOT NULL,
  rei_cut_percent NUMERIC DEFAULT 10,
  rei_cut_amount NUMERIC NOT NULL,
  affiliate_amount NUMERIC NOT NULL,
  payment_status TEXT DEFAULT 'unpaid',  -- 'unpaid', 'paid', 'refunded'
  stripe_payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Revenue Model Summary

| Revenue Stream | Source | Timing |
|---------------|--------|--------|
| HES Assessment fee | Homeowner or broker pays | Per job |
| Inspection fee | Homeowner or broker pays | Per job |
| Affiliate monthly subscription | HES affiliate pays REI | Monthly recurring |
| LEAF full version (10% dev cut) | Homeowner pays affiliate, REI takes 10% | Per sale |
| Broker lead commissions | Existing marketplace | Per lead |
| Broker LEAF lead kickbacks | LEAF engagement → service conversion | Per qualified lead |

---

## Implementation Phases

### Phase NOW — Build Within 8C

1. **ReportDeliveryModal Component**
   - Shared component with `variant` prop: `'admin'` | `'tech'` | `'broker'`
   - Admin: full controls (documents, payment, recipients, LEAF tiers, preview)
   - Tech: same as admin minus invoice controls
   - Broker: simplified (upload PDF, basic LEAF toggle, homeowner recipient, send)
   - Replaces the current one-click "Send Reports" button in admin side panel

2. **BrokerDeliveryPanel Component**
   - Wrapper around ReportDeliveryModal variant='broker'
   - Embedded inline in broker dashboard job cards (not a modal overlay)
   - Only visible on `network_status = 'out_of_network'` + `status = 'pending_delivery'` jobs
   - Drag & drop PDF upload zone
   - Invite assessor nudge below panel

3. **LEAF Link Generation**
   - If `intake_sessions` has a session for customer: generate `{LEAF_APP_URL}/report/{session_id}`
   - If no session: auto-create one with property address + homeowner email
   - Allow manual URL override
   - Save to `leaf_report_url` on job record

4. **HES Report Upload (verify working)**
   - Admin/Tech: upload via side panel button
   - Broker: upload via drag & drop in delivery panel
   - Storage path: `job-files/reports/{jobType}/{jobId}/HES-Report.pdf`
   - Save signed URL to `hes_report_url`
   - Activity log entry

5. **Email Sending Logic**
   - `deliverReports()` function accepts delivery options object from modal/panel
   - Template selection based on variant + LEAF tier + payment combo (see matrix above)
   - Recipient list from modal/panel
   - Tags LEAF session with `originating_broker_id` if broker sends
   - All emails logged to activity log with full details

6. **New Email Templates**
   - Seed: `report_delivery_invoice`, `report_delivery_free`, `report_delivery_broker_sent`
   - Update existing: add `{{leaf_section}}` conditional to `report_delivery` and `report_delivery_broker`

7. **Portal Tech View**
   - Same ReportDeliveryModal variant='tech' accessible from portal job detail
   - Tech can upload HES PDF, select LEAF tier, send when payment confirmed

8. **Broker Dashboard Integration**
   - "Log Out-of-Network Job" button on broker dashboard
   - Creates `pending_delivery` job with `network_status: 'out_of_network'`
   - Job card shows BrokerDeliveryPanel
   - After send: card transitions to "Self-Managed ✅" state with LEAF analytics

### Phase NEXT — Post 8C

9. **Full LEAF Tier**
   - Affiliate subscription system (Stripe recurring billing)
   - `affiliate_profiles` table
   - Full LEAF option in modal (subscriber only)
   - Custom pricing per affiliate
   - REI 10% developer cut calculation and tracking

10. **Web Extension Data Pipeline**
    - Chrome extension captures DOE/GBR form data
    - Writes to `intake_sessions` with pre-filled fields
    - Full LEAF auto-populated when extension data exists
    - Dramatically increases LEAF engagement and value

11. **LEAF Sales Tracking**
    - `leaf_sales` table for revenue split accounting
    - Dashboard: LEAF sales, REI revenue, affiliate payouts
    - Monthly reconciliation reports

12. **Affiliate Self-Service Portal**
    - Affiliates manage their own deliveries
    - Set LEAF pricing
    - View subscription status
    - Sales history and earnings

---

## CLI Commands (when ready to implement)

### Command 1: DB Migration + Templates
```
claude "Read specs/REPORT_DELIVERY_SPEC.md. Create the DB migration for the 'Phase NOW' columns: leaf_tier, leaf_price, leaf_revenue_split, network_status, delivered_by, external_assessor_name/email/company on both schedule tables. Add 'pending_delivery' to status constraints. Seed new email templates: report_delivery_invoice, report_delivery_free, report_delivery_broker_sent. Update existing templates with {{leaf_section}} variable. Run migration against live Supabase. Verify."
```

### Command 2: ReportDeliveryModal Component (Admin + Tech)
```
claude "Read specs/REPORT_DELIVERY_SPEC.md. Build the ReportDeliveryModal component with variant prop ('admin' | 'tech' | 'broker'). For admin variant: HES report confirmation, LEAF tier selection (none/basic for now), payment status display with invoice options, recipient checkboxes, email preview, send action. Replaces the one-click Send Reports button in admin side panel. Wire to deliverReports() function which selects the right email template based on the template matrix in the spec."
```

### Command 3: BrokerDeliveryPanel Component
```
claude "Read specs/REPORT_DELIVERY_SPEC.md. Build the BrokerDeliveryPanel that wraps ReportDeliveryModal variant='broker'. Embedded inline in broker dashboard job cards for out-of-network jobs. Three steps: 1) Drag & drop HES PDF upload to Supabase Storage, 2) Basic LEAF toggle with auto-generated link, 3) Confirm homeowner and send. After send: update job to delivered, set delivered_by='broker', activate lead tracking, show 'Invite assessor to network' nudge. Template: report_delivery_broker_sent."
```

### Command 4: LEAF Link Generation + HES Upload
```
claude "Read specs/REPORT_DELIVERY_SPEC.md. Implement LEAF link auto-generation: check intake_sessions for matching customer, generate link if found, create new session if not. Verify HES PDF upload works end-to-end in admin side panel and broker delivery panel. Ensure both leaf_report_url and hes_report_url are saved correctly."
```

### Command 5: Log Out-of-Network Job
```
claude "Read specs/REPORT_DELIVERY_SPEC.md and specs/NETWORK_INCENTIVES_SPEC.md. Build the 'Log Out-of-Network Job' form for the broker dashboard. Fields: property address, homeowner info, service type, date completed, external assessor name/company/email, invite checkbox. Creates job with status='pending_delivery', network_status='out_of_network'. Job card shows BrokerDeliveryPanel. After delivery: card shows self-managed state with LEAF analytics link."
```

### Command 6: Portal Tech Integration
```
claude "Read specs/REPORT_DELIVERY_SPEC.md. Add ReportDeliveryModal variant='tech' to the tech portal job detail view. Tech can upload HES PDF, select LEAF tier (none/basic), see payment status (read-only), and send reports when everything is ready. Same send logic as admin but without invoice controls."
```
