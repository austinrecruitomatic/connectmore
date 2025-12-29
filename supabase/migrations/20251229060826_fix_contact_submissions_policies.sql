/*
  # Fix Contact Submissions RLS Policies

  1. Changes
    - Remove duplicate/conflicting policies
    - Recreate clean policies for companies and team members to view/update submissions
    
  2. Security
    - Ensures company owners can always see their leads
    - Team members with appropriate permissions can see leads
    - No breaking of existing affiliate access
*/

-- Drop all company-related policies for contact_submissions
DROP POLICY IF EXISTS "Companies and team members can view submissions" ON contact_submissions;
DROP POLICY IF EXISTS "Companies and team members can update submissions" ON contact_submissions;
DROP POLICY IF EXISTS "contact_submissions_company_select_policy" ON contact_submissions;
DROP POLICY IF EXISTS "contact_submissions_company_update_policy" ON contact_submissions;

-- Create clean policies for companies to view submissions
CREATE POLICY "Companies can view their leads"
  ON contact_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM affiliate_partnerships ap
      JOIN companies c ON c.id = ap.company_id
      WHERE ap.id = contact_submissions.partnership_id
      AND c.user_id = auth.uid()
    )
  );

-- Create policy for team members to view submissions
CREATE POLICY "Team members can view company leads"
  ON contact_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM affiliate_partnerships ap
      JOIN team_members tm ON tm.company_id = ap.company_id
      WHERE ap.id = contact_submissions.partnership_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
      AND tm.can_manage_leads = true
    )
  );

-- Create clean policies for companies to update submissions
CREATE POLICY "Companies can update their leads"
  ON contact_submissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM affiliate_partnerships ap
      JOIN companies c ON c.id = ap.company_id
      WHERE ap.id = contact_submissions.partnership_id
      AND c.user_id = auth.uid()
    )
  );

-- Create policy for team members to update submissions
CREATE POLICY "Team members can update company leads"
  ON contact_submissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM affiliate_partnerships ap
      JOIN team_members tm ON tm.company_id = ap.company_id
      WHERE ap.id = contact_submissions.partnership_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
      AND tm.can_manage_leads = true
    )
  );
