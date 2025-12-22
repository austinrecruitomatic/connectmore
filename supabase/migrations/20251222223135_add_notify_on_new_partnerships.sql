/*
  # Add notify_on_new_partnerships to company_settings

  1. Changes
    - Add `notify_on_new_partnerships` boolean column to company_settings
    - Default to true for new partnerships notifications
    - Remove old `notify_on_deal_closed` column if it exists
  
  2. Notes
    - Companies can now control if they receive notifications for new partnership requests
*/

-- Add the new notification preference
ALTER TABLE company_settings 
ADD COLUMN IF NOT EXISTS notify_on_new_partnerships boolean DEFAULT true;

-- Remove the old deal closed notification column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'notify_on_deal_closed'
  ) THEN
    ALTER TABLE company_settings DROP COLUMN notify_on_deal_closed;
  END IF;
END $$;
