/*
  # Add Contract Length Support

  1. Changes to Tables
    - Add `contract_length_months` to `deals` table
      - Stores the length of the contract in months
      - NULL means indefinite/ongoing for recurring contracts or N/A for one-time
    - Add `contract_length_months` to `contact_submissions` table
      - Allows leads to specify expected contract length upfront

  2. Purpose
    - Track contract duration for accurate commission calculations
    - Support multi-month contracts where affiliates earn commission on each payment
    - Distinguish between lump-sum payments and monthly contracts
*/

-- Add contract length to deals table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'contract_length_months'
  ) THEN
    ALTER TABLE deals ADD COLUMN contract_length_months integer;
    COMMENT ON COLUMN deals.contract_length_months IS 'Length of contract in months. NULL = indefinite/ongoing';
  END IF;
END $$;

-- Add contract length to contact_submissions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contact_submissions' AND column_name = 'contract_length_months'
  ) THEN
    ALTER TABLE contact_submissions ADD COLUMN contract_length_months integer;
    COMMENT ON COLUMN contact_submissions.contract_length_months IS 'Expected contract length in months';
  END IF;
END $$;