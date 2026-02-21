# REI Broker Dashboard Redesign
## specs/BROKER_DASHBOARD_SPEC.md
## February 21, 2026

---

## Philosophy

Dead simple. A broker logs in, sees what matters, takes action, gets out. Every page has ONE clear purpose. No feature bloat.

During REI's launch phase (first 90 days), ALL new service requests from brokers route to REI's in-house team. This creates in-house HES work, proves the model, and gives brokers the best possible first experience. The "New Request" button links directly to the intake form we already built, pre-filled with broker info.

---

## Broker Sidebar

```
┌──────────────────────────┐
│  🌿 REI Broker Portal    │
│  ● Marcus Webb           │
│                          │
│  OVERVIEW                │
│    Dashboard             │
│    Schedule              │
│                          │
│  PROJECTS                │
│    My Projects           │
│                          │
│  MARKETPLACE             │
│    Lead Board            │
│                          │
│  NETWORK                 │
│    My Team               │
│                          │
│  TOOLS                   │
│    Campaigns             │
│    Contacts              │
│                          │
│  ──────────────────────  │
│    Settings              │
│                          │
│                          │
│                          │
│  [+ New Request]         │  ← persistent CTA at bottom
└──────────────────────────┘
```

**7 pages total.** Clean, no sub-menus. The [+ New Request] button is always visible at the bottom of the sidebar — it opens the /request intake form in broker mode.

---

## Page 1: Dashboard

The home page. KPIs, urgent tasks, quick stats.

```
┌──────────────────────────────────────────────────────────────┐
│  Dashboard                                  [+ New Request]  │
│                                                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────┐│
│  │ ACTIVE JOBS │ │ PENDING     │ │ LEADS THIS  │ │ REVENUE││
│  │     4       │ │     2       │ │ MONTH: 8    │ │ $1,240 ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────┘│
│                                                              │
│  ── URGENT TASKS ────────────────────────────────────────    │
│                                                              │
│  ⚠️ HES report ready for 1205 NW 23rd — Send LEAF           │
│  ⚠️ Out-of-network job needs delivery — 8829 SE Division     │
│  📋 New lead from LEAF: Sarah Chen wants HES — Follow up     │
│  📋 Invoice pending: $150 for 3344 NE Broadway               │
│                                                              │
│  ── RECENT ACTIVITY ─────────────────────────────────────    │
│                                                              │
│  Today    HES delivered to homeowner at 1205 NW 23rd         │
│  Today    Nate Garrison assigned to 5521 SE Hawthorne        │
│  Yesterday  Payment received: $150 from John Smith           │
│  Yesterday  LEAF engagement: 3 views on 8829 SE Division     │
│                                                              │
│  ── QUICK STATS ─────────────────────────────────────────    │
│                                                              │
│  This Month          │  Network Health                       │
│  Jobs ordered: 6     │  In-network: 4 providers              │
│  Jobs completed: 4   │  Network score: 75%                   │
│  LEAF sent: 5        │  Lead kickbacks: $180                  │
│  Leads generated: 3  │                                        │
└──────────────────────────────────────────────────────────────┘
```

### KPI Cards
- **Active Jobs** — jobs in progress (scheduled through report_ready)
- **Pending** — jobs awaiting confirmation or delivery
- **Leads This Month** — LEAF CTA clicks + inbound from campaigns
- **Revenue** — kickbacks + commissions this month

### Urgent Tasks
Auto-generated from job data:
- Out-of-network jobs needing delivery (`status = 'pending_delivery'`)
- Reports ready but not delivered
- New leads needing follow-up
- Unpaid invoices
- Expiring invites

Each task is clickable → navigates to the relevant page/job.

### Recent Activity
Last 10 activities across all broker's jobs. Pulled from job_activity_log where broker_id matches.

---

## Page 2: Schedule

The broker's view of all their service requests and their current status. Same concept as admin schedule but broker-scoped and read-only for in-network jobs.

```
┌──────────────────────────────────────────────────────────────┐
│  Schedule                                   [+ New Request]  │
│                                                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ IN PROGRESS │ │ COMPLETED   │ │ ALL TIME    │           │
│  │     3       │ │     12      │ │     18      │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                              │
│  [All] [In Progress] [Completed] [Pending Delivery]          │
│                                                              │
│  Search: [_________________________]                         │
│                                                              │
│  DATE      ADDRESS              SERVICE  ASSESSOR   STATUS   │
│  ────────────────────────────────────────────────────────    │
│  02/23/26  1205 NW 23rd Ave     HES     Nate G.  ✅ On Site │
│            ✅ IN-NETWORK                          ●●●●○○○   │
│                                                              │
│  02/25/26  8829 SE Division     HES     Joe's    ⚠️ Pending │
│            ⚠️ OUT-OF-NETWORK                      Delivery  │
│            [Deliver Reports]                                 │
│                                                              │
│  02/22/26  3344 NE Broadway     HES     Nate G.  ✅ Delivered│
│            ✅ IN-NETWORK                          ●●●●●●●   │
│                                                              │
│  02/20/26  5521 SE Hawthorne    HES     Sarah K. 🟡 Self-   │
│            🟡 SELF-MANAGED                        Managed    │
│            LEAF: 3 views, 1 CTA                              │
└──────────────────────────────────────────────────────────────┘
```

### Key Features
- Filter tabs: All / In Progress / Completed / Pending Delivery
- Each row shows network status badge (in-network / out-of-network / self-managed)
- In-network jobs show the progress bar (same StatusProgressBar component from admin)
- Out-of-network jobs show "Deliver Reports" button → opens BrokerDeliveryPanel
- Click any row → side panel with job details (read-only for in-network, delivery panel for out-of-network)
- [+ New Request] in header → opens /request in broker mode

---

## Page 3: My Projects

Project-based view. Each "project" is a property/transaction the broker is working on. A project can have multiple services (HES, inspection, LEAF).

```
┌──────────────────────────────────────────────────────────────┐
│  My Projects                                [+ New Project]  │
│                                                              │
│  [Active] [Completed] [All]                                  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 📍 1205 NW 23rd Ave, Portland, OR                      │  │
│  │ Homeowner: Sarah Chen                                  │  │
│  │                                                        │  │
│  │ Services:                                              │  │
│  │ ✅ HES Assessment — Delivered (02/22/26)               │  │
│  │ ⏳ Home Inspection — Scheduled (02/28/26)              │  │
│  │                                                        │  │
│  │ LEAF: ✅ Sent | Leads: 3 views, 1 CTA click           │  │
│  │ [View Details]  [Order Another Service]                │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 📍 8829 SE Division, Portland, OR                      │  │
│  │ Homeowner: John Smith                                  │  │
│  │                                                        │  │
│  │ Services:                                              │  │
│  │ ⚠️ HES Assessment — Pending Delivery (out-of-network)  │  │
│  │                                                        │  │
│  │ LEAF: Not sent | [Deliver Reports]                     │  │
│  │ [View Details]                                         │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 📍 3344 NE Broadway, Portland, OR                      │  │
│  │ Homeowner: Mike Johnson                                │  │
│  │                                                        │  │
│  │ Services:                                              │  │
│  │ ✅ HES Assessment — Delivered (02/18/26)               │  │
│  │ ✅ Home Inspection — Delivered (02/19/26)              │  │
│  │                                                        │  │
│  │ LEAF: ✅ Sent | Leads: 8 views, 2 CTA clicks          │  │
│  │ [View Details]  [Download Reports]                     │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### What is a "Project"?
A project is grouped by property address. All jobs for the same address belong to the same project. This gives the broker a per-property view of everything that's happened.

### [+ New Project]
Opens a simple form:
1. Property address
2. Homeowner info (name, email, phone)
3. What services do you need? (checkboxes: HES Assessment, Home Inspection)
4. Submit → routes to /request intake form pre-filled with this info in broker mode

This funnels directly to REI's in-house team.

---

## Page 4: Lead Board (Marketplace)

Active leads generated from LEAF engagement and campaigns. The broker's sales pipeline.

```
┌──────────────────────────────────────────────────────────────┐
│  Lead Board                                                  │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ NEW      │ │ CONTACTED│ │ QUALIFIED│ │ CONVERTED│       │
│  │   5      │ │    3     │ │    2     │ │    1     │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                              │
│  ── NEW LEADS ───────────────────────────────────────────    │
│                                                              │
│  Sarah Chen — clicked "Get HES" from LEAF                    │
│  Source: LEAF report (1205 NW 23rd)                          │
│  02/21/26 | [Contact] [Mark Qualified] [Dismiss]             │
│                                                              │
│  Mike Adams — clicked "Get HES" from campaign email          │
│  Source: Broker campaign (February blast)                     │
│  02/20/26 | [Contact] [Mark Qualified] [Dismiss]             │
│                                                              │
│  ── CONTACTED ───────────────────────────────────────────    │
│                                                              │
│  John Smith — followed up via email 02/19                    │
│  Source: LEAF report (8829 SE Division)                       │
│  [Mark Qualified] [Mark Lost]                                │
│                                                              │
│  ── CONVERTED ───────────────────────────────────────────    │
│                                                              │
│  Lisa Park — booked HES assessment ($150)                    │
│  Source: Campaign | Kickback: $7.50 ✅                       │
└──────────────────────────────────────────────────────────────┘
```

### Lead Sources
- LEAF CTA clicks (from delivered LEAF reports)
- Campaign email engagement
- Referral links

### Lead Statuses
`new` → `contacted` → `qualified` → `converted` | `lost`

Broker manually moves leads through the pipeline.

---

## Page 5: My Team (Network)

The broker's HES providers. Toggle between in-network and out-of-network.

```
┌──────────────────────────────────────────────────────────────┐
│  My Team                                [Invite Provider]    │
│                                                              │
│  [In-Network ✅]  [Out-of-Network ⚠️]  [Pending Invites]    │
│                                                              │
│  ── IN-NETWORK (3) ─────────────────────────────────────     │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Nate Garrison — REI Certified                          │  │
│  │ ⭐ Preferred provider                                   │  │
│  │ Jobs together: 12 | Avg turnaround: 1.5 days           │  │
│  │ LEAF deliveries: 10 | Leads generated: 4               │  │
│  │ [View Profile] [Set as Preferred]                      │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Sarah Kim — REI Network Member                         │  │
│  │ Jobs together: 3 | Avg turnaround: 2 days              │  │
│  │ LEAF deliveries: 3 | Leads generated: 1                │  │
│  │ [View Profile] [Set as Preferred]                      │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ── OUT-OF-NETWORK (2) ─────────────────────────────────     │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Joe's Energy Services                                  │  │
│  │ ⚠️ Not in REI network — you handle LEAF delivery       │  │
│  │ Jobs: 3 | No LEAF tracking | No auto-delivery          │  │
│  │ [Invite to Network →]                                  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ── PENDING INVITES (1) ────────────────────────────────     │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Mike's HES — invited 02/18/26                          │  │
│  │ Status: Sent (not yet opened)                          │  │
│  │ [Resend Invite] [Cancel]                               │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ── NETWORK SCORE ──────────────────────────────────────     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━ 75%                               │
│  75% of your jobs use in-network providers                   │
│  💡 Invite your remaining providers to save time             │
└──────────────────────────────────────────────────────────────┘
```

---

## Page 6: Campaigns (under TOOLS)

Existing campaign email functionality — send LEAF blasts to contacts.

```
┌──────────────────────────────────────────────────────────────┐
│  Campaigns                              [+ New Campaign]     │
│                                                              │
│  ── ACTIVE CAMPAIGNS ───────────────────────────────────     │
│                                                              │
│  February LEAF Blast                                         │
│  Sent: 02/15/26 | Recipients: 45 | Opens: 28 | Clicks: 8   │
│  [View Results]                                              │
│                                                              │
│  January New Year Promo                                      │
│  Sent: 01/05/26 | Recipients: 52 | Opens: 31 | Clicks: 12  │
│  [View Results]                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Page 7: Contacts (under TOOLS)

Broker's contact list for campaigns and lead tracking.

```
┌──────────────────────────────────────────────────────────────┐
│  Contacts                     [+ Add Contact] [Import CSV]   │
│                                                              │
│  Search: [_________________________]                         │
│                                                              │
│  NAME           EMAIL              PHONE        SOURCE       │
│  ──────────────────────────────────────────────────────      │
│  Sarah Chen     sarah@email.com   503-555-1234  LEAF Lead    │
│  John Smith     john@email.com    503-555-5678  Campaign     │
│  Lisa Park      lisa@email.com    971-555-9012  Referral     │
└──────────────────────────────────────────────────────────────┘
```

---

## Settings Page

Broker profile, brokerage info, logos, payment preferences.

```
┌──────────────────────────────────────────────────────────────┐
│  Settings                                                    │
│                                                              │
│  ── PROFILE ─────────────────────────────────────────────    │
│  Name: [Marcus Webb]                                         │
│  Email: [marcus@kwrealty.com]                                │
│  Phone: [503-555-1234]                                       │
│  RMLS ID: [12345]                                            │
│                                                              │
│  ── BROKERAGE ───────────────────────────────────────────    │
│  Company: [Keller Williams Realty]                            │
│  Logo: [Upload] (used on co-branded reports)                 │
│  Website: [https://kwrealty.com]                             │
│                                                              │
│  ── PAYMENT ─────────────────────────────────────────────    │
│  Default payment: Broker pays                                │
│  Saved card: Visa ending 4242 [Update]                       │
│                                                              │
│  ── NOTIFICATIONS ───────────────────────────────────────    │
│  ☑ Email updates for job status changes                      │
│  ☑ Email when reports are delivered                          │
│  ☐ SMS notifications                                         │
│  ☑ Weekly summary email                                      │
│                                                              │
│  [Save Changes]                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## The [+ New Request] Flow

This is the most important button in the broker portal. It's persistent in the sidebar AND in the header of Dashboard, Schedule, and Projects pages.

**What happens when clicked:**

1. Opens the /request intake form in broker mode
2. Broker info is pre-filled (name, email, phone, company)
3. Broker fills in: property address, homeowner info, service type, home size, payment preference
4. On submit: creates a `pending` job assigned to REI (in-house)
5. Job appears on broker's Schedule page immediately
6. Broker gets confirmation email
7. REI admin sees it on their schedule with Broker badge

**Why this matters for launch:** Every [+ New Request] click = in-house REI work. The intake form routes to REI by default. No option to use an external provider from this flow. If the broker wants to use their own HES guy, they use "Log Out-of-Network Job" from the Schedule page — which is a secondary, less prominent action.

---

## Routing to REI (Launch Strategy)

During the first 90 days:
- [+ New Request] → routes to REI in-house team (default, prominent)
- "Log Out-of-Network Job" → available but secondary (on Schedule page)
- No option to select an external provider during new request flow
- Cross-sell prompts after every completed job: "Need an inspection too?"

After network opens:
- [+ New Request] → shows preferred in-network providers
- REI remains the default if no preferred provider set
- Broker can select from their in-network team
- Out-of-network logging remains available

---

## Implementation Priority

### Phase 1: Sidebar + Layout (foundation)
1. Broker layout with sidebar navigation
2. Route structure: /broker/dashboard, /broker/schedule, /broker/projects, /broker/leads, /broker/team, /broker/campaigns, /broker/contacts, /broker/settings
3. [+ New Request] button in sidebar → links to /request?role=broker with pre-filled broker info

### Phase 2: Dashboard
4. KPI cards with real data from broker's jobs
5. Urgent tasks list (auto-generated from job statuses)
6. Recent activity feed from job_activity_log

### Phase 3: Schedule
7. Broker's jobs table with network status badges
8. Filter tabs: All / In Progress / Completed / Pending Delivery
9. Click row → side panel (read-only for in-network, delivery panel for out-of-network)
10. StatusProgressBar on in-network jobs

### Phase 4: Projects
11. Group jobs by property address
12. Project cards with service status
13. [+ New Project] → /request in broker mode with address pre-fill

### Phase 5: Team + Lead Board
14. My Team page with in-network / out-of-network toggle
15. Invite provider flow
16. Lead Board with pipeline stages (new → contacted → qualified → converted)

### Phase 6: Tools + Settings
17. Campaigns (existing functionality, moved to tools)
18. Contacts (existing functionality, moved to tools)
19. Settings (profile, brokerage, logo, payment, notifications)

---

## CLI Commands

### Command 1: Broker Layout + Sidebar
```
claude "Read specs/BROKER_DASHBOARD_SPEC.md. Rebuild the broker portal layout and sidebar. Create a new broker layout at src/app/(app)/broker/layout.tsx (or update existing). The sidebar should match the admin sidebar styling (dark theme) but with broker-specific navigation:

OVERVIEW section: Dashboard, Schedule
PROJECTS section: My Projects
MARKETPLACE section: Lead Board
NETWORK section: My Team
TOOLS section: Campaigns, Contacts
Bottom: Settings link + [+ New Request] button

The [+ New Request] button should be persistent at the bottom of the sidebar, styled as a prominent green CTA. It links to /request?role=broker (the existing intake form).

Create placeholder page files for any routes that don't exist yet:
- /broker/dashboard (may exist, update if so)
- /broker/schedule (broker's jobs view)
- /broker/projects (project cards)
- /broker/leads (lead board)
- /broker/team (my providers)
- /broker/campaigns (move existing campaign page here if it exists)
- /broker/contacts (contact list)
- /broker/settings (profile/brokerage)

Each placeholder should have the page title and 'Coming soon' until we build them out. The layout and sidebar are the priority. Clean dark theme matching admin.

Verify TypeScript compiles with npx tsc --noEmit."
```

### Command 2: Broker Dashboard Page
```
claude "Read specs/BROKER_DASHBOARD_SPEC.md. Build the broker dashboard page at /broker/dashboard.

KPI Cards (top row):
- Active Jobs: count of broker's jobs with status in (scheduled, en_route, on_site, field_complete, report_ready, pending_delivery)
- Pending: count with status in (pending, pending_delivery)
- Leads This Month: count from leaf_cta_events where originating_broker_id matches and created_at is this month
- Revenue: sum of broker_kickbacks where status = 'paid' and created_at is this month (if table exists, otherwise show $0)

Urgent Tasks (auto-generated):
- Jobs with status 'pending_delivery' → 'Out-of-network job needs delivery — [address]'
- Jobs with status 'report_ready' → 'Report ready — [address]'
- New leads from leaf_cta_events in last 7 days → 'New lead: [name] wants HES'
Query from hes_schedule and inspector_schedule where broker_id matches. Each task is a clickable link.

Recent Activity:
- Pull from job_activity_log where the job's broker_id matches. Show last 10. Format: relative time + description.

Quick Stats section:
- Jobs ordered / completed / LEAF sent this month
- Network health: count of in-network vs out-of-network providers

Fetch all data server-side. Dark theme matching admin dashboard."
```

### Command 3: Broker Schedule Page
```
claude "Read specs/BROKER_DASHBOARD_SPEC.md. Build the broker schedule page at /broker/schedule.

This is the broker's view of all their service requests. Fetch all jobs from hes_schedule and inspector_schedule where broker_id matches the current user's broker record.

Top: 3 KPI cards (In Progress, Completed, All Time counts)

Filter tabs: All | In Progress | Completed | Pending Delivery

Jobs table with columns: Date, Address, Service Type, Assessor, Network Status, Job Status

Each row shows:
- Network badge: green 'IN-NETWORK' / amber 'OUT-OF-NETWORK' / yellow 'SELF-MANAGED'
- For in-network jobs: StatusProgressBar component showing current stage
- For out-of-network pending_delivery: 'Deliver Reports' button that expands BrokerDeliveryPanel inline
- For delivered self-managed: LEAF stats (views, CTA clicks)

Click a row → expand detail panel (right side or drawer):
- In-network: read-only job details, status timeline, assigned assessor, payment status, download reports when delivered
- Out-of-network: BrokerDeliveryPanel (upload PDF, send LEAF)

Include 'Log Out-of-Network Job' button in the header (secondary style, not as prominent as + New Request).

Dark theme. Reuse table patterns from admin SchedulePageClient."
```
