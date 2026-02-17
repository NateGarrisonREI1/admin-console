# Phase 5 Extended: Advanced Payment Features
## Refunds, Disputes, and Payment Management

**Priority:** HIGH (part of Phase 5)  
**Impact:** Financial controls, customer trust, operational oversight

---

## 1. Refund Request System

### User Flow: Contractor/Affiliate Requests Refund

```
Contractor purchases lead for $50
  ↓
Uses lead, doesn't close the sale
  ↓
Clicks [Request Refund] in my-leads table
  ↓
Modal opens: "Request Refund"
  - Lead details
  - Original price
  - Reason dropdown:
    * No homeowner response
    * Already working with competitor
    * Invalid/bad lead quality
    * Customer not interested
    * Other (text box)
  - Optional notes (text area)
  ↓
[Submit Request]
  ↓
Refund request created in database (status: pending)
  ↓
Admin notified (email + dashboard)

```

### Admin Flow: Review & Approve/Deny

```
Admin logs into dashboard
  ↓
New tab: "Refund Requests"
  ↓
Shows pending refund requests:
  - Contractor name
  - Lead details (address, system type)
  - Original price
  - Reason given
  - Requested date
  - Status (pending, approved, denied)
  ↓
Admin clicks [Review]
  ↓
Modal shows:
  - Full lead details
  - Contractor history (how many leads purchased, conversion rate)
  - Reason text
  - Notes from contractor
  - Buttons: [Approve Refund] [Deny] [Request More Info]
  ↓
If [Approve Refund]:
  - Refund processed via Stripe
  - Refund request status: approved
  - Email sent to contractor: "Refund approved for $X"
  - Payment record updated: status=refunded
  
If [Deny]:
  - Refund request status: denied
  - Email sent to contractor: "Refund request denied. Reason: [admin note]"
  - Payment stays charged

If [Request More Info]:
  - Email sent to contractor asking for clarification
  - Status stays pending until they respond
```

---

## 2. Database Tables for Refunds

### refund_requests Table

```sql
CREATE TABLE refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES app_profiles(id),
  lead_id UUID NOT NULL,  -- system_lead_id or hes_request_id
  lead_type ENUM('system_lead', 'hes_request'),
  original_amount NUMERIC NOT NULL,
  reason TEXT NOT NULL,  -- dropdown option
  reason_category ENUM(
    'no_response',
    'competitor',
    'bad_quality',
    'not_interested',
    'duplicate',
    'other'
  ),
  notes TEXT,  -- contractor's additional notes
  requested_date TIMESTAMPTZ DEFAULT NOW(),
  status ENUM('pending', 'approved', 'denied', 'more_info_requested') DEFAULT 'pending',
  reviewed_by UUID REFERENCES app_profiles(id),  -- admin who reviewed
  reviewed_date TIMESTAMPTZ,
  admin_notes TEXT,  -- why approved/denied
  refund_date TIMESTAMPTZ,  -- when refund was actually processed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refund_status ON refund_requests(status);
CREATE INDEX idx_refund_contractor ON refund_requests(contractor_id);
CREATE INDEX idx_refund_payment ON refund_requests(payment_id);
```

### payments Table Updates

```sql
ALTER TABLE payments ADD COLUMN refund_request_id UUID REFERENCES refund_requests(id);
ALTER TABLE payments ADD COLUMN refund_status ENUM('none', 'requested', 'approved', 'denied', 'refunded') DEFAULT 'none';
ALTER TABLE payments ADD COLUMN refund_amount NUMERIC;
ALTER TABLE payments ADD COLUMN refund_stripe_id TEXT;  -- Stripe refund ID
ALTER TABLE payments ADD COLUMN refund_date TIMESTAMPTZ;

CREATE INDEX idx_payment_refund_status ON payments(refund_status);
```

---

## 3. API Endpoints for Refunds

### Contractor/Affiliate Endpoints

#### Request Refund
```
POST /api/v1/contractor/leads/[leadId]/request-refund
Body: {
  reason: "no_response" | "competitor" | "bad_quality" | "not_interested" | "duplicate" | "other",
  notes: "optional additional context..."
}

Response:
{
  refundRequest: {
    id: "uuid",
    status: "pending",
    leadId: "uuid",
    originalAmount: 50.00,
    requestedDate: "2026-02-17T10:00:00Z"
  }
}

Error cases:
- 404: Lead not found
- 409: Already refunded
- 409: Too late to refund (> 30 days)
- 403: Not the lead purchaser
```

#### Check Refund Status
```
GET /api/v1/contractor/refunds
Query params: status (all, pending, approved, denied)

Response:
{
  refunds: [
    {
      id: "uuid",
      leadId: "uuid",
      amount: 50.00,
      status: "pending",
      reason: "no_response",
      requestedDate: "2026-02-17T10:00:00Z"
    }
  ]
}
```

### Admin Endpoints

#### List Refund Requests
```
GET /api/v1/admin/refund-requests
Query params: status (all, pending, approved, denied), contractor_id, date_range

Response:
{
  refunds: [
    {
      id: "uuid",
      contractorId: "uuid",
      contractorName: "HVAC Solutions Inc",
      leadId: "uuid",
      leadAddress: "123 Main St, New York, NY",
      systemType: "HVAC",
      originalAmount: 50.00,
      reason: "no_response",
      reasonCategory: "no_response",
      requestedDate: "2026-02-17T10:00:00Z",
      contractorHistory: {
        totalLeadsPurchased: 15,
        conversionRate: 0.67,
        previousRefunds: 1
      }
    }
  ]
}
```

#### Review Refund Request
```
GET /api/v1/admin/refund-requests/[id]

Response:
{
  refund: {
    id: "uuid",
    contractorId: "uuid",
    contractorName: "HVAC Solutions Inc",
    leadId: "uuid",
    leadDetails: { address, systemType, homeownerName, ...},
    originalAmount: 50.00,
    reason: "no_response",
    notes: "Called 3 times, no answer",
    requestedDate: "2026-02-17T10:00:00Z",
    status: "pending",
    contractorHistory: {
      totalPurchased: 15,
      conversionRate: 0.67,
      averageLeadValue: 50.00,
      previousRefundRequests: 1,
      previousRefundApprovals: 0
    }
  }
}
```

#### Approve Refund
```
POST /api/v1/admin/refund-requests/[id]/approve
Body: {
  adminNotes: "Contractor has good track record, refund approved"
}

Response:
{
  refund: {
    id: "uuid",
    status: "approved",
    refundDate: "2026-02-17T10:05:00Z",
    refundAmount: 50.00,
    stripeRefundId: "re_xxxx"
  }
}

Actions:
1. Stripe refund API call: stripe.refunds.create({ payment_intent: XXX })
2. Update refund_requests: status=approved, reviewed_by=adminId, reviewed_date=NOW(), refund_date=NOW()
3. Update payments: refund_status=refunded, refund_amount=50.00, refund_stripe_id=stripeId, refund_date=NOW()
4. Send email to contractor: "Refund approved for $50"
5. Create audit log: "Admin approved refund for contractor X"
```

#### Deny Refund
```
POST /api/v1/admin/refund-requests/[id]/deny
Body: {
  reason: "Contractor's responsibility to follow up"
}

Response:
{
  refund: {
    id: "uuid",
    status: "denied",
    reviewedDate: "2026-02-17T10:05:00Z",
    adminNotes: "Contractor's responsibility..."
  }
}

Actions:
1. Update refund_requests: status=denied, reviewed_by=adminId, reviewed_date=NOW(), admin_notes=reason
2. Send email to contractor: "Refund request denied. Reason: [reason]"
3. Create audit log: "Admin denied refund for contractor X"
```

#### Request More Info
```
POST /api/v1/admin/refund-requests/[id]/request-info
Body: {
  question: "Can you provide proof of contact attempts?"
}

Response:
{
  refund: {
    id: "uuid",
    status: "more_info_requested",
    infoRequested: "Can you provide proof of contact attempts?",
    infoRequestedDate: "2026-02-17T10:05:00Z"
  }
}

Actions:
1. Update refund_requests: status=more_info_requested
2. Send email to contractor: "We need more info: [question]"
3. Create deadline: 7 days to respond
4. If no response after 7 days: Auto-deny
```

---

## 4. Refund Policy Configuration

### Admin Settings for Refund Rules

```
Admin Dashboard → Settings → Refund Policy

Configurable rules:
- Refund window: 30 days (default)
- Auto-approve for new contractors: Yes/No
- Require reason: Yes (required)
- Max refunds per contractor per month: 3
- Approval threshold: All must be manually reviewed
- Minimum conversion rate to auto-approve: 50% (if enabled)

Rules engine:
if (contractor.totalLeadsPurchased < 5) {
  // New contractor - require manual review
  status = "pending"
} else if (contractor.conversionRate > 0.5 && amount < 50) {
  // Good track record, small amount - auto-approve after 24h review
  status = "pending_auto_approval"
} else {
  // Standard flow
  status = "pending"
}
```

---

## 5. Fraud Detection

### Risk Scoring

```typescript
function calculateRefundRisk(contractor, refundRequest): number {
  let risk = 0;

  // Pattern 1: Multiple refunds in short timeframe
  const recentRefunds = contractor.refundRequests
    .filter(r => r.requestedDate > NOW() - 7.days)
    .length;
  if (recentRefunds > 2) risk += 30;

  // Pattern 2: High refund rate
  if (contractor.totalRefunds / contractor.totalLeadsPurchased > 0.3) risk += 25;

  // Pattern 3: Vague reason
  if (!refundRequest.notes || refundRequest.notes.length < 10) risk += 15;

  // Pattern 4: Unusual timing
  if (refundRequest.requestedDate === refundRequest.purchase_date) risk += 20;  // Same day refund

  // Pattern 5: High-value leads
  if (refundRequest.originalAmount > 100) risk += 10;

  return risk;
}

// Risk levels:
// 0-20: Low risk, can auto-approve
// 20-50: Medium risk, needs review
// 50+: High risk, flag for manual review + possible investigation
```

### Admin Dashboard Widget

```
"Refund Risk Monitor"
┌────────────────────────────────────┐
│ Contractor: HVAC Solutions Inc      │
│ Refund Rate: 20% (5 of 25 leads)   │
│ Risk Score: 35/100 (MEDIUM)        │
│                                    │
│ ⚠️ Flags:                          │
│ - Multiple refunds in past week (3) │
│ - Reason text is vague              │
│                                    │
│ Recommendation: Manual Review      │
└────────────────────────────────────┘
```

---

## 6. Audit Logging

### audit_logs Table

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,  -- "refund_requested", "refund_approved", "refund_denied"
  actor_id UUID REFERENCES app_profiles(id),  -- who did the action
  actor_role TEXT,  -- contractor, admin, etc
  resource_type TEXT,  -- refund_request, payment
  resource_id UUID,
  changes JSONB,  -- what changed
  details TEXT,  -- human readable description
  ip_address TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);
```

### Log Every Action

```typescript
// When contractor requests refund
await createAuditLog({
  action: "refund_requested",
  actor_id: contractorId,
  actor_role: "contractor",
  resource_type: "refund_request",
  resource_id: refundRequestId,
  changes: {
    status: "pending",
    reason: "no_response"
  },
  details: "Contractor requested refund for HVAC lead at 123 Main St"
});

// When admin approves
await createAuditLog({
  action: "refund_approved",
  actor_id: adminId,
  actor_role: "admin",
  resource_type: "refund_request",
  resource_id: refundRequestId,
  changes: {
    status: "approved",
    reviewed_by: adminId,
    reviewed_date: NOW()
  },
  details: "Admin approved $50 refund for contractor HVAC Solutions Inc"
});
```

---

## 7. Communications & Notifications

### Email Templates

#### Refund Request Submitted
```
To: contractor@hvac.com
Subject: Refund Request Submitted

Hi [Contractor Name],

We received your refund request for:
- Lead: [Address]
- System: [Type]
- Amount: $[Price]
- Reason: [Reason]

Your request is under review. We'll notify you of the outcome within 3-5 business days.

Refund Request ID: [ID]
```

#### Refund Approved
```
To: contractor@hvac.com
Subject: ✅ Refund Approved

Hi [Contractor Name],

Good news! Your refund request has been approved.

- Refund Amount: $[Price]
- Refund Status: Processing
- Expected in account: 3-5 business days (bank dependent)

Thank you for being a valued contractor partner.
```

#### Refund Denied
```
To: contractor@hvac.com
Subject: Refund Request Denied

Hi [Contractor Name],

Your refund request for [Address] has been reviewed and denied.

Reason: [Admin's reason]

If you'd like to discuss this further, please contact support@renewableenergyincentives.com
```

#### More Info Requested
```
To: contractor@hvac.com
Subject: More Information Needed for Refund Request

Hi [Contractor Name],

We need additional information for your refund request:

[Admin's question]

Please reply to this email within 7 days. If we don't hear from you, your request will be automatically denied.

Request ID: [ID]
```

### In-App Notifications

- Refund status badge in my-leads table (pending, approved, denied)
- Toast notification when refund is approved: "Refund approved! You'll see $X in your account in 3-5 days"
- Dashboard widget for admin: "3 pending refund requests"

---

## 8. Reporting & Analytics

### Admin Analytics Dashboard: Refunds Tab

```
Refunds Overview (Last 30 days):
┌────────────────────────────────────┐
│ Total Refunded: $1,250             │
│ Refund Rate: 8.5% (21 of 250 leads)│
│ Avg Refund Time: 2 days            │
│ Approval Rate: 71%                 │
│ Auto-approvals: 5                  │
│ Manual reviews: 16                 │
└────────────────────────────────────┘

Charts:
- Refund requests by reason (pie chart)
  * No response: 40%
  * Bad quality: 25%
  * Competitor: 20%
  * Other: 15%

- Refund timeline (line chart)
  * Days from request to approval

- Contractor refund rates (bar chart)
  * Top requesters
  * Approval rates by contractor

Table: Recent refunds
- Contractor | Amount | Reason | Status | Approved By | Date
```

---

## 9. Implementation Checklist for Phase 5

### Refund System
- [ ] Create refund_requests table + migrations
- [ ] Update payments table (refund tracking columns)
- [ ] Create RefundService.ts
  - [ ] requestRefund()
  - [ ] approveRefund() + Stripe integration
  - [ ] denyRefund()
  - [ ] requestMoreInfo()
  - [ ] calculateRefundRisk()
- [ ] API endpoints (all listed above)
- [ ] Refund request modal (contractor side)
- [ ] Refund requests dashboard (admin side)
- [ ] Email templates + EmailService updates
- [ ] Audit logging
- [ ] Fraud detection logic
- [ ] Analytics queries

### Testing
- [ ] Request refund flow end-to-end
- [ ] Approve refund + verify Stripe refund created
- [ ] Deny refund + verify email sent
- [ ] Request info flow
- [ ] Risk scoring accuracy
- [ ] Audit log creation
- [ ] Payment table updates

---

## 10. Timeline & Effort

**Estimated addition to Phase 5:**
- Database + migrations: 1 hour
- RefundService: 2 hours
- API endpoints: 2 hours
- Frontend components: 2 hours
- Email templates: 1 hour
- Audit logging: 1 hour
- Testing: 2 hours

**Total: ~11 hours** (can expand Phase 5)

---

## Summary

This gives you:
✅ Complete refund workflow (request → approve → refund → payment)
✅ Admin control over refund approvals
✅ Fraud detection to prevent abuse
✅ Full audit trail (who did what, when)
✅ Email notifications at each step
✅ Analytics to track refund trends
✅ Professional, compliant system

**This is payment operations done right.** 💰

