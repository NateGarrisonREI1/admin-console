# Admin Lead Marketplace — Build Spec

## Overview

Super admin view of every lead on the platform. Think of it as the exchange floor — all leads, all brokers, all contractors, full revenue visibility. This also fixes the admin preview of the contractor job board.

## COMMAND 1: Fix Admin Job Board Preview + Create Marketplace Page Shell

```
claude -y "Two tasks:

TASK A: Fix admin preview of contractor Job Board.
When admin views /contractor/job-board, leads show as 0 because the query filters by contractor service_types/areas which admin doesn't have.

In the fetchJobBoardLeads action (src/app/(app)/contractor/_actions/job-board.ts or similar):
1. Check if user role = 'admin'
2. If admin: return ALL available leads with no service type or area filtering
3. If contractor: keep existing filtering
4. Admin should see every available lead split into Network and Open Market

TASK B: Create Admin Marketplace page shell.

1. Create src/app/admin/marketplace/page.tsx and MarketplaceClient.tsx
2. Add 'Marketplace' to admin sidebar — put it under BROKER PLATFORM section (between 'Partner Network' and 'SYSTEM')
3. Page shell with title 'Lead Marketplace' and subtitle 'All leads across the platform'
4. Just render placeholder stats and empty table for now — we'll fill it in Command 2

Build must pass clean."
```

## COMMAND 2: Marketplace Stats + Lead Table

```
claude -y "Build the Admin Marketplace data layer and stats.

TASK A: Server action — src/app/admin/_actions/marketplace.ts

fetchMarketplaceData() should return:
1. ALL leads from contractor_leads (available, sold, expired — everything)
2. For each lead include: id, title, system_type, city, area, zip_code, price, status, has_leaf, is_exclusive, created_at, purchased_at, expires_at
3. Join app_profiles to get posted_by name (broker/admin who posted)
4. Join app_profiles to get buyer name (contractor who purchased)
5. Aggregate stats:
   - Total leads (all statuses)
   - Available (status = 'available')
   - Sold (status = 'sold')
   - Expired (status = 'expired')
   - Total revenue (sum of sold lead prices)
   - REI revenue (30% of total)
   - Avg lead price
   - Leads this month vs last month (trend)

TASK B: Update MarketplaceClient.tsx

Stats row (full width, grid-cols-2 lg:grid-cols-4 xl:grid-cols-6):
- Total Leads (count)
- Available (green number)
- Sold (emerald number)
- Expired (gray number)
- Total Revenue (dollar amount)
- REI Revenue (30% — dollar amount, emerald)

Filter bar:
- Status dropdown: All, Available, Sold, Expired
- Service type pills: All Types, HVAC, Water Heater, Solar, Electrical, Plumbing, General Handyman
- Area dropdown: All Areas + all unique areas from leads
- Broker dropdown: All Brokers + all unique broker names
- Search input: search by title, city, zip, homeowner name
- Sort: Newest, Price Low→High, Price High→Low, Recently Sold
- Date range filter (optional for MVP)

Build must pass clean."
```

## COMMAND 3: Lead Table + Row Actions

```
claude -y "Build the lead table for Admin Marketplace.

Update MarketplaceClient.tsx with a full data table:

Table columns:
- LEAD: title + city (two lines)
- TYPE: service type badge (colored like contractor job board)
- AREA: area name
- PRICE: dollar amount
- STATUS: badge — Available (green), Sold (emerald), Expired (gray)
- LEAF: green dot or badge if has_leaf
- POSTED BY: broker/admin name
- BUYER: contractor name (or '—' if unsold)
- CREATED: date
- SOLD: date (or '—')
- ACTIONS: kebab menu

Row styling:
- Available leads: normal
- Sold leads: slightly muted, emerald left border
- Expired leads: muted/gray text

Kebab menu actions per lead:
- View Details (opens modal with full lead info including homeowner data — admin can see everything)
- Edit Lead (opens edit modal — can change price, title, description, status)
- Mark as Expired (if available)
- Reactivate (if expired — sets back to available, resets expires_at)
- Delete Lead (with confirmation — soft delete or hard delete for seed data)

Lead Detail Modal (when clicking View Details):
- Full lead info: title, description, all home details
- Homeowner contact: name, email, phone, address (admin sees everything)
- LEAF data (if available): full assessment summary
- Purchase info (if sold): buyer name, purchase date, payment intent ID
- Revenue split: total, REI take, poster take, service fee
- Status history / timeline

Pagination: 25 leads per page with page controls

Table should be full width, sortable by clicking column headers.

Build must pass clean."
```

## COMMAND 4: Post Lead from Admin

```
claude -y "Add ability for admin to post new leads to the marketplace from the Admin Marketplace page.

Add '+ Post Lead' button in the marketplace header (top right, emerald).

Post Lead Modal:
- Title (required)
- Description (textarea)
- Service Type (dropdown: HVAC, Water Heater, Solar, Electrical, Plumbing, General Handyman)
- Price (number input with dollar sign)
- Is Exclusive (toggle, default true)

Property Info section:
- Home Type (dropdown: Single Family, Townhouse, Condo, Multi-Family, Commercial)
- Year Built (number)
- Square Feet (number)
- Beds (number)
- Baths (number)

Location section:
- Address (full street address)
- City
- State (default OR)
- Zip Code
- Area (dropdown matching existing areas: Portland Metro, Beaverton, Lake Oswego, etc.)

Homeowner section:
- Name (required)
- Email
- Phone
- Notes

LEAF Data section (optional, collapsible):
- Current System
- System Age
- Efficiency
- Recommendation
- Estimated Cost
- Annual Savings
- Payback Years
- Priority (dropdown: High, Medium, Low)
- Toggle: has_leaf (auto-set true if any LEAF fields filled)

Server action: adminPostLead()
- Validates required fields
- Creates contractor_leads row with posted_by = admin user id, status = 'available'
- Returns success

On success: close modal, refresh table, show toast 'Lead posted to marketplace'

Build must pass clean."
```

## COMMAND 5: Revenue Dashboard Section

```
claude -y "Add a revenue summary section to the Admin Marketplace page.

Below the stats row and above the table, add a collapsible 'Revenue' section.

Revenue cards (grid-cols-3):
- Total Revenue: sum of all sold lead prices
- REI Revenue (30%): our cut
- Broker Payouts (68.6%): total owed/paid to brokers

Revenue by Service Type:
- Simple bar chart or colored stat cards showing revenue per trade
- HVAC: $XX, Solar: $XX, Water Heater: $XX, etc.

Revenue by Broker:
- Table: Broker Name, Leads Posted, Leads Sold, Revenue Generated, Broker Payout
- Sortable by revenue

Recent Transactions (last 10):
- Table from lead_transactions: Lead title, Contractor, Amount, REI Take, Broker Take, Date
- Link to full transaction in Stripe dashboard

This section should be collapsible (default open) so the admin can focus on just the lead table when needed.

Use the lead_transactions table for actual transaction data, fall back to calculating from contractor_leads if no transactions exist yet.

Build must pass clean."
```

## Execution Order

1. Command 1 — Fix admin job board preview + create marketplace shell
2. Command 2 — Stats + filters
3. Command 3 — Lead table + row actions + detail modal
4. Command 4 — Post lead from admin
5. Command 5 — Revenue dashboard

Test after each command. Push migrations if any are created.
