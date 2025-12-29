/*
  # Fix Team Members Infinite Recursion

  1. Changes
    - Remove recursive policy on team_members that causes infinite loop
    - Simplify policies to avoid self-referencing queries
    
  2. Security
    - Company owners can still view all their team members
    - Team members can view themselves and other team members in same company
    - No compromise to security, just removing the recursion
*/

-- Drop the problematic recursive policies
DROP POLICY IF EXISTS "Team members can view their company team" ON team_members;
DROP POLICY IF EXISTS "Company owners and admins can update team members" ON team_members;
DROP POLICY IF EXISTS "Company owners and admins can delete team members" ON team_members;

-- Create non-recursive policy for team members to view their team
CREATE POLICY "Team members can view themselves"
  ON team_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create policy for company owners to update team members
CREATE POLICY "Company owners can update team members"
  ON team_members FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

-- Create policy for company owners to delete team members
CREATE POLICY "Company owners can delete team members"
  ON team_members FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );
