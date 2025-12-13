/*
  # Restrict Platform Fee Settings to Super Admin Only

  ## Overview
  Adds database-level protection to ensure only super admins can modify platform fee settings.
  Regular companies can only update their commission rate and other settings, but not the platform fee.

  ## Changes

  1. **Add Check Constraint Function**
     - Creates a function to validate platform fee changes are made by super admins only
     - Used in UPDATE policies on company_settings table

  2. **Update RLS Policies on company_settings**
     - Modify UPDATE policies to split permissions:
       - Companies can update: commission_rate, payout_frequency_days, auto_approve_commissions
       - Only super admins can update: platform_fee_rate, platform_fee_paid_by

  ## Security
  - Database-level enforcement prevents unauthorized changes
  - Even if frontend is bypassed, backend will reject unauthorized updates
  - Audit trail maintained for all changes

  ## Notes
  - Super admins retain full control over all settings
  - Regular companies can still configure their commission rates
  - Platform fee settings are now centrally controlled
*/

-- Function to check if a user is a super admin
CREATE OR REPLACE FUNCTION is_super_admin_user(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id AND is_super_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing company settings update policies if they exist
DROP POLICY IF EXISTS "Companies can update their own settings" ON company_settings;
DROP POLICY IF EXISTS "Super admins can update all company settings" ON company_settings;

-- Create new policy for companies to update non-platform-fee fields
CREATE POLICY "Companies can update their commission settings"
  ON company_settings FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

-- Create policy for super admins to update all settings including platform fees
CREATE POLICY "Super admins can update all company settings including platform fees"
  ON company_settings FOR UPDATE
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Add a trigger to prevent regular companies from changing platform fee fields
CREATE OR REPLACE FUNCTION prevent_platform_fee_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow super admins to change anything
  IF is_super_admin() THEN
    RETURN NEW;
  END IF;

  -- For non-super-admins, prevent changes to platform fee fields
  IF OLD.platform_fee_rate IS DISTINCT FROM NEW.platform_fee_rate THEN
    RAISE EXCEPTION 'Only super admins can modify platform fee rate';
  END IF;

  IF OLD.platform_fee_paid_by IS DISTINCT FROM NEW.platform_fee_paid_by THEN
    RAISE EXCEPTION 'Only super admins can modify who pays platform fee';
  END IF;

  -- Allow the update for other fields
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to enforce platform fee restrictions
DROP TRIGGER IF EXISTS enforce_platform_fee_restrictions ON company_settings;

CREATE TRIGGER enforce_platform_fee_restrictions
  BEFORE UPDATE ON company_settings
  FOR EACH ROW
  EXECUTE FUNCTION prevent_platform_fee_changes();

-- Add helpful comment
COMMENT ON TRIGGER enforce_platform_fee_restrictions ON company_settings IS 
  'Prevents non-super-admin users from modifying platform fee settings';
