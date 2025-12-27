/*
  # Add Commission Denial and Company Notes

  1. Changes
    - Add 'denied' status to commissions table
    - Add company_notes field for companies to explain denial/cancellation
    - Add company_notes_updated_at timestamp to track when notes were last modified
  
  2. Security
    - Maintain existing RLS policies
    - Company notes are visible to both companies and affiliates
*/

-- Add denied status and company notes to commissions table
DO $$
BEGIN
  -- Update the status check constraint to include 'denied'
  ALTER TABLE commissions DROP CONSTRAINT IF EXISTS commissions_status_check;
  ALTER TABLE commissions ADD CONSTRAINT commissions_status_check 
    CHECK (status IN ('pending', 'approved', 'paid', 'denied'));
END $$;

-- Add company_notes column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commissions' AND column_name = 'company_notes'
  ) THEN
    ALTER TABLE commissions ADD COLUMN company_notes text DEFAULT '';
  END IF;
END $$;

-- Add company_notes_updated_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commissions' AND column_name = 'company_notes_updated_at'
  ) THEN
    ALTER TABLE commissions ADD COLUMN company_notes_updated_at timestamptz;
  END IF;
END $$;

-- Create a function to update the company_notes_updated_at timestamp
CREATE OR REPLACE FUNCTION update_commission_notes_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_notes IS DISTINCT FROM OLD.company_notes THEN
    NEW.company_notes_updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating company_notes timestamp
DROP TRIGGER IF EXISTS update_commission_notes_timestamp_trigger ON commissions;
CREATE TRIGGER update_commission_notes_timestamp_trigger
  BEFORE UPDATE ON commissions
  FOR EACH ROW
  EXECUTE FUNCTION update_commission_notes_timestamp();
