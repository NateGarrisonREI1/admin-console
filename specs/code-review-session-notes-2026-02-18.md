# REI Admin Console — Code Review Session Notes
## Date: February 18, 2026
## Participants: Nate Garrison (CEO) & Alan Moore (Partner)
## Duration: ~1.5 hours via video call

---

## Context

After completing Phases 1–7 and the Brokers page overhaul, Nate walked Alan through the full admin console, broker console, and contractor console live on localhost. Alan provided hands-on feedback while navigating the app. This document captures every technical change, structural issue, and product decision identified during that session.

These items supplement the Phase 8A–9 roadmap. The primary goal remains: get in-house ops connected to the LEAF report so REI can start generating and selling leads. These fixes get folded in alongside that work, not as a blocker.

---

## CRITICAL — Company vs. Contacts Data Model

**Source:** Alan's core feedback — contractors are companies, not individual users.

Alan's example: "I want to sign up OCT. I want to put OCT on here — their service areas, what they do, HVAC, etc. But I don't know who from OCT is going to be the contact. I might want to add six contacts to that company."

**The Problem:** The platform currently treats contractors as individual users. Leads assign to a user, not a company. When Alan clicks "Add Contractor," it asks for a person — but he wants to create a company first and add people to it later.

**What Alan wants:**
1. "Add Contractor" becomes "Create Company" — company name, type, service areas, insurance/bond upload. No contact required at this step. ("What if I want to lock in OCT but I don't know who the contact is yet?")
2. Separate "Add Contact/User" flow — name, email, phone, **title** (Alan stressed title is important), and a dropdown to select which company they belong to (pulls from Supabase companies table).
3. Leads assign to the company, not a person. When a lead is assigned to OCT, then Tristan, Adam, Jason, and their sales guy all get notified. The company distributes internally.

**Database Changes Needed:**

**companies table**
- id (uuid, pk)
- name (text)
- type (contractor | broker | inspector | assessor | internal)
- service_areas (text[] or join table)
- insurance_doc_url (text)
- created_at

**company_users table**
- id (uuid, pk)
- company_id (fk → companies.id)
- name, email, phone
- title (NEW — Alan specifically requested this)
- role (owner | admin | staff)
- created_at

**When to do it:** Before onboarding real contractors. This is a foundation rewrite — needs careful sequencing with LEAF integration. Do it before scaling to 20-30 contractors, but don't let it block LEAF connection.

---

## Marketplace UX — Click Behavior & Side Panels

**Source:** Alan clicking through the marketplace, frustrated by the dropdown expansion and edit-mode behavior.

**Current problem:** Clicking a lead row puts you in edit mode. The kebab menu has View Details, Edit Lead, Mark Expired, Delete Lead. Alan wants a cleaner flow.

**What Alan wants:**
- Click the lead row → opens a detail view (NOT edit mode)
- Within the detail view, an Edit button next to the close X — click that to enter edit mode
- Kebab menu keeps: Mark Expired, Delete Lead (remove Edit from kebab since it's inside the detail view now)
- Same actions available at the bottom of the detail view (Edit, Mark Expired, Delete, Close)

**Side panel vs. dropdown vs. full page:**

This was a significant discussion. Alan and Nate agreed on a consistent view pattern:

| Trigger | Behavior | Example |
|---------|----------|---------|
| **Buttons** (Add Team Member, Schedule Service, Post Lead) | **Modal popup** — centered overlay | "This is a temporary screen. You're adding something and then you're done." |
| **List row click** (leads, jobs, schedules) | **Right side panel** — 33% width | "I still want visibility of my whole list while I'm looking at the detail." |
| **Full profiles** (team member, broker, company) | **Full page** — dedicated route | "There's so much going on. Good luck fitting that on a side panel." |

Alan's reasoning for side panels on list views: "The side panel is like the closest you can get to having two monitors on one monitor. I can toggle through multiple jobs and it's changing right before my eyes. With the dropdown, I'm scrolling back around to get to it."

**Applies to:** Admin Marketplace, Admin Schedule, Lead lists, Job lists.

**Build:** Reusable `SidePanel.tsx` component — fixed right-0, width 33%, full height, border-left, bg-slate-900. Props: isOpen, onClose, children.

---

## Multi-Select Filters

**Source:** Alan looking at the marketplace filters — "These should be a select all that apply box where I can choose Beaverton, Clackamas, Gresham. I can choose like three or four at a time."

**Current problem:** All filters are single-select. You can see Beaverton or All, but not Beaverton AND Clackamas.

**Alan's exact request:** "It should still have the All option, but then I should also be able to click multiples."

**Apply to all filter dropdowns:**
- Service area
- Broker
- Status ("I might want to get rid of sold and expired but see everything else")
- Lead/service type ("Be cool if I could do HVAC and Water Heater together")

**Build:** `MultiSelect.tsx` component with checkbox UI. Query logic: `WHERE field IN (...)`.

---

## Hide/Show Filter Toggle

**Source:** Alan — "Being able to hide this filter section because it can crowd things."

Add a "Hide Filters" / "Show Filters" toggle button above filter bars. Simple state toggle. Applies across Marketplace, Schedule, Leads pages.

---

## Collapsible List Sections

**Source:** Alan showed his own project with collapsible milestone sections as an example. "I like to be able to hide things if I want."

Add expand/collapse toggles to list sections (Leads, Revenue by Service Type, Recent Transactions, etc.). Arrow indicator: ▼ expanded, ▲ collapsed.

---

## Schedule Page Issues

### Activity Logs
**Source:** Alan looking at a rescheduled job — "There's no indication whether it's the first time, the second time. An activity board especially for something like a job that could be somewhat ongoing would be really good to see."

**Build:** `job_activity_logs` table tracking: job created, rescheduled, status changed, assigned contractor changed, cancelled, completed. Display as a timeline in the job side panel.

### Archive Function
**Source:** Alan — "Cancelling just grays it out. There's no way to delete it. We should just archive if we have old ones. The status should become archived."

Add `archived` as a job status. "Archive Job" for old/completed jobs. "Delete Job" as a separate danger action (last resort). Archive replaces cancel for historical jobs.

### Job Status Cleanup
**Source:** Alan testing status transitions — "Your statuses don't match up. You have pending up here but no pending option. You don't have a rescheduled status. You can't complete it without putting it in progress first."

Ensure these statuses exist with proper transitions:
- pending → scheduled → rescheduled → in_progress → completed → archived
- Any state → cancelled
- Any state → archived

### Schedule Service Card Bug
**Source:** Nate — "I hate how when you click out of the schedule service card, it deletes everything you put in there. Totally horrible."

Fix: Prevent form reset on blur/outside click.

---

## Pricing Tab Colors

**Source:** Nate — "It's all purple. It's kind of weird. I don't like it."

Replace purple styling in the pricing/schedule service UI with the standard brand system: bg-emerald-500, hover:bg-emerald-600, border-emerald-400/60.

---

## Lead Post Assignment Fix

**Source:** Alan — "Where does this contractor pull from? It must be just pulling from contact users." Nate confirmed it pulls from users.

Alan's fix: "It'd be nice if it pulled the company and then assigned it to every contact within that company."

Once the companies table exists, manual lead post should pull from companies, not users:
```sql
SELECT id, name FROM companies WHERE type = 'contractor'
```

---

## Strategic Decisions Discussed (Not Technical — For Reference)

### Broker Business Model Alignment
Alan and Nate aligned that brokers are the primary distribution channel. Brokers get the platform free, sell leads from LEAF reports to their contractor network, and REI takes 30% (potentially lower — Nate said he'd go to 80/20 or whatever makes it work). The broker's incentive: they make money from leads generated by their homeowners clicking "Get Estimate" on LEAF reports.

Key Nate quote: "I'd rather have 30% of something that's worth a billion dollars than try to roll this thing out locally and get a bunch of brokers that are pissed off at us because we're the only ones making money in a slow market."

### "Hire Now" vs. "Sell Lead" — Two Different Broker Needs
Alan identified that brokers need two distinct flows:
1. **Hire Now** — scheduling inspectors, HES providers, photographers directly. Fixed price, no lead selling. "They don't want to go through the whole lead thing. They just want to hire someone now."
2. **Sell Lead** — homeowner-generated leads from LEAF reports that go to the broker's contractor network for purchase.

These are different UX paths and should be treated separately in the broker console.

### Open Network vs. My Network
Alan suggested: when Broker A onboards a contractor, that contractor joins the broader REI network. Broker B can then find that contractor without onboarding them separately. Brokers would have "My Network" (preferred vendors) and access to the "Open Network" (all REI contractors in their area).

Alan's example: "A new broker who doesn't have a plumber — they can pull from our vendor list of already vetted contractors."

### Don't Taint REI's Name Before Product Launch
Alan's concern: "Every call we make now gets into someone's mind that REI is a HES provider. Then when we call them in a month with this totally different thing, they're screening the call."

Both agreed: don't run a phone campaign positioning REI as just an HES provider before the platform is ready. Wait until it's presentable and functional, then approach brokers with the full value proposition.

Nate: "I'd almost rather Braden sit for another month and not work than to ruin 100 prospects."

### Inspectors & HES Providers Don't Need Incentivizing
Alan: "I don't think the inspector needs incentivized. I don't think even the HES providers need incentivized because we're giving them this ecosystem where they're getting hired. That's what they're after."

The value to service providers is simply getting work through the platform. No revenue share needed for them.

### LEAF Connection is Still Priority #1
Nate confirmed: "The only thing that's not working is that we haven't interconnected the two repositories to communicate. The LEAF report works, in-house operations are done."

Rev 1 goal: Braden does HES → LEAF report is generated → homeowner clicks Get Estimate → lead is created → contractor buys lead. That loop needs to close before anything else rolls out.

---

## Implementation Order

**Quick wins (do anytime, low risk):**
1. Reusable side panel component
2. Marketplace — click row opens side panel, not edit mode
3. Multi-select filters
4. Hide/show filter toggle
5. Collapsible sections
6. Pricing tab color fix
7. Schedule card form bug fix
8. Archive function for jobs
9. Job status cleanup

**Medium effort (do alongside LEAF work):**
10. Schedule activity logs
11. View pattern standardization across all pages

**Heavy lift (do before onboarding real contractors):**
12. Company vs. contacts database refactor
13. Lead assignment → company
14. Company profile pages (`/admin/companies/[id]`)
15. Lead post assignment pulls from companies

**Product decisions (need further Nate + Alan discussion):**
16. Broker "Hire Now" vs. "Sell Lead" flow separation
17. Open Network vs. My Network for contractors
18. Broker onboarding flow and setup fee structure
19. Go-to-market timing — when to start broker outreach

---

## Reminder

Phase 8A (LEAF ↔ Admin Console interlink) is still the #1 priority — that's what turns this from a demo into a live revenue-generating platform. These items get folded in where they make sense. As Nate said: "My focus is get in-house ops done. The LEAF report works, in-house operations are done. That way when Braden is ready to go, we know every customer is getting a LEAF report."
