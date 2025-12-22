/*
  # Optimize RLS Policies - Part 4: Customers and Final Tables

  ## Performance Improvement
    Completes optimization of all RLS policies using subquery pattern for auth functions
    
  ## Tables Updated
    - product_affiliate_access
    - customers
    - customer_referrals
    - customer_payouts
    - lead_update_requests
*/

-- =====================================================
-- Optimize RLS Policies - Product Affiliate Access
-- =====================================================

DROP POLICY IF EXISTS "Affiliates can view own access grants" ON product_affiliate_access;
CREATE POLICY "Affiliates can view own access grants"
  ON product_affiliate_access FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = affiliate_id);

DROP POLICY IF EXISTS "Companies can view access grants for own products" ON product_affiliate_access;
CREATE POLICY "Companies can view access grants for own products"
  ON product_affiliate_access FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products p
      JOIN companies c ON c.id = p.company_id
      WHERE p.id = product_affiliate_access.product_id
      AND c.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Companies can grant access to own products" ON product_affiliate_access;
CREATE POLICY "Companies can grant access to own products"
  ON product_affiliate_access FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products p
      JOIN companies c ON c.id = p.company_id
      WHERE p.id = product_id
      AND c.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Companies can revoke access to own products" ON product_affiliate_access;
CREATE POLICY "Companies can revoke access to own products"
  ON product_affiliate_access FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products p
      JOIN companies c ON c.id = p.company_id
      WHERE p.id = product_affiliate_access.product_id
      AND c.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Super admins can view all access grants" ON product_affiliate_access;
CREATE POLICY "Super admins can view all access grants"
  ON product_affiliate_access FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_super_admin = true
    )
  );

-- =====================================================
-- Optimize RLS Policies - Customers
-- =====================================================

DROP POLICY IF EXISTS "Customers can view own record" ON customers;
CREATE POLICY "Customers can view own record"
  ON customers FOR SELECT
  TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = (select auth.uid())));

DROP POLICY IF EXISTS "Affiliates can view their customers" ON customers;
CREATE POLICY "Affiliates can view their customers"
  ON customers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM affiliate_partnerships
      WHERE affiliate_partnerships.id = customers.original_partnership_id
      AND affiliate_partnerships.affiliate_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Companies can view customers from their partnerships" ON customers;
CREATE POLICY "Companies can view customers from their partnerships"
  ON customers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM affiliate_partnerships ap
      JOIN companies c ON c.id = ap.company_id
      WHERE ap.id = customers.original_partnership_id
      AND c.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Super admins can view all customers" ON customers;
CREATE POLICY "Super admins can view all customers"
  ON customers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_super_admin = true
    )
  );

-- =====================================================
-- Optimize RLS Policies - Customer Referrals
-- =====================================================

DROP POLICY IF EXISTS "Affiliates can view their referral chains" ON customer_referrals;
CREATE POLICY "Affiliates can view their referral chains"
  ON customer_referrals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM affiliate_partnerships
      WHERE affiliate_partnerships.id = customer_referrals.original_partnership_id
      AND affiliate_partnerships.affiliate_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Companies can view referrals from their partnerships" ON customer_referrals;
CREATE POLICY "Companies can view referrals from their partnerships"
  ON customer_referrals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM affiliate_partnerships ap
      JOIN companies c ON c.id = ap.company_id
      WHERE ap.id = customer_referrals.original_partnership_id
      AND c.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Super admins can view all referrals" ON customer_referrals;
CREATE POLICY "Super admins can view all referrals"
  ON customer_referrals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_super_admin = true
    )
  );

-- =====================================================
-- Optimize RLS Policies - Customer Payouts
-- =====================================================

DROP POLICY IF EXISTS "Customers can view own payouts" ON customer_payouts;
CREATE POLICY "Customers can view own payouts"
  ON customer_payouts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = customer_payouts.customer_id
      AND customers.email = (SELECT email FROM auth.users WHERE id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Companies can view customer payouts" ON customer_payouts;
CREATE POLICY "Companies can view customer payouts"
  ON customer_payouts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers c
      JOIN affiliate_partnerships ap ON ap.id = c.original_partnership_id
      JOIN companies co ON co.id = ap.company_id
      WHERE c.id = customer_payouts.customer_id
      AND co.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Super admins can view all customer payouts" ON customer_payouts;
CREATE POLICY "Super admins can view all customer payouts"
  ON customer_payouts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_super_admin = true
    )
  );

DROP POLICY IF EXISTS "Super admins can create customer payouts" ON customer_payouts;
CREATE POLICY "Super admins can create customer payouts"
  ON customer_payouts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_super_admin = true
    )
  );

DROP POLICY IF EXISTS "Super admins can update customer payouts" ON customer_payouts;
CREATE POLICY "Super admins can update customer payouts"
  ON customer_payouts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_super_admin = true
    )
  );

-- =====================================================
-- Optimize RLS Policies - Lead Update Requests
-- =====================================================

DROP POLICY IF EXISTS "Affiliates can create their own update requests" ON lead_update_requests;
CREATE POLICY "Affiliates can create their own update requests"
  ON lead_update_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contact_submissions cs
      JOIN affiliate_partnerships ap ON cs.partnership_id = ap.id
      WHERE cs.id = contact_submission_id
      AND ap.affiliate_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Affiliates can view their own update requests" ON lead_update_requests;
CREATE POLICY "Affiliates can view their own update requests"
  ON lead_update_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contact_submissions cs
      JOIN affiliate_partnerships ap ON cs.partnership_id = ap.id
      WHERE cs.id = lead_update_requests.contact_submission_id
      AND ap.affiliate_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Companies can view update requests for their leads" ON lead_update_requests;
CREATE POLICY "Companies can view update requests for their leads"
  ON lead_update_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contact_submissions cs
      JOIN affiliate_partnerships ap ON cs.partnership_id = ap.id
      JOIN companies c ON c.id = ap.company_id
      WHERE cs.id = lead_update_requests.contact_submission_id
      AND c.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Companies can update requests for their leads" ON lead_update_requests;
CREATE POLICY "Companies can update requests for their leads"
  ON lead_update_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contact_submissions cs
      JOIN affiliate_partnerships ap ON cs.partnership_id = ap.id
      JOIN companies c ON c.id = ap.company_id
      WHERE cs.id = lead_update_requests.contact_submission_id
      AND c.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contact_submissions cs
      JOIN affiliate_partnerships ap ON cs.partnership_id = ap.id
      JOIN companies c ON c.id = ap.company_id
      WHERE cs.id = lead_update_requests.contact_submission_id
      AND c.user_id = (select auth.uid())
    )
  );