/*
  # Add Default Contract Support

  1. Changes
    - Add `custom_contract_content` column to companies table
    - Add `use_custom_contract` boolean to companies table
    - Companies will use a system default TCPA-compliant contract unless they customize it

  2. Notes
    - Default contract ensures TCPA compliance
    - Makes affiliates liable for obtaining proper consent
    - Companies can customize if needed
*/

-- Add contract columns to companies table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'use_custom_contract'
  ) THEN
    ALTER TABLE companies ADD COLUMN use_custom_contract boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'custom_contract_content'
  ) THEN
    ALTER TABLE companies ADD COLUMN custom_contract_content text;
  END IF;
END $$;
