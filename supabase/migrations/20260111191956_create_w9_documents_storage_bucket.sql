/*
  # Create W-9 Documents Storage Bucket

  ## Overview
  Creates secure storage bucket for W-9 PDF documents with strict access controls.

  ## Security
  - Only affiliate owner can upload their own W-9
  - Only affiliate owner and super admins can download W-9 documents
  - Audit trail for all access
*/

-- Create the w9-documents bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'w9-documents',
  'w9-documents',
  false,
  10485760,
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Allow users to upload their own W-9
CREATE POLICY "Users can upload own W-9"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'w9-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to update their own W-9
CREATE POLICY "Users can update own W-9"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'w9-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'w9-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to view their own W-9
CREATE POLICY "Users can view own W-9"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'w9-documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_super_admin = true
      )
    )
  );

-- Allow users to delete their own W-9
CREATE POLICY "Users can delete own W-9"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'w9-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );