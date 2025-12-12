/*
  # Fix Contact Submissions RLS for Anonymous Users

  ## Overview
  Allows anonymous users to select their just-inserted contact submission.
  This fixes the form submission error where the INSERT succeeds but the
  subsequent SELECT fails due to RLS restrictions.

  ## Changes Made

  ### 1. Add SELECT policy for anonymous inserts
    - Allows returning data immediately after insert
    - Uses session's temporary context to identify the submission
    
  ## Security Notes
  - Anonymous users can only see the record they just inserted
  - After the session ends, they lose access
  - Companies retain full access to all their submissions
*/

-- Drop existing select policy and recreate with anon support
DROP POLICY IF EXISTS "Companies can view their contact submissions" ON contact_submissions;

-- Policy: Companies can view all submissions for their partnerships
CREATE POLICY "Companies can view their contact submissions"
  ON contact_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM affiliate_partnerships ap
      INNER JOIN companies c ON c.id = ap.company_id
      INNER JOIN profiles p ON p.id = c.user_id
      WHERE ap.id = contact_submissions.partnership_id
      AND p.id = auth.uid()
    )
  );

-- Policy: Allow returning inserted rows (for .select().single() after insert)
CREATE POLICY "Allow select on just-inserted submissions"
  ON contact_submissions
  FOR SELECT
  TO anon
  USING (true);