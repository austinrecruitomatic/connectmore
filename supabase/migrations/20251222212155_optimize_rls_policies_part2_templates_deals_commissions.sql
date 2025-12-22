/*
  # Optimize RLS Policies - Part 2: Templates, Deals, and Commissions

  ## Performance Improvement
    Continues optimization of RLS policies using subquery pattern for auth functions
    
  ## Tables Updated
    - landing_page_templates
    - deals
    - commissions
    - payouts
    - payout_preferences
    - company_settings
*/

-- =====================================================
-- Optimize RLS Policies - Landing Page Templates
-- =====================================================

DROP POLICY IF EXISTS "Companies can view own templates" ON landing_page_templates;
CREATE POLICY "Companies can view own templates"
  ON landing_page_templates FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Companies can create templates" ON landing_page_templates;
CREATE POLICY "Companies can create templates"
  ON landing_page_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Companies can update own templates" ON landing_page_templates;
CREATE POLICY "Companies can update own templates"
  ON landing_page_templates FOR UPDATE
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

DROP POLICY IF EXISTS "Companies can delete own templates" ON landing_page_templates;
CREATE POLICY "Companies can delete own templates"
  ON landing_page_templates FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Affiliates can view available templates" ON landing_page_templates;
CREATE POLICY "Affiliates can view available templates"
  ON landing_page_templates FOR SELECT
  TO authenticated
  USING (
    is_active = true AND
    company_id IN (
      SELECT company_id FROM affiliate_partnerships
      WHERE affiliate_id = (select auth.uid())
      AND status = 'active'
    )
  );

-- =====================================================
-- Optimize RLS Policies - Deals
-- =====================================================

DROP POLICY IF EXISTS "Companies can view their deals" ON deals;
CREATE POLICY "Companies can view their deals"
  ON deals FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Affiliates can view their deals" ON deals;
CREATE POLICY "Affiliates can view their deals"
  ON deals FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = affiliate_id);

DROP POLICY IF EXISTS "Companies can create deals" ON deals;
CREATE POLICY "Companies can create deals"
  ON deals FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Companies can update their deals" ON deals;
CREATE POLICY "Companies can update their deals"
  ON deals FOR UPDATE
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
-- Optimize RLS Policies - Commissions
-- =====================================================

DROP POLICY IF EXISTS "Companies can view their commissions" ON commissions;
CREATE POLICY "Companies can view their commissions"
  ON commissions FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Affiliates can view their commissions" ON commissions;
CREATE POLICY "Affiliates can view their commissions"
  ON commissions FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = affiliate_id);

DROP POLICY IF EXISTS "Companies can create commissions" ON commissions;
CREATE POLICY "Companies can create commissions"
  ON commissions FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Companies can update their commissions" ON commissions;
CREATE POLICY "Companies can update their commissions"
  ON commissions FOR UPDATE
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
-- Optimize RLS Policies - Payouts
-- =====================================================

DROP POLICY IF EXISTS "Affiliates can view their payouts" ON payouts;
CREATE POLICY "Affiliates can view their payouts"
  ON payouts FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = affiliate_id);

-- =====================================================
-- Optimize RLS Policies - Payout Preferences
-- =====================================================

DROP POLICY IF EXISTS "Affiliates can view their own payout preferences" ON payout_preferences;
CREATE POLICY "Affiliates can view their own payout preferences"
  ON payout_preferences FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = affiliate_id);

DROP POLICY IF EXISTS "Affiliates can insert their own payout preferences" ON payout_preferences;
CREATE POLICY "Affiliates can insert their own payout preferences"
  ON payout_preferences FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = affiliate_id);

DROP POLICY IF EXISTS "Affiliates can update their own payout preferences" ON payout_preferences;
CREATE POLICY "Affiliates can update their own payout preferences"
  ON payout_preferences FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = affiliate_id)
  WITH CHECK ((select auth.uid()) = affiliate_id);

-- =====================================================
-- Optimize RLS Policies - Company Settings
-- =====================================================

DROP POLICY IF EXISTS "Companies can view their settings" ON company_settings;
CREATE POLICY "Companies can view their settings"
  ON company_settings FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Companies can insert their settings" ON company_settings;
CREATE POLICY "Companies can insert their settings"
  ON company_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Companies can update their settings" ON company_settings;
CREATE POLICY "Companies can update their settings"
  ON company_settings FOR UPDATE
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

DROP POLICY IF EXISTS "Companies can update their commission settings" ON company_settings;
CREATE POLICY "Companies can update their commission settings"
  ON company_settings FOR UPDATE
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