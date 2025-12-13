# Stripe Connect Integration Setup Guide

This guide will help you complete the Stripe Connect integration for automated affiliate payouts.

## Overview

Your affiliate portal now supports automated payouts via Stripe Connect! Affiliates can:
- Connect their bank account or debit card
- Choose their payout frequency (weekly, bi-weekly, monthly, or custom)
- Set minimum payout thresholds
- Receive automated transfers based on their preferences
- Choose between standard ACH (free) or instant payouts (1% fee)

## Prerequisites

1. **Stripe Account**: You need a Stripe account. Sign up at https://stripe.com
2. **Stripe API Keys**: Get your test and live API keys from the Stripe Dashboard
3. **Webhook Endpoint**: You'll need to configure webhooks in Stripe

## Setup Steps

### 1. Configure Stripe API Keys

Update your `.env` file with your Stripe keys:

```
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_SECRET_KEY=sk_test_your_key_here
```

**Important**:
- Use `pk_test_` and `sk_test_` keys for testing
- Switch to `pk_live_` and `sk_live_` keys for production
- Never commit real API keys to your repository

### 2. Set Up Stripe Webhooks

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter your webhook URL: `https://your-supabase-project.supabase.co/functions/v1/stripe-webhooks`
4. Select these events to listen for:
   - `transfer.created`
   - `transfer.paid`
   - `transfer.failed`
   - `account.updated`
   - `payout.paid`
   - `payout.failed`
5. Copy the webhook signing secret
6. Add it to your Supabase Edge Function secrets:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   ```

### 3. Configure Environment Variables in Supabase

Add these environment variables to your Supabase Edge Functions:

1. Go to your Supabase project dashboard
2. Navigate to Edge Functions settings
3. Add the following secrets:
   - `STRIPE_SECRET_KEY`: Your Stripe secret key
   - `STRIPE_WEBHOOK_SECRET`: Your webhook signing secret
   - `APP_URL`: Your app's URL (for redirect URLs)
   - `CRON_SECRET`: A secret token for the scheduled payout cron job (generate a random string)

### 4. Set Up Scheduled Payouts (Optional)

To automatically process payouts on a schedule, set up a cron job:

#### Option A: Using Supabase Cron (Recommended)
If your Supabase plan supports pg_cron, create a scheduled job:

```sql
SELECT cron.schedule(
  'process-scheduled-payouts',
  '0 2 * * *', -- Run at 2 AM daily
  $$
  SELECT
    net.http_post(
      url:='https://your-project.supabase.co/functions/v1/process-scheduled-payouts',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer your-cron-secret"}'::jsonb,
      body:='{}'::jsonb
    ) AS request_id;
  $$
);
```

#### Option B: Using External Cron Service
Use a service like GitHub Actions, AWS Lambda, or cron-job.org to hit your endpoint daily:

```
POST https://your-project.supabase.co/functions/v1/process-scheduled-payouts
Headers:
  Authorization: Bearer your-cron-secret
```

### 5. Enable Stripe Connect in Your Dashboard

1. Log into your Stripe Dashboard
2. Go to Settings → Connect
3. Enable Connect if not already enabled
4. Configure your platform settings:
   - Platform name: Your company name
   - Support email: Your support email
   - Brand color and logo (optional)

### 6. Test the Integration

#### Test Affiliate Onboarding:
1. Create an affiliate account in your app
2. Navigate to the Payouts tab
3. Click "Setup Required" to start Stripe Connect onboarding
4. Use Stripe's test mode to complete verification without real information
5. Test bank account: Use routing number `110000000` and account number `000123456789`

#### Test Payout Processing:
1. Create a test commission for the affiliate
2. Approve the commission
3. Either wait for the scheduled payout or manually trigger it:
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/process-scheduled-payouts \
     -H "Authorization: Bearer your-cron-secret"
   ```
4. Check the Stripe Dashboard for the transfer
5. Verify the payout appears in your app's Payouts tab

### 7. Webhook Testing

Test webhooks locally using Stripe CLI:

```bash
# Install Stripe CLI
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhooks

# Trigger test events
stripe trigger transfer.paid
stripe trigger account.updated
```

## Features

### For Affiliates:
- **Stripe Connect Onboarding**: Secure bank account connection
- **Payout Dashboard**: View pending earnings, payout history, and next scheduled payout
- **Customizable Settings**:
  - Payout frequency (weekly, bi-weekly, monthly, custom)
  - Minimum payout threshold ($10-$500)
  - Payout method (standard ACH free, instant for 1% fee)
  - Auto-payout toggle
  - Notification preferences

### For Platform Admins:
- **Automated Processing**: Payouts are processed automatically based on affiliate preferences
- **Retry Logic**: Failed transfers are tracked and can be retried
- **Audit Trail**: Complete history of all payout events
- **Real-time Status**: Webhook integration keeps status updated in real-time

## Payout Methods Explained

### Standard ACH (Bank Transfer)
- **Cost**: Free
- **Speed**: 2-3 business days
- **Best for**: Regular scheduled payouts

### Instant ACH
- **Cost**: 1% of transfer amount
- **Speed**: Arrives in 30 minutes
- **Limits**: $1 - $100,000 per transfer
- **Best for**: Urgent payouts

### Instant to Debit Card
- **Cost**: 1% of transfer amount
- **Speed**: Arrives in 30 minutes
- **Limits**: $1 - $5,000 per transfer
- **Best for**: Quick access to smaller amounts

## Security & Compliance

### Data Security:
- Affiliate bank information is stored securely by Stripe
- Only last 4 digits are displayed in your app
- PCI compliance handled by Stripe

### Tax Reporting:
- Consider implementing 1099 generation for US affiliates earning over $600/year
- Track all payouts for tax reporting purposes
- Consult with a tax professional for your specific requirements

## Troubleshooting

### Affiliates Can't Complete Onboarding:
- Ensure Stripe Connect is enabled in your dashboard
- Check that `APP_URL` environment variable is set correctly
- Verify API keys are correct and not expired

### Payouts Not Processing:
- Check that the cron job is running
- Verify `STRIPE_SECRET_KEY` is set in Edge Functions
- Check Supabase logs for error messages
- Ensure affiliates have completed Stripe verification

### Webhooks Not Working:
- Verify webhook endpoint URL is correct
- Check `STRIPE_WEBHOOK_SECRET` is configured
- Review webhook logs in Stripe Dashboard
- Ensure Edge Function is deployed

### Failed Transfers:
- Check affiliate's Stripe account status
- Verify bank account details are correct
- Review failure reason in payout details
- Some banks may block electronic transfers initially

## Going Live

Before launching to production:

1. **Switch to Live Keys**:
   - Replace test API keys with live keys
   - Update webhook endpoint to use live keys
   - Test with real bank account (small amount)

2. **Legal & Compliance**:
   - Add terms of service for payouts
   - Include payout schedule in affiliate agreement
   - Ensure compliance with local banking regulations

3. **Communication**:
   - Email affiliates about new payout system
   - Provide onboarding guide and FAQ
   - Set up support channel for payout questions

4. **Monitoring**:
   - Set up alerts for failed payouts
   - Monitor Stripe Dashboard regularly
   - Review audit logs weekly

## Support & Resources

- **Stripe Connect Documentation**: https://stripe.com/docs/connect
- **Stripe API Reference**: https://stripe.com/docs/api
- **Stripe Testing**: https://stripe.com/docs/testing
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions

## Cost Breakdown

### Stripe Fees:
- **Standard ACH**: $0 (free for platform)
- **Instant Payouts**: 1% charged to affiliate
- **Connect Account**: $0/month
- **Transfers**: Volume-based (contact Stripe for details)

### Best Practices:
- Encourage affiliates to use standard ACH to minimize costs
- Set reasonable minimum thresholds to reduce transfer frequency
- Monitor failed transfers to avoid unnecessary retry fees

---

**Questions or Issues?**
Check the Stripe Dashboard logs and Supabase Edge Function logs for detailed error messages. Most issues can be resolved by verifying environment variables and API key configurations.
