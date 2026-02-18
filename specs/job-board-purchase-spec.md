# Job Board + Lead Purchase Flow — Build Spec

## COMMAND 1 OF 2: Seed Test Leads + Job Board UI

READ specs/CONTRACTOR_CONSOLE_SPEC.md for full context on lead structure, pricing, and job board design.

### TASK 1: SEED TEST LEADS MIGRATION

Create `supabase/migrations/20260218000005_seed_test_leads.sql`

First check what lead/job tables already exist — look at the existing schema for tables like leads, jobs, contractor_leads, direct_leads, etc. Use whatever table already stores leads in the system.

If no suitable lead table exists for the contractor marketplace, create one:

```sql
CREATE TABLE IF NOT EXISTS public.contractor_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Lead source
  posted_by UUID REFERENCES public.app_profiles(id),
  broker_id UUID REFERENCES public.app_profiles(id),
  -- Lead info
  system_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  -- Property info (from LEAF or manual)
  home_year_built INTEGER,
  home_sqft INTEGER,
  home_type TEXT,
  beds INTEGER,
  baths NUMERIC(3,1),
  -- Location (general until purchased)
  city TEXT,
  state TEXT DEFAULT 'OR',
  zip_code TEXT,
  area TEXT,
  -- Homeowner (hidden until purchased)
  homeowner_name TEXT,
  homeowner_email TEXT,
  homeowner_phone TEXT,
  homeowner_address TEXT,
  -- LEAF data (JSON, shown as executive summary after purchase)
  leaf_data JSONB,
  has_leaf BOOLEAN DEFAULT false,
  -- Pricing
  price NUMERIC(10,2) NOT NULL,
  -- Status
  status TEXT DEFAULT 'available',
  buyer_id UUID REFERENCES public.app_profiles(id),
  purchased_at TIMESTAMPTZ,
  -- Pipeline (after purchase)
  pipeline_status TEXT DEFAULT 'purchased',
  -- Flags
  is_exclusive BOOLEAN DEFAULT true,
  is_seed_data BOOLEAN DEFAULT false,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days')
);

CREATE INDEX idx_contractor_leads_status ON contractor_leads(status);
CREATE INDEX idx_contractor_leads_system ON contractor_leads(system_type);
CREATE INDEX idx_contractor_leads_area ON contractor_leads(area);
CREATE INDEX idx_contractor_leads_broker ON contractor_leads(broker_id);
CREATE INDEX idx_contractor_leads_buyer ON contractor_leads(buyer_id);

ALTER TABLE contractor_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_read_available_leads" ON contractor_leads
  FOR SELECT USING (status = 'available' OR buyer_id = auth.uid() OR posted_by = auth.uid());

CREATE POLICY "admin_broker_insert_leads" ON contractor_leads
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM app_profiles WHERE id = auth.uid() AND role IN ('admin', 'broker'))
  );

CREATE POLICY "admin_full_leads" ON contractor_leads
  FOR ALL USING (
    EXISTS (SELECT 1 FROM app_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Contractors can update their own purchased leads (pipeline status, notes)
CREATE POLICY "contractor_update_own_leads" ON contractor_leads
  FOR UPDATE USING (buyer_id = auth.uid());
```

Then seed 15 realistic Portland-area test leads across all trades (HVAC, Water Heater, Solar, Electrical, Plumbing, General Handyman). Each lead should have:
- Realistic title and description
- Portland metro area locations (Portland, Beaverton, Lake Oswego, Tigard, West Linn, Hillsboro, Tualatin, Gresham, Oregon City, Milwaukie, Clackamas, Happy Valley)
- Realistic home details (year built, sqft, beds, baths)
- Realistic homeowner names, emails, phones, addresses (all fake/example.com)
- Prices within the lead_pricing_config ranges (HVAC $50-$150, Water Heater $20-$75, Solar $75-$200, Electrical $20-$60, Plumbing $20-$60, Handyman $20-$60)
- ~8 leads with has_leaf=true and realistic leaf_data JSON
- ~7 leads without LEAF data
- All marked is_seed_data=true for easy cleanup later
- All status='available'

LEAF data JSON format for has_leaf leads:
```json
{
  "current_system": "Gas Furnace",
  "system_age": 18,
  "efficiency": "78 AFUE",
  "recommendation": "Heat Pump Upgrade",
  "estimated_cost": "$8,500 - $12,000",
  "annual_savings": "$1,200",
  "payback_years": 7,
  "priority": "High"
}
```

### TASK 2: SERVER ACTIONS FOR JOB BOARD

Create or update server action: `fetchJobBoardLeads(contractorId)`

Location: `src/app/(app)/contractor/_actions/job-board.ts`

Logic:
1. Get contractor's service_types and service_areas from contractor_profiles
2. Get contractor's broker connections from user_relationships
3. Query contractor_leads where status = 'available'
4. Split into two groups:
   - **Network leads**: where broker_id is in contractor's connected brokers
   - **Open Market leads**: all other available leads matching contractor's service_types and service_areas
5. Return both lists with counts
6. Do NOT return homeowner_name, homeowner_email, homeowner_phone, homeowner_address — those are hidden until purchase

### TASK 3: JOB BOARD UI

Update `src/app/(app)/contractor/job-board/` to use real data.

**Header**: 'Job Board' with subtitle showing total available lead count

**Two tabs**:
- Network ({count}) — leads from connected brokers (priority, usually better priced)
- Open Market ({count}) — all leads matching contractor's service types and areas

**Filter bar** (full width):
- Service type dropdown (All, HVAC, Water Heater, Solar, Electrical, Plumbing, General Handyman)
- Area dropdown (All, Portland Metro, Beaverton, Lake Oswego, etc.)
- Sort: Newest, Price Low→High, Price High→Low

**Lead cards** (grid: `grid-cols-1 lg:grid-cols-2 xl:grid-cols-3`):
Each card shows:
- Service type badge (colored per trade)
- Title (bold)
- Area + City (NOT full address)
- Home info: sqft, year built, beds/baths (if available)
- LEAF badge (green pill if has_leaf=true: "LEAF Report Included")
- Price (large, bold, emerald: "$75")
- Posted time ago ("2 hours ago", "3 days ago")
- [View Details] button

**Service badge colors**:
- HVAC: `bg-orange-500/20 text-orange-400`
- Water Heater: `bg-blue-500/20 text-blue-400`
- Solar: `bg-yellow-500/20 text-yellow-400`
- Electrical: `bg-amber-500/20 text-amber-400`
- Plumbing: `bg-cyan-500/20 text-cyan-400`
- General Handyman: `bg-gray-500/20 text-gray-400`
- LEAF badge: `bg-emerald-500/20 text-emerald-400`

**Lead detail MODAL** (opens on card click — NOT a separate page):
- Full title and description
- Home details card (sqft, year built, type, beds, baths)
- Location (city, area — NOT full address)
- LEAF preview section (if has_leaf): "This lead includes a LEAF energy assessment" with general recommendation and priority level shown, but NOT full data or homeowner contact
- Price prominently displayed
- **[Purchase Lead — $XX]** button (emerald, large)
- "Exclusive lead — only one contractor per lead" note
- Warning if no payment method: "Add a payment method in Billing before purchasing"

**CRITICAL**: Do NOT show homeowner name, email, phone, or full address before purchase. Only city/area and general home info.

**Card styling** (dark theme):
- `bg-slate-800 border border-slate-700 rounded-lg p-5`
- Hover: `hover:border-emerald-500/30 transition-colors`
- Full width within grid cell

Build must pass clean. Push the migration with `npx supabase db push`.

---

## COMMAND 2 OF 2: Lead Purchase Flow with Stripe

### TASK 1: STRIPE SETUP

Check for existing Stripe setup in the project. If not, create:

`src/lib/stripe.ts`:
```typescript
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia'
})
```

Install packages if needed:
```bash
npm install stripe @stripe/stripe-js @stripe/react-stripe-js
```

### TASK 2: STRIPE API ROUTE

Create `src/app/api/stripe/create-payment-intent/route.ts`:

```typescript
// POST handler
// Receives: { leadId }
// 1. Authenticate user (must be contractor)
// 2. Fetch lead from contractor_leads (must be status=available)
// 3. Get or create Stripe customer for contractor
//    - Check contractor_profiles.stripe_customer_id
//    - If none: stripe.customers.create({ email, name, metadata: { contractor_id } })
//    - Save stripe_customer_id back to contractor_profiles
// 4. Create PaymentIntent:
//    stripe.paymentIntents.create({
//      amount: Math.round(lead.price * 100),
//      currency: 'usd',
//      customer: stripeCustomerId,
//      metadata: { lead_id: leadId, contractor_id, system_type, area }
//    })
// 5. Return { clientSecret: paymentIntent.client_secret }
```

### TASK 3: PURCHASE LEAD SERVER ACTION

Create `src/app/(app)/contractor/_actions/purchase.ts`:

```typescript
export async function confirmLeadPurchase(leadId: string, paymentIntentId: string) {
  // 1. Verify PaymentIntent succeeded via Stripe API
  // 2. Update contractor_leads:
  //    - status = 'sold'
  //    - buyer_id = contractor user id
  //    - purchased_at = now()
  //    - pipeline_status = 'purchased'
  // 3. Create contractor_customers entry from lead's homeowner data
  // 4. Log the transaction (amount, lead_id, contractor_id, timestamp)
  // 5. Return { success: true, lead: fullLeadWithHomeownerData }
}
```

### TASK 4: PURCHASE MODAL UI

When contractor clicks **[Purchase Lead — $XX]** in the lead detail modal:

1. Expand the modal to show Stripe Card Element:
   - Card number, expiry, CVC (using `@stripe/react-stripe-js` CardElement)
   - Test mode helper text: "Test mode — use card 4242 4242 4242 4242, any future expiry, any CVC"
2. **[Confirm Purchase — $XX]** button (emerald)
3. Flow:
   a. Click Confirm → call `/api/stripe/create-payment-intent` to get clientSecret
   b. Use `stripe.confirmCardPayment(clientSecret, { payment_method: { card: cardElement } })`
   c. If success → call `confirmLeadPurchase(leadId, paymentIntentId)`
   d. Show success state: "Lead purchased! Homeowner contact unlocked."
   e. Close modal → show success toast → refresh job board
4. Loading/processing states throughout
5. Error handling: show Stripe error messages (card declined, insufficient funds, etc.)

### TASK 5: UPDATE MY LEADS PAGE

`src/app/(app)/contractor/leads/` should show real purchased leads:

**Server action**: `fetchMyLeads(contractorId)` — query contractor_leads where buyer_id = current user

**Stats row** (full width):
- Total Purchased (count)
- Active (purchased + contacted + quoted + scheduled + in_progress)
- Completed (count)
- Total Spent (sum of prices)

**Filter by pipeline status**: All, Purchased, Contacted, Quoted, Scheduled, In Progress, Completed

**Lead table/cards**: title, service type badge, area, homeowner name, pipeline status badge, price paid, purchased date

**Click lead → Lead detail page** showing:
- FULL homeowner contact: name, email (mailto:), phone (tel:), full address
- LEAF executive summary card (if has_leaf): rendered from leaf_data JSON showing current system, recommendation, estimated cost, annual savings, payback, priority
- Pipeline status stepper (visual: Purchased → Contacted → Quoted → Scheduled → In Progress → Completed) — click to advance
- Job notes section (text area, saves to contractor_leads)
- Communication log (future — just show placeholder for now)

### TASK 6: REVENUE SPLIT LOGGING

When a lead is purchased, calculate and log the revenue split:
- Total price: lead.price (e.g., $75)
- REI take: 30% ($22.50)
- Poster take: 70% minus 2% service fee = 68.6% ($51.45)
- Service fee: 2% of total ($1.50)

Store in a transactions or revenue_splits table (create if needed):
```sql
CREATE TABLE IF NOT EXISTS public.lead_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES contractor_leads(id),
  contractor_id UUID REFERENCES app_profiles(id),
  poster_id UUID REFERENCES app_profiles(id),
  stripe_payment_intent_id TEXT,
  total_amount NUMERIC(10,2),
  rei_amount NUMERIC(10,2),
  poster_amount NUMERIC(10,2),
  service_fee NUMERIC(10,2),
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Build must pass clean. Push any new migrations.

---

## Execution Order

1. Run Command 1 (this file through "Push the migration")
2. Push migration: `npx supabase db push`
3. Test: log in as contractor, check job board shows 15 leads
4. Run Command 2 (from "STRIPE SETUP" onward)
5. Push any new migrations: `npx supabase db push`
6. Test: log in as contractor, browse job board, purchase a lead with test card 4242 4242 4242 4242
7. Verify: lead moves from job board to My Leads, homeowner contact unlocked, LEAF summary visible
8. Check Stripe test dashboard for the payment

## Test Card Numbers
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires auth: `4000 0025 0000 3155`
- Any future expiry (e.g., 12/34)
- Any CVC (e.g., 123)
