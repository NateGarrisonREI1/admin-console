# Admin Console Complete Specification
## REI Lead Marketplace Platform

**Version:** 2.0  
**Status:** Ready for Implementation  
**Last Updated:** February 2026

---

## 📋 Table of Contents

1. [Business Model Overview](#business-model-overview)
2. [User Roles & Dashboards](#user-roles--dashboards)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Implementation Phases](#implementation-phases)
6. [UI/UX Specifications](#uiux-specifications)
7. [Data Flows](#data-flows)
8. [Technical Stack](#technical-stack)

---

## Business Model Overview

### Core Value Proposition

REI is a **lead generation and fulfillment platform** that monetizes homeowner energy reports:

1. **Homeowner** pays $19 for LEAF Report (future; MVP free)
   - Gets energy analysis for all home systems
   - Identifies where utility money is going
   - Can simulate upgrades (water heater, HVAC, solar, etc.)
   - Clicks "Get Estimate" on specific system
   - Generates a **LEAD**

2. **REI Admin** receives the lead
   - Option A: Post to public Job Board (set price/expiration)
   - Option B: Assign directly to contractor
   - Either way, **lead is monetized**

3. **Contractors** buy leads
   - Browse system-specific leads (Water Heater, HVAC, Solar)
   - Filter by location, price, urgency
   - Purchase lead → Get homeowner contact info
   - Close the sale
   - REI takes % or per-lead fee

4. **HES Affiliates** (separate business)
   - Buy HES visit requests from brokers ($10)
   - Complete HES work
   - Build customer relationships

### Revenue Streams (MVP)

1. **Lead Sales:** $20-150 per lead (system-dependent)
   - Water Heater: $20-30
   - HVAC: $50-100
   - Solar: $75-150

2. **LEAF Reports:** $19 per report (future; currently free MVP)

3. **HES Requests:** $10 per lead sold to affiliates

---

## User Roles & Dashboards

### 1. Admin (REI Operations Manager)

**Purpose:** Control center for all leads and operations

**Access Level:** Full platform control

**Primary Tasks:**
- View all system leads (water heater, HVAC, solar)
- Post leads to public job board (set price, expiration)
- Assign leads directly to contractors
- Track lead sales and revenue
- Manage HES requests from brokers
- View performance metrics

**Dashboard Layout:**

```
┌─────────────────────────────────────────────────────────┐
│ ADMIN DASHBOARD                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ KPI CARDS (4 columns):                                  │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │
│ │ Leads Posted │ │ Leads Sold   │ │ Revenue      │     │
│ │ This Month   │ │ This Month   │ │ This Month   │     │
│ │     45       │ │     32       │ │   $3,200     │     │
│ └──────────────┘ └──────────────┘ └──────────────┘     │
│                                                         │
│ TABS: System Leads | HES Requests | Performance         │
│                                                         │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                         │
│ TAB 1: SYSTEM LEADS (to be posted or assigned)         │
│                                                         │
│ Filters: System Type | Status | Date Range             │
│                                                         │
│ TABLE: Address | System | Status | Actions             │
│ • New York, NY | HVAC | pending-post | [Post] [Assign] │
│ • Los Angeles, CA | Solar | pending-post | [Post]      │
│ • Chicago, IL | Water Heater | posted | [View]         │
│                                                         │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                         │
│ TAB 2: HES REQUESTS (from brokers)                      │
│                                                         │
│ TABLE: Broker | Address | Req. Date | Status | Actions │
│                                                         │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                         │
│ CHARTS:                                                 │
│ • Revenue Trend (line chart, 30 days)                   │
│ • Lead Sales by System (pie chart)                      │
│ • Leads Posted vs Sold (bar chart)                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Key Features:**
- Post lead to job board → Dialog: Set price, expiration date, system type
- Assign to contractor → Dialog: Select contractor, system type
- View analytics → Revenue, conversion rates by system
- Bulk actions → Post multiple leads at once

**Data:** All system leads, HES requests, contractors

---

### 2. Contractor (System Service Provider)

**Purpose:** Buy and manage customer leads for their system specialization

**Access Level:** View own purchases only + public job board

**Primary Tasks:**
- Browse system-specific leads (Water Heater, HVAC, Solar)
- Filter by location, price, urgency
- Purchase leads ($20-150 per lead)
- View purchased lead details (homeowner contact, LEAF report snippet)
- Track lead status (new, contacted, quoted, closed)
- Mark leads as closed to track conversion

**Dashboard Layout:**

```
┌─────────────────────────────────────────────────────────┐
│ CONTRACTOR DASHBOARD                                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ FILTER BAR:                                             │
│ [System: All ▼] [Location: ▼] [Price: ▼] [Sort: ▼]    │
│                                                         │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                         │
│ SECTION 1: AVAILABLE LEADS (Job Board)                 │
│                                                         │
│ [Water Heater] [HVAC] [Solar] [All Systems]            │
│                                                         │
│ GRID VIEW (3 columns):                                  │
│                                                         │
│ ┌─────────────────┐ ┌─────────────────┐                │
│ │ 🔥 HVAC        │ │ ☀️  Solar       │                │
│ │ New York, NY   │ │ Los Angeles, CA │                │
│ │                │ │                 │                │
│ │ Current: Gas   │ │ Interested in   │                │
│ │ furnace        │ │ solar install   │                │
│ │ (15 yrs old)   │ │                 │                │
│ │                │ │ Est. Savings:   │                │
│ │ Est. Savings:  │ │ $1,200/yr       │                │
│ │ $800/yr        │ │ Est. Incentives:│                │
│ │ Est. Incentives│ │ $8,000          │                │
│ │ $0             │ │ ROI: 8 years    │                │
│ │ ROI: N/A       │ │                 │                │
│ │                │ │ Price: $75      │                │
│ │ Price: $50     │ │ Expires: 5 days │                │
│ │ Expires: 10 dy │ │                 │                │
│ │                │ │ [View Details]  │                │
│ │ [View Details] │ │ [Purchase]      │                │
│ │ [Purchase]     │ │                 │                │
│ └─────────────────┘ └─────────────────┘                │
│                                                         │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                         │
│ SECTION 2: MY PURCHASED LEADS                          │
│                                                         │
│ Stats Cards (4 cols):                                   │
│ │ Total Purchased │ In Progress │ Closed │ Conversion  │
│ │      47         │     12      │   23   │    49%      │
│                                                         │
│ Table: System | Address | Homeowner | Phone | Status   │
│ • HVAC | New York, NY | John Smith | ••••• | new       │
│ • Water Heater | Boston, MA | Jane Doe | ••••• | quoted │
│ • Solar | Denver, CO | Bob Johnson | ••••• | closed    │
│                                                         │
│ Status workflow: new → contacted → quoted → closed     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Key Features:**
- Browse leads by system type (tabs)
- Filter: Location, price range, urgency (expiration date)
- Purchase lead → Payment dialog → Get full contact info
- Track status progression: new → contacted → quoted → closed
- View LEAF report snippet (system-specific recommendations)
- See homeowner contact info (after purchase): Name, phone, email, address
- Mark lead as closed to track conversion rate
- Delete lead if no longer interested

**Data:** Available system leads (public), own purchased leads

---

### 3. Broker (Real Estate Agent)

**Purpose:** Request HES reports for properties they're selling

**Access Level:** Submit requests + view own request history

**Primary Tasks:**
- Submit HES request with property address + completion date
- Track HES request status (pending, assigned to REI, assigned to affiliate, completed)
- Download completed HES report when ready

**Dashboard Layout:**

```
┌─────────────────────────────────────────────────────────┐
│ BROKER DASHBOARD                                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌──────────────────────────────────────────────────┐   │
│ │ SUBMIT NEW HES REQUEST                           │   │
│ │                                                  │   │
│ │ Property Address: [________________]             │   │
│ │ City: [___________] State: [__] ZIP: [_____]    │   │
│ │ Property Type: [Single-Family ▼]                │   │
│ │ Requested Completion Date: [___/___/____]       │   │
│ │ Notes: [____________________________]            │   │
│ │                                                  │   │
│ │ [Submit Request]                                │   │
│ │                                                  │   │
│ │ "REI will complete this HES or assign to"        │   │
│ │ "a certified Home Energy Assessor"               │   │
│ └──────────────────────────────────────────────────┘   │
│                                                         │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                         │
│ MY REQUESTS (History):                                  │
│                                                         │
│ Filters: Status | Date Range                           │
│                                                         │
│ TABLE: Address | Req. Date | Status | Completion | Act │
│                                                         │
│ Status indicators:                                      │
│ • ⏳ Pending (REI reviewing)                           │
│ • 🏗️  Assigned to REI (in progress)                    │
│ • 👤 Assigned to Affiliate (professional handling)     │
│ • ✅ Completed (report ready)                          │
│                                                         │
│ New York, NY | 2026-02-20 | ✅ Completed | 2026-02-18 │
│ Boston, MA   | 2026-02-25 | 👤 Assigned  | —           │
│ Denver, CO   | 2026-03-10 | ⏳ Pending   | —           │
│                                                         │
│ [View] [Download Report] (for completed)               │
│                                                         │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                         │
│ CHART: Request Status Distribution (pie)               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Key Features:**
- Simple request submission form
- Track request status with clear indicators
- Download completed HES reports
- View when assigned to REI team vs. affiliate
- See completion dates

**Data:** Own HES requests only

---

### 4. HES Affiliate (Home Energy Assessor)

**Purpose:** Buy HES request leads and complete HES work

**Access Level:** Browse available leads + manage own work

**Primary Tasks:**
- Browse available HES leads posted for sale ($10 each)
- Purchase leads for properties they'll assess
- Complete HES work and upload report
- Track completion rate and performance

**Dashboard Layout:**

```
┌─────────────────────────────────────────────────────────┐
│ HES AFFILIATE DASHBOARD                                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                         │
│ SECTION 1: LEAD MARKETPLACE ($10 per lead)             │
│                                                         │
│ Header: "Buy HES Leads"                                 │
│ Total Available: 23 leads                               │
│                                                         │
│ Filters: Location [▼] Date [▼]                          │
│                                                         │
│ GRID VIEW (3 columns):                                  │
│                                                         │
│ ┌─────────────────┐ ┌─────────────────┐                │
│ │ New York, NY    │ │ Boston, MA      │                │
│ │ Req: Feb 25     │ │ Req: Mar 5      │                │
│ │ Single-Family   │ │ Multi-Family    │                │
│ │                 │ │                 │                │
│ │ Price: $10      │ │ Price: $10      │                │
│ │                 │ │                 │                │
│ │ [View Details]  │ │ [View Details]  │                │
│ │ [Purchase]      │ │ [Purchase]      │                │
│ └─────────────────┘ └─────────────────┘                │
│                                                         │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                         │
│ SECTION 2: MY PURCHASED LEADS & WORK                   │
│                                                         │
│ Stats Cards (4 cols):                                   │
│ │ Leads Purchased │ In Progress │ Completed │ Revenue  │
│ │      47         │     3       │    44     │  $470    │
│                                                         │
│ Table: Address | Purchased | Status | Actions          │
│                                                         │
│ Status workflow: purchased → in-progress → completed   │
│                                                         │
│ New York, NY | Feb 10 | ✅ Completed | [View]         │
│ Boston, MA   | Feb 15 | 🔄 In Progress | [Mark Done]  │
│ Denver, CO   | Feb 18 | 📋 Purchased | [Start Work]   │
│                                                         │
│ [View Details] [Mark Complete] [Upload Report]         │
│                                                         │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                         │
│ PERFORMANCE (Last 30 days):                             │
│                                                         │
│ Completion Rate: 94%                                    │
│ Avg. Completion Time: 4 days                            │
│ Report Quality Score: 4.8/5                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Key Features:**
- Browse available HES leads ($10 each)
- Filter by location, date
- Purchase → Get homeowner contact info + broker info
- Track completion status: purchased → in-progress → completed
- Mark as complete → Upload HES report
- View performance metrics
- Request deadline extension if needed

**Data:** Available HES leads (public) + own purchased leads

---

## Database Schema

### Core Tables

#### 1. system_leads
**Purpose:** Store contractor leads from homeowner system upgrade requests

```sql
system_leads
├── id (uuid, PK)
├── homeowner_id (uuid, FK to external leaf-diagnose-sim-2)
├── system_type (enum: water_heater, hvac, solar)
├── address (text)
├── city (text)
├── state (text)
├── zip (text)
├── homeowner_name (text, encrypted)
├── homeowner_phone (text, encrypted)
├── homeowner_email (text, encrypted)
├── best_contact_time (text)
├── leaf_report_data (jsonb)
│   ├── current_system_age
│   ├── current_system_efficiency
│   ├── estimated_savings_annual (numeric)
│   ├── estimated_incentives (numeric)
│   ├── roi_years (numeric)
│   ├── recommended_upgrades (array)
│   └── performance_data (jsonb)
├── price (numeric, default: system-dependent)
├── status (enum: available, purchased, expired, archived)
├── posted_date (timestamptz)
├── expiration_date (timestamptz)
├── purchased_by_contractor_id (uuid, FK to app_profiles, nullable)
├── purchased_date (timestamptz, nullable)
├── contacted_status (enum: new, contacted, quoted, closed, lost, default: new)
├── created_at (timestamptz)
├── updated_at (timestamptz)
└── deleted_at (timestamptz, soft delete)

Indexes:
- system_type (for filtering by HVAC, Solar, etc.)
- status (for marketplace queries)
- posted_date (for sorting)
- purchased_by_contractor_id (for contractor's leads)
- zip (for location-based filtering)
- expiration_date (for cleanup/alerts)

RLS Policies:
- Admins: Full read/write
- Contractors: Read available leads + own purchased leads only
- Brokers: No access
- HES Affiliates: No access
```

#### 2. hes_requests
**Purpose:** Store HES visit requests from brokers

```sql
hes_requests
├── id (uuid, PK)
├── broker_id (uuid, FK to app_profiles)
├── property_address (text)
├── city (text)
├── state (text)
├── zip (text)
├── property_type (enum: single_family, multi_family, commercial)
├── requested_completion_date (date)
├── notes (text)
├── status (enum: pending, assigned-internal, assigned-affiliate, completed, cancelled)
├── assigned_to_internal_user_id (uuid, FK to app_profiles, nullable)
├── assigned_to_affiliate_id (uuid, FK to app_profiles, nullable)
├── posted_for_sale_date (timestamptz, nullable)
├── purchased_by_affiliate_id (uuid, FK to app_profiles, nullable)
├── purchased_date (timestamptz, nullable)
├── completion_date (timestamptz, nullable)
├── hes_report_url (text, nullable)
├── price (numeric, default: 10.00)
├── created_at (timestamptz)
├── updated_at (timestamptz)
└── deleted_at (timestamptz, soft delete)

Indexes:
- broker_id (for broker's requests)
- status (for admin filtering)
- requested_completion_date
- assigned_to_affiliate_id (for affiliate's work)
- purchased_by_affiliate_id

RLS Policies:
- Admins: Full access
- Brokers: Read own requests only, can create new requests
- HES Affiliates: Read available (posted for sale) + own purchased
- Contractors: No access
```

#### 3. contractor_profiles
**Purpose:** Store contractor specializations and settings

```sql
contractor_profiles
├── id (uuid, PK, FK to app_profiles)
├── company_name (text)
├── system_specialties (array of enums: water_heater, hvac, solar)
├── service_radius_miles (integer)
├── service_zip_codes (array of text)
├── phone (text)
├── email (text)
├── website (text)
├── license_number (text)
├── insurance_verified (boolean)
├── stripe_customer_id (text, for payments)
├── created_at (timestamptz)
├── updated_at (timestamptz)

Indexes:
- system_specialties (for lead filtering)
- service_zip_codes (for location-based recommendations)
```

#### 4. contractor_lead_status
**Purpose:** Track contractor's interaction with each lead (new, contacted, quoted, closed, lost)

```sql
contractor_lead_status
├── id (uuid, PK)
├── contractor_id (uuid, FK to app_profiles)
├── system_lead_id (uuid, FK to system_leads)
├── status (enum: new, contacted, quoted, closed, lost)
├── notes (text)
├── quote_amount (numeric, nullable)
├── closed_date (timestamptz, nullable)
├── updated_at (timestamptz)

Indexes:
- contractor_id, system_lead_id (composite for lookups)
- status (for filtering)
```

#### 5. payments
**Purpose:** Record all lead purchases

```sql
payments
├── id (uuid, PK)
├── contractor_id (uuid, FK to app_profiles)
├── system_lead_id (uuid, FK to system_leads, nullable)
├── hes_request_id (uuid, FK to hes_requests, nullable)
├── amount (numeric)
├── system_type (text, for reference)
├── stripe_transaction_id (text)
├── status (enum: pending, completed, failed, refunded)
├── created_at (timestamptz)
├── refunded_date (timestamptz, nullable)

Indexes:
- contractor_id (for contractor history)
- created_at (for reporting)
```

---

## API Endpoints

### Admin Endpoints

#### System Leads
```
GET /api/v1/admin/system-leads
  Query params: status, system_type, date_range, sort
  Returns: Array of system_leads

POST /api/v1/admin/system-leads/[id]/post-for-sale
  Body: { price, expiration_date }
  Returns: Updated system_lead

POST /api/v1/admin/system-leads/[id]/assign-contractor
  Body: { contractor_id }
  Returns: Updated system_lead

GET /api/v1/admin/analytics
  Returns: { total_leads_posted, leads_sold, revenue_this_month, ... }
```

#### HES Requests
```
GET /api/v1/admin/hes-requests
  Query params: status, system_type
  Returns: Array of hes_requests

POST /api/v1/admin/hes-requests/[id]/assign-internal
  Body: { internal_user_id, completion_date }
  Returns: Updated hes_request

POST /api/v1/admin/hes-requests/[id]/post-for-sale
  Body: { price }
  Returns: Updated hes_request (status: available for purchase)
```

### Contractor Endpoints

#### Browse & Purchase Leads
```
GET /api/v1/contractor/system-leads
  Query params: system_type, location, price_min, price_max, sort
  Returns: Array of available system_leads

GET /api/v1/contractor/system-leads/[id]
  Returns: system_lead detail + full contact info (if purchased)

POST /api/v1/contractor/system-leads/[id]/purchase
  Body: {} (payment processed via Stripe)
  Returns: system_lead + homeowner contact details

GET /api/v1/contractor/my-leads
  Query params: status (new, contacted, quoted, closed, lost)
  Returns: Array of contractor's purchased leads

PATCH /api/v1/contractor/my-leads/[id]
  Body: { status, notes, quote_amount }
  Returns: Updated lead status

GET /api/v1/contractor/analytics
  Returns: { total_purchased, conversion_rate, system_breakdown }
```

### Broker Endpoints

#### HES Requests
```
POST /api/v1/broker/hes-requests
  Body: { property_address, city, state, zip, property_type, requested_completion_date, notes }
  Returns: Created hes_request

GET /api/v1/broker/hes-requests
  Returns: Array of broker's HES requests

GET /api/v1/broker/hes-requests/[id]
  Returns: hes_request detail + status + completion date (if available)

GET /api/v1/broker/hes-requests/[id]/download-report
  Returns: Download link to completed HES report
```

### HES Affiliate Endpoints

#### Lead Marketplace & Work Tracking
```
GET /api/v1/affiliate/hes-leads
  Query params: location, date_range
  Returns: Array of available hes_requests (posted for sale)

GET /api/v1/affiliate/hes-leads/[id]
  Returns: hes_request detail

POST /api/v1/affiliate/hes-leads/[id]/purchase
  Body: {} (payment via Stripe)
  Returns: hes_request + homeowner contact info

GET /api/v1/affiliate/my-work
  Query params: status (purchased, in-progress, completed)
  Returns: Array of affiliate's HES requests

PATCH /api/v1/affiliate/my-work/[id]
  Body: { status, notes }
  Returns: Updated hes_request

POST /api/v1/affiliate/my-work/[id]/upload-report
  Body: { report_file, report_data (jsonb) }
  Returns: Updated hes_request (status: completed)

GET /api/v1/affiliate/analytics
  Returns: { total_purchased, completion_rate, avg_completion_time, quality_score }
```

---

## Implementation Phases

### Phase 1: ✅ COMPLETE
- Code cleanup (remove dead code)
- Database schema + migrations
- API v1 endpoints
- Service layer

### Phase 2: 🚀 UPCOMING
**Dashboard Implementation (All 4 Dashboards)**

**Goal:** Build all 4 dashboards with full functionality

**Components to Build:**

1. **Admin Dashboard**
   - KPI cards (leads posted, sold, revenue)
   - System leads table (pending post/assign)
   - HES requests table
   - Charts: Revenue trend, lead sales by system
   - Post to Job Board dialog
   - Assign to Contractor dialog

2. **Contractor Dashboard**
   - Filter bar (system type, location, price, sort)
   - Available leads grid (3 columns, card-based)
   - Lead detail modal
   - Purchase flow (confirmation → payment → contact unlock)
   - My purchased leads table
   - Status tracking (new → contacted → quoted → closed)
   - Conversion analytics

3. **Broker Dashboard**
   - HES request submission form
   - My requests table with status indicators
   - Download report link (when completed)
   - Status legend and explanations

4. **HES Affiliate Dashboard**
   - Lead marketplace grid (available HES requests)
   - Purchase flow ($10 per lead)
   - My work table (in-progress, completed)
   - Mark complete → Upload report flow
   - Performance metrics (completion rate, avg time, quality)

**Shared Components:**
- DashboardHeader (greeting, user menu, notifications)
- StatCard (metric display with icon + trend)
- SystemLeadCard (grid view for leads)
- LeadDetailModal (full snapshot + contact info)
- StatusBadge (visual status indicator)
- SystemTypeIcon (water heater, HVAC, solar icons)
- PurchaseDialog (confirm + payment)

**Custom Hooks:**
- useSystemLeads() (fetch available leads with filters)
- useMyLeads() (fetch contractor's purchased leads)
- useHESRequests() (fetch HES requests)
- usePurchaseLead() (handle lead purchase + payment)
- useLeadStatus() (track and update lead status)

**Styling:**
- Dark theme (gray-900 background)
- Tailwind CSS responsive grid
- Heroicons for all icons
- Color scheme: green-500 (primary), amber-500 (warning), red-600 (danger)

**Data Fetching:**
- TanStack Query with stale-while-revalidate caching
- Loading skeletons for all data-dependent sections
- Error states with retry buttons
- Real-time updates for lead purchases (if using websockets)

---

### Phase 3: Payment Integration

**Goal:** Integrate Stripe for lead + HES request purchases

**Components:**
- Stripe payment form
- Payment confirmation
- Invoice/receipt generation
- Refund handling

---

### Phase 4: Notifications & Alerts

**Goal:** Real-time alerts and notifications

**Features:**
- New lead notifications (contractors)
- Lead expiration warnings (48 hrs before)
- Purchase notifications (admin sees sales)
- FOMO alerts (3 contractors bought HVAC leads today)

---

### Phase 5: Analytics & Reporting

**Goal:** Advanced analytics dashboards

**Features:**
- Revenue dashboards (by system, by contractor, by region)
- Contractor performance metrics
- Lead conversion funnel
- System popularity trends

---

## UI/UX Specifications

### Color Scheme
```
Primary (Actions): #22c55e (green-500)
Success: #16a34a (green-600)
Warning: #f59e0b (amber-500)
Danger: #dc2626 (red-600)
Background: #111827 (gray-900)
Surface: #1f2937 (gray-800)
Text: #f3f4f6 (gray-100)
Muted: #9ca3af (gray-400)
```

### Typography
```
Page Title: 32px, bold
Section Title: 24px, semibold
Card Title: 18px, semibold
Body: 14px, regular
Label: 12px, medium
Caption: 12px, regular
```

### Spacing
```
XS: 4px
S: 8px
M: 16px
L: 24px
XL: 32px
XXL: 48px
```

### Responsive Breakpoints
```
Mobile: < 640px
Tablet: 640px - 1024px
Desktop: > 1024px
```

### Components

#### Lead Card (Grid View)
```
Width: 100% (mobile), calc(50% - 12px) (tablet), calc(33% - 12px) (desktop)
Height: 320px

Header Section:
- System icon + label (HVAC, Solar, Water Heater)
- Address (city, state)

Content Section:
- Current system details (age, condition)
- Est. Savings (annual)
- Est. Incentives
- ROI (years)

Footer Section:
- Price ($X)
- Expiration countdown (X days left)
- [View Details] button
- [Purchase] button (green, prominent)
```

#### Status Badge
```
new:        ⭕ Gray
contacted:  🔵 Blue
quoted:     🟡 Amber
closed:     🟢 Green
lost:       ⚫ Red
completed:  ✅ Green
pending:    ⏳ Gray
in-progress:🔄 Blue
```

#### KPI Card
```
Icon (top-left)
Metric Name (top-right, small)
Large Number (center)
Trend indicator + percentage (bottom)
Optional: Sparkline chart
```

---

## Data Flows

### Flow 1: Admin Posts Lead to Job Board

```
Homeowner clicks "Get Estimate" (in leaf-diagnose-sim-2)
  ↓
LEAF report captures system interest
  ↓
System lead created in admin console (status: pending-post)
  ↓
Admin views in dashboard
  ↓
Admin clicks [Post for Sale]
  ↓
Dialog: Set price (\$50 for HVAC), expiration date (30 days)
  ↓
[Confirm] → Lead posted to job board
  ↓
Status changes to "available"
  ↓
Contractors see in their Job Board
  ↓
Contractor purchases → Payment processed
  ↓
Lead status: "purchased"
  ↓
Contractor gets homeowner contact info
  ↓
Contractor contacts homeowner
  ↓
Contractor marks status: contacted → quoted → closed
```

### Flow 2: Admin Assigns Lead Directly to Contractor

```
Same as above until admin clicks [Post for Sale]
  ↓
Admin clicks [Assign to Contractor]
  ↓
Dialog: Select contractor (filtered by specialization)
  ↓
[Assign] → Lead assigned directly
  ↓
Status: "assigned"
  ↓
Contractor can't purchase (already assigned)
  ↓
Contractor sees in "My Assigned Leads"
  ↓
Rest of flow same as above
```

### Flow 3: Broker Requests HES

```
Broker logs in
  ↓
Fills HES Request Form:
  - Property address
  - Requested completion date
  - Property type
  - Notes
  ↓
[Submit Request]
  ↓
Status: "pending"
  ↓
Admin views HES requests
  ↓
Admin decides: Assign to internal team OR post for sale
  ↓
If assign to internal:
  - Status: "assigned-internal"
  - REI service team completes HES
  
If post for sale (\$10):
  - Status: "available"
  - HES Affiliates see in marketplace
  ↓
If posted: Affiliate purchases
  ↓
Status: "assigned-affiliate"
  ↓
Affiliate completes work + uploads report
  ↓
Status: "completed"
  ↓
Broker can download report
```

### Flow 4: Contractor Purchases Lead

```
Contractor browses available leads
  ↓
Filters: System type (HVAC), Location (New York), Price (\$20-75)
  ↓
Sees 12 available HVAC leads
  ↓
Clicks lead card
  ↓
Lead Detail Modal shows:
  - Full address
  - Current system (age, condition)
  - Est. savings/incentives/ROI
  - Homeowner contact (hidden until purchase)
  - Broker name (if applicable)
  ↓
[Purchase for \$50]
  ↓
Payment dialog: Confirm lead, price, total
  ↓
Stripe payment form
  ↓
[Pay \$50] → Payment processed
  ↓
Lead status: "purchased"
  ↓
Modal updates: Shows homeowner contact info
  ↓
Contractor added to contractor_lead_status table (status: new)
  ↓
Contractor calls/emails homeowner
  ↓
Updates status: new → contacted → quoted → closed
```

---

## Technical Stack

### Frontend
- **Framework:** Next.js 16+ (App Router)
- **UI:** React 19
- **Styling:** Tailwind CSS 3.4
- **Data Fetching:** TanStack Query v5
- **State Management:** React hooks + Context
- **Icons:** Heroicons
- **Charts:** Recharts
- **Forms:** React Hook Form + Zod validation
- **Payment:** Stripe.js
- **Auth:** Supabase Auth (sessions)

### Backend
- **Framework:** Next.js 16 (API routes)
- **Database:** Supabase (PostgreSQL)
- **ORM:** None (raw SQL via Supabase client)
- **Auth:** Supabase RLS policies
- **File Storage:** Supabase Storage
- **Payment Processing:** Stripe
- **Environment:** Node.js 20+

### Database
- **Provider:** Supabase (PostgreSQL)
- **Security:** Row-Level Security (RLS) policies
- **Migrations:** Versioned SQL files in supabase/migrations/
- **Backups:** Automatic (Supabase)

---

## Summary

This admin console is a **B2B SaaS lead marketplace** where:

1. **Homeowners** (in leaf-diagnose-sim-2) generate leads by requesting system estimates
2. **REI Admin** monetizes leads by posting to job board or assigning to contractors
3. **Contractors** buy system-specific leads (Water Heater, HVAC, Solar) to build their business
4. **Brokers** request HES reports for property transactions
5. **HES Affiliates** buy affordable HES leads (\$10) to complete assessments

**Revenue Model:**
- Lead sales: \$20-150 per lead (system-dependent)
- HES requests: \$10 per lead sold to affiliates
- Future: LEAF reports at \$19 per homeowner

**Next Step:** Implement Phase 2 (all dashboards) using this spec.

