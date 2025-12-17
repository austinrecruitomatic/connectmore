/*
  # Allow Affiliates to View Their Contact Submissions

  ## Overview
  Adds RLS policy to enable affiliates to view contact submissions generated from their partnerships.
  This allows affiliates to track their lead generation efforts and see the outcomes of their referrals.

  ## Changes
  - Add SELECT policy for affiliates to view contact_submissions from their partnerships
  - Affiliates can see all fields including contact details for leads they generated
  - This enables affiliates to track conversion rates and lead quality

  ## Security
  - Affiliates can only view submissions where they are the affiliate in the partnership
  - No INSERT, UPDATE, or DELETE permissions for affiliates
  - Contact information is visible to affiliates since they generated the leads
*/

-- Policy: Affiliates can view contact submissions from their partnerships
CREATE POLICY "Affiliates can view their contact submissions"
  ON contact_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM affiliate_partnerships ap
      WHERE ap.id = contact_submissions.partnership_id
      AND ap.affiliate_id = auth.uid()
    )
  );
