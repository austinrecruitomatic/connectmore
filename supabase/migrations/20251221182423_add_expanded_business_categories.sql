/*
  # Expand Business Categories

  ## Overview
  Expands the business_category field to include more industry types and organizes them alphabetically.

  ## Changes Made

  ### 1. Drop existing constraint
    - Remove old business_category constraint

  ### 2. Add new constraint with expanded categories
    All categories sorted alphabetically:
    - accounting
    - advertising
    - analytics
    - banking
    - business_intelligence
    - cloud_services
    - construction
    - consulting
    - crm
    - cybersecurity
    - design
    - ecommerce
    - education
    - financial_services
    - healthcare
    - hospitality
    - hr_software
    - insurance
    - it_services
    - legal_services
    - legal_software
    - logistics
    - manufacturing
    - marketing
    - payment_processing
    - project_management
    - real_estate
    - recruiting
    - retail
    - sales_software
    - saas
    - taxes
    - telecommunications
    - travel
    - other

  ## Notes
  - Existing companies will retain their current categories
  - New categories provide more granular industry classification
  - All categories are in alphabetical order for better organization
*/

-- Drop the existing constraint
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_business_category_check;

-- Add new constraint with expanded and alphabetically sorted categories
ALTER TABLE companies ADD CONSTRAINT companies_business_category_check 
CHECK (business_category IN (
  'accounting',
  'advertising',
  'analytics',
  'banking',
  'business_intelligence',
  'cloud_services',
  'construction',
  'consulting',
  'crm',
  'cybersecurity',
  'design',
  'ecommerce',
  'education',
  'financial_services',
  'healthcare',
  'hospitality',
  'hr_software',
  'insurance',
  'it_services',
  'legal_services',
  'legal_software',
  'logistics',
  'manufacturing',
  'marketing',
  'payment_processing',
  'project_management',
  'real_estate',
  'recruiting',
  'retail',
  'sales_software',
  'saas',
  'taxes',
  'telecommunications',
  'travel',
  'other'
));