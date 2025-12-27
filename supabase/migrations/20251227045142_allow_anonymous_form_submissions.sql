/*
  # Allow Anonymous Form Submissions

  1. Changes
    - Update form_submissions INSERT policy to allow anonymous (unauthenticated) users
    - This enables customers to submit forms from product share links without being logged in
    
  2. Security
    - Only INSERT is allowed for anonymous users
    - SELECT remains restricted to form owners and submitters
*/

-- Drop existing insert policy
DROP POLICY IF EXISTS "Anyone can submit forms" ON form_submissions;

-- Create new policy allowing both authenticated and anonymous users
CREATE POLICY "Anyone can submit forms"
  ON form_submissions
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);
