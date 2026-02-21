# REI Job Request Intake Form
## specs/INTAKE_FORM_SPEC.md
## February 20, 2026

---

## Purpose

Public-facing form at `/request` for homeowners and brokers to request a Home Energy Score assessment. Submissions create `pending` jobs on the admin schedule. Designed to be extractable as an embeddable widget for renewableenergyincentives.com.

---

## Route

`src/app/request/page.tsx` — standalone, no admin nav/sidebar.

---

## Design

- Light/white background (NOT the dark admin theme)
- Centered card, max-width 640px, mobile responsive
- REI logo at top (check `public/` for existing logo assets)
- Heading: **"Schedule a Home Energy Assessment"**
- Subtext: *"Get your Home Energy Score and personalized LEAF energy analysis"*
- Inline styles or CSS module — NO Tailwind (must be extractable as widget)
- Brand green: `#10b981`
- Self-contained styles, zero global CSS dependencies
- Add comment at top of file: `// Widget-ready: designed to be extracted as embeddable component for renewableenergyincentives.com`

---

## Step 1: Role Selection

Two large selectable cards, side by side (stack vertical on mobile):

| Card | Icon | Title | Subtitle |
|------|------|-------|----------|
| A | 🏠 | I'm a Homeowner | I want to schedule an assessment for my home |
| B | 🏢 | I'm a Real Estate Professional | I'm requesting on behalf of a client or property |

Selecting one reveals the form below with a smooth expand transition. Selected card gets green border + subtle green background.

---

## Step 2A: Homeowner Form

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Full Name | text | ✅ | |
| Email | email | ✅ | Validated with regex |
| Phone | tel | ✅ | Auto-format (xxx) xxx-xxxx |
| Property Address | text | ✅ | Full street address |
| City | text | ✅ | Row with State + Zip |
| State | text | ✅ | Default: OR |
| Zip | text | ✅ | 5-digit validated |
| Preferred Date | date picker | ✅ | Min = tomorrow |
| Preferred Time | select | ✅ | Options: Morning (8am–12pm), Afternoon (12–4pm), Flexible |
| How did you hear about us? | select | ❌ | Options: Real Estate Agent, Utility Company, Online Search, Friend/Family, Other |
| Notes | textarea | ❌ | Max 500 chars |

---

## Step 2B: Broker Form

### Broker Info Section
| Field | Type | Required |
|-------|------|----------|
| Your Name | text | ✅ |
| Brokerage / Company | text | ✅ |
| Your Email | email | ✅ |
| Your Phone | tel | ✅ |

### Property & Homeowner Section
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Homeowner presence toggle | switch | ✅ | "Homeowner will be present" / "Vacant or no homeowner contact" |
| Homeowner Name | text | If present | Hidden if vacant toggle |
| Homeowner Email | email | If present | Hidden if vacant toggle |
| Homeowner Phone | tel | If present | Hidden if vacant toggle |
| Property Address | text | ✅ | |
| City | text | ✅ | |
| State | text | ✅ | Default: OR |
| Zip | text | ✅ | |

### Payment Section
**"Who will be paying?"** — two radio buttons:
- "I will (broker pays)" → sets `payer_type: 'broker'`
- "The homeowner will pay" → sets `payer_type: 'homeowner'`

If vacant/no homeowner toggle is ON → auto-select "I will (broker pays)" and hide the radio

### Scheduling
| Field | Type | Required |
|-------|------|----------|
| Preferred Date | date picker | ✅ |
| Preferred Time | select | ✅ |
| Notes | textarea | ❌ |

---

## Step 3: Submission

### Submit Button
- Full width green button: **"Request Assessment"**
- Loading spinner while submitting
- Disabled until all required fields pass validation

### Success Screen
Replaces the form on success:
- Green checkmark animation (CSS, no library)
- **"Your request has been submitted!"**
- *"We'll confirm your appointment within 1 business day."*
- **Reference #: REI-XXXX** (first 8 chars of UUID, uppercased)
- If homeowner: "A confirmation email will be sent to [email]"
- If broker: "We'll send confirmation to both you and the homeowner"
- "Submit Another Request" link to reset form

---

## Server Action: `submitJobRequest`

File: `src/app/request/actions.ts`

### Validation
- Server-side validation of ALL required fields
- Email regex validation
- Phone: strip to digits, must be 10
- Zip: must be 5 digits
- Date: must be tomorrow or later
- Return field-level errors for inline display

### Database Insert → `hes_schedule`

| Column | Value |
|--------|-------|
| status | `'pending'` |
| customer_name | Homeowner name (or broker name if vacant) |
| customer_email | Homeowner email (or broker email if vacant) |
| customer_phone | Homeowner phone (or broker phone if vacant) |
| address | Full address string |
| city | From form |
| state | From form |
| zip | From form |
| scheduled_date | Preferred date (request, not confirmed) |
| scheduled_time | Preferred time slot text |
| payment_status | `'unpaid'` |
| requested_by | `'homeowner'` or `'broker'` |
| payer_type | `'homeowner'` or `'broker'` (from payment radio) |
| payer_name | Broker name if broker pays, homeowner name otherwise |
| payer_email | Broker email if broker pays, homeowner email otherwise |
| broker_id | `null` (wire broker table lookup later) |
| source | 'how did you hear about us' value, or `'broker_referral'` if broker |
| service_name | `'HES Assessment'` |
| amount | `null` (admin sets pricing on approval) |
| notes | From form |

### Activity Log
Insert to `job_activity_log`:
- event: `'job_requested'`
- details JSONB: full form submission data including who requested, source, etc.

### Return
```ts
{ success: true, referenceId: string }
// or
{ success: false, errors: Record<string, string> }
```

---

## Form Validation UX

- Validate on blur (not on every keystroke)
- Red border + error message below field on invalid
- Green border on valid after blur
- Submit button validates all fields, scrolls to first error
- Phone auto-formats as user types: (503) 555-1234

---

## Mobile Considerations

- Role cards stack vertically
- All fields full width
- Date picker uses native mobile date input
- Sticky submit button at bottom on mobile (optional nice-to-have)

---

## Future: Widget Extraction

This page is designed to be lifted out and embedded via iframe or web component on the main marketing site. Key requirements for that:
- Zero external CSS dependencies
- All styles inline or in CSS module
- Server action can be re-exposed as a POST API route at `/api/request` for cross-domain use
- CORS headers on the API route when needed
