# REI Homeowner Portal & LEAF CTA Flow
## specs/HOMEOWNER_PORTAL_SPEC.md
## February 21, 2026

---

## Core Principle

The LEAF report is open, free, no login required. The homeowner browses it like a website. The moment they click a CTA — "Get a quote," "Request an HES" — THAT is when they enter the system. The CTA collects their info, creates the request, and gives them a reason to make an account: tracking.

No gate before value. Value first, account second.

---

## The LEAF Report (No Account Needed)

The LEAF report is a standalone interactive web app. It already exists at:
```
https://leaf-diagnose-sim-2.vercel.app
```

What the homeowner sees (no login):
- Property overview (address, year built, sq ft)
- Energy findings (HVAC age, insulation type, water heater condition, solar viability, etc.)
- Each finding has a severity indicator (good / needs attention / urgent)
- CTA buttons on relevant findings

The LEAF report knows:
- `session_id` — unique to this LEAF instance
- `originating_broker_id` — who sent it (if anyone)
- `originating_job_id` — which HES/inspection generated it (if any)
- `homeowner_email` — if pre-filled from job data
- `property_address` — from the job data

This data is stored in `intake_sessions` and flows through to any CTA action.

---

## CTA Types

Two categories of CTAs live inside the LEAF report:

### Type 1: Contractor Lead CTAs
These generate leads for specific trades. They appear on LEAF findings.

| Finding | CTA Text | Lead Type | Typical Value |
|---------|----------|-----------|---------------|
| HVAC is 18 years old | "Get an HVAC Quote" | hvac | $75 |
| Solar viable roof | "Get a Solar Estimate" | solar | $150-200 |
| Water heater past lifespan | "Replace Water Heater" | water_heater | $35 |
| Outdated electrical panel | "Get an Electrical Assessment" | electrical | $40 |
| Plumbing issues detected | "Get a Plumbing Quote" | plumbing | $40 |
| Poor insulation | "Improve Insulation" | insulation | $55 |
| Windows need replacement | "Get Window Quotes" | windows | $65 |
| General maintenance needed | "Find a Handyman" | handyman | $25 |

### Type 2: Service Request CTAs
These create job requests back to REI.

| CTA Text | Creates |
|----------|---------|
| "Get a Full HES Assessment" | HES job request → REI schedule |
| "Get a Home Inspection" | Inspection job request → REI schedule |
| "Get a Detailed Energy Plan" | Premium LEAF upsell |

---

## CTA Click Flow — Step by Step

### Step 1: Homeowner Clicks CTA in LEAF

Example: Homeowner sees "Your HVAC system is 18 years old" finding and clicks **"Get an HVAC Quote"**

### Step 2: CTA Modal Opens (inside LEAF)

A clean modal appears within the LEAF report. No page navigation.

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  Get an HVAC Quote                                   │
│                                                      │
│  A qualified HVAC contractor will reach out to       │
│  discuss replacement options for your home.          │
│                                                      │
│  ── CONFIRM YOUR INFO ─────────────────────────────  │
│                                                      │
│  Name:  [Sarah Chen___________]  (pre-filled if      │
│  Email: [sarah@gmail.com______]   available from     │
│  Phone: [(503) 555-0199_______]   job/session data)  │
│                                                      │
│  ── YOUR PROPERTY ─────────────────────────────────  │
│                                                      │
│  1205 NW 23rd Ave, Portland, OR 97210  ✓             │
│  (from LEAF data, read-only)                         │
│                                                      │
│  ── ANYTHING ELSE? ────────────────────────────────  │
│                                                      │
│  [Optional notes...                        ]         │
│                                                      │
│  [Submit Request]                                    │
│                                                      │
│  By submitting, you agree to be contacted about      │
│  this service. Free, no obligation.                  │
└──────────────────────────────────────────────────────┘
```

**Pre-fill logic:**
- If the LEAF was delivered from a job, homeowner name/email/phone may already exist → pre-fill
- Property address always pre-filled from LEAF session data
- If no homeowner info exists (organic LEAF), all fields are empty — homeowner fills them

### Step 3: Submit Creates the Request

**For Contractor Lead CTAs:**

```javascript
// Creates a lead in system_leads
{
  lead_type: 'hvac',
  title: 'HVAC Replacement Quote',
  property_address: '1205 NW 23rd Ave',
  city: 'Portland',
  state: 'OR',
  zip: '97210',
  homeowner_name: 'Sarah Chen',
  homeowner_email: 'sarah@gmail.com',
  homeowner_phone: '503-555-0199',
  
  // Source tracking
  source_type: 'leaf_cta',
  source_leaf_session_id: 'abc-123',    // links to intake_sessions
  source_leaf_finding: 'HVAC system is 18 years old',
  source_job_id: 'job-456',             // HES job that generated this LEAF
  
  // Exclusivity (if broker attached)
  exclusive_broker_id: 'broker-789',    // from intake_sessions.originating_broker_id
  exclusivity_status: 'exclusive',      // or 'available' if no broker
  exclusivity_expires_at: NOW() + 24hr, // only if broker attached
  
  // Pricing
  lead_price: 75.00,                    // from LEAD_PRICING constant
  status: 'available',
  
  // Revenue split (calculated on creation)
  revenue_split: {
    broker_percent: 70,
    rei_percent: 30,
    broker_amount: 52.50,
    rei_amount: 22.50
  }
}
```

**For Service Request CTAs (HES/Inspection):**

```javascript
// Creates a job in hes_schedule or inspector_schedule
{
  status: 'pending',
  requested_by: 'homeowner',           // not broker — homeowner initiated
  broker_id: 'broker-789',             // still attached if LEAF came from broker
  customer_name: 'Sarah Chen',
  customer_email: 'sarah@gmail.com',
  customer_phone: '503-555-0199',
  address: '1205 NW 23rd Ave',
  city: 'Portland',
  state: 'OR',
  zip: '97210',
  source: 'leaf_cta',
  source_session_id: 'abc-123',
  network_status: 'in_network',        // routes to REI
  notes: 'Requested from LEAF report — interested in full assessment'
}
```

### Step 4: Confirmation Screen (inside LEAF modal)

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  ✅ Request Submitted!                               │
│                                                      │
│  We'll connect you with a qualified HVAC             │
│  contractor within 48 hours.                         │
│                                                      │
│  Want to track your request?                         │
│                                                      │
│  [Create Your Free Account →]                        │
│                                                      │
│  You'll be able to:                                  │
│  • Track this request and any future ones            │
│  • Access your LEAF energy report anytime            │
│  • Get quotes and compare options                    │
│                                                      │
│  [Maybe Later — Close]                               │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Step 5: Email Sent to Homeowner

Regardless of whether they create an account, they get an email:

```
Subject: Your HVAC Quote Request — REI

Hi Sarah,

We received your request for an HVAC quote at 1205 NW 23rd Ave.

What happens next:
• A qualified contractor will reach out within 48 hours
• You'll receive updates at this email address

Track your request online:
[Create Account & Track Request →]
{link with magic token for instant signup}

Thanks,
REI — Renewable Energy Incentives
```

**For HES/Inspection requests, different email:**

```
Subject: Your Home Energy Assessment Request — REI

Hi Sarah,

We received your request for a Home Energy Assessment at 1205 NW 23rd Ave.

What happens next:
• Our team will contact you to schedule within 24 hours
• The assessment takes about 2-3 hours on site
• You'll receive a detailed report + LEAF energy analysis

Track your request online:
[Create Account & Track Request →]

Thanks,
REI — Renewable Energy Incentives
```

---

## Account Creation Flow

### Magic Link Signup

The "Create Account" link in the email contains a magic token:
```
https://app.renewableenergyincentives.com/signup?token=xyz&email=sarah@gmail.com
```

When clicked:
1. Validates token
2. Creates auth user with email (Supabase auth)
3. Creates `app_profiles` entry with role = 'homeowner'
4. Links all existing requests/leads with this email to the new user
5. Redirects to homeowner portal

### If They Already Have an Account

- Email matches existing user → "Log in to track your request" link instead
- Magic link logs them in and redirects to portal

### If They Click "Maybe Later"

- No account created
- They still get email updates about their request
- The "Create Account" link in emails remains valid
- All requests are tracked by email, not user_id
- When they eventually sign up, everything links retroactively

---

## Homeowner Portal

### Route: `/homeowner/dashboard` or `/portal`

### Who Sees It
Homeowners who created an account after a CTA click. Role = 'homeowner' in app_profiles.

### Sidebar (minimal)
```
[REI Logo]

Sarah Chen
sarah@gmail.com

─────────────
Dashboard
My Reports
My Requests
Settings
─────────────
```

### Dashboard

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  Welcome, Sarah                                          │
│                                                          │
│  ── MY LEAF REPORTS ───────────────────────────────────  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  🌿 1205 NW 23rd Ave, Portland, OR                 │  │
│  │  Generated: Feb 20, 2026                           │  │
│  │  8 findings · 3 urgent                             │  │
│  │  [Open Report →]                                   │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ── MY REQUESTS ───────────────────────────────────────  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  🔧 HVAC Quote                                     │  │
│  │  1205 NW 23rd Ave                                  │  │
│  │  Requested: Feb 21, 2026                           │  │
│  │                                                    │  │
│  │  Status: Sent to contractor                        │  │
│  │  ●━━●━━○━━○                                       │  │
│  │  Submitted → Contractor Contacted → Quote Ready    │  │
│  │                                                    │  │
│  │  Contractor: ABC HVAC Services                     │  │
│  │  Expected response: Within 48 hours                │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  🏠 HES Assessment                                 │  │
│  │  1205 NW 23rd Ave                                  │  │
│  │  Requested: Feb 21, 2026                           │  │
│  │                                                    │  │
│  │  Status: Scheduled for Feb 25 at 9:00 AM           │  │
│  │  ●━━●━━●━━○━━○━━○━━○                              │  │
│  │  Submitted → Confirmed → Scheduled → ...           │  │
│  │                                                    │  │
│  │  Assessor: Nate Garrison — REI                     │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ── EXPLORE MORE ──────────────────────────────────────  │
│                                                          │
│  Based on your LEAF report, you may also want:          │
│  [Get Solar Estimate →]  [Improve Insulation →]         │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### My Reports Page

Lists all LEAF reports tied to this homeowner's email/account.

```
┌────────────────────────────────────────────────────┐
│  🌿 1205 NW 23rd Ave, Portland, OR                 │
│  Generated: Feb 20, 2026                           │
│  Source: HES Assessment by REI                     │
│  Findings: 8 total (3 urgent, 2 needs attention)   │
│  [Open Full Report →]                              │
│                                                    │
│  Quick Summary:                                    │
│  🔴 HVAC — 18 years old, replacement recommended  │
│  🔴 Water Heater — past expected lifespan          │
│  🔴 Insulation — below recommended R-value        │
│  🟡 Windows — single pane, upgrade suggested       │
│  🟡 Electrical — panel nearing capacity            │
│  🟢 Roof — good condition, solar viable            │
│  🟢 Foundation — no issues                         │
│  🟢 Plumbing — good condition                      │
└────────────────────────────────────────────────────┘
```

Clicking "Open Full Report" opens the LEAF app in a new tab (or embedded iframe) — same LEAF they already viewed, but now bookmarked in their portal.

### My Requests Page

All CTA-generated requests, with real-time status tracking.

**Request Statuses — Contractor Leads:**
```
Submitted → Sent to Contractor → Contractor Responded → Quote Ready → Completed
```

**Request Statuses — HES/Inspection:**
```
Submitted → Confirmed → Scheduled → In Progress → Report Ready → Delivered
```

Each request card shows:
- Service type + icon
- Property address
- Status progress bar
- Current status description
- Contractor/assessor name (when assigned)
- Date submitted + any scheduled dates
- Actions: [Cancel Request] (if still pending)

---

## Request Tracking — How Statuses Flow

### Contractor Lead Lifecycle (from homeowner's POV)

```
HOMEOWNER CLICKS CTA
  ↓
Status: "Submitted"
Homeowner sees: "We received your request."
Email: Confirmation with tracking link
  ↓
BROKER CLAIMS LEAD (within 24hr exclusivity)
  ↓
Status: "Sent to Contractor"
Homeowner sees: "We've connected you with a contractor."
Email: "[Contractor Name] will reach out within 48 hours."
  ↓
CONTRACTOR RESPONDS
  ↓
Status: "Quote Ready"
Homeowner sees: "Your quote is ready to review."
Email: "You have a new quote from [Contractor]."
  ↓
HOMEOWNER ACCEPTS/DECLINES
  ↓
Status: "Completed" or "Declined"
```

### HES/Inspection Request Lifecycle (from homeowner's POV)

```
HOMEOWNER CLICKS CTA
  ↓
Status: "Submitted"
Homeowner sees: "We received your request. We'll confirm within 24 hours."
  ↓
REI ADMIN CONFIRMS + SCHEDULES
  ↓
Status: "Scheduled"
Homeowner sees: "Your assessment is scheduled for [date] at [time]."
Email: Calendar invite + confirmation details
  ↓
ASSESSOR GOES ON SITE
  ↓
Status: "In Progress"
Homeowner sees: "Your assessment is underway."
  ↓
REPORT + LEAF DELIVERED
  ↓
Status: "Delivered"
Homeowner sees: "Your report is ready! View your LEAF energy analysis."
New LEAF report appears in My Reports
```

---

## Database: Homeowner Tracking

### homeowner_requests table (NEW)

Tracks all CTA-originated requests from the homeowner's perspective. This is the homeowner's view — separate from the broker's lead view and the admin's job view.

```sql
CREATE TABLE IF NOT EXISTS homeowner_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who
  homeowner_email TEXT NOT NULL,
  homeowner_name TEXT,
  homeowner_phone TEXT,
  homeowner_user_id UUID,              -- linked when they create account
  
  -- What
  request_type TEXT NOT NULL,          -- 'contractor_quote', 'hes_assessment', 'inspection', 'premium_leaf'
  service_subtype TEXT,                -- 'hvac', 'solar', 'plumbing', etc.
  
  -- Where
  property_address TEXT NOT NULL,
  property_city TEXT,
  property_state TEXT,
  property_zip TEXT,
  
  -- Source
  source_leaf_session_id UUID,         -- which LEAF report
  source_leaf_finding TEXT,            -- what triggered the CTA
  source_cta_type TEXT,                -- 'contractor_lead', 'service_request'
  
  -- Links to other tables
  linked_lead_id UUID,                 -- → system_leads (if contractor lead)
  linked_job_id UUID,                  -- → hes_schedule/inspector_schedule (if service request)
  linked_job_type TEXT,                -- 'hes' or 'inspection'
  
  -- Attribution
  originating_broker_id UUID,          -- broker who sent the LEAF (if any)
  originating_assessor_id UUID,        -- assessor who delivered the LEAF (if any)
  
  -- Status (homeowner-facing)
  status TEXT DEFAULT 'submitted',
  -- Contractor leads: 'submitted', 'sent_to_contractor', 'quote_ready', 'completed', 'declined', 'expired'
  -- Service requests: 'submitted', 'confirmed', 'scheduled', 'in_progress', 'report_ready', 'delivered', 'completed'
  status_message TEXT,                 -- human-readable: "ABC HVAC will contact you within 48 hours"
  
  -- Contractor info (populated when lead is claimed/routed)
  assigned_contractor_name TEXT,
  assigned_contractor_email TEXT,
  assigned_contractor_phone TEXT,
  
  -- Assessor info (populated when job is scheduled)
  assigned_assessor_name TEXT,
  
  -- Scheduling
  scheduled_date DATE,
  scheduled_time TEXT,
  
  -- Notes
  homeowner_notes TEXT,                -- from CTA form
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Account linking
  account_created BOOLEAN DEFAULT false,
  account_invite_sent_at TIMESTAMPTZ,
  account_created_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_homeowner_requests_email ON homeowner_requests(homeowner_email);
CREATE INDEX idx_homeowner_requests_user ON homeowner_requests(homeowner_user_id);
CREATE INDEX idx_homeowner_requests_status ON homeowner_requests(status);
CREATE INDEX idx_homeowner_requests_lead ON homeowner_requests(linked_lead_id);
CREATE INDEX idx_homeowner_requests_job ON homeowner_requests(linked_job_id);
CREATE INDEX idx_homeowner_requests_session ON homeowner_requests(source_leaf_session_id);
```

### How Tables Connect

```
intake_sessions (LEAF report data)
  ↓ source_leaf_session_id
homeowner_requests (homeowner's tracking view)
  ↓ linked_lead_id          ↓ linked_job_id
system_leads                hes_schedule / inspector_schedule
(broker/marketplace view)   (admin/assessor view)
```

One CTA click creates entries in TWO places:
1. `homeowner_requests` — for the homeowner's tracking portal
2. `system_leads` OR `hes_schedule`/`inspector_schedule` — for the broker/admin view

They're linked by IDs. When a broker claims a lead or admin schedules a job, the corresponding `homeowner_requests` status updates automatically.

---

## LEAF CTA → System Integration

### API Endpoint: POST /api/leaf/cta

Called by the LEAF app when a homeowner submits a CTA form.

```typescript
// Request body from LEAF app
{
  session_id: string,           // LEAF session
  cta_type: 'contractor_lead' | 'service_request',
  service_type: string,         // 'hvac', 'solar', 'hes', 'inspection', etc.
  finding_text: string,         // "HVAC system is 18 years old"
  homeowner_name: string,
  homeowner_email: string,
  homeowner_phone: string,
  property_address: string,
  property_city: string,
  property_state: string,
  property_zip: string,
  notes?: string
}

// Response
{
  success: true,
  request_id: string,           // homeowner_requests.id
  lead_id?: string,             // system_leads.id (if contractor lead)
  job_id?: string,              // hes_schedule.id (if service request)
  tracking_url: string,         // link to portal
  signup_url: string            // link with magic token
}
```

### What the API Does

```
1. Look up intake_session by session_id
   → Get originating_broker_id, originating_job_id, property data

2. IF cta_type = 'contractor_lead':
   a. Create system_leads entry with:
      - lead_type, title, homeowner info, property info
      - source_type: 'leaf_cta'
      - source_leaf_session_id
      - source_leaf_finding
      - lead_price from LEAD_PRICING constant
      - IF broker attached: exclusivity_status='exclusive', exclusive_broker_id, exclusivity_expires_at=NOW()+24hr
      - IF no broker: exclusivity_status='available' (goes straight to open market)
      - revenue_split calculated based on broker presence
   b. Create homeowner_requests entry linked to the lead
   c. Log to lead_routing_history: action='created'

3. IF cta_type = 'service_request':
   a. Create hes_schedule or inspector_schedule entry with:
      - status='pending', requested_by='homeowner'
      - broker_id (if attached)
      - source='leaf_cta'
      - All homeowner + property fields
   b. Create homeowner_requests entry linked to the job
   c. Log to job_activity_log

4. Send confirmation email to homeowner
   - Include tracking link + account creation link
   - Magic token for one-click signup

5. IF broker attached:
   - Send broker notification: "New [lead/request] from your LEAF at [address]"
   - For leads: start 24hr exclusivity countdown

6. Send admin notification: "New [lead/request] from LEAF CTA"

7. Log CTA event to leaf_cta_events for analytics

8. Return response with all IDs + URLs
```

### LEAD_PRICING Constant

```typescript
const LEAD_PRICING: Record<string, number> = {
  hvac: 75,
  solar: 175,
  water_heater: 35,
  electrical: 40,
  plumbing: 40,
  insulation: 55,
  windows: 65,
  handyman: 25,
  hes: 125,        // for service requests, this is the job price, not lead price
  inspection: 400,
};
```

---

## Status Sync — Keeping Homeowner Updated

When actions happen in other parts of the system, homeowner_requests must update:

### Broker Claims Lead
```
Trigger: system_leads.claimed_by_broker_id is set
Update: homeowner_requests.status = 'sent_to_contractor'
Update: homeowner_requests.status_message = '[Contractor] will contact you within 48 hours'
Update: homeowner_requests.assigned_contractor_name/email/phone
Email: "Good news! [Contractor] will reach out about your [service] request."
```

### Admin Schedules Job
```
Trigger: hes_schedule.status changes to 'scheduled'
Update: homeowner_requests.status = 'scheduled'
Update: homeowner_requests.scheduled_date, scheduled_time
Update: homeowner_requests.assigned_assessor_name
Update: homeowner_requests.status_message = 'Scheduled for [date] at [time]'
Email: "Your assessment is scheduled! [date] at [time]"
```

### Job Status Changes
```
'en_route'      → homeowner_requests.status = 'in_progress', message = 'Your assessor is on the way'
'on_site'       → homeowner_requests.status = 'in_progress', message = 'Assessment underway'
'field_complete' → homeowner_requests.status = 'in_progress', message = 'Assessment complete, report processing'
'report_ready'  → homeowner_requests.status = 'report_ready', message = 'Your report is almost ready'
'delivered'     → homeowner_requests.status = 'delivered', message = 'Your report and LEAF analysis are ready!'
```

### Lead Expires (no broker claimed)
```
Trigger: exclusivity_expires_at passed, no claim
Update: homeowner_requests.status_message = 'We're finding the best contractor for you'
(Homeowner doesn't need to know about the marketplace mechanics)
```

---

## Email Templates

| Template | Trigger | Recipient |
|----------|---------|-----------|
| `cta_confirmation_lead` | Homeowner submits contractor quote CTA | Homeowner |
| `cta_confirmation_service` | Homeowner submits HES/inspection CTA | Homeowner |
| `cta_account_invite` | After CTA submission — account creation invite | Homeowner |
| `cta_contractor_assigned` | Broker claims lead, contractor assigned | Homeowner |
| `cta_job_scheduled` | Admin schedules their HES/inspection | Homeowner |
| `cta_job_in_progress` | Assessor en route or on site | Homeowner |
| `cta_report_delivered` | Report + LEAF delivered | Homeowner |
| `cta_quote_ready` | Contractor has responded with quote | Homeowner |
| `cta_broker_new_lead` | New lead from broker's LEAF | Broker |
| `cta_broker_new_request` | New service request from broker's LEAF | Broker |
| `cta_admin_new_lead` | New lead from any LEAF | Admin |
| `cta_admin_new_request` | New service request from any LEAF | Admin |

---

## Homeowner Auth Flow

### Option A: Magic Link (Preferred)

1. CTA confirmation email includes link: `https://app.rei.com/signup?token=xyz&email=sarah@gmail.com`
2. Click → lands on signup page with email pre-filled
3. User sets password (or uses magic link login permanently)
4. Account created → app_profiles with role='homeowner'
5. All homeowner_requests with matching email linked to user_id
6. Redirect to homeowner portal

### Option B: Email + Password

1. Standard signup form at /signup
2. After signup, link requests by email match
3. Same result

### Login After Account Exists

- Standard login at /login
- Role-based redirect: homeowner → /homeowner, broker → /broker, admin → /admin, tech → /tech

---

## Homeowner Portal — Technical Build

### Route Structure

```
/homeowner                    → redirect to /homeowner/dashboard
/homeowner/dashboard          → overview: reports + requests
/homeowner/reports            → all LEAF reports
/homeowner/reports/[id]       → single report view (or link to LEAF app)
/homeowner/requests           → all CTA requests with status
/homeowner/requests/[id]      → single request detail
/homeowner/settings           → profile, email preferences
```

### Layout

Minimal sidebar (or top nav on mobile). Light theme. Clean.

```
┌─────────────┬───────────────────────────────────────────┐
│             │                                           │
│  [REI Logo] │  Dashboard / Reports / Requests           │
│             │                                           │
│  Sarah Chen │  [page content]                           │
│             │                                           │
│  Dashboard  │                                           │
│  Reports    │                                           │
│  Requests   │                                           │
│  Settings   │                                           │
│             │                                           │
│             │                                           │
│             │                                           │
│  Log Out    │                                           │
└─────────────┴───────────────────────────────────────────┘
```

### Server Actions

```typescript
// Fetch all LEAF reports for this homeowner
fetchHomeownerReports(userId: string)
→ Query intake_sessions WHERE homeowner_email = user's email
→ Return sessions with property info, finding summaries, dates

// Fetch all requests for this homeowner
fetchHomeownerRequests(userId: string)
→ Query homeowner_requests WHERE homeowner_user_id = userId OR homeowner_email = user's email
→ Return with status, linked lead/job details

// Fetch single request with full details
fetchHomeownerRequestDetail(requestId: string, userId: string)
→ Query homeowner_requests + linked system_leads or hes_schedule
→ Return full status history, contractor/assessor info, dates
```

---

## Organic LEAF Users

Homeowners who find LEAF through marketing, the website, or other channels (no broker, no prior HES). Their flow:

1. Land on LEAF (via marketing URL or embedded widget)
2. Fill in basic property info themselves (address, sq ft, year built)
3. LEAF generates basic findings from property data
4. Homeowner clicks CTA → same flow as above
5. No broker attached → leads go straight to open marketplace
6. REI keeps 100% of lead revenue
7. Homeowner gets same portal experience

The intake_sessions entry has no originating_broker_id — that's how the system knows it's organic.

---

## Implementation Priority

### Phase 1: LEAF CTA API Endpoint
1. Create POST /api/leaf/cta endpoint
2. Handle both contractor_lead and service_request CTA types
3. Create entries in system_leads or hes_schedule
4. Create homeowner_requests entry
5. Exclusivity logic (broker attached → 24hr, no broker → open market)
6. LEAD_PRICING constant
7. Return tracking URLs

### Phase 2: Homeowner Email Flow
8. CTA confirmation email template
9. Account creation magic link
10. Include tracking URL in email
11. Follow-up emails on status changes

### Phase 3: Homeowner Account Creation
12. Magic link signup page (/signup?token=...)
13. Create homeowner role in app_profiles
14. Link existing requests to new user_id
15. Role-based login redirect

### Phase 4: Homeowner Portal
16. Portal layout + sidebar (light theme)
17. Dashboard page (reports + requests overview)
18. My Reports page (LEAF report cards)
19. My Requests page (status tracking cards with progress bars)
20. Request detail page

### Phase 5: Status Sync
21. When broker claims lead → update homeowner_requests
22. When admin schedules job → update homeowner_requests
23. When job status changes → update homeowner_requests
24. Email notifications at each status change

### Phase 6: LEAF App Integration
25. CTA modal in LEAF app (form with pre-fill)
26. POST to /api/leaf/cta on submit
27. Confirmation screen with account creation prompt
28. Track CTA events for analytics

---

## CLI Commands

### Command 1: LEAF CTA API + Database
```
claude "Read specs/HOMEOWNER_PORTAL_SPEC.md. Build Phase 1:

1. Create homeowner_requests table with full schema from the spec. Run via supabaseAdmin.

2. Create LEAD_PRICING constant in src/lib/constants/lead-pricing.ts

3. Create API route at src/app/api/leaf/cta/route.ts that handles POST requests:
   - Validates request body
   - Looks up intake_session by session_id to get broker/job attribution
   - If cta_type='contractor_lead': creates system_leads entry with exclusivity logic + creates homeowner_requests linked to it
   - If cta_type='service_request': creates hes_schedule or inspector_schedule entry + creates homeowner_requests linked to it
   - Calculates revenue split based on broker presence
   - Logs to lead_routing_history
   - Returns request_id, lead_id/job_id, tracking_url, signup_url

4. Create helper: calculateRevenueSplit(leadPrice, hasBroker, isExclusive) in src/lib/utils/revenue.ts

Verify TypeScript compiles with npx tsc --noEmit."
```

### Command 2: Homeowner Portal Layout + Dashboard
```
claude "Read specs/HOMEOWNER_PORTAL_SPEC.md. Build Phase 4:

1. Create homeowner layout at src/app/(app)/homeowner/layout.tsx with minimal light-themed sidebar (Dashboard, Reports, Requests, Settings, Log Out)

2. Create dashboard page at /homeowner/dashboard:
   - Server action fetchHomeownerDashboard() that queries homeowner_requests + intake_sessions by user email
   - Client component showing: LEAF report cards with finding summaries + request cards with status progress bars
   - 'Explore More' section suggesting additional CTAs based on LEAF findings

3. Create requests page at /homeowner/requests:
   - Server action fetchHomeownerRequests()
   - Cards with status progress bars, contractor/assessor info, dates
   - Filter: All, Active, Completed

4. Auth middleware: ensure only role='homeowner' users can access /homeowner routes

Light theme, clean, mobile-friendly. Verify TypeScript compiles."
```

### Command 3: Status Sync Triggers
```
claude "Read specs/HOMEOWNER_PORTAL_SPEC.md. Build Phase 5:

When these events happen, update the corresponding homeowner_requests entry:

1. Create updateHomeownerRequestStatus() helper in src/lib/services/homeowner-request-service.ts
2. When a broker claims a lead (system_leads.claimed_by_broker_id set) → update linked homeowner_requests to 'sent_to_contractor' with contractor info
3. When admin changes job status → update linked homeowner_requests status to match
4. Add calls to updateHomeownerRequestStatus() in: broker marketplace claim action, admin schedule status update action, report delivery action

Verify TypeScript compiles."
```
