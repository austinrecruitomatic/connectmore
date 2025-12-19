/*
  # Create Product Purchases Table

  1. New Table
    - `product_purchases`
      - `id` (uuid, primary key)
      - `product_id` (uuid, foreign key to products)
      - `affiliate_id` (uuid, foreign key to profiles - affiliates)
      - `company_id` (uuid, foreign key to companies)
      - `customer_name` (text)
      - `customer_email` (text)
      - `customer_phone` (text, optional)
      - `purchase_amount` (numeric) - total purchase amount
      - `commission_amount` (numeric) - commission earned by affiliate
      - `platform_fee` (numeric) - platform fee charged
      - `quantity` (integer) - number of units purchased
      - `status` (text) - pending, completed, refunded, cancelled
      - `payment_method` (text) - stripe, external, etc.
      - `external_transaction_id` (text, optional)
      - `purchased_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Companies can view purchases for their products
    - Affiliates can view their own purchases
    - Super admins can view all purchases
*/

-- Create product_purchases table
CREATE TABLE IF NOT EXISTS product_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  affiliate_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  purchase_amount numeric(10, 2) NOT NULL,
  commission_amount numeric(10, 2) NOT NULL DEFAULT 0,
  platform_fee numeric(10, 2) NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending',
  payment_method text,
  external_transaction_id text,
  purchased_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT product_purchases_status_check CHECK (status IN ('pending', 'completed', 'refunded', 'cancelled'))
);

-- Enable RLS
ALTER TABLE product_purchases ENABLE ROW LEVEL SECURITY;

-- Policy: Companies can view purchases for their products
CREATE POLICY "Companies can view their product purchases"
  ON product_purchases FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

-- Policy: Affiliates can view their own purchases
CREATE POLICY "Affiliates can view their own purchases"
  ON product_purchases FOR SELECT
  TO authenticated
  USING (
    affiliate_id = auth.uid()
  );

-- Policy: Super admins can view all purchases
CREATE POLICY "Super admins can view all purchases"
  ON product_purchases FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

-- Policy: System can insert purchases (for checkout flow)
CREATE POLICY "Allow authenticated users to create purchases"
  ON product_purchases FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Companies can update purchase status
CREATE POLICY "Companies can update their purchase status"
  ON product_purchases FOR UPDATE
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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_product_purchases_product_id ON product_purchases(product_id);
CREATE INDEX IF NOT EXISTS idx_product_purchases_affiliate_id ON product_purchases(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_product_purchases_company_id ON product_purchases(company_id);
CREATE INDEX IF NOT EXISTS idx_product_purchases_status ON product_purchases(status);
CREATE INDEX IF NOT EXISTS idx_product_purchases_purchased_at ON product_purchases(purchased_at);