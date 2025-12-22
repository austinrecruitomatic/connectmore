/*
  # Optimize RLS Policies - Part 3: Leads and Products

  ## Performance Improvement
    Continues optimization of RLS policies using subquery pattern for auth functions
    
  ## Tables Updated
    - leads
    - deal_payment_periods
    - product_purchases
    - product_refunds
    - affiliate_tracking_links
    - affiliate_link_clicks
*/

-- =====================================================
-- Optimize RLS Policies - Leads
-- =====================================================

DROP POLICY IF EXISTS "Affiliates can view their partnership leads" ON leads;
CREATE POLICY "Affiliates can view their partnership leads"
  ON leads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM affiliate_partnerships
      WHERE affiliate_partnerships.id = leads.partnership_id
      AND affiliate_partnerships.affiliate_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Companies can view their partnership leads" ON leads;
CREATE POLICY "Companies can view their partnership leads"
  ON leads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM affiliate_partnerships ap
      JOIN companies c ON c.id = ap.company_id
      WHERE ap.id = leads.partnership_id
      AND c.user_id = (select auth.uid())
    )
  );

-- =====================================================
-- Optimize RLS Policies - Deal Payment Periods
-- =====================================================

DROP POLICY IF EXISTS "Companies can view their payment periods" ON deal_payment_periods;
CREATE POLICY "Companies can view their payment periods"
  ON deal_payment_periods FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deals d
      JOIN companies c ON c.id = d.company_id
      WHERE d.id = deal_payment_periods.deal_id
      AND c.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Companies can update their payment periods" ON deal_payment_periods;
CREATE POLICY "Companies can update their payment periods"
  ON deal_payment_periods FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deals d
      JOIN companies c ON c.id = d.company_id
      WHERE d.id = deal_payment_periods.deal_id
      AND c.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM deals d
      JOIN companies c ON c.id = d.company_id
      WHERE d.id = deal_payment_periods.deal_id
      AND c.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Affiliates can view their payment periods" ON deal_payment_periods;
CREATE POLICY "Affiliates can view their payment periods"
  ON deal_payment_periods FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_payment_periods.deal_id
      AND deals.affiliate_id = (select auth.uid())
    )
  );

-- =====================================================
-- Optimize RLS Policies - Product Purchases
-- =====================================================

DROP POLICY IF EXISTS "Companies can view their product purchases" ON product_purchases;
CREATE POLICY "Companies can view their product purchases"
  ON product_purchases FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Affiliates can view their own purchases" ON product_purchases;
CREATE POLICY "Affiliates can view their own purchases"
  ON product_purchases FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = affiliate_id);

DROP POLICY IF EXISTS "Super admins can view all purchases" ON product_purchases;
CREATE POLICY "Super admins can view all purchases"
  ON product_purchases FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_super_admin = true
    )
  );

DROP POLICY IF EXISTS "Companies can update their purchase status" ON product_purchases;
CREATE POLICY "Companies can update their purchase status"
  ON product_purchases FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE user_id = (select auth.uid())
    )
  );

-- =====================================================
-- Optimize RLS Policies - Product Refunds
-- =====================================================

DROP POLICY IF EXISTS "Companies can view refunds for their products" ON product_refunds;
CREATE POLICY "Companies can view refunds for their products"
  ON product_refunds FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM product_purchases pp
      JOIN companies c ON c.id = pp.company_id
      WHERE pp.id = product_refunds.purchase_id
      AND c.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Affiliates can view refunds for their purchases" ON product_refunds;
CREATE POLICY "Affiliates can view refunds for their purchases"
  ON product_refunds FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM product_purchases
      WHERE product_purchases.id = product_refunds.purchase_id
      AND product_purchases.affiliate_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Super admins can view all refunds" ON product_refunds;
CREATE POLICY "Super admins can view all refunds"
  ON product_refunds FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_super_admin = true
    )
  );

DROP POLICY IF EXISTS "Companies can create refunds for their products" ON product_refunds;
CREATE POLICY "Companies can create refunds for their products"
  ON product_refunds FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM product_purchases pp
      JOIN companies c ON c.id = pp.company_id
      WHERE pp.id = purchase_id
      AND c.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Super admins can create any refund" ON product_refunds;
CREATE POLICY "Super admins can create any refund"
  ON product_refunds FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_super_admin = true
    )
  );

-- =====================================================
-- Optimize RLS Policies - Affiliate Tracking Links
-- =====================================================

DROP POLICY IF EXISTS "Affiliates can view their own tracking links" ON affiliate_tracking_links;
CREATE POLICY "Affiliates can view their own tracking links"
  ON affiliate_tracking_links FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = affiliate_id);

DROP POLICY IF EXISTS "Companies can view their product tracking links" ON affiliate_tracking_links;
CREATE POLICY "Companies can view their product tracking links"
  ON affiliate_tracking_links FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Super admins can view all tracking links" ON affiliate_tracking_links;
CREATE POLICY "Super admins can view all tracking links"
  ON affiliate_tracking_links FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_super_admin = true
    )
  );

DROP POLICY IF EXISTS "Affiliates can create their tracking links" ON affiliate_tracking_links;
CREATE POLICY "Affiliates can create their tracking links"
  ON affiliate_tracking_links FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = affiliate_id);

-- =====================================================
-- Optimize RLS Policies - Affiliate Link Clicks
-- =====================================================

DROP POLICY IF EXISTS "Affiliates can view their link clicks" ON affiliate_link_clicks;
CREATE POLICY "Affiliates can view their link clicks"
  ON affiliate_link_clicks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM affiliate_tracking_links
      WHERE affiliate_tracking_links.id = affiliate_link_clicks.tracking_link_id
      AND affiliate_tracking_links.affiliate_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Companies can view their product link clicks" ON affiliate_link_clicks;
CREATE POLICY "Companies can view their product link clicks"
  ON affiliate_link_clicks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM affiliate_tracking_links atl
      JOIN companies c ON c.id = atl.company_id
      WHERE atl.id = affiliate_link_clicks.tracking_link_id
      AND c.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Super admins can view all link clicks" ON affiliate_link_clicks;
CREATE POLICY "Super admins can view all link clicks"
  ON affiliate_link_clicks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_super_admin = true
    )
  );