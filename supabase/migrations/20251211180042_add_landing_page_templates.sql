/*
  # Add landing page template fields to products

  1. Changes
    - Add landing page template fields to products table
    - Companies configure these once, affiliates just get shareable links
    - Template includes: headline, description, CTA type, imagery
  
  2. Template Fields
    - `lp_headline` - Main headline for the landing page
    - `lp_description` - Description text
    - `lp_cta_type` - Type of call-to-action (signup, demo, buy)
    - `lp_cta_text` - Custom CTA button text
    - `lp_hero_image` - Hero/product image URL
*/

DO $$
BEGIN
  -- Add landing page template fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'lp_headline'
  ) THEN
    ALTER TABLE products ADD COLUMN lp_headline text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'lp_description'
  ) THEN
    ALTER TABLE products ADD COLUMN lp_description text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'lp_cta_type'
  ) THEN
    ALTER TABLE products ADD COLUMN lp_cta_type text DEFAULT 'signup';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'lp_cta_text'
  ) THEN
    ALTER TABLE products ADD COLUMN lp_cta_text text DEFAULT 'Get Started';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'lp_hero_image'
  ) THEN
    ALTER TABLE products ADD COLUMN lp_hero_image text DEFAULT '';
  END IF;
END $$;