/*
  # Allow Admin Team Members to Update Company Settings

  1. Changes
    - Update companies RLS policy to allow admin team members to update company settings
    - This enables team admins to configure webhooks, payment settings, and other company configurations

  2. Security
    - Only active team members with 'admin' role can update company settings
    - Company owner retains full update access
*/

DROP POLICY IF EXISTS "Company owners can update their company" ON companies;
CREATE POLICY "Company owners and admins can update company"
  ON companies FOR UPDATE
  TO authenticated
  USING (
    (select auth.uid()) = user_id OR
    id IN (
      SELECT company_id FROM team_members
      WHERE user_id = auth.uid() 
      AND role = 'admin' 
      AND status = 'active'
    )
  )
  WITH CHECK (
    (select auth.uid()) = user_id OR
    id IN (
      SELECT company_id FROM team_members
      WHERE user_id = auth.uid() 
      AND role = 'admin' 
      AND status = 'active'
    )
  );