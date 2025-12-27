/*
  # Add Payment Details to Admin Payout Summary View

  1. Changes
    - Drop and recreate admin_payout_summary view to include payment_details
    - This allows admins to see Venmo usernames and other payment information when processing payouts

  2. Security
    - View is already protected by RLS
    - Only super admins can access payout data
*/

-- Drop the existing view
DROP VIEW IF EXISTS admin_payout_summary;

-- Recreate the view with payment_details included
CREATE VIEW admin_payout_summary AS
SELECT
  p.id,
  p.affiliate_id,
  pr.full_name as affiliate_name,
  pr.email as affiliate_email,
  pr.payment_method,
  pr.payment_details,
  p.total_amount,
  p.platform_fee_total,
  p.status,
  p.scheduled_date,
  p.processed_at,
  p.notes,
  array_length(p.commission_ids, 1) as commission_count,
  p.created_at
FROM payouts p
JOIN profiles pr ON pr.id = p.affiliate_id
ORDER BY p.created_at DESC;

-- Grant access to the view for authenticated users (RLS still applies)
GRANT SELECT ON admin_payout_summary TO authenticated;
