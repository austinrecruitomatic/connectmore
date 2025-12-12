/*
  # Add Contract Value Fields to Contact Submissions

  1. Changes
    - Add `contract_value` column to store the monetary value (numeric field)
    - Add `contract_type` column to specify if it's 'monthly' or 'total' (text field with default 'total')
  
  2. Notes
    - contract_value is nullable since not all leads will have contract values immediately
    - contract_type defaults to 'total' but can be changed to 'monthly'
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contact_submissions' AND column_name = 'contract_value'
  ) THEN
    ALTER TABLE contact_submissions ADD COLUMN contract_value numeric(10,2) DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contact_submissions' AND column_name = 'contract_type'
  ) THEN
    ALTER TABLE contact_submissions ADD COLUMN contract_type text DEFAULT 'total' CHECK (contract_type IN ('monthly', 'total'));
  END IF;
END $$;
