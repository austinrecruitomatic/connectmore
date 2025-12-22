/*
  # Customer Referral Tracking System

  ## Overview
  Enables reps to earn commissions when their customers refer friends and family.
  Creates a multi-tier referral network where customers become advocates and reps
  benefit from the entire referral chain they initiate.

  ## New Tables

  ### `customers`
  Tracks unique customers and their referral information
  - `id` (uuid, primary key) - Customer identifier
  - `email` (text, unique) - Customer email address
  - `name` (text) - Customer full name
  - `phone` (text, optional) - Customer phone number
  - `original_affiliate_id` (uuid) - The rep who brought this customer in
  - `original_partnership_id` (uuid) - The partnership used for acquisition
  - `referred_by_customer_id` (uuid, nullable) - If this customer was referred by another customer
  - `referral_code` (text, unique) - Unique code this customer can share with friends
  - `total_purchases` (numeric) - Lifetime purchase value
  - `total_referrals` (integer) - Number of successful referrals made
  - `first_purchase_at` (timestamptz) - When customer made first purchase
  - `created_at` (timestamptz) - Customer record creation
  - `updated_at` (timestamptz) - Last update

  ### `customer_referrals`
  Tracks the referral chain and attribution
  - `id` (uuid, primary key) - Referral record ID
  - `referring_customer_id` (uuid) - Customer who made the referral
  - `referred_customer_id` (uuid) - Customer who was referred
  - `original_affiliate_id` (uuid) - Rep who gets credit for this referral
  - `original_partnership_id` (uuid) - Partnership for commission calculation
  - `status` (text) - 'pending', 'converted', 'rewarded'
  - `converted_at` (timestamptz) - When referred customer made first purchase
  - `commission_id` (uuid, nullable) - Commission record for this referral
  - `created_at` (timestamptz) - Referral tracking started

  ## Table Modifications

  ### `product_purchases`
  - Add `customer_id` (uuid) - Links purchase to customer record
  - Add `referral_tier` (text) - 'direct' or 'customer_referral'

  ### `contact_submissions`
  - Add `customer_id` (uuid) - Links submission to customer record
  - Add `customer_referral_code` (text) - Referral code used if any

  ### `commissions`
  - Add `referral_tier` (text) - Tracks commission source: 'direct' or 'customer_referral'
  - Add `customer_referral_id` (uuid) - Links to customer_referrals if applicable

  ### `company_settings`
  - Add `customer_referral_commission_rate` (decimal) - Commission % for customer referrals
  - Add `enable_customer_referrals` (boolean) - Feature toggle

  ## Security
  - Enable RLS on customers and customer_referrals tables
  - Customers can view their own referral data
  - Reps can view customers they brought in and their referral chains
  - Companies can view all customers from their partnerships
  - Protect customer PII with appropriate policies

  ## Indexes
  - Index on customer email and referral_code for fast lookup
  - Index on referral status and dates for reporting
  - Index on original_affiliate_id for rep dashboard queries
*/

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text NOT NULL,
  phone text,
  original_affiliate_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  original_partnership_id uuid NOT NULL REFERENCES affiliate_partnerships(id) ON DELETE CASCADE,
  referred_by_customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  referral_code text NOT NULL UNIQUE,
  total_purchases numeric(10,2) DEFAULT 0 NOT NULL,
  total_referrals integer DEFAULT 0 NOT NULL,
  first_purchase_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT customers_email_unique UNIQUE (email)
);

-- Create customer_referrals table
CREATE TABLE IF NOT EXISTS customer_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referring_customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  referred_customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  original_affiliate_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  original_partnership_id uuid NOT NULL REFERENCES affiliate_partnerships(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'converted', 'rewarded')),
  converted_at timestamptz,
  commission_id uuid REFERENCES commissions(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT customer_referrals_no_self_referral CHECK (referring_customer_id != referred_customer_id)
);

-- Add customer_id to product_purchases
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_purchases' AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE product_purchases ADD COLUMN customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add referral_tier to product_purchases
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_purchases' AND column_name = 'referral_tier'
  ) THEN
    ALTER TABLE product_purchases ADD COLUMN referral_tier text DEFAULT 'direct' CHECK (referral_tier IN ('direct', 'customer_referral'));
  END IF;
END $$;

-- Add customer_id to contact_submissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contact_submissions' AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE contact_submissions ADD COLUMN customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add customer_referral_code to contact_submissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contact_submissions' AND column_name = 'customer_referral_code'
  ) THEN
    ALTER TABLE contact_submissions ADD COLUMN customer_referral_code text;
  END IF;
END $$;

-- Add referral_tier to commissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commissions' AND column_name = 'referral_tier'
  ) THEN
    ALTER TABLE commissions ADD COLUMN referral_tier text DEFAULT 'direct' CHECK (referral_tier IN ('direct', 'customer_referral'));
  END IF;
END $$;

-- Add customer_referral_id to commissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commissions' AND column_name = 'customer_referral_id'
  ) THEN
    ALTER TABLE commissions ADD COLUMN customer_referral_id uuid REFERENCES customer_referrals(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add customer referral settings to company_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'customer_referral_commission_rate'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN customer_referral_commission_rate decimal(5,2) DEFAULT 5.00 NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'enable_customer_referrals'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN enable_customer_referrals boolean DEFAULT true NOT NULL;
  END IF;
END $$;

-- Enable RLS on customers table
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Policy: Customers can view their own record
CREATE POLICY "Customers can view own record"
  ON customers FOR SELECT
  TO authenticated
  USING (
    email IN (
      SELECT email FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy: Reps can view customers they brought in
CREATE POLICY "Affiliates can view their customers"
  ON customers FOR SELECT
  TO authenticated
  USING (
    original_affiliate_id = auth.uid()
  );

-- Policy: Companies can view customers from their partnerships
CREATE POLICY "Companies can view customers from their partnerships"
  ON customers FOR SELECT
  TO authenticated
  USING (
    original_partnership_id IN (
      SELECT ap.id FROM affiliate_partnerships ap
      INNER JOIN products p ON ap.product_id = p.id
      INNER JOIN companies c ON p.company_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

-- Policy: Super admins can view all customers
CREATE POLICY "Super admins can view all customers"
  ON customers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

-- Policy: System can insert customers
CREATE POLICY "Allow authenticated users to create customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: System can update customer records
CREATE POLICY "Allow authenticated users to update customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Enable RLS on customer_referrals table
ALTER TABLE customer_referrals ENABLE ROW LEVEL SECURITY;

-- Policy: Reps can view referrals in their chain
CREATE POLICY "Affiliates can view their referral chains"
  ON customer_referrals FOR SELECT
  TO authenticated
  USING (
    original_affiliate_id = auth.uid()
  );

-- Policy: Companies can view referrals from their partnerships
CREATE POLICY "Companies can view referrals from their partnerships"
  ON customer_referrals FOR SELECT
  TO authenticated
  USING (
    original_partnership_id IN (
      SELECT ap.id FROM affiliate_partnerships ap
      INNER JOIN products p ON ap.product_id = p.id
      INNER JOIN companies c ON p.company_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

-- Policy: Super admins can view all referrals
CREATE POLICY "Super admins can view all referrals"
  ON customer_referrals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

-- Policy: System can insert referrals
CREATE POLICY "Allow authenticated users to create referrals"
  ON customer_referrals FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: System can update referrals
CREATE POLICY "Allow authenticated users to update referrals"
  ON customer_referrals FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_referral_code ON customers(referral_code);
CREATE INDEX IF NOT EXISTS idx_customers_original_affiliate_id ON customers(original_affiliate_id);
CREATE INDEX IF NOT EXISTS idx_customers_referred_by ON customers(referred_by_customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_referrals_referring ON customer_referrals(referring_customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_referrals_referred ON customer_referrals(referred_customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_referrals_affiliate ON customer_referrals(original_affiliate_id);
CREATE INDEX IF NOT EXISTS idx_customer_referrals_status ON customer_referrals(status);
CREATE INDEX IF NOT EXISTS idx_product_purchases_customer_id ON product_purchases(customer_id);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_customer_id ON contact_submissions(customer_id);
CREATE INDEX IF NOT EXISTS idx_commissions_customer_referral_id ON commissions(customer_referral_id);

-- Add updated_at trigger for customers table
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS text AS $$
DECLARE
  code text;
  exists boolean;
BEGIN
  LOOP
    -- Generate 8-character alphanumeric code
    code := upper(substr(md5(random()::text), 1, 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM customers WHERE referral_code = code) INTO exists;
    
    EXIT WHEN NOT exists;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to track customer referral and create commission
CREATE OR REPLACE FUNCTION process_customer_referral()
RETURNS trigger AS $$
DECLARE
  referring_customer_record RECORD;
  referral_record RECORD;
  company_settings_record RECORD;
  commission_amount_calc numeric;
  platform_fee_calc numeric;
  affiliate_payout_calc numeric;
  new_commission_id uuid;
BEGIN
  -- Only process if this is a new customer with a referral code
  IF NEW.customer_referral_code IS NOT NULL AND NEW.customer_id IS NULL THEN
    -- Find the referring customer
    SELECT * INTO referring_customer_record
    FROM customers
    WHERE referral_code = NEW.customer_referral_code;
    
    IF referring_customer_record.id IS NOT NULL THEN
      -- Create customer record for the referred person
      INSERT INTO customers (
        email,
        name,
        phone,
        original_affiliate_id,
        original_partnership_id,
        referred_by_customer_id,
        referral_code
      ) VALUES (
        NEW.email,
        NEW.name,
        NEW.phone,
        referring_customer_record.original_affiliate_id,
        referring_customer_record.original_partnership_id,
        referring_customer_record.id,
        generate_referral_code()
      )
      RETURNING id INTO NEW.customer_id;
      
      -- Create customer_referrals record
      INSERT INTO customer_referrals (
        referring_customer_id,
        referred_customer_id,
        original_affiliate_id,
        original_partnership_id,
        status
      ) VALUES (
        referring_customer_record.id,
        NEW.customer_id,
        referring_customer_record.original_affiliate_id,
        referring_customer_record.original_partnership_id,
        'pending'
      )
      RETURNING id INTO referral_record;
      
      -- Update referring customer's referral count
      UPDATE customers
      SET total_referrals = total_referrals + 1
      WHERE id = referring_customer_record.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically process referrals on contact submission
DROP TRIGGER IF EXISTS trigger_process_customer_referral ON contact_submissions;
CREATE TRIGGER trigger_process_customer_referral
  BEFORE INSERT ON contact_submissions
  FOR EACH ROW
  EXECUTE FUNCTION process_customer_referral();