# Phase 5: Stripe Payment Integration Specification
## Complete Payment Flow Implementation

**Status:** Ready for Implementation  
**Priority:** HIGH (blocks Phase 6+)  
**Stripe Account:** support@rei.com (existing)

---

## Overview

Integrate Stripe for lead purchases:
- Contractors pay \$20-150 per system lead
- HES Affiliates pay \$10 per HES request
- Webhook handling for payment confirmations
- Recurring billing setup (future enhancement)

---

## Environment Setup

### 1. Stripe API Keys (Already Have)

Your support@ account should have:
- **Publishable Key** (pk_live_xxx)
- **Secret Key** (sk_live_xxx)
- **Webhook Signing Secret** (whsec_xxx)

**Add to .env.local:**
```bash
# Stripe Keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# For testing (optional, use test keys in development)
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
# STRIPE_SECRET_KEY=sk_test_xxx
# STRIPE_WEBHOOK_SECRET=whsec_test_xxx
```

### 2. Install Stripe Libraries

```bash
npm install stripe @stripe/react-stripe-js @stripe/js
```

### 3. Customer Tracking (Supabase)

Add to contractor_profiles table:
```sql
ALTER TABLE contractor_profiles ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE app_profiles ADD COLUMN stripe_customer_id TEXT;

-- Index for lookups
CREATE INDEX idx_stripe_customer_id ON contractor_profiles(stripe_customer_id);
CREATE INDEX idx_stripe_customer_id_app ON app_profiles(stripe_customer_id);
```

Add to payments table:
```sql
ALTER TABLE payments ADD COLUMN stripe_payment_intent_id TEXT;
ALTER TABLE payments ADD COLUMN stripe_charge_id TEXT;
```

---

## Implementation Steps

### Step 1: Create Stripe Service

**File:** `src/lib/services/StripeService.ts`

```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export class StripeService {
  /**
   * Create or retrieve Stripe customer for contractor
   */
  static async getOrCreateCustomer(contractorId: string, email: string, name: string) {
    // Check if customer exists in DB
    const { data: profile } = await supabaseAdmin
      .from('contractor_profiles')
      .select('stripe_customer_id')
      .eq('id', contractorId)
      .single();

    if (profile?.stripe_customer_id) {
      return profile.stripe_customer_id;
    }

    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: { contractor_id: contractorId },
    });

    // Save to DB
    await supabaseAdmin
      .from('contractor_profiles')
      .update({ stripe_customer_id: customer.id })
      .eq('id', contractorId);

    return customer.id;
  }

  /**
   * Create payment intent for lead purchase
   * Returns client secret for frontend
   */
  static async createPaymentIntent(
    contractorId: string,
    leadId: string,
    amount: number,
    leadType: 'system_lead' | 'hes_request'
  ) {
    const customerId = await this.getOrCreateCustomer(contractorId, '', '');

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      customer: customerId,
      metadata: {
        contractor_id: contractorId,
        lead_id: leadId,
        lead_type: leadType,
      },
      description: `${leadType === 'system_lead' ? 'System Lead' : 'HES Request'} Purchase`,
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  }

  /**
   * Confirm payment after client-side processing
   */
  static async confirmPayment(paymentIntentId: string) {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (intent.status !== 'succeeded') {
      throw new Error(`Payment failed: ${intent.status}`);
    }

    return {
      status: intent.status,
      amount: intent.amount / 100,
      chargeId: intent.charges.data[0]?.id,
    };
  }

  /**
   * Refund a purchase
   */
  static async refundPayment(paymentIntentId: string, reason: string = 'requested_by_customer') {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason: reason as any,
    });

    return refund;
  }

  /**
   * Verify webhook signature
   */
  static verifyWebhookSignature(body: string, signature: string) {
    try {
      const event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
      return event;
    } catch (err) {
      throw new Error(`Webhook signature verification failed: ${(err as Error).message}`);
    }
  }
}
```

---

### Step 2: Update Lead Purchase Endpoints

**File:** `src/app/api/v1/contractor/system-leads/[id]/purchase/route.ts`

```typescript
import { StripeService } from '@/lib/services/StripeService';
import { LeadService } from '@/lib/services/LeadService';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { leadId } = params;
    const user = await getUser(); // From auth middleware
    const contractorId = user.id;

    // Get lead details
    const lead = await LeadService.getSystemLead(leadId);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (lead.status !== 'available') {
      return NextResponse.json({ error: 'Lead no longer available' }, { status: 409 });
    }

    // Create Stripe payment intent
    const { clientSecret, paymentIntentId } = await StripeService.createPaymentIntent(
      contractorId,
      leadId,
      lead.price,
      'system_lead'
    );

    // Return client secret (frontend will handle payment)
    return NextResponse.json({
      clientSecret,
      paymentIntentId,
      amount: lead.price,
      lead: {
        id: lead.id,
        address: lead.address,
        systemType: lead.system_type,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
```

---

### Step 3: Create Webhook Handler

**File:** `src/app/api/v1/webhooks/stripe/route.ts`

```typescript
import { StripeService } from '@/lib/services/StripeService';
import { LeadService } from '@/lib/services/LeadService';

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  try {
    // Verify webhook signature
    const event = StripeService.verifyWebhookSignature(body, signature);

    // Handle payment.intent.succeeded
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const { contractor_id, lead_id, lead_type } = paymentIntent.metadata as any;

      // Record payment
      await supabaseAdmin.from('payments').insert({
        contractor_id,
        system_lead_id: lead_type === 'system_lead' ? lead_id : null,
        hes_request_id: lead_type === 'hes_request' ? lead_id : null,
        amount: paymentIntent.amount / 100,
        system_type: lead_type,
        stripe_transaction_id: paymentIntent.id,
        stripe_payment_intent_id: paymentIntent.id,
        stripe_charge_id: paymentIntent.charges.data[0]?.id,
        status: 'completed',
      });

      // Update lead status to purchased
      if (lead_type === 'system_lead') {
        await LeadService.markAsPurchased(lead_id, contractor_id);
      } else if (lead_type === 'hes_request') {
        await HESService.markAsPurchased(lead_id, contractor_id);
      }

      // Send confirmation email
      await sendPaymentConfirmationEmail(contractor_id, lead_id, paymentIntent.amount / 100);
    }

    // Handle payment.intent.payment_failed
    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const { contractor_id, lead_id } = paymentIntent.metadata as any;

      // Record failed payment
      await supabaseAdmin.from('payments').insert({
        contractor_id,
        system_lead_id: lead_id,
        amount: paymentIntent.amount / 100,
        stripe_transaction_id: paymentIntent.id,
        status: 'failed',
      });

      // Send failure notification
      await sendPaymentFailureEmail(contractor_id, paymentIntent.last_payment_error?.message);
    }

    // Handle charge.refunded
    if (event.type === 'charge.refunded') {
      const charge = event.data.object as Stripe.Charge;
      
      // Update payment status
      await supabaseAdmin
        .from('payments')
        .update({ status: 'refunded', refunded_date: new Date() })
        .eq('stripe_charge_id', charge.id);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
```

---

### Step 4: Frontend Payment Component

**File:** `src/components/dashboard/StripePaymentForm.tsx`

```typescript
'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export function PurchaseLeadDialog({ lead, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Purchase Lead</h2>

        <div className="mb-6 p-4 bg-gray-700 rounded">
          <p className="text-sm text-gray-300">Address</p>
          <p className="font-semibold">{lead.address}</p>
          <p className="text-sm text-gray-300 mt-2">System Type</p>
          <p className="font-semibold">{lead.system_type}</p>
          <div className="border-t border-gray-600 mt-4 pt-4">
            <p className="text-sm text-gray-300">Price</p>
            <p className="text-2xl font-bold text-green-500">${lead.price}</p>
          </div>
        </div>

        <Elements stripe={stripePromise}>
          <StripePaymentForm
            leadId={lead.id}
            price={lead.price}
            onLoading={setLoading}
            onError={setError}
            onSuccess={() => {
              onSuccess();
              onClose();
            }}
          />
        </Elements>

        {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

        <button
          onClick={onClose}
          className="w-full mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Cancel'}
        </button>
      </div>
    </div>
  );
}

function StripePaymentForm({ leadId, price, onLoading, onError, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [clientSecret, setClientSecret] = useState('');

  // Step 1: Request client secret from backend
  const initializePayment = async () => {
    const res = await fetch(`/api/v1/contractor/system-leads/${leadId}/purchase`, {
      method: 'POST',
    });
    const data = await res.json();
    setClientSecret(data.clientSecret);
  };

  // Step 2: Handle payment submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onLoading(true);

    if (!stripe || !elements) {
      onError('Stripe not loaded');
      onLoading(false);
      return;
    }

    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement)!,
        billing_details: { email: 'contractor@example.com' },
      },
    });

    if (result.error) {
      onError(result.error.message || 'Payment failed');
      onLoading(false);
    } else if (result.paymentIntent?.status === 'succeeded') {
      onSuccess();
      onLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {!clientSecret ? (
        <button
          type="button"
          onClick={initializePayment}
          className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold"
        >
          Proceed to Payment
        </button>
      ) : (
        <>
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#f3f4f6',
                  backgroundColor: '#1f2937',
                },
              },
            }}
          />
          <button
            type="submit"
            disabled={!stripe}
            className="w-full mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold disabled:opacity-50"
          >
            Pay ${price}
          </button>
        </>
      )}
    </form>
  );
}
```

---

### Step 5: Update PurchaseDialog Component

**File:** `src/components/dashboard/PurchaseDialog.tsx` (Update existing)

```typescript
'use client';

import { useState } from 'react';
import { StripePaymentForm } from './StripePaymentForm';

export function PurchaseDialog({ lead, isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState<'confirm' | 'payment'>('confirm');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6">Purchase Lead</h2>

        {step === 'confirm' ? (
          <>
            <div className="mb-6 p-4 bg-gray-700 rounded-lg space-y-4">
              <div>
                <p className="text-sm text-gray-300">Address</p>
                <p className="font-semibold text-lg">{lead.address}</p>
              </div>
              <div>
                <p className="text-sm text-gray-300">System Type</p>
                <p className="font-semibold">{lead.system_type}</p>
              </div>
              <div className="border-t border-gray-600 pt-4">
                <p className="text-sm text-gray-300">Price</p>
                <p className="text-3xl font-bold text-green-500">${lead.price}</p>
              </div>
            </div>

            <p className="text-gray-300 text-sm mb-6">
              After purchase, you'll receive full contact details and LEAF report information.
            </p>

            <button
              onClick={() => setStep('payment')}
              className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold mb-3"
            >
              Continue to Payment
            </button>

            <button
              onClick={onClose}
              className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold"
            >
              Cancel
            </button>
          </>
        ) : (
          <StripePaymentForm
            leadId={lead.id}
            price={lead.price}
            onBack={() => setStep('confirm')}
            onSuccess={onSuccess}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}
```

---

### Step 6: Configure Webhook in Stripe

**Manual Setup (One-time):**

1. Go to: https://dashboard.stripe.com/webhooks
2. Add endpoint: `https://yourdomain.com/api/v1/webhooks/stripe`
3. Events to listen:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
4. Copy webhook signing secret → Add to `.env.local` as `STRIPE_WEBHOOK_SECRET`

---

### Step 7: Create Payment Confirmation Email Service

**File:** `src/lib/services/EmailService.ts`

```typescript
export async function sendPaymentConfirmationEmail(
  contractorId: string,
  leadId: string,
  amount: number
) {
  // Get contractor email
  const { data: contractor } = await supabaseAdmin
    .from('contractor_profiles')
    .select('email')
    .eq('id', contractorId)
    .single();

  if (!contractor?.email) return;

  // Get lead details
  const { data: lead } = await supabaseAdmin
    .from('system_leads')
    .select('address, system_type, homeowner_name, homeowner_phone, homeowner_email')
    .eq('id', leadId)
    .single();

  // Send email with Resend or SendGrid
  await sendEmail({
    to: contractor.email,
    subject: `Lead Purchase Confirmation - ${lead.system_type}`,
    html: `
      <h2>Lead Purchase Successful!</h2>
      <p>You've successfully purchased a ${lead.system_type} lead.</p>
      
      <h3>Lead Details:</h3>
      <ul>
        <li><strong>Address:</strong> ${lead.address}</li>
        <li><strong>Homeowner:</strong> ${lead.homeowner_name}</li>
        <li><strong>Phone:</strong> ${lead.homeowner_phone}</li>
        <li><strong>Email:</strong> ${lead.homeowner_email}</li>
      </ul>
      
      <h3>Payment:</h3>
      <p><strong>Amount:</strong> $${amount}</p>
      <p>Your account has been charged. This is your receipt.</p>
      
      <p>Contact the homeowner soon — they're ready for an estimate!</p>
    `,
  });
}

export async function sendPaymentFailureEmail(contractorId: string, reason: string) {
  const { data: contractor } = await supabaseAdmin
    .from('contractor_profiles')
    .select('email')
    .eq('id', contractorId)
    .single();

  if (!contractor?.email) return;

  await sendEmail({
    to: contractor.email,
    subject: 'Payment Failed',
    html: `
      <h2>Payment Failed</h2>
      <p>Your recent lead purchase failed.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>Please try again or contact support.</p>
    `,
  });
}
```

---

## Testing Checklist

### Local Testing (Use Stripe Test Keys)

```bash
# Add test keys to .env.local
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_test_xxx

# Test credit card numbers:
4242 4242 4242 4242 — Success
4000 0025 0000 3155 — Decline
4000 0000 0000 0002 — Decline CVC
```

### Test Flows

1. **Happy Path:** Contractor purchases lead → Payment succeeds → Lead unlocked
2. **Failure:** Payment declines → Error shown → Lead remains available
3. **Webhook:** Payment webhook received → Lead marked purchased → Email sent
4. **Refund:** Admin refunds payment → Payment status updated → Email sent

---

## Production Deployment

### Pre-launch Checklist

- [ ] Stripe account fully set up (support@ email verified)
- [ ] Live Stripe keys in production `.env` (NOT in code)
- [ ] Webhook endpoint live and responding to Stripe events
- [ ] Email service configured (Resend/SendGrid)
- [ ] Payment success/failure flows tested end-to-end
- [ ] Contractor confirmation emails working
- [ ] Admin dashboard shows payments correctly
- [ ] Error handling for edge cases (duplicate payments, race conditions)
- [ ] Rate limiting on payment endpoint
- [ ] PCI compliance verified

### Monitoring

```bash
# Monitor webhook deliveries
curl https://api.stripe.com/v1/events?type=payment_intent.succeeded \
  -u sk_live_xxx:

# Test webhook endpoint
curl -X POST https://yourdomain.com/api/v1/webhooks/stripe \
  -H "stripe-signature: SIGNATURE_FROM_STRIPE"
```

---

## Implementation Order for Claude CLI

1. Create StripeService.ts (payment intent creation, refunds, webhook verification)
2. Update API endpoints (POST /contractor/system-leads/[id]/purchase)
3. Create webhook handler (POST /webhooks/stripe)
4. Update PurchaseDialog.tsx component (integration with Stripe Elements)
5. Create StripePaymentForm.tsx component (CardElement, payment submission)
6. Add database migrations (stripe_customer_id columns, payment records)
7. Create EmailService.ts (confirmation + failure emails)
8. Create tests for payment flows

---

## Summary

**What CLI will build:**
- ✅ Stripe integration (payment intents, customers, refunds)
- ✅ Payment endpoints for contractors + affiliates
- ✅ Webhook handler for payment confirmations
- ✅ Frontend payment UI (CardElement, confirmation dialog)
- ✅ Email confirmations
- ✅ Database updates for payments
- ✅ Error handling + edge cases
- ✅ Monitoring + logging

**Result:** Full payment flow end-to-end, ready for production.

