# Payment & Commission System Guide

## Overview

This affiliate platform includes a complete commission tracking and payout system that allows:
- Companies to track deals and generate commissions
- Affiliates to earn money and receive payments
- Super admins to manage and process payouts

## Payment Workflows

### Option 1: Manual Payments (Current Default)

This is the simpler approach that works right out of the box:

1. **Affiliate Signs Up**
   - Affiliate configures payment method in Profile settings
   - Options: Bank Transfer, PayPal, Stripe, Venmo, Wise, or Other
   - Enters payment details (email, account number, etc.)

2. **Company Creates Deal**
   - When a lead converts, company creates a deal
   - System automatically calculates commission based on partnership terms
   - Commission is marked as "pending" and needs approval

3. **Company Approves Commission**
   - Company reviews and approves the commission
   - Commission moves to "approved" status
   - Affiliate can see approved commissions in their dashboard

4. **System Creates Payout**
   - Payouts are batched (default: every 30 days)
   - System combines multiple approved commissions into one payout
   - Payout is marked as "scheduled"

5. **Admin Processes Payout**
   - Super admin logs into Admin Dashboard
   - Views pending payouts with affiliate payment details
   - Processes payment manually via:
     - Bank transfer
     - PayPal
     - Venmo
     - Or any other method affiliate configured
   - Marks payout as "completed" with transaction notes
   - System automatically marks all commissions as "paid"

### Option 2: Automated Payments (Stripe Connect - Future Enhancement)

For automated payouts, you can integrate Stripe Connect:

1. **Setup Requirements**
   - Create Stripe Connect account
   - Configure webhook endpoints
   - Store Stripe account IDs for each affiliate

2. **Automated Flow**
   - When payout is scheduled, system automatically:
   - Creates Stripe Transfer
   - Sends money to affiliate's connected Stripe account
   - Marks payout as completed
   - Notifies affiliate

3. **Implementation**
   - Add Stripe Connect onboarding for affiliates
   - Create Supabase Edge Function for payout processing
   - Set up Stripe webhooks for transfer confirmations

## Platform Fee Structure

The platform takes a percentage of each commission:

- **Commission Amount**: What company pays (e.g., 10% of deal value)
- **Platform Fee**: Your cut (default: 20% of commission)
- **Affiliate Payout**: What affiliate receives (80% of commission)

Example:
- Deal Value: $1,000
- Commission Rate: 10% = $100
- Platform Fee (20%): $20
- Affiliate Receives: $80

## Super Admin Setup

### Creating Your First Super Admin

To make a user a super admin, you need to update their profile in the database:

```sql
-- Replace 'user-id-here' with the actual user ID
UPDATE profiles
SET is_super_admin = true
WHERE email = 'admin@example.com';
```

You can do this through:
1. Supabase Dashboard SQL Editor
2. Database management tool
3. Or using the SQL execution tool

### Admin Capabilities

Super admins can:
- View all companies, affiliates, and partnerships
- Approve/reject commissions
- Process payouts to affiliates
- View all deals and contact submissions
- Access platform-wide analytics
- See affiliate payment methods and details

## Payout Management

### Processing a Payout

1. Go to Admin Dashboard → Manage Payouts
2. Review scheduled payouts
3. For each payout:
   - Verify affiliate payment method
   - Note the payout amount
   - Process payment through selected method
   - Add transaction details in notes field
   - Mark as "Completed"

### Payout Statuses

- **Scheduled**: Ready to be paid, waiting for admin action
- **Processing**: Admin has started payment process
- **Completed**: Payment sent, commissions marked as paid
- **Failed**: Payment failed, needs attention

## Commission Types

### Initial Commissions
- One-time payment when deal is first closed
- Based on initial contract value

### Recurring Commissions
- Ongoing payments for subscription/recurring deals
- Generated automatically based on billing frequency
- Paid out each billing period while deal is active

## Security & Access Control

### Row Level Security (RLS)

All data is protected with RLS policies:
- Affiliates can only see their own data
- Companies can only see their own data
- Super admins can see everything
- Payment details are encrypted and only visible to admins during payout

### Payment Data Protection

- Payment details stored in encrypted JSONB field
- Only super admins can access during payout processing
- Never exposed in public APIs or to other users

## Database Schema

### Key Tables

1. **profiles** - User accounts with payment settings
2. **companies** - Company information
3. **affiliate_partnerships** - Relationships between affiliates and companies
4. **deals** - Closed contracts
5. **commissions** - Individual commission records
6. **payouts** - Batched payments to affiliates
7. **company_settings** - Commission rates and platform fees

## Analytics & Reporting

### For Companies
- Track all partnerships
- View lead conversion rates
- Monitor commission spend
- Review deal performance

### For Affiliates
- Track clicks and conversions
- View pending/approved commissions
- See payout history
- Monitor earnings

### For Super Admins
- Platform-wide revenue (platform fees)
- Total payouts processed
- Active users and companies
- Commission approval rates

## Best Practices

### For Manual Payments

1. **Regular Schedule**: Process payouts on a consistent schedule (e.g., monthly)
2. **Clear Communication**: Notify affiliates when payouts are processed
3. **Documentation**: Always add transaction IDs/confirmation numbers in notes
4. **Verification**: Verify payment details before processing
5. **Audit Trail**: Keep records of all processed payouts

### For Companies

1. **Timely Approval**: Review and approve commissions promptly
2. **Accurate Deals**: Enter deal values correctly
3. **Clear Terms**: Set clear commission rates with affiliates
4. **Regular Review**: Monitor affiliate performance

### For Affiliates

1. **Configure Payment**: Set up payment method immediately
2. **Keep Details Updated**: Update payment info if it changes
3. **Track Performance**: Monitor clicks, conversions, and earnings
4. **Quality Over Quantity**: Focus on quality referrals

## Troubleshooting

### Payout Not Showing for Admin
- Check commission approval status
- Verify payout hasn't already been processed
- Ensure affiliate has approved commissions

### Commission Not Created
- Verify deal was created correctly
- Check partnership has commission rate set
- Ensure deal status is "active"

### Affiliate Can't See Earnings
- Verify commission status (must be "approved" or "paid")
- Check deal is linked to correct partnership
- Ensure affiliate ID matches on all records

## Future Enhancements

### Recommended Improvements

1. **Stripe Connect Integration**
   - Automated payouts
   - Faster payment processing
   - Better tracking

2. **Email Notifications**
   - Commission approved alerts
   - Payout processed notifications
   - Monthly earning summaries

3. **Tax Reporting**
   - 1099 form generation
   - Tax withholding options
   - Annual tax summaries

4. **Analytics Dashboard**
   - Advanced reporting
   - Custom date ranges
   - Export capabilities

5. **Bulk Actions**
   - Approve multiple commissions at once
   - Batch payout processing
   - Bulk payment uploads

## Support

For questions about the payment system:
1. Review this documentation
2. Check database schema and RLS policies
3. Review code comments in migration files
4. Test workflows in development environment before production use
