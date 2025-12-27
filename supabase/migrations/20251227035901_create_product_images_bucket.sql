/*
  # Create Product Images Storage Bucket

  1. Storage
    - Create a public bucket for product hero images
    - Set up RLS policies for secure access
  
  2. Security
    - Companies can upload images for their own products
    - Everyone can view images (public bucket)
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Companies can upload product images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM public.products
      WHERE products.company_id = auth.uid()
      AND storage.objects.name LIKE products.id::text || '/%'
    )
  );

CREATE POLICY "Anyone can view product images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'product-images');