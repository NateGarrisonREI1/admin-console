# Contractor Console — Full Build Specification
## REI Platform — Contractor Portal

**Status:** Ready to Build
**Date:** February 18, 2026
**Theme:** Dark (match broker console — slate-900/800/700, emerald-500 accents)
**Location:** src/app/(app)/contractor/

---

## Overview

The contractor console is where revenue happens. Contractors discover leads, purchase them, close jobs, and build their professional network. It's designed to feel like a professional tool — not a marketplace — where contractors manage their business on the REI platform.

**Contractor Journey:**
1. REI admin sends invite → contractor onboarding flow
2. Contractor sets up profile, payment method, service areas
3. Contractor sees leads available (network + open market)
4. Contractor purchases exclusive lead → gets homeowner info + LEAF summary
5. Contractor works the job → updates status → closes
6. Contractor can refer past customers to other contractors in their network

---

## Tech Stack & Conventions

- Next.js 16, React 19, TypeScript strict
- Tailwind 3 — dark theme matching broker console
- @heroicons/react for icons
- Supabase backend (service role for admin queries, RLS for contractor queries)
- Server components for pages, 'use client' for interactive components
- 'use server' actions for all Supabase queries
- Stripe for lead purchases (existing integration in src/lib/stripe.ts)
- No component library — custom Tailwind components

---

## Database Schema

### Lead Pricing Config (admin-controlled)
```sql
CREATE TABLE public.lead_pricing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_type TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  min_price DECIMAL(10,2) NOT NULL,
  max_price DECIMAL(10,2) NOT NULL,
  default_price DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- MVP Seed Data:
-- HVAC (Heating & Cooling): $50–$150, default $75
-- Water Heater: $20–$75, default $40
-- Solar: $75–$200, default $125
-- Electrical: $20–$60, default $35
-- Plumbing: $20–$60, default $35
```

### Contractor Profiles (extend existing)
```sql
-- contractor_profiles already exists (migration 20260216000012)
-- Ensure these fields exist or add:
--   service_types TEXT[] (array of system types they handle)
--   service_areas TEXT[] (array of area slugs)
--   certifications TEXT[]
--   company_name TEXT
--   company_phone TEXT
--   company_email TEXT
--   license_number TEXT
--   stripe_customer_id TEXT (for purchasing leads)
--   onboarding_complete BOOLEAN DEFAULT false
--   bio TEXT
--   years_experience INT
```

### Contractor Network (contractor-to-contractor)
```sql
CREATE TABLE public.contractor_network (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  company_name TEXT,
  trade TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- This is the contractor's personal rolodex of other contractors they refer work to
```

### Contractor Customers (past job contacts)
```sql
CREATE TABLE public.contractor_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES system_leads(id),
  homeowner_name TEXT NOT NULL,
  homeowner_email TEXT,
  homeowner_phone TEXT,
  homeowner_address TEXT,
  job_type TEXT NOT NULL,
  job_date DATE,
  job_status TEXT DEFAULT 'completed',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Auto-populated when contractor completes a purchased lead
-- Contractor can view but not bulk export
```

### Contractor Referrals
```sql
CREATE TABLE public.contractor_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_contractor_id UUID NOT NULL REFERENCES auth.users(id),
  to_contractor_id UUID,
  to_contact_name TEXT,
  to_contact_email TEXT,
  to_contact_phone TEXT,
  customer_id UUID REFERENCES contractor_customers(id),
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_address TEXT,
  job_description TEXT,
  sent_via TEXT NOT NULL DEFAULT 'email',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT DEFAULT 'sent'
);
```

---

## Sidebar Navigation

```
OVERVIEW
  Dashboard

LEADS
  Job Board              ← Network + Open Market tabs
  My Leads               ← Purchased leads pipeline

NETWORK
  My Brokers             ← Broker connections
  My Contractors         ← Contractor-to-contractor network
  Customers              ← Past job customer book

ACCOUNT
  Profile                ← Business info, services, areas
  Billing                ← Stripe payment, spend history, receipts
  Settings               ← Notifications, password, support
```

---

## Page Specifications

### 1. Layout & Theme
- REPLACE current light theme (#f8fafc) with dark theme
- Match broker console exactly: slate-900 bg, slate-800 sidebar, emerald-500 accents
- Sidebar: collapsible, dark, same pattern as admin/broker sidebars
- Top bar: contractor company name, profile menu (top right)
- Mobile responsive

### 2. Dashboard (/contractor/dashboard)
**Header:** 'Dashboard' with company name

**Stats Row (4 cards):**
- Available Leads (network + open market count in their service area)
- Active Jobs (purchased leads in progress)
- Spend This Month ($)
- Jobs Completed This Month

**New Leads Preview (card):**
- Title: 'New Leads in Your Area'
- Show top 3-5 newest leads matching their service types + areas
- Each: service type badge, area, price, age
- 'View All →' link to job board

**Active Jobs (card):**
- Title: 'Active Jobs'
- Show leads in progress (Contacted, Quoted, Scheduled, In Progress)
- Each: customer first name + area, service type, status badge, days since purchase
- 'View All →' link to my leads

**Network Summary (card):**
- Connected to X brokers
- X contractors in personal network
- X past customers
- Recent referrals sent/received

### 3. Job Board (/contractor/job-board)
**Header:** 'Job Board' subtitle: 'Browse and purchase exclusive leads in your service area'

**Two Tabs:**
- **My Network** — leads posted by brokers the contractor is connected to
- **Open Market** — all leads in their service area from any source

**Filters:**
- Service Type: [All] [HVAC] [Water Heater] [Solar] [Electrical] [Plumbing]
- Area: [All] + their service areas
- Price Range: slider or min/max
- Sort: Newest, Price Low→High, Price High→Low

**Lead Cards (grid or list):**
Each card shows:
- Service type badge (color-coded: HVAC=orange, Solar=yellow, Water Heater=blue, Electrical=amber, Plumbing=cyan)
- General location (neighborhood/zip, NOT exact address)
- Home size (sq ft range or Small/Med/Large)
- Lead price (set by poster, within admin guardrails)
- Posted by: broker name or 'REI Direct'
- Lead age: 'Posted 2 hours ago'
- LEAF report indicator: green badge if LEAF data available
- [View Details] button

**Lead Detail (modal or expand):**
- Everything from card + more detail
- Home details from LEAF: year built, current system age/condition, recommended upgrade
- NOT homeowner name/contact (locked until purchase)
- Price prominent
- [Purchase Lead — $XX] button (Stripe charge)
- Fine print: 'Exclusive lead. You will receive homeowner contact info and LEAF report summary upon purchase.'

**Purchase Flow:**
1. Click Purchase → Stripe payment intent
2. Success → lead status changes to 'sold', buyer_id set to contractor
3. Contractor gets: homeowner name, phone, email, address, LEAF executive summary
4. Lead appears in 'My Leads' with status 'Purchased'
5. Auto-create contractor_customers entry (status: 'purchased')
6. REI takes 30% cut, poster keeps 70% minus 2% service fee

### 4. My Leads (/contractor/leads)
**Header:** 'My Leads' subtitle: 'Track purchased leads through your sales pipeline'

**Status Filters (pill buttons):**
[All] [Purchased] [Contacted] [Quoted] [Scheduled] [In Progress] [Completed] [Closed - Lost]

**Stats Row:**
- Total Purchased (all time)
- Active (in pipeline)
- Completed (closed won)
- Close Rate (%)

**Lead List (table):**
| Customer | Service | Area | Purchased | Status | Price Paid | Actions |
- Customer: name + phone (clickable to call)
- Service: type badge
- Area: city/neighborhood
- Purchased: date + days ago
- Status: color-coded badge
- Price Paid: $ amount
- Actions: View, Update Status, Request Refund

**Lead Detail Page (/contractor/leads/[id]):**
- Customer info: full name, phone, email, address
- LEAF Executive Summary (view-only):
  - Home: year built, sq ft, type
  - Relevant system: current condition, age, efficiency rating
  - Recommended upgrade: what LEAF suggested
  - Estimated cost range
  - Estimated annual savings
  - NOT the full interactive simulation — just the executive summary
- Status pipeline (visual): Purchased → Contacted → Quoted → Scheduled → In Progress → Completed
- Update status buttons (advance to next stage)
- Job notes (text area, append-only log)
- Communication log (calls, emails, texts — manual entry)
- Refund request button (only if status is 'Purchased' or 'Contacted', within 48 hours)
- If Completed: prompt to rate experience, enter final job value

### 5. My Brokers (/contractor/network/brokers)
**Header:** 'My Brokers' subtitle: 'Broker networks you belong to'

**Broker Cards:**
Each broker connection shows:
- Broker name + company
- Connected since: date
- Leads from this broker: count
- Jobs completed from this broker: count
- How connected: 'Invited by broker' or 'Joined from open market' or 'REI placed'

**Browse Brokers Section:**
- 'Find more brokers in your area'
- Shows brokers in contractor's service area that they're NOT connected to
- [Request to Join] button → sends notification to broker
- Broker approves/denies

### 6. My Contractors (/contractor/network/contractors)
**Header:** 'My Network' subtitle: 'Your personal contractor network for referrals'

**Contractor Contact List:**
- Name, company, trade/specialty, phone, email
- [Add Contact] button → simple form (name, company, trade, phone, email)
- [Send Referral] button on each contact

**Send Referral Flow:**
1. Click 'Send Referral' on a contractor contact
2. Modal: Select customer from past jobs dropdown
3. Add job description / notes
4. Choose: Send via Email or Text
5. Preview message → Send
6. Referral logged in contractor_referrals table

### 7. Customers (/contractor/customers)
**Header:** 'Customers' subtitle: 'Homeowners from completed jobs'

**Customer List (table):**
| Name | Address | Job Type | Job Date | Status | Actions |
- Auto-populated from completed leads
- Actions: View Details, Send Referral (opens referral flow with this customer pre-selected)
- Cannot export/download (data stays on platform)

### 8. Profile (/contractor/profile)
**Onboarding Flow (first time):**
Step 1: Company Info — name, phone, email, license number
Step 2: Services — select service types (HVAC, Water Heater, Solar, Electrical, Plumbing, + future trades grayed out with 'Coming Soon')
Step 3: Service Areas — select from Portland Metro, Salem, Eugene, Bend, Medford, Corvallis, etc.
Step 4: Certifications — relevant certs for selected trades
Step 5: Payment — add Stripe payment method for purchasing leads
Step 6: Done → redirect to dashboard

**Profile Page (after onboarding):**
- All above fields editable
- Profile completeness indicator
- Business logo upload (future)

### 9. Billing (/contractor/billing)
**Header:** 'Billing & Payments'

**Payment Method Card:**
- Current card on file (last 4 digits, expiry)
- [Update Payment Method] button (Stripe)

**Spend Summary:**
- This month: $ total, # leads purchased
- Last month: $ total, # leads purchased
- All time: $ total, # leads, close rate, avg cost per lead

**Transaction History (table):**
| Date | Description | Amount | Status | Receipt |
- Each lead purchase as a row
- Refunds shown as negative/green
- Receipt: downloadable PDF or link to Stripe receipt

**Promo Codes:**
- Input field: 'Enter promo code'
- Applied credits shown
- Credit balance displayed

### 10. Settings (/contractor/settings)
- Notification preferences (email/text for: new leads, network invites, lead status reminders)
- Password change
- Contact REI Support (form or mailto link)
- Terms of Service
- Privacy Policy
- Delete Account (with confirmation)

---

## Lead Pricing System

### Admin-Controlled Ranges
Stored in `lead_pricing_config` table. Admin can update from REI admin console.

| System Type | Min | Max | Default | Status |
|-------------|-----|-----|---------|--------|
| HVAC | $50 | $150 | $75 | Active |
| Water Heater | $20 | $75 | $40 | Active |
| Solar | $75 | $200 | $125 | Active |
| Electrical | $20 | $60 | $35 | Active |
| Plumbing | $20 | $60 | $35 | Active |

### Pricing Rules
- When a broker (or REI admin) posts a lead, they set the price within the min/max range
- If they try to set outside range, it clamps to min or max
- REI admin can adjust ranges at any time (affects new leads only, not existing)
- Admin can also set per-system-type defaults

### Revenue Split
- Lead sold for $100:
  - REI takes 30%: $30
  - Poster takes 70%: $70
  - Service fee (2% of poster's take): $1.40
  - Poster net: $68.60
- All tracked in payments table
- Stripe handles the charge to contractor
- REI holds funds, pays out to broker on schedule

---

## LEAF Report — The Three-Headed Lead Generator

The LEAF report doesn't just create system service leads. Every LEAF simulation gives the homeowner three CTAs:

### 1. System Service Leads (Contractor Marketplace)
- "Get Estimate" on HVAC, Solar, Water Heater, etc.
- Creates a lead → posted to broker network + open market
- Contractor purchases → closes job
- Revenue: lead price split (30% REI, ~68.6% poster)

### 2. HES Assessment Leads (REI In-House or Affiliate)
- "Get a DOE-Compliant Home Energy Score"
- Non-DOE LEAF report → homeowner wants official HES rating
- Creates HES lead → routed to REI in-house team or broker's HES affiliate
- Revenue: HES service fee ($125–$175 from service catalog)
- Bonus: official HES data feeds back into LEAF → makes report more accurate → generates better system leads

### 3. Home Inspection Leads (REI In-House or Affiliate)
- "Request a Home Inspection"
- Homeowner wants full property clarity (buying, selling, or just wants to know)
- Creates inspection lead → routed to REI in-house team or broker's inspector affiliate
- Revenue: inspection fee ($400–$800 + add-ons from service catalog)
- Bonus: inspection findings can generate ADDITIONAL system leads

### 4. Comprehensive LEAF Report (Future — $199)
- "Get the Full LEAF Report"
- Professional tech visits home, measures everything
- Unlocks ALL systems, ALL trades
- Generates 5-15x more leads per home
- Revenue: $199 report fee + massive lead generation

**Impact for Brokers:**
A broker sends 1,000 LEAF campaigns and potentially generates:
- ~200 simulations completed
- ~150 system service leads (sold to contractors: $50–$200 each)
- ~80 HES assessment requests (fulfilled at $125–$175 each)
- ~40 home inspection requests (fulfilled at $400–$800+ each)
- Future: ~30 paid LEAF requests ($199 each)

One campaign. Four revenue streams. This is why LEAF is the backbone.

---

## LEAF Executive Summary (Contractor View)

When a contractor purchases a lead that has LEAF data, they see a read-only summary:

**Home Overview:**
- Address (full, unlocked on purchase)
- Year built
- Square footage
- Home type (single family, condo, etc.)
- Number of bedrooms/bathrooms

**Relevant System Details (filtered to the lead's service type):**
- Current system: make/model if available, age, condition
- Efficiency rating (if LEAF scored it)
- Issues identified by LEAF

**LEAF Recommendation:**
- Recommended upgrade
- Estimated cost range
- Estimated annual energy savings
- Estimated ROI / payback period
- Priority level (high/medium/low based on LEAF scoring)

**What Contractor Does NOT See:**
- Full simulation controls
- Other system recommendations (only their trade)
- Homeowner's financial details
- Other contractors who viewed this lead

---

## Onboarding Flow (Admin → Contractor)

1. REI admin (or broker) creates contractor user from their console
2. System sends invite email with magic link
3. Contractor clicks link → lands on onboarding flow
4. Completes 5 steps (company info, services, areas, certs, payment)
5. onboarding_complete = true
6. Redirected to dashboard
7. Can now browse and purchase leads

**Onboarding Gating:**
- Cannot purchase leads until onboarding_complete = true
- Cannot access job board until payment method added
- Dashboard shows onboarding progress if incomplete

---

## Contractor-to-Contractor Referral System

**How It Works:**
1. Contractor A completes a job for homeowner (e.g., HVAC install)
2. Homeowner mentions they also need plumbing work
3. Contractor A goes to 'My Network' → finds their plumber buddy
4. Clicks 'Send Referral' → selects the homeowner from 'Customers'
5. Adds note: 'They need a new water heater, kitchen is accessible'
6. Chooses: Email or Text
7. System sends formatted message to the plumber with:
   - Customer name + phone + address
   - Job description
   - 'Referred by [Contractor A company name]'
8. Referral logged in system

**No Fees (MVP):**
- Contractor-to-contractor referrals are free
- This is a value-add to get contractors on the platform
- Future: optional referral fee/commission between contractors

**Message Template (Email):**
Subject: Referral from [Contractor A Company] — [Job Type] Job
Body:
"Hi [Contractor B],
[Contractor A] has referred a customer to you for [job type] work.
Customer: [Name]
Phone: [Phone]
Address: [Address]
Notes: [Notes from Contractor A]
— Sent via REI Platform"

**Message Template (Text):**
"[Contractor A Company] referred you a [job type] job: [Customer Name] at [Address]. Call: [Phone]. Notes: [Notes]"

---

## Build Order (5 Commands)

### Command 1: Foundation
- Dark theme layout + sidebar
- Database migrations (lead_pricing_config, contractor_network, contractor_customers, contractor_referrals)
- TypeScript types
- Lead pricing admin page (in REI admin console under Settings)

### Command 2: Dashboard + Profile/Onboarding
- Contractor dashboard (stats, lead preview, active jobs, network summary)
- Profile page with onboarding flow (5 steps)
- Stripe payment method setup

### Command 3: Job Board
- Network + Open Market tabs
- Lead cards with filters
- Lead detail view
- Purchase flow (Stripe)
- Price guardrails enforcement

### Command 4: My Leads + LEAF Summary
- Purchased leads pipeline
- Status tracking (Purchased → Completed)
- LEAF executive summary (read-only)
- Job notes + communication log
- Refund request flow

### Command 5: Network + Referrals + Customers
- My Brokers (connections, browse/request to join)
- My Contractors (personal network, add contacts)
- Customers (past job book)
- Send Referral flow (email/text)
- Billing page (spend history, receipts, promo codes)
- Settings page (notifications, password, support)

---

## Success Criteria

- [ ] Contractor can complete onboarding (5 steps)
- [ ] Contractor can browse leads (network + open market)
- [ ] Contractor can purchase lead (Stripe charge)
- [ ] Contractor sees LEAF executive summary after purchase
- [ ] Contractor can update lead status through pipeline
- [ ] Contractor can request refund (within rules)
- [ ] Contractor can add contacts to personal network
- [ ] Contractor can send referral (email/text) with customer info
- [ ] Contractor can view past customers
- [ ] Lead pricing enforced within admin-set ranges
- [ ] Revenue split tracked (30% REI, 70% poster minus 2% fee)
- [ ] Dark theme matches broker console
- [ ] Mobile responsive
- [ ] Zero TypeScript errors
- [ ] Build passes clean
