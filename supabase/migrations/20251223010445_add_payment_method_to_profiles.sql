/*
  # Add Payment Method to Profiles
  
  ## Changes
  - Add `stripe_payment_method_id` to profiles table for companies to store their payment card
  - This card will be used to charge companies when they pay affiliate commissions
  
  ## Security
  - No RLS changes needed (already secured by existing profile policies)
*/

-- Add payment method ID field to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'stripe_payment_method_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN stripe_payment_method_id text;
  END IF;
END $$;