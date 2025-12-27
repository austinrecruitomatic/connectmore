/*
  # Update Product Images Bucket Policy

  1. Changes
    - Drop the restrictive product-based policy
    - Create a new policy allowing companies to upload to their own folder
    - Companies can upload images to paths like: companyId/filename.jpg or companyId/hero/filename.jpg
  
  2. Security
    - Companies can only upload to folders matching their user ID
    - Everyone can view images (public bucket)
*/

DROP POLICY IF EXISTS "Companies can upload product images" ON storage.objects;

CREATE POLICY "Companies can upload to their folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.objects.name LIKE auth.uid()::text || '/%')
  );