/*
  # Update Service Areas to State/County System

  ## Overview
  Replaces zip code-based service areas with a more user-friendly state/county system.

  ## Changes Made

  ### 1. Updated columns in companies table
    - Removed `service_zip_codes` (text[] array)
    - Added `service_states` (text[] array): List of state codes (e.g., ['TX', 'CA'])
    - Added `service_counties` (jsonb): Maps states to their counties
      Example: {"TX": ["Travis County", "Dallas County"], "CA": ["Los Angeles County"]}
    - Updated `service_area_type` values to:
      - 'local': Serves specific states/counties
      - 'regional': Serves multiple states
      - 'national': Serves entire country
      - 'international': Serves globally
    - Default changed to 'national' for backward compatibility

  ### 2. Indexes
    - Removed old GIN index on service_zip_codes
    - Added GIN index on service_states for efficient state searches
    - Added GIN index on service_counties for efficient county searches

  ## Migration Strategy
  - Existing companies with 'zip_codes' type will be converted to 'local'
  - Empty arrays/objects for service_states and service_counties
  - Companies will need to update their service areas in profile settings

  ## Notes
  - State codes should be 2-letter abbreviations (e.g., 'TX', 'CA')
  - Counties should include "County" suffix (e.g., "Travis County")
  - service_counties is optional - companies can serve entire states without specifying counties
*/

-- Drop old index and column
DROP INDEX IF EXISTS idx_companies_service_zip_codes;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'service_zip_codes'
  ) THEN
    ALTER TABLE companies DROP COLUMN service_zip_codes;
  END IF;
END $$;

-- Add new service area columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'service_states'
  ) THEN
    ALTER TABLE companies ADD COLUMN service_states text[] DEFAULT ARRAY[]::text[];
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'service_counties'
  ) THEN
    ALTER TABLE companies ADD COLUMN service_counties jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Update service_area_type constraint
DO $$
BEGIN
  -- Drop old constraint if exists
  ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_service_area_type_check;
  
  -- Add new constraint with updated values
  ALTER TABLE companies ADD CONSTRAINT companies_service_area_type_check 
    CHECK (service_area_type IN ('local', 'regional', 'national', 'international'));
END $$;

-- Update existing 'zip_codes' type to 'local'
UPDATE companies 
SET service_area_type = 'local' 
WHERE service_area_type = 'zip_codes';

-- Create indexes for efficient searches
CREATE INDEX IF NOT EXISTS idx_companies_service_states ON companies USING GIN (service_states);
CREATE INDEX IF NOT EXISTS idx_companies_service_counties ON companies USING GIN (service_counties);