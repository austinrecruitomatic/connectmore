/*
  # Add Affiliate Link Discount System

  1. Changes to Tables
    - Add `affiliate_discount_enabled` to `products` table
      - Boolean to enable/disable discounts for a product
    - Add `affiliate_discount_type` to `products` table
      - 'percentage' or 'fixed_amount'
    - Add `affiliate_discount_value` to `products` table
      - The discount amount (10 for 10% or $10 fixed)
    - Add `discount_applied` to `contact_submissions` table
      - Tracks if customer received affiliate discount

  2. Purpose
    - Companies can incentivize customers to use affiliate links
    - Affiliates can promote better knowing customers get a deal
    - Track which leads came with discount expectations
*/

-- Add discount fields to products table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'affiliate_discount_enabled'
  ) THEN
    ALTER TABLE products ADD COLUMN affiliate_discount_enabled boolean DEFAULT false;
    COMMENT ON COLUMN products.affiliate_discount_enabled IS 'Whether affiliate link discount is enabled';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'affiliate_discount_type'
  ) THEN
    ALTER TABLE products ADD COLUMN affiliate_discount_type text CHECK (affiliate_discount_type IN ('percentage', 'fixed_amount'));
    COMMENT ON COLUMN products.affiliate_discount_type IS 'Type of discount: percentage or fixed_amount';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'affiliate_discount_value'
  ) THEN
    ALTER TABLE products ADD COLUMN affiliate_discount_value numeric;
    COMMENT ON COLUMN products.affiliate_discount_value IS 'Discount value (10 = 10% or $10)';
  END IF;
END $$;

-- Add discount tracking to contact submissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contact_submissions' AND column_name = 'discount_applied'
  ) THEN
    ALTER TABLE contact_submissions ADD COLUMN discount_applied boolean DEFAULT true;
    COMMENT ON COLUMN contact_submissions.discount_applied IS 'Whether the customer expects the affiliate discount';
  END IF;
END $$;