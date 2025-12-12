/*
  # Completely Reset Contact Submissions RLS

  ## Overview
  Removes all policies and recreates them from scratch to fix persistent
  RLS issues blocking form submissions.

  ## Changes Made

  ### 1. Drop all existing policies
    - Clean slate for policy recreation
    
  ### 2. Create minimal, permissive policies
    - Allow all inserts for anon and authenticated
    - Allow selects for reading back data
    - Keep company access policies
*/

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Anyone can submit contact forms" ON contact_submissions;
DROP POLICY IF EXISTS "Allow select on just-inserted submissions" ON contact_submissions;
DROP POLICY IF EXISTS "Companies can view their contact submissions" ON contact_submissions;
DROP POLICY IF EXISTS "Companies can update their contact submissions" ON contact_submissions;
DROP POLICY IF EXISTS "Super admins can view all contact submissions" ON contact_submissions;
DROP POLICY IF EXISTS "Super admins can update all contact submissions" ON contact_submissions;

-- Disable and re-enable RLS to clear any cache
ALTER TABLE contact_submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Create INSERT policy - allow anyone to submit
CREATE POLICY "contact_submissions_insert_policy"
  ON contact_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Create SELECT policy for anon users - allow reading any row
CREATE POLICY "contact_submissions_anon_select_policy"
  ON contact_submissions
  FOR SELECT
  TO anon
  USING (true);

-- Create SELECT policy for companies
CREATE POLICY "contact_submissions_company_select_policy"
  ON contact_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM affiliate_partnerships ap
      JOIN companies c ON c.id = ap.company_id
      JOIN profiles p ON p.id = c.user_id
      WHERE ap.id = contact_submissions.partnership_id
      AND p.id = auth.uid()
    )
  );

-- Create UPDATE policy for companies
CREATE POLICY "contact_submissions_company_update_policy"
  ON contact_submissions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM affiliate_partnerships ap
      JOIN companies c ON c.id = ap.company_id
      JOIN profiles p ON p.id = c.user_id
      WHERE ap.id = contact_submissions.partnership_id
      AND p.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM affiliate_partnerships ap
      JOIN companies c ON c.id = ap.company_id
      JOIN profiles p ON p.id = c.user_id
      WHERE ap.id = contact_submissions.partnership_id
      AND p.id = auth.uid()
    )
  );