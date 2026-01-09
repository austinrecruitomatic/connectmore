/*
  # Add Commission Payment Tracking

  1. Changes to Profiles
    - Add `venmo_username` for payment processing
    - Stores Venmo handle for receiving payments

  2. Changes to Commissions
    - Add `company_paid` (boolean) - tracks if company paid the commission
    - Add `company_paid_at` (timestamptz) - when company paid
    - Add `rep_paid` (boolean) - tracks if rep was paid
    - Add `rep_paid_at` (timestamptz) - when rep was paid
    - Add `payment_notes` (text) - optional notes about payment

  3. Purpose
    - Track payment flow: Company pays → Rep gets paid
    - Store Venmo username for payment processing
    - Maintain audit trail of payment dates
*/

-- Add Venmo username to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'venmo_username'
  ) THEN
    ALTER TABLE profiles ADD COLUMN venmo_username text;
  END IF;
END $$;

-- Add payment tracking to commissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commissions' AND column_name = 'company_paid'
  ) THEN
    ALTER TABLE commissions ADD COLUMN company_paid boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commissions' AND column_name = 'company_paid_at'
  ) THEN
    ALTER TABLE commissions ADD COLUMN company_paid_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commissions' AND column_name = 'rep_paid'
  ) THEN
    ALTER TABLE commissions ADD COLUMN rep_paid boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commissions' AND column_name = 'rep_paid_at'
  ) THEN
    ALTER TABLE commissions ADD COLUMN rep_paid_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commissions' AND column_name = 'payment_notes'
  ) THEN
    ALTER TABLE commissions ADD COLUMN payment_notes text;
  END IF;
END $$;

-- Create indexes for payment tracking queries
CREATE INDEX IF NOT EXISTS idx_commissions_company_paid ON commissions(company_paid);
CREATE INDEX IF NOT EXISTS idx_commissions_rep_paid ON commissions(rep_paid);
