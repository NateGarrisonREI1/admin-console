# Phase 8A — Lead Routing System + LEAF Interlink
## The Money Connection
## Date: February 19, 2026

---

## Overview

This spec covers two connected pieces:
1. **Lead Routing** — When a lead is created (from LEAF or manually), where does it go?
2. **LEAF Interlink** — How does a LEAF report completion turn into a lead on the platform?

Together, these close the revenue loop: HES/Inspection → LEAF Report → Homeowner clicks CTA → Lead Created → Routed to contractor(s) → Contractor pays → REI makes money.

---

## Part 1: Lead Routing System

### The Three Channels

Every lead on the platform gets routed to one of three channels:

#### Channel 1: Open Market
- Lead appears on the public job board visible to ALL contractors on the platform
- Any contractor can purchase it at the listed price
- First come, first served
- REI takes 30% if posted by a broker, 100% if posted by REI in-house
- This is the existing marketplace behavior

#### Channel 2: Internal Network (My Network)
- Lead appears on a private job board visible ONLY to contractors in the poster's network
- For REI: only REI's vetted contractor network sees it
- For Brokers: only that broker's connected contractors see it
- Same purchase flow — contractor buys the lead at listed price
- If nobody in the network purchases within a configurable window (e.g. 48 hours), optionally auto-release to Open Market
- Revenue split same as normal (30/68.6/2 for broker leads, 100% REI for in-house leads)

#### Channel 3: Exclusive Assignment
- Lead is sent directly to ONE specific contractor
- Two sub-modes:
  - **Paid Exclusive** — contractor still pays the lead price, but it's reserved for them. Nobody else can see or buy it. They get a notification and a window to accept (e.g. 24 hours before it releases).
  - **Free Assignment** — lead is given to the contractor at no cost. Used for referrals, relationship building, or internal arrangements. Revenue = $0, but the lead is tracked for metrics.

### Data Model Changes

**Update contractor_leads table** — add these columns:

```sql
ALTER TABLE contractor_leads ADD COLUMN IF NOT EXISTS routing_channel TEXT DEFAULT 'open_market';
-- Values: 'open_market' | 'internal_network' | 'exclusive'

ALTER TABLE contractor_leads ADD COLUMN IF NOT EXISTS exclusive_contractor_id UUID REFERENCES app_profiles(id);
-- Only set when routing_channel = 'exclusive'

ALTER TABLE contractor_leads ADD COLUMN IF NOT EXISTS is_free_assignment BOOLEAN DEFAULT false;
-- Only relevant when routing_channel = 'exclusive'

ALTER TABLE contractor_leads ADD COLUMN IF NOT EXISTS network_release_at TIMESTAMPTZ;
-- When routing_channel = 'internal_network', auto-release to open market after this time

ALTER TABLE contractor_leads ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
-- Values: 'manual' | 'leaf_cta' | 'leaf_warm' | 'broker_post' | 'admin_post'

ALTER TABLE contractor_leads ADD COLUMN IF NOT EXISTS leaf_report_id UUID;
-- Links back to the LEAF report that generated this lead (null for manual leads)

ALTER TABLE contractor_leads ADD COLUMN IF NOT EXISTS leaf_completion_id UUID;
-- Links to the specific LEAF completion event
```

**Create rei_contractor_network table** — REI's own contractor network:

```sql
CREATE TABLE rei_contractor_network (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID REFERENCES app_profiles(id) NOT NULL,
  added_by UUID REFERENCES app_profiles(id),
  status TEXT DEFAULT 'active', -- active | inactive
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contractor_id)
);
```

This is separate from broker_contractor_connections. REI manages its own network as the platform operator.

### Updated Post Lead Modal

The existing Post Lead modal needs a new first step — choosing the routing channel. Update the modal flow:

**Step 1: Choose Routing**

Three big selectable cards (radio-style, click to select):

```
┌─────────────────────────────┐
│  🌐 Open Market             │
│  Post to the public job     │
│  board. Any contractor      │
│  can purchase this lead.    │
└─────────────────────────────┘

┌─────────────────────────────┐
│  👥 My Network Only         │
│  Post to REI's contractor   │
│  network. Auto-releases to  │
│  open market after 48 hrs.  │
└─────────────────────────────┘

┌─────────────────────────────┐
│  🎯 Assign to Contractor    │
│  Send directly to a         │
│  specific contractor.       │
└─────────────────────────────┘
```

**Step 2: Lead Details** (same as current)
- Title, description, property info, homeowner info, service type, price
- If source is LEAF, these fields auto-populate from LEAF data

**Step 2b: If Exclusive Assignment selected**
- Contractor dropdown (pulls from rei_contractor_network for admin, broker_contractor_connections for brokers)
- Toggle: "Paid lead" (default) / "Free assignment"
- If paid: price field stays active
- If free: price field grays out, set to $0, is_free_assignment = true

**Step 2c: If My Network selected**
- Auto-release timer: dropdown (24 hours / 48 hours / 72 hours / Never)
- This sets network_release_at = now() + selected duration

**Step 3: Confirm & Post**
- Summary of lead details + routing channel
- Post button

### Job Board Visibility Logic

Update the contractor job board queries:

**Open Market tab (existing):**
```sql
WHERE routing_channel = 'open_market'
  OR (routing_channel = 'internal_network' AND network_release_at < now())
```
Show all open market leads PLUS internal network leads whose timer has expired.

**My Network tab (existing but needs update):**
For a contractor viewing the job board:
```sql
WHERE routing_channel = 'internal_network'
  AND network_release_at > now()
  AND posted_by IN (
    -- brokers this contractor is connected to
    SELECT broker_id FROM broker_contractor_connections WHERE contractor_id = ?
    UNION
    -- REI network check
    SELECT posted_by FROM contractor_leads WHERE ? IN (
      SELECT contractor_id FROM rei_contractor_network WHERE status = 'active'
    )
  )
```

**Exclusive leads:**
These don't appear on any job board. The assigned contractor sees them in a "Reserved for You" section or gets a direct notification/email.

### REI Network Management (Admin Console)

Add a section in the admin console for managing REI's own contractor network. This can live under the existing admin flow or as a new sidebar item.

For now, the simplest approach: add an "REI Network" tab on the admin Marketplace page or a toggle on the existing contractor management. This mirrors what brokers have with their network — REI just needs the same thing for itself.

Quick add: On the Marketplace page or in Settings, add an "REI Network" section where admin can:
- View all contractors in REI's network
- Add a contractor (search by name/email from existing platform contractors)
- Remove a contractor
- See their status (active/inactive)

---

## Part 2: LEAF Interlink

### How a LEAF Report Creates a Lead

The LEAF app (leaf-ss-module repo) is currently a standalone tool. Here's how we connect it:

#### The Flow

```
Braden does HES assessment
         ↓
LEAF report is generated (leaf-ss-module)
         ↓
Homeowner receives LEAF report (email or direct link)
         ↓
Homeowner views LEAF report
         ↓
Homeowner clicks CTA ("Get Estimate" on HVAC, Solar, etc.)
         ↓
★ THIS IS WHERE THE MONEY HAPPENS ★
         ↓
CTA click hits an API endpoint on admin console
         ↓
Lead is auto-created in contractor_leads table
         ↓
Lead is routed based on config (open market / internal / exclusive)
         ↓
Contractor purchases lead → REI gets paid
```

#### LEAF → Admin Console API

Create an API endpoint in the admin console that the LEAF app calls when a homeowner clicks a CTA:

**Endpoint:** `POST /api/leaf/lead`

**Payload from LEAF app:**
```json
{
  "leaf_report_id": "uuid-of-the-leaf-report",
  "leaf_completion_id": "uuid-of-the-completion-event",
  "homeowner": {
    "name": "Jane Smith",
    "email": "jane@example.com",
    "phone": "5035551234",
    "address": "123 Main St, Portland, OR 97201"
  },
  "property": {
    "address": "123 Main St, Portland, OR 97201",
    "city": "Portland",
    "state": "OR",
    "zip": "97201",
    "sqft": 2100,
    "year_built": 1985,
    "bedrooms": 3,
    "bathrooms": 2
  },
  "service_requested": "hvac",
  "cta_type": "get_estimate",
  "source_broker_id": "uuid-of-broker-who-sent-leaf (or null if REI in-house)",
  "source_assessor_id": "uuid-of-hes-assessor (e.g. Braden)",
  "leaf_summary": {
    "energy_score": 6,
    "recommendations": ["HVAC upgrade", "Insulation", "Windows"],
    "estimated_savings": "$1,200/year"
  }
}
```

**What the endpoint does:**
1. Validates the payload
2. Determines routing:
   - If `source_broker_id` is set → check broker's default lead routing preference
   - If `source_broker_id` is null (REI in-house) → use REI's default routing (configurable in Settings, default: internal_network)
3. Determines pricing:
   - Pull from lead_pricing table based on service_requested type
   - Use the default price for that trade type
4. Creates the lead in contractor_leads:
   ```
   title: "{Service} Lead — {City}" (e.g. "HVAC Lead — Portland")
   description: Auto-generated from LEAF data
   service_type: from payload
   homeowner info: from payload
   property info: from payload
   price: from lead_pricing defaults
   status: 'available'
   routing_channel: determined in step 2
   source: 'leaf_cta'
   leaf_report_id: from payload
   leaf_completion_id: from payload
   posted_by: broker_id if broker lead, admin if REI in-house
   ```
5. If routing is exclusive → notify assigned contractor via email
6. If routing is internal_network → notify all network contractors via email (batch)
7. If routing is open_market → appears on job board immediately, no notification needed (contractors browse)
8. Returns success + lead_id

**Security:** API key auth (shared secret between LEAF app and admin console). Store in environment variables on both sides.

#### LEAF Completions Tracking (Conversion Funnel)

Beyond CTA clicks, track ALL LEAF completions — even the ones that don't click a CTA. These are "warm leads."

**Create leaf_completions table:**
```sql
CREATE TABLE leaf_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leaf_report_id UUID NOT NULL,
  homeowner_name TEXT,
  homeowner_email TEXT,
  homeowner_phone TEXT,
  property_address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  source_broker_id UUID REFERENCES app_profiles(id),
  source_assessor_id UUID REFERENCES app_profiles(id),
  energy_score INTEGER,
  recommendations JSONB,
  completed_at TIMESTAMPTZ DEFAULT now(),
  cta_clicked BOOLEAN DEFAULT false,
  cta_clicked_at TIMESTAMPTZ,
  cta_service_type TEXT,
  lead_created BOOLEAN DEFAULT false,
  lead_id UUID REFERENCES contractor_leads(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Two LEAF API endpoints:**

1. `POST /api/leaf/completion` — Called when homeowner completes/views a LEAF report. Logs the completion. No lead created yet.

2. `POST /api/leaf/lead` — Called when homeowner clicks a CTA. Updates the completion record (cta_clicked = true) AND creates the lead.

This gives you the conversion funnel:
- LEAF reports generated → LEAF reports viewed/completed → CTA clicks → Leads created → Leads purchased

#### "Warm Leads" Tier

LEAF completions where the homeowner viewed the report but DIDN'T click a CTA. These are warm leads — they saw the recommendations but didn't act yet.

REI or brokers can:
- View warm leads in a separate section (LEAF completions with cta_clicked = false)
- Choose to manually post them as leads at a lower price point (e.g. 50% of normal)
- Run a retargeting campaign (email the homeowner again with the LEAF report link)

This is Nate's "golden insight" from the handoff doc — tracking completions vs. CTA clicks.

#### Default Routing Configuration

Add a setting in Admin Settings for REI's default lead routing when leads come from in-house LEAF reports:

**Settings → Lead Routing**
- Default channel for REI in-house leads: [Open Market / Internal Network / Exclusive]
- Internal Network auto-release timer: [24h / 48h / 72h / Never]
- Default exclusive contractor: [Dropdown of REI network contractors] (optional)

Brokers will eventually have a similar setting in their own console.

---

## Part 3: LEAF Analytics Dashboard

Add a new section to the Admin Dashboard (or Marketplace page) showing LEAF funnel metrics:

**LEAF Funnel KPIs:**
- Total LEAF Reports Generated (all time / this month)
- LEAF Completions (homeowner viewed the report)
- CTA Clicks (homeowner clicked Get Estimate)
- Conversion Rate: CTA Clicks / Completions (this is the money metric)
- Leads Created from LEAF
- Leads Sold from LEAF
- Revenue from LEAF-generated leads

**Breakdown by:**
- By broker (which broker's LEAFs are converting best?)
- By assessor (which HES assessor's reports lead to the most CTAs?)
- By service type (are HVAC CTAs more common than Solar?)
- By area (Portland Metro vs Salem vs Eugene)

**Warm Leads section:**
- Count of LEAF completions with no CTA click
- "Post as Warm Lead" bulk action
- Homeowner contact info for retargeting

---

## Implementation Order

### Step 1: Database + Data Model (do first)
- Add columns to contractor_leads (routing_channel, exclusive_contractor_id, is_free_assignment, network_release_at, source, leaf_report_id, leaf_completion_id)
- Create rei_contractor_network table
- Create leaf_completions table
- Run migrations in Supabase

### Step 2: Update Post Lead Modal
- Add routing channel selection (Open Market / My Network / Exclusive)
- Add exclusive contractor picker + paid/free toggle
- Add network auto-release timer
- Wire up to save new fields

### Step 3: Update Job Board Visibility
- Open Market tab query includes expired network leads
- My Network tab filters to poster's network only
- Exclusive leads show in "Reserved for You" for assigned contractor

### Step 4: REI Network Management
- Admin can add/remove contractors from REI's network
- Simple UI — list view with add/remove

### Step 5: LEAF API Endpoints
- POST /api/leaf/completion
- POST /api/leaf/lead
- API key auth between repos
- Auto-create leads from CTA clicks

### Step 6: LEAF Analytics
- Funnel dashboard
- Warm leads section
- Breakdown views

### Step 7: Connect LEAF App
- Update leaf-ss-module to call the new API endpoints
- CTA buttons hit /api/leaf/lead
- Report completion hits /api/leaf/completion
- Test end-to-end: HES → LEAF → CTA → Lead → Purchase

---

## What This Unlocks

Once this is live:
1. Braden does an HES → homeowner automatically gets LEAF → clicks "Get Estimate" → lead appears on job board or goes to REI's network → contractor buys it → REI makes money. **Zero manual work after the HES assessment.**

2. REI can track exactly which HES assessments and which brokers generate the most revenue. Data-driven decisions on where to focus.

3. Warm leads become a retargeting goldmine — homeowners who saw recommendations but didn't act. Cheaper leads, second chance at conversion.

4. When brokers come online, they get the exact same system. Their LEAF reports create leads that go to their network. REI takes 30%. Scales nationally without REI needing to vet contractors in every market.

This is the engine. Everything else is UI polish.
