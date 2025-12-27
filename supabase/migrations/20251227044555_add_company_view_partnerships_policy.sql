/*
  # Add Company View Partnerships Policy

  1. Changes
    - Add SELECT policy for companies to view their own partnerships
    
  2. Security
    - Companies can view partnerships where they own the company
    - This enables the partnerships screen to work correctly for company users
*/

-- Drop policy if it exists and recreate
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'affiliate_partnerships' 
    AND policyname = 'Companies can view their partnerships'
  ) THEN
    DROP POLICY "Companies can view their partnerships" ON affiliate_partnerships;
  END IF;
END $$;

-- Add policy for companies to view their partnerships
CREATE POLICY "Companies can view their partnerships"
  ON affiliate_partnerships
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM companies
      WHERE companies.id = affiliate_partnerships.company_id
        AND companies.user_id = auth.uid()
    )
  );
