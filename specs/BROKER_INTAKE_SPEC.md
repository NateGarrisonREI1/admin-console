# REI Broker Intake Forms
## specs/BROKER_INTAKE_SPEC.md
## February 21, 2026

---

## Three Intake Experiences

REI has three distinct intake paths. All three create the same `pending` job in the system, but the experience is tailored to who's filling it out.

### 1. Public Intake (`/request`)
**Already built.** Generic form with broker/homeowner role picker. Used on the REI website, marketing pages, LEAF CTAs. No changes needed.

### 2. Broker Self-Request (`/broker/request`)
**For the broker.** When a broker wants to order an HES or inspection for their client's property. They're logged in, their info is pre-filled, they just enter the property + homeowner details. Lives inside the broker portal (authenticated route).

### 3. Broker Client Link (`/request/[brokerCode]`)
**For the broker's client.** A unique URL the broker shares with their clients (email, text, listing page). The client fills out the form — no role picker, no broker section needed because the broker is auto-attached via the URL. Looks clean, simple, branded with the broker's name.

---

## Form 2: Broker Self-Request (`/broker/request`)

### Who Uses It
The broker, from their portal. They click [+ New Request] in the sidebar or header.

### What's Pre-Filled (from broker's profile)
```
YOUR INFO (pre-filled, read-only or editable)
┌──────────────────────────────────────────────────────┐
│  Broker: Marcus Webb                                  │
│  Company: Keller Williams Realty                      │
│  Email: marcus@kwrealty.com                           │
│  Phone: 503-555-1234                                  │
│  [Edit My Info →]                                     │
└──────────────────────────────────────────────────────┘
```

### What the Broker Fills In

```
┌──────────────────────────────────────────────────────────┐
│  📋 Request a Service                                    │
│  Order an HES Assessment or Home Inspection from REI     │
│                                                          │
│  ── YOUR INFO ──────────────────────────────────────────  │
│  Marcus Webb — Keller Williams Realty                     │
│  marcus@kwrealty.com | 503-555-1234                       │
│  [Edit]                                                  │
│                                                          │
│  ── SERVICE ────────────────────────────────────────────  │
│                                                          │
│  What do you need?                                       │
│  ┌─────────────────────┐  ┌──────────────────────┐      │
│  │ 🏠 HES Assessment   │  │ 🔍 Home Inspection   │      │
│  │     From $125       │  │     From $400        │      │
│  └─────────────────────┘  └──────────────────────┘      │
│                                                          │
│  Home Size:                                              │
│  [Small (<1,500 sq ft) ▼]                                │
│  Price: $125                                             │
│                                                          │
│  ── PROPERTY ───────────────────────────────────────────  │
│                                                          │
│  Address: [________________________]                     │
│  City: [____________] State: [OR] Zip: [_____]           │
│                                                          │
│  ── HOMEOWNER ──────────────────────────────────────────  │
│                                                          │
│  ○ Homeowner will be present                             │
│  ○ Vacant / no homeowner contact                         │
│                                                          │
│  [If present:]                                           │
│  Name: [________________________]                        │
│  Email: [________________________]                       │
│  Phone: [________________________]                       │
│                                                          │
│  ── SCHEDULING ─────────────────────────────────────────  │
│                                                          │
│  Preferred Date: [__________]                            │
│  Preferred Time: [Morning ▼]                             │
│                                                          │
│  ── PAYMENT ────────────────────────────────────────────  │
│                                                          │
│  Who pays?                                               │
│  ● I'll pay (invoice me after)                           │
│  ○ Homeowner pays (invoice them)                         │
│  ○ Pay now (credit card)                                 │
│                                                          │
│  ── NOTES ──────────────────────────────────────────────  │
│  [Any special instructions...                 ]          │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │  📋 Summary                                      │    │
│  │  HES Assessment — Small Home                     │    │
│  │  1205 NW 23rd Ave, Portland, OR                  │    │
│  │  Total: $125                                     │    │
│  │  Payment: Broker pays (invoice after)            │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  [Submit Request — $125]                                 │
│                                                          │
│  Your request will be assigned to an REI assessor.       │
│  You'll receive status updates at marcus@kwrealty.com    │
└──────────────────────────────────────────────────────────┘
```

### On Submit

Creates a job with:
```
status: 'pending'
requested_by: 'broker'
broker_id: [broker's ID]
customer_name: [homeowner name]
customer_email: [homeowner email]
customer_phone: [homeowner phone]
address, city, state, zip: [property info]
service_category_id: [HES or Inspection]
service_tier_id: [size tier]
amount: [catalog price]
payer_type: [broker's selection]
payer_name: [broker or homeowner name based on selection]
payer_email: [broker or homeowner email based on selection]
network_status: 'in_network' (always — routed to REI)
source: 'broker_portal'
```

### After Submit

- Shows confirmation: "Request submitted! Reference: REI-XXXXXXXX"
- Broker gets confirmation email
- Job appears on broker's Schedule page
- Job appears on REI admin schedule with Broker badge
- Redirects to /broker/schedule after 3 seconds

---

## Form 3: Broker Client Link (`/request/[brokerCode]`)

### The Concept

Every broker gets a unique URL they can share:
```
https://app.renewableenergyincentives.com/request/marcus-webb
https://app.renewableenergyincentives.com/request/MW2024
```

The `brokerCode` is either:
- Broker's referral_code from the brokers table
- Auto-generated slug from their name
- Custom code they set in settings

### Who Uses It

The broker's clients — homeowners, sellers, buyers. The broker texts or emails them the link: "Hey, use this link to schedule your home energy assessment."

### What the Client Sees

No role picker. No broker fields. Just a clean, simple homeowner form with the broker's name at the top.

```
┌──────────────────────────────────────────────────────────┐
│  [REI Logo]                                              │
│                                                          │
│  Schedule a Home Energy Assessment                       │
│  Referred by Marcus Webb — Keller Williams Realty         │
│                                                          │
│  ── SERVICE ────────────────────────────────────────────  │
│                                                          │
│  ┌─────────────────────┐  ┌──────────────────────┐      │
│  │ 🏠 HES Assessment   │  │ 🔍 Home Inspection   │      │
│  │     From $125       │  │     From $400        │      │
│  └─────────────────────┘  └──────────────────────┘      │
│                                                          │
│  Home Size:                                              │
│  [Medium (1,500-3,000 sq ft) ▼]                          │
│  Price: $150                                             │
│                                                          │
│  ── YOUR INFO ──────────────────────────────────────────  │
│                                                          │
│  Name: [________________________]                        │
│  Email: [________________________]                       │
│  Phone: [________________________]                       │
│                                                          │
│  ── PROPERTY ───────────────────────────────────────────  │
│                                                          │
│  Address: [________________________]                     │
│  City: [____________] State: [OR] Zip: [_____]           │
│                                                          │
│  ── SCHEDULING ─────────────────────────────────────────  │
│                                                          │
│  Preferred Date: [__________]                            │
│  Preferred Time: [Morning ▼]                             │
│                                                          │
│  ── NOTES ──────────────────────────────────────────────  │
│  [Any special instructions...                 ]          │
│                                                          │
│  Your [Service] Assessment: $150                         │
│                                                          │
│  [Schedule My Assessment — $150]                         │
│                                                          │
│  Powered by REI — Renewable Energy Incentives            │
└──────────────────────────────────────────────────────────┘
```

### Key Differences from Public Intake

| Feature | Public Intake | Client Link |
|---------|-------------|-------------|
| URL | `/request` | `/request/[brokerCode]` |
| Role picker | Yes | No — homeowner only |
| Broker fields | Shown if "Real Estate Professional" | Hidden — auto-attached |
| Broker attribution | Manual (broker enters their info) | Automatic (from URL) |
| Payment options | Homeowner pays / Broker pays | Homeowner pays only (default) |
| Broker visibility | Broker sees "Referred by" note | Top banner: "Referred by Marcus Webb" |
| Authentication required | No | No |

### On Submit

Creates a job with:
```
status: 'pending'
requested_by: 'broker'
broker_id: [looked up from brokerCode]
customer_name: [from form]
customer_email: [from form]
customer_phone: [from form]
address, city, state, zip: [from form]
service_category_id: [selected service]
service_tier_id: [size tier]
amount: [catalog price]
payer_type: 'homeowner' (default for client link)
payer_name: [customer name]
payer_email: [customer email]
network_status: 'in_network'
source: 'broker_client_link'
```

### After Submit

- Shows confirmation to homeowner: "You're all set! REI will contact you to schedule."
- Homeowner gets confirmation email
- **Broker gets notification**: "Your client [Name] requested an HES at [address]"
- Job appears on broker's Schedule page
- Job appears on admin schedule with Broker badge

---

## Broker Code System

### Database

```sql
-- Add referral_code to brokers table if not exists
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS referral_link_visits INTEGER DEFAULT 0;
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS referral_link_conversions INTEGER DEFAULT 0;
```

### Code Generation

On broker signup or first login, auto-generate a code:
```typescript
// Option 1: Name-based slug
'marcus-webb' // lowercase, hyphenated

// Option 2: Short code
'MW2024' // initials + year

// Option 3: Custom (broker can change in settings)
'marcuswebb-kw' // whatever they want
```

### Broker Settings — Share Your Link

```
┌──────────────────────────────────────────────────────────┐
│  YOUR CLIENT REQUEST LINK                                │
│                                                          │
│  https://app.renewableenergyincentives.com/request/      │
│  marcus-webb                                             │
│                                                          │
│  [Copy Link]  [Share via Email]  [Edit Code]             │
│                                                          │
│  Stats:                                                  │
│  Link visits: 24  |  Submissions: 8  |  Conversion: 33% │
│                                                          │
│  Share this link with your clients so they can request   │
│  energy assessments directly. You'll be automatically    │
│  attached to every request.                              │
└──────────────────────────────────────────────────────────┘
```

---

## [+ New Request] Button Behavior

### In Sidebar (persistent)
Links to `/broker/request` (the broker self-request form)

### In Broker Dashboard Header
Same — links to `/broker/request`

### In Schedule Page Header  
Same — links to `/broker/request`

### The Client Link
Accessible from broker Settings page and also from a "Share with Client" button on the dashboard:
```
[+ New Request]  [Share Link with Client]
```

"Share with Client" copies the client link URL or opens a share modal.

---

## Sidebar Update

The [+ New Request] in the sidebar should link to `/broker/request` (authenticated, pre-filled broker form), NOT to the public `/request` page.

---

## Implementation Priority

### Phase 1: Broker Self-Request Form
1. Create `/broker/request` page (authenticated route inside broker layout)
2. Pre-fill broker info from profile
3. Service selection (HES / Inspection) with dynamic pricing from catalog
4. Property + homeowner fields
5. Payment preference (broker pays / homeowner pays / pay now)
6. Submit creates pending job, redirects to schedule
7. Update sidebar [+ New Request] to link here

### Phase 2: Broker Client Link
8. Add referral_code to brokers table
9. Auto-generate codes on broker signup
10. Create `/request/[brokerCode]` dynamic route
11. Look up broker from code, show "Referred by" banner
12. Simple homeowner-only form (no role picker, no broker fields)
13. Submit creates pending job with broker auto-attached
14. Broker notification on client submission

### Phase 3: Settings Integration
15. "Your Client Link" section in broker settings
16. Copy link / share via email
17. Edit referral code
18. Link visit + conversion stats

---

## CLI Commands

### Command 1: Broker Self-Request Form
```
claude "Read specs/BROKER_INTAKE_SPEC.md. Create the broker self-request form at /broker/request (inside the broker authenticated layout).

1. Create src/app/(app)/broker/request/page.tsx as a server component that:
   - Fetches the current broker's profile (name, email, phone, company from app_profiles + brokers tables)
   - Fetches service categories and tiers from the catalog (reuse fetchServiceTiers from existing intake actions)
   - Passes broker info + catalog data to client component

2. Create src/app/(app)/broker/request/BrokerRequestClient.tsx with:
   - Top section: 'Your Info' card showing broker name, company, email, phone (read-only with 'Edit' link to settings)
   - Service selection: HES Assessment / Home Inspection cards (clickable, toggle)
   - Home Size dropdown (pulls tiers from catalog, shows price)
   - Inspection addons checkboxes (if inspection selected)
   - Property section: address, city, state (default OR), zip
   - Homeowner section: vacant toggle, name, email, phone (if present)
   - Scheduling: preferred date picker, preferred time dropdown (Morning/Afternoon/Evening)
   - Payment: radio — 'I'll pay (invoice me)' / 'Homeowner pays' / 'Pay now'
   - Summary card: service name, home size, address, total price, payment method
   - Submit button: 'Submit Request — $X'

3. Create server action submitBrokerRequest() that:
   - Validates all fields
   - Looks up service tier price server-side
   - Creates job in hes_schedule or inspector_schedule with: status='pending', requested_by='broker', broker_id, network_status='in_network', source='broker_portal', all address/customer/payer fields
   - Returns reference ID (REI-XXXXXXXX format)

4. After submit: show success message with reference ID, auto-redirect to /broker/schedule after 3 seconds

5. Update BrokerSidebar.tsx: change [+ New Request] link from '/request?role=broker' to '/broker/request'

Dark theme matching broker portal. Reuse form patterns from the existing /request page but styled for the dark broker theme.

Verify TypeScript compiles with npx tsc --noEmit."
```

### Command 2: Broker Client Link
```
claude "Read specs/BROKER_INTAKE_SPEC.md. Create the broker client link form at /request/[brokerCode].

1. Add referral_code column to brokers table (TEXT UNIQUE, IF NOT EXISTS). Auto-generate codes for existing brokers: lowercase full_name with spaces replaced by hyphens.

2. Create src/app/request/[brokerCode]/page.tsx as a dynamic route:
   - Server component that looks up the broker by referral_code
   - If not found: show 404 / 'Invalid referral link'
   - If found: pass broker name, company, and broker_id to client component
   - Track visit: increment brokers.referral_link_visits

3. Create src/app/request/[brokerCode]/BrokerClientFormClient.tsx:
   - Top banner: 'Referred by [Broker Name] — [Company]' with subtle styling
   - NO role picker (homeowner only)
   - NO broker info fields
   - Service selection: HES / Inspection cards with pricing
   - Home size dropdown
   - Homeowner info: name, email, phone
   - Property: address, city, state, zip
   - Scheduling: preferred date, preferred time
   - Notes field
   - Price callout + submit button
   - Light theme (public-facing, same as /request)

4. Server action submitBrokerClientRequest():
   - Creates job with requested_by='broker', broker_id from URL lookup, payer_type='homeowner', source='broker_client_link', network_status='in_network'
   - Increments brokers.referral_link_conversions
   - Sends broker notification email: 'Your client [Name] requested an HES at [address]'

5. After submit: confirmation to homeowner + redirect message

Verify TypeScript compiles with npx tsc --noEmit."
```
