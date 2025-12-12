/*
  # Grant Table Permissions for Contact Submissions

  ## Overview
  Ensures that anon and authenticated roles have the necessary table-level
  permissions to insert into contact_submissions.

  ## Changes Made

  ### 1. Grant INSERT permission to anon role
    - Allows anonymous users to insert records
    
  ### 2. Grant INSERT permission to authenticated role
    - Allows authenticated users to insert records
    
  ### 3. Grant SELECT permission to anon role
    - Allows reading back inserted records
*/

-- Grant necessary permissions to anon role
GRANT INSERT ON contact_submissions TO anon;
GRANT SELECT ON contact_submissions TO anon;

-- Grant necessary permissions to authenticated role
GRANT INSERT ON contact_submissions TO authenticated;
GRANT SELECT ON contact_submissions TO authenticated;
GRANT UPDATE ON contact_submissions TO authenticated;