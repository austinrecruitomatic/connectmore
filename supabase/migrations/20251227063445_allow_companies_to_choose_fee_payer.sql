/*
  # Allow Companies to Choose Platform Fee Payer

  1. Changes
    - Updates the `prevent_platform_fee_changes()` trigger function
    - Removes restriction on `platform_fee_paid_by` field
    - Keeps restriction on `platform_fee_rate` (super admin only)
  
  2. Business Logic
    - All companies can now decide who pays the platform fee (company or affiliate)
    - Only super admins can change the platform fee rate percentage
    - This gives companies flexibility while maintaining platform control over pricing
*/

-- Update the trigger function to allow companies to change fee payer
CREATE OR REPLACE FUNCTION prevent_platform_fee_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow super admins to change anything
  IF is_super_admin() THEN
    RETURN NEW;
  END IF;

  -- For non-super-admins, only prevent changes to platform fee RATE
  -- They CAN change who pays the fee (platform_fee_paid_by)
  IF OLD.platform_fee_rate IS DISTINCT FROM NEW.platform_fee_rate THEN
    RAISE EXCEPTION 'Only super admins can modify platform fee rate';
  END IF;

  -- Allow the update for all other fields including platform_fee_paid_by
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the comment to reflect the new behavior
COMMENT ON TRIGGER enforce_platform_fee_restrictions ON company_settings IS 
  'Prevents non-super-admin users from modifying platform fee rate (but allows changing who pays the fee)';
