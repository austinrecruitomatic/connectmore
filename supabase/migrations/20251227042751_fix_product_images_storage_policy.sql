/*
  # Fix Product Images Storage Policy

  1. Changes
    - Update the storage policy to allow companies to upload to their company folder
    - Check that the user owns the company by joining with the companies table
    - Allow uploads to paths like: companyId/filename.jpg or companyId/hero/filename.jpg
  
  2. Security
    - Users can only upload to folders matching their company's ID
    - Everyone can view images (public bucket)
*/

DROP POLICY IF EXISTS "Companies can upload to their folder" ON storage.objects;

CREATE POLICY "Companies can upload to their company folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM companies
      WHERE companies.user_id = auth.uid()
      AND (storage.objects.name LIKE companies.id::text || '/%')
    )
  );
