/*
  # Allow Anonymous Form Field Reads

  1. Changes
    - Update custom_form_fields SELECT policy to allow anonymous (unauthenticated) users
    - This enables customers to see form fields from product share links without being logged in
    
  2. Security
    - Only SELECT is allowed for anonymous users
    - INSERT, UPDATE, DELETE remain restricted to form owners
*/

-- Drop existing select policy
DROP POLICY IF EXISTS "Users can view fields for accessible forms" ON custom_form_fields;

-- Create new policy allowing both authenticated and anonymous users to read fields
CREATE POLICY "Anyone can view form fields"
  ON custom_form_fields
  FOR SELECT
  TO authenticated, anon
  USING (true);
