/*
  # Add DELETE policy for products table

  1. Changes
    - Add DELETE policy to allow company owners to delete their products
  
  2. Security
    - Only company owners can delete their own products
    - Verified through company_id and user_id relationship
*/

DO $$
BEGIN
  -- Drop existing DELETE policy if it exists
  DROP POLICY IF EXISTS "Company owners can delete their products" ON products;
  
  -- Create DELETE policy
  CREATE POLICY "Company owners can delete their products"
    ON products
    FOR DELETE
    TO authenticated
    USING (
      company_id IN (
        SELECT id FROM companies WHERE user_id = auth.uid()
      )
    );
END $$;
