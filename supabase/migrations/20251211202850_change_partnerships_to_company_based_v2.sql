/*
  # Change partnerships to company-based instead of product-based

  1. Changes
    - Modify affiliate_partnerships table to reference companies instead of products
    - Update unique constraint to affiliate_id + company_id
    - Update all related policies and indexes
    - Migrate existing data to new structure
  
  2. New Structure
    - Affiliates partner with companies, not individual products
    - Once partnered, affiliates can promote all products from that company
    - Affiliate code is unique per company partnership
  
  3. Security
    - Update RLS policies to work with company-based partnerships
    - Company owners can manage partnership requests
    - Affiliates can view their own partnerships
*/

-- Step 1: Drop all policies that reference product_id in affiliate_partnerships
DROP POLICY IF EXISTS "Affiliates can view their partnerships" ON affiliate_partnerships;
DROP POLICY IF EXISTS "Company owners can update partnership status" ON affiliate_partnerships;
DROP POLICY IF EXISTS "Affiliates can view leads from their landing pages" ON leads;
DROP POLICY IF EXISTS "Affiliates can create reviews for companies they partner with" ON company_reviews;

-- Step 2: Drop existing constraints and indexes
DROP INDEX IF EXISTS idx_partnerships_product_id;
ALTER TABLE affiliate_partnerships DROP CONSTRAINT IF EXISTS affiliate_partnerships_affiliate_id_product_id_key;

-- Step 3: Create a temporary column for company_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'affiliate_partnerships' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE affiliate_partnerships ADD COLUMN company_id uuid;
  END IF;
END $$;

-- Step 4: Populate company_id from product relationships
UPDATE affiliate_partnerships ap
SET company_id = p.company_id
FROM products p
WHERE ap.product_id = p.id
AND ap.company_id IS NULL;

-- Step 5: Drop product_id column and make company_id NOT NULL
ALTER TABLE affiliate_partnerships DROP COLUMN IF EXISTS product_id CASCADE;
ALTER TABLE affiliate_partnerships ALTER COLUMN company_id SET NOT NULL;

-- Step 6: Add foreign key constraint for company_id
ALTER TABLE affiliate_partnerships 
  DROP CONSTRAINT IF EXISTS affiliate_partnerships_company_id_fkey;

ALTER TABLE affiliate_partnerships 
  ADD CONSTRAINT affiliate_partnerships_company_id_fkey 
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

-- Step 7: Add unique constraint for affiliate_id + company_id
ALTER TABLE affiliate_partnerships 
  DROP CONSTRAINT IF EXISTS affiliate_partnerships_affiliate_company_unique;

ALTER TABLE affiliate_partnerships 
  ADD CONSTRAINT affiliate_partnerships_affiliate_company_unique 
  UNIQUE(affiliate_id, company_id);

-- Step 8: Create new indexes
CREATE INDEX IF NOT EXISTS idx_partnerships_company_id ON affiliate_partnerships(company_id);

-- Step 9: Create new RLS policies for company-based partnerships
CREATE POLICY "Affiliates can view their partnerships"
  ON affiliate_partnerships FOR SELECT
  TO authenticated
  USING (
    auth.uid() = affiliate_id OR
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Company owners can update partnership status"
  ON affiliate_partnerships FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

-- Step 10: Recreate leads policy for company-based partnerships
CREATE POLICY "Affiliates can view leads from their landing pages"
  ON leads FOR SELECT
  TO authenticated
  USING (
    landing_page_id IN (
      SELECT id FROM landing_pages WHERE affiliate_id = auth.uid()
    ) OR
    partnership_id IN (
      SELECT ap.id FROM affiliate_partnerships ap
      INNER JOIN companies c ON ap.company_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

-- Step 11: Recreate company_reviews policy for company-based partnerships
CREATE POLICY "Affiliates can create reviews for companies they partner with"
  ON company_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = reviewer_id AND
    company_id IN (
      SELECT ap.company_id 
      FROM affiliate_partnerships ap 
      WHERE ap.affiliate_id = auth.uid() 
      AND ap.status = 'approved'
    )
  );

-- Step 12: Update landing_pages to allow null partnership_id
ALTER TABLE landing_pages ALTER COLUMN partnership_id DROP NOT NULL;
