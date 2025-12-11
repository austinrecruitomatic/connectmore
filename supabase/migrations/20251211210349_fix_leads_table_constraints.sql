/*
  # Fix Leads Table Constraints

  ## Changes Made
  1. Make landing_page_id nullable to support tracking leads by partnership without requiring a landing_page record
  2. Add 'view' to the allowed lead_type values (previously only allowed: click, signup, conversion)

  ## Rationale
  - The landing page viewer uses affiliate codes to dynamically generate pages without creating landing_page records
  - This allows flexible lead tracking for both formal landing pages and dynamic partnership links
  - Adding 'view' lead type enables tracking page views in addition to clicks and conversions
*/

-- Make landing_page_id nullable
ALTER TABLE leads 
ALTER COLUMN landing_page_id DROP NOT NULL;

-- Drop the existing check constraint on lead_type
ALTER TABLE leads 
DROP CONSTRAINT IF EXISTS leads_lead_type_check;

-- Add new check constraint that includes 'view'
ALTER TABLE leads 
ADD CONSTRAINT leads_lead_type_check 
CHECK (lead_type = ANY (ARRAY['view'::text, 'click'::text, 'signup'::text, 'conversion'::text]));