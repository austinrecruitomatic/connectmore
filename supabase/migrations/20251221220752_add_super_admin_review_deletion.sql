/*
  # Allow Super Admins to Delete Reviews

  1. Changes
    - Add policy to allow super admins to delete any review (for spam moderation)

  2. Security
    - Only users marked as super_admin can delete any review
    - Regular users can still only delete their own reviews (existing policy)
*/

CREATE POLICY "Super admins can delete any review"
  ON company_reviews
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );
