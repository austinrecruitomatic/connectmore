/*
  # Add Direct Sales Support to Products

  1. Changes
    - Add `sale_type` column to products table
      - Values: 'lead_generation' or 'direct_sale'
      - Default: 'lead_generation' (maintains current behavior)
    - Add `product_price` column for direct sale pricing
      - Numeric field for the product price
      - Only required when sale_type is 'direct_sale'
    - Add `currency` column to specify pricing currency
      - Default: 'USD'
    - Add `inventory_tracking` boolean to enable inventory management
      - Default: false
    - Add `inventory_quantity` for tracking available units
      - Only used when inventory_tracking is enabled
    - Add `external_checkout_url` for companies using their own checkout
      - Optional field for custom payment flows

  2. Notes
    - Existing products will default to 'lead_generation' type
    - Direct sale products can use platform checkout or external URLs
    - Inventory tracking is optional for scenarios like ticket sales
*/

-- Add sale_type column with check constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'sale_type'
  ) THEN
    ALTER TABLE products ADD COLUMN sale_type text DEFAULT 'lead_generation' NOT NULL;
    ALTER TABLE products ADD CONSTRAINT products_sale_type_check 
      CHECK (sale_type IN ('lead_generation', 'direct_sale'));
  END IF;
END $$;

-- Add product_price column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'product_price'
  ) THEN
    ALTER TABLE products ADD COLUMN product_price numeric(10, 2) DEFAULT 0;
  END IF;
END $$;

-- Add currency column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'currency'
  ) THEN
    ALTER TABLE products ADD COLUMN currency text DEFAULT 'USD' NOT NULL;
  END IF;
END $$;

-- Add inventory tracking columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'inventory_tracking'
  ) THEN
    ALTER TABLE products ADD COLUMN inventory_tracking boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'inventory_quantity'
  ) THEN
    ALTER TABLE products ADD COLUMN inventory_quantity integer DEFAULT 0;
  END IF;
END $$;

-- Add external checkout URL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'external_checkout_url'
  ) THEN
    ALTER TABLE products ADD COLUMN external_checkout_url text;
  END IF;
END $$;