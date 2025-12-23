/*
  # Add Affiliate Lead Update Response Notification Preference
  
  1. Changes
    - Add notification_lead_update_response column to profiles table
    - This allows affiliates to be notified when companies respond to their lead update requests
    
  2. Security
    - Uses existing RLS policies for profiles table
*/

-- Add notification preference for lead update responses
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'notification_lead_update_response'
  ) THEN
    ALTER TABLE profiles ADD COLUMN notification_lead_update_response boolean DEFAULT true;
  END IF;
END $$;
