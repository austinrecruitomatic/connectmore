/*
  # Add product URL field

  1. Changes
    - Add `product_url` column to products table to store the base product purchase URL
    - Merchants will set this URL and affiliates will automatically get it with their tracking code
  
  2. Notes
    - This field stores the base URL where customers can purchase the product
    - Affiliates will append their affiliate code to this URL when creating landing pages
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'product_url'
  ) THEN
    ALTER TABLE products ADD COLUMN product_url text DEFAULT '';
  END IF;
END $$;