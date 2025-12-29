/*
  # Add Company Service Area Configuration

  ## Overview
  Adds service area capabilities to companies so they can specify if they serve specific zip codes, operate nationally, or internationally.

  ## Changes Made

  ### 1. New Columns Added to companies table
    - `service_area_type` (text): Defines the service scope
      - 'zip_codes': Company serves specific zip codes only
      - 'national': Company serves entire country
      - 'international': Company serves internationally
      - Defaults to 'national'
    
    - `service_zip_codes` (text[]): Array of zip codes the company services
      - Only relevant when service_area_type is 'zip_codes'
      - Defaults to empty array
      - Indexed for fast zip code lookups

  ### 2. Indexes
    - GIN index on service_zip_codes for efficient zip code searches

  ## Notes
  - Existing companies will default to 'national' service area
  - Companies can update their service area in their profile settings
  - Affiliates can filter companies by zip code in the marketplace
*/

-- Add service area type column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'service_area_type'
  ) THEN
    ALTER TABLE companies ADD COLUMN service_area_type text DEFAULT 'national' CHECK (service_area_type IN ('zip_codes', 'national', 'international'));
  END IF;
END $$;

-- Add service zip codes column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'service_zip_codes'
  ) THEN
    ALTER TABLE companies ADD COLUMN service_zip_codes text[] DEFAULT ARRAY[]::text[];
  END IF;
END $$;

-- Create index for efficient zip code searches
CREATE INDEX IF NOT EXISTS idx_companies_service_zip_codes ON companies USING GIN (service_zip_codes);