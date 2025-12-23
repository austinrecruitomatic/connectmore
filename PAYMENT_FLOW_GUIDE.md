# Complete Payment Flow Documentation

## Overview

This system implements a complete end-to-end payment flow from customer purchase to affiliate payout:

**Customer → Company → Platform → Affiliate**

## Payment Flow Steps

### 1. Customer Makes Payment

**How it works:**
- Company generates a payment link through the "Payment Links" tab
- Company selects a product and enters the sale amount
- System calculates commission breakdown automatically
- Company shares the payment link with customer
- Customer pays through Stripe Checkout

**What happens:**
- Customer payment record is created in `customer_payments` table
- Stripe Checkout Session is created via `customer-checkout` edge function
- Payment status tracked: `pending` → `processing` → `succeeded`

**Files involved:**
- `/app/(tabs)/payment-links.tsx` - UI for generating payment links
- `/supabase/functions/customer-checkout/index.ts` - Creates Stripe checkout
- `/supabase/functions/stripe-webhooks/index.ts` - Handles payment success

### 2. Deal Auto-Creation

**How it works:**
- When customer payment succeeds, webhook automatically creates a deal
- Deal is linked to the partnership (affiliate + product)
- Commission is calculated based on product settings

**What happens:**
- `checkout.session.completed` webhook fires
- Deal record created in `deals` table
- Commission record created in `commissions` table
- Reconciliation record started in `payment_reconciliation` table

**Automatic calculations:**
- Deal value = Customer payment amount
- Affiliate commission = Deal value × commission rate
- Platform fee = Calculated based on company settings
- Commission status = `pending` (awaiting company approval)

### 3. Company Reviews & Approves Commission

**How it works:**
- Company sees the deal in their "Deals" tab
- Company can review deal details and payment confirmation
- Company approves the commission when ready

**What happens:**
- Commission status changes: `pending` → `approved`
- Commission becomes payable by company
- Company's outstanding balance increases
- Reconciliation record updated

**Files involved:**
- `/app/(tabs)/deals.tsx` - Deal management interface
- Database trigger updates company outstanding balance

### 4. Company Pays Commission to Platform

**How it works:**
- Company navigates to "Pay Commissions" tab
- Views all approved commissions awaiting payment
- Selects commissions to pay (single or batch)
- System shows breakdown of what company owes
- Redirects to Stripe Checkout to pay

**What happens:**
- Company commission payment record created
- Stripe Checkout Session created via `company-pay-commissions` function
- Company pays through Stripe
- Webhook updates payment status
- Commissions marked as paid by company
- Platform treasury updated with received funds
- Reconciliation records updated

**Files involved:**
- `/app/(tabs)/pay-commissions.tsx` - Company payment interface
- `/supabase/functions/company-pay-commissions/index.ts` - Payment processing
- `/supabase/functions/stripe-webhooks/index.ts` - Handles payment webhooks

### 5. Platform Pays Affiliate

**How it works:**
- Platform uses existing Stripe Connect integration
- Commissions are paid out on affiliate's schedule
- Funds transferred to affiliate's connected Stripe account

**What happens:**
- Payout record created in `payouts` table
- Stripe Transfer initiated to affiliate's Connect account
- Transfer webhook updates payout status
- Commission marked as `paid`
- Reconciliation record marked as `fully_settled`
- Platform treasury updated with payout

**Files involved:**
- `/supabase/functions/process-scheduled-payouts/index.ts` - Automated payouts
- Existing Stripe Connect infrastructure

## Database Tables

### New Tables

1. **customer_payments** - Tracks customer purchases
   - Links to products, partnerships, and deals
   - Stores Stripe payment IDs
   - Records payment status and amounts

2. **company_commission_payments** - Tracks company payments to platform
   - Links to multiple commissions (batch payments)
   - Stores Stripe payment transaction IDs
   - Records total amounts paid

3. **platform_treasury** - Platform financial tracking
   - Records all money movements
   - Tracks commission receipts and affiliate payouts
   - Calculates platform fees collected

4. **payment_reconciliation** - Links entire payment chain
   - Connects customer payment → deal → commission → payout
   - Tracks status at each step
   - Identifies fully settled vs pending transactions

5. **payment_audit_log** - Complete audit trail
   - Immutable record of all payment events
   - Tracks webhook events and manual actions
   - Provides compliance documentation

6. **company_payment_methods** - Saved payment methods
   - Stores Stripe payment method IDs
   - Supports future auto-pay feature

### Updated Tables

- **commissions** - Added `company_payment_status`, `company_paid_at`, `company_commission_payment_id`
- **deals** - Added `customer_payment_id`, `payment_verified`, `stripe_payment_intent_id`
- **companies** - Added `outstanding_commission_balance`, `stripe_customer_id`

## Edge Functions

### 1. customer-checkout
**Purpose:** Creates Stripe Checkout Session for customer payments
**Authentication:** None (public endpoint)
**Input:**
```json
{
  "product_id": "uuid",
  "partnership_id": "uuid",
  "amount": 100.00,
  "customer_email": "customer@example.com",
  "success_url": "https://...",
  "cancel_url": "https://..."
}
```
**Output:**
```json
{
  "session_id": "cs_...",
  "session_url": "https://checkout.stripe.com/...",
  "customer_payment_id": "uuid"
}
```

### 2. company-pay-commissions
**Purpose:** Creates payment session for companies to pay commissions
**Authentication:** Required (JWT)
**Input:**
```json
{
  "commission_ids": ["uuid1", "uuid2"],
  "payment_method_id": "pm_..." (optional),
  "success_url": "https://...",
  "cancel_url": "https://..."
}
```
**Output:**
```json
{
  "session_id": "cs_...",
  "session_url": "https://checkout.stripe.com/...",
  "payment_id": "uuid"
}
```

### 3. stripe-webhooks (Updated)
**Purpose:** Handles all Stripe payment webhooks
**New Events Handled:**
- `checkout.session.completed` - Customer and company payments
- `payment_intent.succeeded` - Direct payment success
- `payment_intent.payment_failed` - Payment failures
- `charge.refunded` - Refund processing

## User Interface

### For Companies

1. **Payment Links Tab** (`/app/(tabs)/payment-links.tsx`)
   - Generate payment links with commission preview
   - Share links with customers
   - See commission breakdown before sending

2. **Pay Commissions Tab** (`/app/(tabs)/pay-commissions.tsx`)
   - View outstanding balance
   - Select commissions to pay
   - Batch payment support
   - Payment history with receipts

3. **Deals Tab** (Updated)
   - Auto-created deals from customer payments
   - Payment verification status
   - Commission approval workflow

### For Platform Admins

4. **Platform Treasury Tab** (`/app/(tabs)/platform-treasury.tsx`)
   - Financial overview dashboard
   - Treasury transaction history
   - Reconciliation status tracking
   - Real-time balance calculations

### For Affiliates

- Existing commission and payout interfaces
- Updated to show company payment status
- Clear visibility into payment chain

## Security & Compliance

### Row Level Security (RLS)
- Companies can only see their own payments and commissions
- Affiliates can only see their commission payment status
- Platform admins have full visibility
- All audit logs are accessible to relevant parties

### Payment Security
- All payments processed through Stripe
- PCI compliance handled by Stripe
- Webhook signature verification
- Idempotency keys prevent duplicate payments
- Secure storage of payment method IDs

### Audit Trail
- Every payment event logged
- Immutable audit records
- Webhook events tracked with Stripe IDs
- Manual actions attributed to users

## Money Flow Example

**Example Transaction: $1,000 Sale**

1. **Customer pays $1,000** to company for product
   - Customer → Stripe → Company bank account
   - Customer payment record created

2. **Commission calculated** (assuming 20% commission, 5% platform fee)
   - Affiliate commission: $200 (20% of $1,000)
   - Platform fee: $50 (5% of $1,000)
   - Total company owes: $250

3. **Company pays $250** to platform
   - Company → Stripe → Platform account
   - Commission payment record created
   - Platform treasury: +$250

4. **Platform pays $200** to affiliate
   - Platform → Stripe Connect → Affiliate account
   - Payout record created
   - Platform treasury: -$200

5. **Platform keeps $50** as platform fee
   - Net platform revenue: $50
   - Transaction fully reconciled

## Reconciliation Dashboard

The platform treasury dashboard shows:

- **Total Received:** All commission payments from companies
- **Total Paid Out:** All payouts to affiliates
- **Platform Revenue:** Total platform fees collected
- **Current Balance:** Available funds for payouts
- **Pending Payouts:** Approved but not yet paid to affiliates
- **Reconciliation Status:** Fully settled vs pending transactions

## Testing the Flow

### End-to-End Test

1. **Generate Payment Link**
   - Login as company user
   - Navigate to "Payment Links" tab
   - Select product and enter amount
   - Share generated link

2. **Process Customer Payment**
   - Open payment link
   - Complete Stripe checkout
   - Verify deal auto-creation
   - Check commission calculation

3. **Approve Commission**
   - Navigate to "Deals" tab
   - Review deal details
   - Approve commission

4. **Pay Commission**
   - Navigate to "Pay Commissions" tab
   - Select approved commission
   - Complete Stripe checkout
   - Verify payment record

5. **Verify Reconciliation**
   - Login as super admin
   - Navigate to "Platform Treasury" tab
   - Check reconciliation status
   - Verify all steps marked complete

## Configuration Requirements

### Environment Variables
All automatically configured by Supabase:
- `STRIPE_SECRET_KEY` - Stripe API key
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret
- `SUPABASE_URL` - Database URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role for functions

### Stripe Configuration
1. **Webhook Endpoints:**
   - Add webhook URL: `{SUPABASE_URL}/functions/v1/stripe-webhooks`
   - Subscribe to events: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, `transfer.created`, `transfer.paid`, `transfer.failed`

2. **Connect Platform:**
   - Already configured for affiliate payouts
   - Same platform used for all payments

## Future Enhancements

### Automatic Payments
- Save payment methods for auto-pay
- Schedule automatic commission payments
- Recurring subscription support

### Advanced Reconciliation
- Export financial reports
- Automated accounting integration
- Tax documentation generation

### Dispute Handling
- Refund workflow with commission adjustments
- Dispute resolution interface
- Chargeback management

## Support & Troubleshooting

### Common Issues

**Payment link not working:**
- Verify product is active
- Check partnership exists
- Ensure amount is valid

**Commission not auto-created:**
- Check webhook delivery in Stripe
- Verify customer payment succeeded
- Review audit logs for errors

**Company payment failing:**
- Verify commission is approved
- Check Stripe customer setup
- Review payment method validity

**Reconciliation not complete:**
- Check each step in payment chain
- Review webhook event history
- Verify all status updates processed

### Monitoring

Check these locations for issues:
1. Stripe Dashboard - Payment and webhook logs
2. Supabase Edge Function Logs - Function execution errors
3. `payment_audit_log` table - Complete event history
4. Platform Treasury Dashboard - Financial reconciliation status
