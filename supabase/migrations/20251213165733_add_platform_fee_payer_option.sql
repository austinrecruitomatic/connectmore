/*
  # Add Platform Fee Payer Option
  
  ## Changes
  - Adds `platform_fee_paid_by` field to company_settings table
  - Allows companies to choose whether they pay the platform fee or pass it to affiliates
  
  ## Details
  - `platform_fee_paid_by` can be 'company' or 'affiliate' (default: 'affiliate')
  - When set to 'affiliate': affiliate receives (commission - platform_fee)
  - When set to 'company': affiliate receives full commission, company pays (commission + platform_fee)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'platform_fee_paid_by'
  ) THEN
    ALTER TABLE company_settings 
    ADD COLUMN platform_fee_paid_by text DEFAULT 'affiliate' NOT NULL 
    CHECK (platform_fee_paid_by IN ('company', 'affiliate'));
  END IF;
END $$;