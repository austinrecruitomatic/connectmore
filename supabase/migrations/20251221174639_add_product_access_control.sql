/*
  # Add Product Access Control System

  1. Changes to `products` table
    - Add `access_type` enum column ('public' or 'restricted')
    - Defaults to 'public' for backward compatibility
  
  2. New Tables
    - `product_affiliate_access`
      - Links products to specific affiliates when access is restricted
      - `product_id` (uuid, foreign key to products)
      - `affiliate_id` (uuid, foreign key to auth.users)
      - `granted_at` (timestamp)
      - `granted_by` (uuid, who granted access)
  
  3. Security
    - Enable RLS on `product_affiliate_access` table
    - Affiliates can view their own access grants
    - Companies can manage access for their products
    - Super admins can view all access grants
  
  4. Important Notes
    - Public products are visible to all affiliates
    - Restricted products only visible to granted affiliates
    - Companies can toggle between public/restricted at any time
*/

-- Add access_type to products
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'access_type'
  ) THEN
    ALTER TABLE products ADD COLUMN access_type text DEFAULT 'public' CHECK (access_type IN ('public', 'restricted'));
  END IF;
END $$;

-- Create product_affiliate_access table
CREATE TABLE IF NOT EXISTS product_affiliate_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  affiliate_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at timestamptz DEFAULT now(),
  granted_by uuid REFERENCES auth.users(id),
  UNIQUE(product_id, affiliate_id)
);

-- Enable RLS
ALTER TABLE product_affiliate_access ENABLE ROW LEVEL SECURITY;

-- Affiliates can view their own access grants
CREATE POLICY "Affiliates can view own access grants"
  ON product_affiliate_access
  FOR SELECT
  TO authenticated
  USING (auth.uid() = affiliate_id);

-- Companies can view access grants for their products
CREATE POLICY "Companies can view access grants for own products"
  ON product_affiliate_access
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_affiliate_access.product_id
      AND products.company_id IN (
        SELECT id FROM companies WHERE user_id = auth.uid()
      )
    )
  );

-- Companies can insert access grants for their products
CREATE POLICY "Companies can grant access to own products"
  ON product_affiliate_access
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_affiliate_access.product_id
      AND products.company_id IN (
        SELECT id FROM companies WHERE user_id = auth.uid()
      )
    )
  );

-- Companies can delete access grants for their products
CREATE POLICY "Companies can revoke access to own products"
  ON product_affiliate_access
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_affiliate_access.product_id
      AND products.company_id IN (
        SELECT id FROM companies WHERE user_id = auth.uid()
      )
    )
  );

-- Super admins can view all access grants
CREATE POLICY "Super admins can view all access grants"
  ON product_affiliate_access
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'is_super_admin')::boolean = true
    )
  );

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_product_affiliate_access_product ON product_affiliate_access(product_id);
CREATE INDEX IF NOT EXISTS idx_product_affiliate_access_affiliate ON product_affiliate_access(affiliate_id);