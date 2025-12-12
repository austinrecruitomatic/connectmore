/*
  # Fix Contact Submissions INSERT Policy

  ## Overview
  Recreates the INSERT policy for contact submissions to ensure anonymous
  and authenticated users can submit forms without restrictions.

  ## Changes Made

  ### 1. Drop and recreate INSERT policy
    - Remove any cached policy issues
    - Ensure clean policy creation
    - Allow both anon and authenticated users
    
  ## Security Notes
  - Anyone can insert contact submissions (public form)
  - Companies can view and manage their submissions
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Anyone can submit contact forms" ON contact_submissions;

-- Recreate INSERT policy with explicit permissions
CREATE POLICY "Anyone can submit contact forms"
  ON contact_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Verify RLS is enabled
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;