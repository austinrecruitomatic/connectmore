/*
  # Update Business Categories to Specific Industries

  ## Overview
  Updates the business_category field to use more specific industry categories
  instead of vague generic categories.

  ## Changes Made

  ### 1. Update existing data first
    - Map old categories to new ones where possible
    - Set unmapped categories to 'other'

  ### 2. Drop existing constraint
    - Remove old business_category constraint

  ### 3. Add new constraint with specific industries
    - real_estate
    - insurance
    - taxes
    - legal_software
    - legal_services
    - recruiting
    - hr_software
    - marketing
    - sales_software
    - accounting
    - financial_services
    - healthcare
    - construction
    - consulting
    - ecommerce
    - other

  ## Notes
  - Existing companies with old categories will be migrated to new values
  - Companies can update their category from the profile page
*/

-- Update existing categories to new values first
UPDATE companies 
SET business_category = CASE 
  WHEN business_category = 'ecommerce' THEN 'ecommerce'
  WHEN business_category = 'saas' THEN 'other'
  WHEN business_category = 'finance' THEN 'financial_services'
  WHEN business_category = 'health' THEN 'healthcare'
  WHEN business_category = 'services' THEN 'consulting'
  ELSE 'other'
END;

-- Drop the existing constraint
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_business_category_check;

-- Add new constraint with specific industry categories
ALTER TABLE companies ADD CONSTRAINT companies_business_category_check 
CHECK (business_category IN (
  'real_estate',
  'insurance',
  'taxes',
  'legal_software',
  'legal_services',
  'recruiting',
  'hr_software',
  'marketing',
  'sales_software',
  'accounting',
  'financial_services',
  'healthcare',
  'construction',
  'consulting',
  'ecommerce',
  'other'
));