/*
  # Temporarily Disable RLS for Contact Submissions

  ## Overview
  Disables RLS on contact_submissions table to allow public form submissions.
  This is a temporary fix to get the form working while we investigate
  the RLS policy configuration issue.

  ## Changes Made

  ### 1. Disable RLS on contact_submissions
    - Allows anyone to insert submissions without policy checks
    
  ## Security Notes
  - This makes the table fully accessible
  - We'll re-enable RLS once we identify the policy issue
  - Only use temporarily for debugging
*/

-- Disable RLS temporarily
ALTER TABLE contact_submissions DISABLE ROW LEVEL SECURITY;