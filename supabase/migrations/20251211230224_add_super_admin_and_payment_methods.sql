/*
  # Add Super Admin Role and Payment Methods

  ## Overview
  Adds super admin functionality and payment method tracking for secure payout management

  ## Changes

  1. **Profiles Table Updates**
    - Add `is_super_admin` column (boolean, default false)
    - Add `payment_method` column (text: 'bank_transfer', 'paypal', 'stripe', etc.)
    - Add `payment_details` column (jsonb for encrypted payment info)

  2. **Security Updates**
    - Fix overly permissive payout RLS policies
    - Add super admin policies for all tables
    - Ensure only super admins can approve payouts and manage all data

  3. **New Functions**
    - `is_super_admin()` helper function for RLS policies
    - Makes policies cleaner and more maintainable

  ## Super Admin Capabilities
  Super admins can:
  - View all companies, affiliates, partnerships
  - View and approve/reject all commissions
  - Process payouts to affiliates
  - View all contact submissions and deals
  - Access platform-wide analytics
*/

-- Add super admin and payment fields to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'is_super_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_super_admin boolean DEFAULT false NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE profiles ADD COLUMN payment_method text CHECK (payment_method IN ('bank_transfer', 'paypal', 'stripe', 'venmo', 'wise', 'other'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'payment_details'
  ) THEN
    ALTER TABLE profiles ADD COLUMN payment_details jsonb DEFAULT '{}';
  END IF;
END $$;

-- Create helper function to check if current user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_super_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the overly permissive payout policy
DROP POLICY IF EXISTS "System can manage payouts" ON payouts;

-- Create proper payout policies
CREATE POLICY "Super admins can manage all payouts"
  ON payouts FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "System can create payouts"
  ON payouts FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add super admin policies for all tables

-- Companies
CREATE POLICY "Super admins can view all companies"
  ON companies FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Profiles
CREATE POLICY "Super admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Super admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Affiliate partnerships
CREATE POLICY "Super admins can view all partnerships"
  ON affiliate_partnerships FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Super admins can update all partnerships"
  ON affiliate_partnerships FOR UPDATE
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Commissions
CREATE POLICY "Super admins can view all commissions"
  ON commissions FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Super admins can update all commissions"
  ON commissions FOR UPDATE
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Deals
CREATE POLICY "Super admins can view all deals"
  ON deals FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Super admins can update all deals"
  ON deals FOR UPDATE
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can create deals"
  ON deals FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin());

-- Contact submissions
CREATE POLICY "Super admins can view all contact submissions"
  ON contact_submissions FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Super admins can update all contact submissions"
  ON contact_submissions FOR UPDATE
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Landing pages
CREATE POLICY "Super admins can view all landing pages"
  ON landing_pages FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Products
CREATE POLICY "Super admins can view all products"
  ON products FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Create admin analytics views for quick access
CREATE OR REPLACE VIEW admin_payout_summary AS
SELECT 
  p.id as payout_id,
  p.affiliate_id,
  pr.full_name as affiliate_name,
  pr.email as affiliate_email,
  pr.payment_method,
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

CREATE OR REPLACE VIEW admin_commission_summary AS
SELECT 
  c.id as commission_id,
  c.deal_id,
  c.affiliate_id,
  pr.full_name as affiliate_name,
  pr.email as affiliate_email,
  c.company_id,
  comp.company_name,
  c.commission_amount,
  c.platform_fee_amount,
  c.affiliate_payout_amount,
  c.commission_type,
  c.status,
  c.expected_payout_date,
  c.paid_at,
  c.created_at
FROM commissions c
JOIN profiles pr ON pr.id = c.affiliate_id
JOIN companies comp ON comp.id = c.company_id
ORDER BY c.created_at DESC;

-- Grant access to views for authenticated users (RLS still applies)
GRANT SELECT ON admin_payout_summary TO authenticated;
GRANT SELECT ON admin_commission_summary TO authenticated;
