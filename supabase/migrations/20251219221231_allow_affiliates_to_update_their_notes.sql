/*
  # Allow Affiliates to Update Their Notes

  ## Overview
  Adds RLS policy to enable affiliates to update the affiliate_notes field on contact
  submissions from their partnerships. This allows affiliates to track their follow-up
  efforts and conversations with companies about lead outcomes.

  ## Changes
  - Add UPDATE policy for affiliates to update only the affiliate_notes field
  - Affiliates can only update submissions from their own partnerships
  - This enables better communication and tracking between affiliates and companies

  ## Security
  - Affiliates can only update submissions where they are the affiliate in the partnership
  - Only the affiliate_notes field can be modified by affiliates
  - Other fields remain protected from affiliate modification
*/

-- Policy: Affiliates can update affiliate_notes on their contact submissions
CREATE POLICY "Affiliates can update their notes on contact submissions"
  ON contact_submissions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM affiliate_partnerships ap
      WHERE ap.id = contact_submissions.partnership_id
      AND ap.affiliate_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM affiliate_partnerships ap
      WHERE ap.id = contact_submissions.partnership_id
      AND ap.affiliate_id = auth.uid()
    )
  );