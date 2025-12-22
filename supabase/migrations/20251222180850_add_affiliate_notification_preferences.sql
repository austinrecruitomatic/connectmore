/*
  # Add Affiliate Notification Preferences
  
  1. Changes
    - Add notification preferences columns to profiles table for affiliates
    - notification_lead_dispositioned: Notify when a lead status changes
    - notification_lead_closed: Notify when a lead is marked as closed
    - notification_customer_submission: Notify when a customer submits through their portal
    
  2. Security
    - Affiliates can update their own notification preferences
    - Existing RLS policies cover read access
*/

-- Add notification preference columns to profiles table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'notification_lead_dispositioned'
  ) THEN
    ALTER TABLE profiles ADD COLUMN notification_lead_dispositioned boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'notification_lead_closed'
  ) THEN
    ALTER TABLE profiles ADD COLUMN notification_lead_closed boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'notification_customer_submission'
  ) THEN
    ALTER TABLE profiles ADD COLUMN notification_customer_submission boolean DEFAULT true;
  END IF;
END $$;

-- Add policy for affiliates to update their own notification preferences
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can update own notification preferences'
  ) THEN
    CREATE POLICY "Users can update own notification preferences"
      ON profiles
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;