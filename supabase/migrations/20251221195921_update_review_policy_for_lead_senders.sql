/*
  # Update Review Policy to Allow Lead Senders

  ## Overview
  Updates the company review policy to allow affiliates who have sent leads to a company
  to leave reviews, even if they don't have an approved partnership yet.

  ## Changes Made
  
  ### Updated RLS Policy
  - Replaces the "Affiliates can create reviews for companies they partner with" policy
  - New policy allows reviews if affiliate has:
    1. An approved partnership with any product from the company, OR
    2. Sent at least one lead (contact submission) to the company
  
  ## Rationale
  Affiliates who have sent leads to a company should be able to share their experience
  with the company's responsiveness, communication, and partnership quality, even if
  they don't have a formal approved partnership yet.
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Affiliates can create reviews for companies they partner with" ON company_reviews;

-- Create new policy that allows reviews based on partnerships OR lead submissions
CREATE POLICY "Affiliates can review companies they work with or send leads to"
  ON company_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = reviewer_id AND
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'affiliate'
    ) AND
    (
      -- Condition 1: Has approved partnership with company's products
      EXISTS (
        SELECT 1 FROM affiliate_partnerships ap
        INNER JOIN products p ON ap.product_id = p.id
        WHERE ap.affiliate_id = auth.uid() 
        AND p.company_id = company_reviews.company_id
        AND ap.status = 'approved'
      )
      OR
      -- Condition 2: Has sent at least one lead to the company
      EXISTS (
        SELECT 1 FROM contact_submissions cs
        INNER JOIN affiliate_partnerships ap ON cs.partnership_id = ap.id
        INNER JOIN products p ON ap.product_id = p.id
        WHERE ap.affiliate_id = auth.uid()
        AND p.company_id = company_reviews.company_id
      )
    )
  );