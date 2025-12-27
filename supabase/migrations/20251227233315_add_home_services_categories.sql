/*
  # Add Home Services Business Categories

  ## Overview
  Adds home services and contractor business categories to the companies table.

  ## Changes Made

  ### 1. Drop existing constraint
    - Remove current business_category constraint

  ### 2. Add new constraint with home services categories
    New home services categories added:
    - doors
    - electrical
    - fiber_internet
    - flooring
    - hvac
    - permanent_lighting
    - pest_control
    - plumbing
    - roofing
    - solar
    - windows

  ### 3. Complete alphabetically sorted category list
    All existing categories plus new home services:
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
    - doors (NEW)
    - ecommerce
    - education
    - electrical (NEW)
    - fiber_internet (NEW)
    - financial_services
    - flooring (NEW)
    - healthcare
    - hospitality
    - hr_software
    - hvac (NEW)
    - insurance
    - it_services
    - legal_services
    - legal_software
    - logistics
    - manufacturing
    - marketing
    - payment_processing
    - permanent_lighting (NEW)
    - pest_control (NEW)
    - plumbing (NEW)
    - project_management
    - real_estate
    - recruiting
    - retail
    - roofing (NEW)
    - sales_software
    - saas
    - solar (NEW)
    - taxes
    - telecommunications
    - travel
    - windows (NEW)
    - other

  ## Notes
  - Existing companies retain their current categories
  - New categories support home services and contractor businesses
  - All categories remain alphabetically sorted
*/

-- Drop the existing constraint
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_business_category_check;

-- Add new constraint with home services categories included
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
  'doors',
  'ecommerce',
  'education',
  'electrical',
  'fiber_internet',
  'financial_services',
  'flooring',
  'healthcare',
  'hospitality',
  'hr_software',
  'hvac',
  'insurance',
  'it_services',
  'legal_services',
  'legal_software',
  'logistics',
  'manufacturing',
  'marketing',
  'payment_processing',
  'permanent_lighting',
  'pest_control',
  'plumbing',
  'project_management',
  'real_estate',
  'recruiting',
  'retail',
  'roofing',
  'sales_software',
  'saas',
  'solar',
  'taxes',
  'telecommunications',
  'travel',
  'windows',
  'other'
));