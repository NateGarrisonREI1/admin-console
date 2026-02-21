# REI Workflow Status Bar & Pending Requests
## specs/STATUS_BAR_AND_PENDING_SPEC.md
## February 20, 2026

---

## Part 1: Status Progress Bar Redesign

### Problem
Current implementation is ugly — disconnected green dots with dashes, cramped labels, no visual hierarchy.

### Component
Create reusable: `StatusProgressBar.tsx` (used in admin side panel AND tech portal)

**Props:**
```ts
{
  status: string;           // current job status
  paymentStatus: string;    // 'unpaid' | 'invoiced' | 'paid'
}
```

### Status Order
```
Pending → Scheduled → En Route → On Site → Field Complete → Report Ready → Delivered
```

### Visual Design — Connected Stepper/Pipeline

**Track:**
- Single continuous horizontal line, 2px height
- Completed section: green `#10b981`
- Future section: grey `#334155`
- Full width of container

**Nodes (circles on the track):**
| State | Size | Fill | Border | Extra |
|-------|------|------|--------|-------|
| Completed | 12px | Solid green `#10b981` | none | — |
| Current | 16px | Solid green `#10b981` | none | Glow ring: `box-shadow: 0 0 0 4px rgba(16,185,129,0.2)` |
| Future | 12px | Transparent | 2px grey `#334155` | — |
| Delivered (when current) | 16px | Solid green | none | Checkmark icon inside instead of dot |

**Labels:**
- Below each node, 10px font
- Completed: white `#f1f5f9`
- Current: green `#10b981`, font-weight 600
- Future: grey `#94a3b8`
- Compact labels: Pending, Scheduled, En Route, On Site, Field Done, Report Ready, Delivered

**Payment Badge (integrated):**
- Tucked under the progress bar, right-aligned
- `paid` → Green "✓ Paid" badge (same style as existing)
- `unpaid` → Nothing shown (or subtle grey "Unpaid")
- `invoiced` → Amber/yellow "📧 Invoiced" badge

**Badge cleanup:**
- HES badge stays at top of side panel
- Paid badge MOVES from top to progress bar area — don't duplicate

### Spacing
- Component has 16px vertical padding
- Sits in its own card/section with subtle border `#334155`
- Comfortable breathing room above and below

---

## Part 2: Pending Requests on Schedule Page

### KPI Card Wiring

The existing "Pending Requests" KPI card (currently shows 0) needs to be functional:

**Query:** `SELECT COUNT(*) FROM hes_schedule WHERE status = 'pending'`

**When count > 0:**
- Number displays in amber/orange `#f59e0b`
- Subtle pulse dot (CSS animation) next to "Pending Requests" label
- Creates visual urgency

**Click behavior:**
- Clicking the KPI card adds a filter chip: `Status: Pending` (same pill style as "Date: This Week")
- Table filters to `status = 'pending'` only
- KPI card gets subtle highlighted border while filter is active
- Clicking the chip X or "Clear All" removes it

### Pending Jobs in Table

**Visual distinction:**
- Status badge: "Pending" in amber/orange background
- Subtle left border accent (4px amber) on the table row
- These should stand out from scheduled/completed jobs

### Pending Job Side Panel

When a pending job is selected, the admin edits fields directly in the side panel (no modal):

**Editable fields in-panel:**
- Assign team member (tech dropdown)
- Set scheduled date and time
- Set price / invoice amount

**Action buttons (below the editable fields):**
- Green button: **"Confirm & Schedule"**
  - Updates `status` from `'pending'` → `'scheduled'`
  - Logs `'job_scheduled'` to activity log
  - No intermediate approval step

- Secondary danger button: **"Cancel Request"**
  - Sets `status` → `'cancelled'`
  - Logs `'job_cancelled'` to activity log

### Status Filter Updates
Add `'pending'` to whatever status filter/dropdown exists on the schedule page.

---

## Implementation Notes

- StatusProgressBar must be a standalone component file for reuse
- Handle legacy status mapping: `'completed'` → render as `'delivered'`, `'in_progress'` → render as `'on_site'`
- TypeScript must compile clean: `npx tsc --noEmit`
