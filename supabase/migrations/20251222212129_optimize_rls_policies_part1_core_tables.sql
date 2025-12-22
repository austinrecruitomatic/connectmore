/*
  # Optimize RLS Policies - Part 1: Core Tables

  ## Performance Improvement
    Replaces `auth.uid()` with `(select auth.uid())` in RLS policies
    This prevents re-evaluation of auth functions for each row, improving query performance at scale
    
  ## Tables Updated
    - profiles
    - companies
    - products
    - affiliate_partnerships
    - landing_pages
    - company_reviews
*/

-- =====================================================
-- Optimize RLS Policies - Profiles Table
-- =====================================================

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can set their recruiter during signup" ON profiles;
CREATE POLICY "Users can set their recruiter during signup"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own notification preferences" ON profiles;
CREATE POLICY "Users can update own notification preferences"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- =====================================================
-- Optimize RLS Policies - Companies Table
-- =====================================================

DROP POLICY IF EXISTS "Company owners can insert their company" ON companies;
CREATE POLICY "Company owners can insert their company"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Company owners can update their company" ON companies;
CREATE POLICY "Company owners can update their company"
  ON companies FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- =====================================================
-- Optimize RLS Policies - Products Table
-- =====================================================

DROP POLICY IF EXISTS "Anyone can view active products" ON products;
CREATE POLICY "Anyone can view active products"
  ON products FOR SELECT
  TO authenticated
  USING (
    is_active = true OR
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = products.company_id
      AND companies.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Company owners can insert products" ON products;
CREATE POLICY "Company owners can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_id
      AND companies.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Company owners can update their products" ON products;
CREATE POLICY "Company owners can update their products"
  ON products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_id
      AND companies.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_id
      AND companies.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Company owners can delete their products" ON products;
CREATE POLICY "Company owners can delete their products"
  ON products FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_id
      AND companies.user_id = (select auth.uid())
    )
  );

-- =====================================================
-- Optimize RLS Policies - Affiliate Partnerships
-- =====================================================

DROP POLICY IF EXISTS "Affiliates can create partnership requests" ON affiliate_partnerships;
CREATE POLICY "Affiliates can create partnership requests"
  ON affiliate_partnerships FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = affiliate_id);

DROP POLICY IF EXISTS "Affiliates can view their partnerships" ON affiliate_partnerships;
CREATE POLICY "Affiliates can view their partnerships"
  ON affiliate_partnerships FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = affiliate_id);

DROP POLICY IF EXISTS "Company owners can update partnership status" ON affiliate_partnerships;
CREATE POLICY "Company owners can update partnership status"
  ON affiliate_partnerships FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_id
      AND companies.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_id
      AND companies.user_id = (select auth.uid())
    )
  );

-- =====================================================
-- Optimize RLS Policies - Landing Pages
-- =====================================================

DROP POLICY IF EXISTS "Anyone can view published landing pages" ON landing_pages;
CREATE POLICY "Anyone can view published landing pages"
  ON landing_pages FOR SELECT
  TO authenticated
  USING (
    is_published = true OR
    EXISTS (
      SELECT 1 FROM affiliate_partnerships ap
      WHERE ap.id = partnership_id
      AND ap.affiliate_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Affiliates can create their landing pages" ON landing_pages;
CREATE POLICY "Affiliates can create their landing pages"
  ON landing_pages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM affiliate_partnerships
      WHERE affiliate_partnerships.id = partnership_id
      AND affiliate_partnerships.affiliate_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Affiliates can update their landing pages" ON landing_pages;
CREATE POLICY "Affiliates can update their landing pages"
  ON landing_pages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM affiliate_partnerships
      WHERE affiliate_partnerships.id = partnership_id
      AND affiliate_partnerships.affiliate_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM affiliate_partnerships
      WHERE affiliate_partnerships.id = partnership_id
      AND affiliate_partnerships.affiliate_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Affiliates can delete their landing pages" ON landing_pages;
CREATE POLICY "Affiliates can delete their landing pages"
  ON landing_pages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM affiliate_partnerships
      WHERE affiliate_partnerships.id = partnership_id
      AND affiliate_partnerships.affiliate_id = (select auth.uid())
    )
  );

-- =====================================================
-- Optimize RLS Policies - Company Reviews
-- =====================================================

DROP POLICY IF EXISTS "Reviewers can update their own reviews" ON company_reviews;
CREATE POLICY "Reviewers can update their own reviews"
  ON company_reviews FOR UPDATE
  TO authenticated
  USING (reviewer_id = (select auth.uid()))
  WITH CHECK (reviewer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Reviewers can delete their own reviews" ON company_reviews;
CREATE POLICY "Reviewers can delete their own reviews"
  ON company_reviews FOR DELETE
  TO authenticated
  USING (reviewer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Affiliates can review companies they partner with or send leads" ON company_reviews;
CREATE POLICY "Affiliates can review companies they partner with or send leads"
  ON company_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    reviewer_id = (select auth.uid()) AND
    (
      EXISTS (
        SELECT 1 FROM affiliate_partnerships
        WHERE affiliate_partnerships.company_id = company_reviews.company_id
        AND affiliate_partnerships.affiliate_id = (select auth.uid())
        AND affiliate_partnerships.status = 'active'
      )
      OR EXISTS (
        SELECT 1 FROM contact_submissions cs
        JOIN affiliate_partnerships ap ON cs.partnership_id = ap.id
        WHERE ap.company_id = company_reviews.company_id
        AND ap.affiliate_id = (select auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Super admins can delete any review" ON company_reviews;
CREATE POLICY "Super admins can delete any review"
  ON company_reviews FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_super_admin = true
    )
  );