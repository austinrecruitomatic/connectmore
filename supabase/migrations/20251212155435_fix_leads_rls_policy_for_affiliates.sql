/*
  # Fix Leads RLS Policy for Affiliates

  ## Changes
  - Drop the incorrect RLS policy that only works for companies
  - Create a new policy that allows affiliates to view leads from their partnerships
  - Create a separate policy for companies to view leads from their partnerships

  ## Security
  - Affiliates can only view leads from partnerships where they are the affiliate
  - Companies can only view leads from partnerships where they own the company
*/

-- Drop the incorrect policy
DROP POLICY IF EXISTS "Affiliates can view leads from their landing pages" ON leads;

-- Create separate policies for affiliates and companies
CREATE POLICY "Affiliates can view their partnership leads"
  ON leads FOR SELECT
  TO authenticated
  USING (
    partnership_id IN (
      SELECT id FROM affiliate_partnerships 
      WHERE affiliate_id = auth.uid()
    )
  );

CREATE POLICY "Companies can view their partnership leads"
  ON leads FOR SELECT
  TO authenticated
  USING (
    partnership_id IN (
      SELECT ap.id 
      FROM affiliate_partnerships ap
      JOIN companies c ON ap.company_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );
