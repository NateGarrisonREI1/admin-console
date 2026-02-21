# REI Network Matching & Incentive System
## specs/NETWORK_INCENTIVES_SPEC.md
## February 20, 2026 (Updated)

---

## Core Principle

REI is a two-sided network: Brokers bring transactions, HES/Inspection providers do the fieldwork. REI wins when both sides operate through the platform. The incentive system must make in-network collaboration so obviously superior that both brokers and HES providers naturally gravitate toward it.

---

## Network Status Definitions

### HES/Inspection Provider Tiers

| Tier | Label | LEAF Access | How They Join |
|------|-------|-------------|---------------|
| `out_of_network` | Not in REI network | None — can't deliver LEAF | Haven't signed up |
| `basic_affiliate` | REI Network Member | Basic LEAF delivery | Free sign-up |
| `premium_affiliate` | REI Certified Provider | Full LEAF delivery + upsell | Monthly subscription |

### Broker Network Status

| Status | Meaning |
|--------|---------|
| `active` | Broker is registered and ordering through REI |
| `pending` | Broker signed up, awaiting first order |
| `inactive` | Broker hasn't ordered in 90+ days |

---

## The Two Broker Experiences

This is the most important section. The broker has two completely different experiences depending on whether their HES assessor is in the REI network or not. Both paths end with the homeowner getting an HES report + LEAF, but the broker's effort level is dramatically different.

### Path A: In-Network (Hands-Off) ✅

The broker's experience is like ordering an Uber. Place the order, watch the status, get the deliverable.

```
BROKER'S WORKFLOW:
1. Log into broker dashboard
2. Click "Order HES Assessment"
3. Enter property address, home size, homeowner info, payment preference
4. Submit → job enters system as 'pending'

   ---- BROKER SITS BACK FROM HERE ----

5. Gets notification: "Your HES has been confirmed for 02/23 at 9:00 AM"
   (Broker sees: Scheduled ● on their dashboard)

6. Gets notification: "Your assessor Nate is on the way to 1205 NW 23rd"
   (Broker sees: En Route ● on their dashboard)

7. Gets notification: "Assessment complete. Report being processed."
   (Broker sees: Field Complete ● on their dashboard)

8. Gets notification: "Report ready. Nate is preparing delivery."
   (Broker sees: Report Ready ● on their dashboard)

9. Gets notification: "HES report + LEAF delivered to homeowner"
   (Broker sees: Delivered ✅ on their dashboard)
   (Broker receives: copy of HES report for RMLS upload)
   (Broker's lead kickback tracking: ACTIVE)

TOTAL BROKER EFFORT: 2 minutes (place order)
TOTAL EMAILS/NOTIFICATIONS: 5 status updates
LEAF DELIVERY: Handled by assessor
LEAD KICKBACKS: Automatic
```

**What the broker sees on their dashboard for this job:**

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

### Path B: Out-of-Network (Broker Handles Delivery) ⚠️

The broker used their own HES guy who isn't on REI. The HES work happens outside the platform. But the broker still wants to deliver a LEAF and earn lead kickbacks. So the broker becomes the sender.

```
BROKER'S WORKFLOW:
1. Broker's HES guy does the assessment (off-platform)
2. HES guy emails the broker the HES report PDF
3. Broker logs into their dashboard
4. Clicks "Log Out-of-Network Job" (or similar)
5. Enters: property address, homeowner info, HES guy name/company
6. Job card created on their dashboard in 'pending_delivery' status

   ---- BROKER NOW DOES THE DELIVERY ----

7. Broker opens the Broker Delivery Panel for this job
8. Drags and drops (or uploads) the HES PDF they received via email
9. System auto-generates a basic LEAF link for the property/homeowner
10. Broker reviews: HES PDF ✓, Basic LEAF ✓, Homeowner email ✓
11. Broker clicks "Send to Homeowner"
12. Homeowner receives: HES report + LEAF link (same as in-network delivery)
13. Broker's lead kickback tracking: ACTIVE
14. Job status: Delivered ✅

TOTAL BROKER EFFORT: 10-15 minutes (log job + upload + send)
LEAF DELIVERY: Broker handles it
LEAD KICKBACKS: Active (broker did the delivery work)
```

**What the broker sees on their dashboard for this job:**

Before delivery:
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
│ │  Step 1: Upload HES Report                      │     │
│ │  [  Drag & drop PDF here, or click to browse  ] │     │
│ │                                                 │     │
│ │  Step 2: LEAF Report                            │     │
│ │  ● Include Basic LEAF (free)                    │     │
│ │  ○ Don't include LEAF                           │     │
│ │                                                 │     │
│ │  Step 3: Confirm Recipient                      │     │
│ │  📧 sarah.chen@gmail.com (homeowner)            │     │
│ │                                                 │     │
│ │  [  Send Reports → ]                            │     │
│ └─────────────────────────────────────────────────┘     │
│                                                         │
│ 💡 Invite Joe to join REI Network →                     │
│    Next time, Joe handles delivery automatically        │
└─────────────────────────────────────────────────────────┘
```

After delivery:
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

## Side-by-Side Comparison (What Brokers See)

This is the pitch. This is why brokers will push their HES guys to join the network.

```
┌──────────────────────────┬──────────────────────────┐
│   ✅ IN-NETWORK           │   ⚠️ OUT-OF-NETWORK      │
├──────────────────────────┼──────────────────────────┤
│ Place order: 2 min       │ Log job: 5 min           │
│ Schedule: REI handles    │ Schedule: You handle     │
│ Status updates: ✅ Auto  │ Status updates: ❌ None  │
│ HES delivery: ✅ Auto    │ HES delivery: You upload │
│ LEAF delivery: ✅ Auto   │ LEAF delivery: You send  │
│ Lead kickbacks: ✅ Auto  │ Lead kickbacks: ✅ Active │
│ RMLS report: ✅ Emailed  │ RMLS report: You manage  │
│ Assessor quality: Vetted │ Assessor quality: ?      │
│                          │                          │
│ YOUR EFFORT: ⬇️ Minimal  │ YOUR EFFORT: ⬆️ More     │
│ Same great result.       │ Same great result.       │
│                          │ But more work for you.   │
│                          │                          │
│                          │ 💡 Invite your HES guy   │
│                          │ to the network and get   │
│                          │ the left column ↖️        │
└──────────────────────────┴──────────────────────────┘
```

---

## The Broker Delivery Panel

This is the simplified version of the Report Delivery Modal (from REPORT_DELIVERY_SPEC.md) designed specifically for brokers handling out-of-network jobs. It's embedded directly in the broker dashboard job card — not a separate page.

### Component: `BrokerDeliveryPanel`

Lives inside the out-of-network job card on the broker dashboard. Expands inline when the broker is ready to deliver.

### Flow

```
┌──────────────────────────────────────────────────────────┐
│  📤 Deliver Reports to Homeowner                         │
│                                                          │
│  ── STEP 1: HES REPORT ────────────────────────────────  │
│                                                          │
│  ┌────────────────────────────────────────────────┐      │
│  │                                                │      │
│  │   📄 Drag & drop your HES report PDF here      │      │
│  │      or click to browse                        │      │
│  │                                                │      │
│  │   Accepted: .pdf (max 25MB)                    │      │
│  └────────────────────────────────────────────────┘      │
│                                                          │
│  [After upload:]                                         │
│  📄 HES-Report-8829-SE-Division.pdf  ✅ Uploaded         │
│  [Preview] [Remove]                                      │
│                                                          │
│  ── STEP 2: LEAF ENERGY REPORT ────────────────────────  │
│                                                          │
│  ● Include Basic LEAF (free energy analysis)             │
│    Homeowner gets a personalized energy dashboard        │
│    Leads from LEAF engagement tracked to you             │
│                                                          │
│  ○ Don't include LEAF                                    │
│    No energy analysis. No lead tracking.                 │
│                                                          │
│  [If basic selected:]                                    │
│  🌿 LEAF link: https://leaf.rei.com/report/abc123        │
│  Auto-generated for this property ✓                      │
│                                                          │
│  ── STEP 3: HOMEOWNER ─────────────────────────────────  │
│                                                          │
│  Name: Sarah Chen                                        │
│  Email: sarah.chen@gmail.com  [✏️ Edit]                  │
│                                                          │
│  ── PREVIEW ────────────────────────────────────────────  │
│                                                          │
│  [Shows email preview: subject line, body with HES       │
│   report attachment and LEAF link, broker's branding]    │
│                                                          │
│  ┌────────────────┐  ┌────────────────────────────┐     │
│  │ Cancel         │  │ ✅ Send to Sarah Chen       │     │
│  └────────────────┘  └────────────────────────────┘     │
└──────────────────────────────────────────────────────────┘
```

### After Send

- HES PDF stored in Supabase Storage under broker's job
- LEAF session tagged with `originating_broker_id`
- Email sent via SendGrid using `report_delivery_broker_sent` template
- Job status updated to `delivered`
- Activity logged: `broker_delivered_reports`
- Lead kickback tracking activated

### Key Differences from Tech/Admin Delivery Modal

| Feature | Tech/Admin Modal | Broker Delivery Panel |
|---------|-----------------|----------------------|
| HES report source | Already uploaded from field/office | Broker uploads (received from HES guy via email) |
| LEAF tier options | None, Basic, Full (if subscriber) | None, Basic only |
| Full LEAF upsell | Available for premium subscribers | Not available to brokers |
| Payment section | Shows payment status, invoice options | Not shown (broker handles payment with their HES guy separately) |
| Recipients | Homeowner + broker checkboxes | Homeowner only (broker already has the report) |
| Status transitions | Updates job lifecycle status | Only sets to 'delivered' |
| Email template | `report_delivery` with full variables | `report_delivery_broker_sent` (simpler, broker-branded) |

---

## Logging Out-of-Network Jobs

Before the broker can use the delivery panel, they need to log the job in their dashboard. This is how out-of-network jobs enter the system.

### "Log a Job" Button on Broker Dashboard

```
┌──────────────────────────────────────────────────────────┐
│  📝 Log Out-of-Network Job                          [X]  │
│                                                          │
│  Use this when your HES assessor isn't in the REI        │
│  network and you want to deliver reports + LEAF          │
│  yourself to earn lead kickbacks.                        │
│                                                          │
│  ── PROPERTY ───────────────────────────────────────────  │
│  Address: [________________________]                     │
│  City: [________] State: [OR] Zip: [_____]               │
│                                                          │
│  ── HOMEOWNER ──────────────────────────────────────────  │
│  Name: [________________________]                        │
│  Email: [________________________]                       │
│  Phone: [________________________] (optional)            │
│                                                          │
│  ── SERVICE ────────────────────────────────────────────  │
│  Type: ○ HES Assessment  ○ Home Inspection               │
│  Date completed: [__________]                            │
│                                                          │
│  ── ASSESSOR (out-of-network) ──────────────────────────  │
│  Name/Company: [________________________]                │
│  Email: [________________________] (optional)            │
│                                                          │
│  ☐ Invite this assessor to join REI Network              │
│                                                          │
│  [Create Job]                                            │
│                                                          │
│  This creates a job on your dashboard where you can      │
│  upload the HES report and send it with LEAF.            │
└──────────────────────────────────────────────────────────┘
```

### What Happens on Submit

1. Creates a job record with:
   - `status: 'pending_delivery'` (new status — work is done, awaiting broker delivery)
   - `requested_by: 'broker'`
   - `broker_id: [broker's ID]`
   - `network_status: 'out_of_network'`
   - `external_assessor_name / external_assessor_company` (stored but no system user link)
   - No assigned_to (no REI team member involved)
2. Job appears on broker dashboard with the Deliver Reports panel
3. If "Invite assessor" checked, sends invite email
4. Activity logged: `broker_logged_job`

---

## New Status: `pending_delivery`

Added to the job lifecycle specifically for out-of-network broker jobs:

```
Standard lifecycle (in-network):
pending → scheduled → en_route → on_site → field_complete → report_ready → delivered

Broker out-of-network lifecycle:
pending_delivery → delivered
(Only two states — work already happened off-platform)
```

This status means: "The HES work is done. The broker has the PDF. They just need to upload it and send it."

---

## Revenue & Incentive Model

### LEAF Full Version Revenue Split

When a premium affiliate sells a Full LEAF to a homeowner:

```
Homeowner pays: $200 (example — affiliate sets their own price)
├── Affiliate receives: $180 (90%)
└── REI developer cut:   $20 (10%)
```

The 10% developer cut covers:
- LEAF platform hosting and maintenance
- Web extension development and updates
- Data pipeline and integrations
- Customer support

### Lead Kickback Structure

When a LEAF engagement generates a new service request:

| LEAF Source | Broker Gets | How |
|------------|-------------|-----|
| In-network assessor delivered LEAF | 5% of resulting service fee | Automatic — tracked through platform |
| Broker delivered LEAF themselves (out-of-network) | 5% of resulting service fee | Automatic — broker originated delivery |
| Broker campaign email LEAF | 5% of resulting service fee | Automatic — campaign tracked |
| No LEAF delivered | 0% | No LEAF = no engagement = no leads |

### Per Broker Revenue Projection (20 transactions/year)

```
In-Network HES Revenue:    20 × $150 avg = $3,000
In-Network Inspection Rev: 10 × $600 avg = $6,000 (if 50% also order inspection)
LEAF Lead Conversions:     ~5 leads × $150 = $750
Full LEAF 10% Cut:         ~3 × $200 × 10% = $60
──────────────────────────────────────────────────
Total REI Revenue Per Active Broker: ~$9,810/year

Scale: 50 active brokers = ~$490,000/year
```

---

## Broker Kickback Tracking

### Database

```sql
-- Lead kickback tracking
CREATE TABLE IF NOT EXISTS broker_kickbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL,
  source_type TEXT NOT NULL,           -- 'job_leaf', 'campaign_leaf', 'referral'
  source_job_id UUID,
  source_job_type TEXT,                -- 'hes', 'inspection'
  lead_event_id UUID,                  -- leaf_cta_events entry
  lead_type TEXT,                      -- 'hes', 'inspection', 'solar', etc.
  lead_value NUMERIC,                  -- value of the converted service
  kickback_percent NUMERIC DEFAULT 5,
  kickback_amount NUMERIC,
  status TEXT DEFAULT 'pending',       -- 'pending', 'approved', 'paid'
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Network invites
CREATE TABLE IF NOT EXISTS network_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invited_by_broker_id UUID NOT NULL,
  invited_by_name TEXT,
  invitee_name TEXT NOT NULL,
  invitee_email TEXT NOT NULL,
  invitee_company TEXT,
  status TEXT DEFAULT 'sent',         -- 'sent', 'opened', 'signed_up', 'expired'
  signed_up_affiliate_id UUID,
  invite_token TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  sent_at TIMESTAMPTZ DEFAULT now(),
  opened_at TIMESTAMPTZ,
  signed_up_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days')
);

-- Network tracking on jobs
ALTER TABLE hes_schedule ADD COLUMN IF NOT EXISTS network_status TEXT DEFAULT 'in_network';
-- Values: 'in_network', 'out_of_network', 'self_managed'

ALTER TABLE hes_schedule ADD COLUMN IF NOT EXISTS external_assessor_name TEXT;
ALTER TABLE hes_schedule ADD COLUMN IF NOT EXISTS external_assessor_email TEXT;
ALTER TABLE hes_schedule ADD COLUMN IF NOT EXISTS external_assessor_company TEXT;
ALTER TABLE hes_schedule ADD COLUMN IF NOT EXISTS delivered_by TEXT;
-- Values: 'assessor', 'broker', 'admin'

-- Same for inspector_schedule
ALTER TABLE inspector_schedule ADD COLUMN IF NOT EXISTS network_status TEXT DEFAULT 'in_network';
ALTER TABLE inspector_schedule ADD COLUMN IF NOT EXISTS external_assessor_name TEXT;
ALTER TABLE inspector_schedule ADD COLUMN IF NOT EXISTS external_assessor_email TEXT;
ALTER TABLE inspector_schedule ADD COLUMN IF NOT EXISTS external_assessor_company TEXT;
ALTER TABLE inspector_schedule ADD COLUMN IF NOT EXISTS delivered_by TEXT;

-- Update status constraint to include pending_delivery
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

---

## Email Templates Needed

| Template Key | When Used | Recipient |
|-------------|-----------|-----------|
| `report_delivery_broker_sent` | Broker sends HES + LEAF to homeowner (out-of-network) | Homeowner |
| `network_invite` | Broker invites HES assessor to join REI | Assessor |
| `network_invite_accepted` | Assessor joined, broker notified | Broker |
| `broker_job_confirmed` | In-network job confirmed/scheduled | Broker |
| `broker_assessor_en_route` | In-network assessor heading to property | Broker |
| `broker_field_complete` | Assessment done, report being processed | Broker |
| `broker_report_delivered` | Report delivered to homeowner (in-network) | Broker |

---

## HES Affiliate Invite System

### Broker-Initiated Invites

When a broker tags a job as out-of-network, they can invite the HES assessor:

**Step 1: Broker clicks "Invite to REI Network"**
```
┌──────────────────────────────────────────┐
│  Invite Your HES Assessor               │
│                                          │
│  Assessor Name: [________________]       │
│  Assessor Email: [________________]      │
│  Company: [________________]             │
│                                          │
│  They'll receive an invitation to join   │
│  the REI network with:                   │
│  ✓ Free LEAF delivery tools              │
│  ✓ More client referrals from brokers    │
│  ✓ Option to upgrade for Full LEAF       │
│                                          │
│  [Send Invite]                           │
└──────────────────────────────────────────┘
```

**Step 2: Assessor receives invite email**
- Personalized: "[Broker Name] invited you to join the REI network"
- Highlights benefits: more clients, LEAF tools, professional profile
- One-click sign-up link

**Step 3: Assessor signs up**
- Creates affiliate profile
- Automatically linked to the inviting broker
- Future jobs from that broker auto-match to this assessor

**Step 4: Network grows**
- Broker's future jobs now dispatch to their preferred in-network assessor
- Both benefit from LEAF delivery + lead tracking
- REI captures the service revenue

---

## Broker Dashboard — Network Health Section

Below the jobs table, show network health metrics:

```
┌─────────────────────────────────────────────────────────┐
│  YOUR REI NETWORK                                       │
│                                                         │
│  In-Network Assessors: 3                                │
│  ├── Nate Garrison (REI Certified) — 8 jobs together    │
│  ├── Sarah Kim (REI Member) — 3 jobs together           │
│  └── Mike Chen (REI Certified) — 12 jobs together       │
│                                                         │
│  Pending Invites: 1                                     │
│  └── Joe's Energy — invited 02/18, not yet signed up    │
│                                                         │
│  Network Score: 87%                                     │
│  (% of your jobs using in-network assessors)            │
│                                                         │
│  Lead Kickbacks This Month: $340                        │
│  Total Kickbacks YTD: $2,180                            │
│                                                         │
│  [Invite Another Assessor]  [View All Kickbacks]        │
└─────────────────────────────────────────────────────────┘
```

---

## Incentive Messaging Throughout the Platform

### On Broker Dashboard (persistent banner for out-of-network jobs)
```
💡 3 of your 8 jobs this month used out-of-network assessors.
   That's 15 extra minutes per job you're spending on delivery.
   Invite your assessors to REI → save time and earn more.
   [Invite Assessors]
```

### Monthly Broker Email Digest
```
📊 Your February REI Summary

Jobs This Month: 8
├── In-Network: 5 (hands-off delivery ✅)
└── Out-of-Network: 3 (you handled delivery ⚠️)

Time Saved with In-Network: ~75 minutes
Lead Kickbacks Earned: $180

💡 Invite your remaining 2 assessors to save even more time.
```

---

## REI First 90 Days — Pilot Strategy

For the first 90 days, REI is the ONLY in-network provider. This means:

1. All broker orders go through REI's in-house team
2. REI proves the concept: smooth ordering, status updates, auto-delivery
3. REI demonstrates the value gap vs out-of-network
4. After 90 days: open the network to affiliate HES providers
5. Brokers who experienced the in-network flow will push their HES contacts to join

---

## Implementation Priority

### Phase 1: Broker Delivery Panel (build first)
1. `BrokerDeliveryPanel` component (upload PDF + send LEAF)
2. "Log Out-of-Network Job" form on broker dashboard
3. `pending_delivery` status for out-of-network jobs
4. Network status badges on all job cards

### Phase 2: Broker Dashboard Redesign
5. KPI cards (active, pending, completed, this year)
6. Quick order buttons (HES, Inspection, Bundle)
7. Jobs table with network status indicators
8. In-network vs out-of-network comparison visuals

### Phase 3: Broker Notifications (in-network jobs)
9. Status update emails at each lifecycle stage
10. Report delivered notification with HES PDF copy
11. New email templates for broker milestones

### Phase 4: Network Growth
12. Invite system (broker invites HES assessor)
13. Invite tracking and conversion
14. Network health metrics on broker dashboard
15. Incentive messaging and nudges

### Phase 5: Lead Kickbacks
16. LEAF engagement tracking tied to originating broker
17. Kickback calculation engine
18. Kickback dashboard and history
19. Payout system (manual at first, automated later)

---

## CLI Commands (when ready)

### Broker Delivery Panel
```
claude "Read specs/NETWORK_INCENTIVES_SPEC.md. Build the BrokerDeliveryPanel component that lives on the broker dashboard for out-of-network jobs. It has three steps: 1) Upload HES PDF (drag & drop to Supabase Storage), 2) Toggle basic LEAF (auto-generates link from intake_sessions or new session), 3) Confirm homeowner recipient and send. On send: email via SendGrid using report_delivery_broker_sent template, update job status to delivered, log activity, activate lead tracking. Style to match the admin dark theme."
```

### Log Out-of-Network Job
```
claude "Read specs/NETWORK_INCENTIVES_SPEC.md. Build the 'Log Out-of-Network Job' form for the broker dashboard. Fields: property address, homeowner name/email/phone, service type (HES/Inspection), date completed, assessor name/company/email, checkbox to invite assessor. Creates a job with status 'pending_delivery', network_status 'out_of_network'. Add the pending_delivery status to the DB constraint. Add network_status and external_assessor columns to both schedule tables."
```

### Network Status Badges
```
claude "Read specs/NETWORK_INCENTIVES_SPEC.md. Add network_status visual indicators to all job displays: admin schedule table, admin side panel, broker dashboard cards. In-network = green badge, out-of-network = amber badge with invite nudge, self-managed = yellow badge. Show external assessor info when out-of-network."
```

### Invite System
```
claude "Read specs/NETWORK_INCENTIVES_SPEC.md. Build the assessor invite flow: broker enters name/email/company, system sends invite email with unique token, tracks invite status in network_invites table. When invitee signs up via token link, auto-link to the inviting broker as preferred assessor. Create the network_invites table and the invite API endpoint."
```
