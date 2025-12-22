/*
  # Customer Earnings & Payout Configuration

  ## Overview
  Adds commission split configuration and customer payout management to enable 
  customers to earn and withdraw referral commissions.

  ## Table Modifications

  ### `customers`
  New columns for payout preferences:
  - `stripe_account_id` (text) - Stripe Connect account for payouts
  - `preferred_payout_method` (text) - 'stripe' or 'manual'
  - `payout_email` (text) - Email for payout notifications
  - `payout_minimum` (decimal) - Minimum balance before payout
  - `total_earned` (decimal) - Lifetime earnings from referrals
  - `total_paid` (decimal) - Total paid out to customer
  - `pending_balance` (decimal) - Current unpaid balance

  ### `company_settings`
  New columns for referral commission configuration:
  - `customer_referral_commission_rate` (decimal) - Commission % paid to referring customer (already exists)
  - `rep_override_commission_rate` (decimal) - Override commission % paid to original sales rep
  - `customer_payout_minimum` (decimal) - Minimum payout threshold for customers

  ## New Tables

  ### `customer_payouts`
  Tracks customer payout history
  - `id` (uuid, primary key)
  - `customer_id` (uuid) - Customer receiving payout
  - `amount` (decimal) - Payout amount
  - `status` (text) - 'pending', 'processing', 'completed', 'failed'
  - `payout_method` (text) - 'stripe', 'manual'
  - `stripe_transfer_id` (text) - Stripe transfer ID if applicable
  - `notes` (text) - Admin notes
  - `processed_at` (timestamptz) - When payout was processed
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on customer_payouts
  - Customers can view their own payouts
  - Companies can view payouts for their customers
  - Super admins can view and manage all payouts

  ## Indexes
  - Index on customer_id for fast lookup
  - Index on status for payout processing
*/

-- Add payout preferences to customers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'stripe_account_id'
  ) THEN
    ALTER TABLE customers ADD COLUMN stripe_account_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'preferred_payout_method'
  ) THEN
    ALTER TABLE customers ADD COLUMN preferred_payout_method text DEFAULT 'manual' CHECK (preferred_payout_method IN ('stripe', 'manual'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'payout_email'
  ) THEN
    ALTER TABLE customers ADD COLUMN payout_email text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'payout_minimum'
  ) THEN
    ALTER TABLE customers ADD COLUMN payout_minimum decimal(10,2) DEFAULT 50.00 NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'total_earned'
  ) THEN
    ALTER TABLE customers ADD COLUMN total_earned decimal(10,2) DEFAULT 0 NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'total_paid'
  ) THEN
    ALTER TABLE customers ADD COLUMN total_paid decimal(10,2) DEFAULT 0 NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'pending_balance'
  ) THEN
    ALTER TABLE customers ADD COLUMN pending_balance decimal(10,2) DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- Add rep override commission rate to company_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'rep_override_commission_rate'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN rep_override_commission_rate decimal(5,2) DEFAULT 3.00 NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'customer_payout_minimum'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN customer_payout_minimum decimal(10,2) DEFAULT 50.00 NOT NULL;
  END IF;
END $$;

-- Create customer_payouts table
CREATE TABLE IF NOT EXISTS customer_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL,
  status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  payout_method text NOT NULL CHECK (payout_method IN ('stripe', 'manual')),
  stripe_transfer_id text,
  notes text,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on customer_payouts
ALTER TABLE customer_payouts ENABLE ROW LEVEL SECURITY;

-- Policy: Customers can view their own payouts
CREATE POLICY "Customers can view own payouts"
  ON customer_payouts FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE email IN (
        SELECT email FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Policy: Companies can view payouts for their customers
CREATE POLICY "Companies can view customer payouts"
  ON customer_payouts FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT c.id FROM customers c
      INNER JOIN affiliate_partnerships ap ON c.original_partnership_id = ap.id
      INNER JOIN products p ON ap.product_id = p.id
      INNER JOIN companies co ON p.company_id = co.id
      WHERE co.user_id = auth.uid()
    )
  );

-- Policy: Super admins can view all payouts
CREATE POLICY "Super admins can view all customer payouts"
  ON customer_payouts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

-- Policy: Super admins can insert payouts
CREATE POLICY "Super admins can create customer payouts"
  ON customer_payouts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

-- Policy: Super admins can update payouts
CREATE POLICY "Super admins can update customer payouts"
  ON customer_payouts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customer_payouts_customer_id ON customer_payouts(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_payouts_status ON customer_payouts(status);
CREATE INDEX IF NOT EXISTS idx_customer_payouts_created_at ON customer_payouts(created_at DESC);

-- Function to process customer referral commission
CREATE OR REPLACE FUNCTION create_customer_referral_commissions()
RETURNS trigger AS $$
DECLARE
  referring_customer RECORD;
  company_settings_record RECORD;
  customer_commission_amount numeric;
  rep_override_amount numeric;
  deal_value numeric;
BEGIN
  -- Only process when a referral is converted
  IF NEW.status = 'converted' AND OLD.status = 'pending' THEN
    -- Get referring customer details
    SELECT * INTO referring_customer
    FROM customers
    WHERE id = NEW.referring_customer_id;
    
    -- Get company settings for commission rates
    SELECT cs.* INTO company_settings_record
    FROM company_settings cs
    INNER JOIN affiliate_partnerships ap ON ap.id = NEW.original_partnership_id
    INNER JOIN products p ON p.id = ap.product_id
    WHERE cs.company_id = p.company_id;
    
    -- Get the deal value from the referred customer's first purchase
    SELECT COALESCE(contract_value, 0) INTO deal_value
    FROM contact_submissions
    WHERE customer_id = NEW.referred_customer_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Calculate commission amounts
    customer_commission_amount := deal_value * (company_settings_record.customer_referral_commission_rate / 100);
    rep_override_amount := deal_value * (company_settings_record.rep_override_commission_rate / 100);
    
    -- Create commission for referring customer
    INSERT INTO commissions (
      affiliate_id,
      partnership_id,
      amount,
      status,
      referral_tier,
      customer_referral_id
    ) VALUES (
      referring_customer.original_affiliate_id,
      NEW.original_partnership_id,
      customer_commission_amount,
      'pending',
      'customer_referral',
      NEW.id
    );
    
    -- Update customer's earnings
    UPDATE customers
    SET 
      total_earned = total_earned + customer_commission_amount,
      pending_balance = pending_balance + customer_commission_amount
    WHERE id = NEW.referring_customer_id;
    
    -- Create override commission for original sales rep (if override rate > 0)
    IF rep_override_amount > 0 THEN
      INSERT INTO commissions (
        affiliate_id,
        partnership_id,
        amount,
        status,
        referral_tier,
        customer_referral_id
      ) VALUES (
        referring_customer.original_affiliate_id,
        NEW.original_partnership_id,
        rep_override_amount,
        'pending',
        'customer_referral',
        NEW.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for customer referral commissions
DROP TRIGGER IF EXISTS trigger_create_customer_referral_commissions ON customer_referrals;
CREATE TRIGGER trigger_create_customer_referral_commissions
  AFTER UPDATE ON customer_referrals
  FOR EACH ROW
  EXECUTE FUNCTION create_customer_referral_commissions();
