/*
  # Add Product Tracking Throughout Affiliate Flow

  1. Changes
    - Add `product_id` to `affiliate_partnerships` table
      - Allows partnerships to be product-specific
      - Nullable to support existing partnerships
    - Add `product_id` to `contact_submissions` table
      - Tracks which product the lead is for
      - Nullable for backwards compatibility
    - Add `product_id` to `deals` table
      - Links deals to specific products
      - Nullable for existing deals

  2. Benefits
    - Enables product-specific commission rates
    - Better tracking and analytics per product
    - Allows different affiliate terms per product

  3. Migration Strategy
    - All columns nullable to not break existing data
    - Foreign key constraints ensure data integrity
    - Indexes added for query performance
*/

-- Add product_id to affiliate_partnerships
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'affiliate_partnerships' AND column_name = 'product_id'
  ) THEN
    ALTER TABLE affiliate_partnerships 
    ADD COLUMN product_id uuid REFERENCES products(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_affiliate_partnerships_product_id 
    ON affiliate_partnerships(product_id);
  END IF;
END $$;

-- Add product_id to contact_submissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contact_submissions' AND column_name = 'product_id'
  ) THEN
    ALTER TABLE contact_submissions 
    ADD COLUMN product_id uuid REFERENCES products(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_contact_submissions_product_id 
    ON contact_submissions(product_id);
  END IF;
END $$;

-- Add product_id to deals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'product_id'
  ) THEN
    ALTER TABLE deals 
    ADD COLUMN product_id uuid REFERENCES products(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_deals_product_id 
    ON deals(product_id);
  END IF;
END $$;