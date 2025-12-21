/*
  # Fix Review Policy for Company-Level Partnerships

  ## Overview
  Updates the company review policy to work with both product-level and company-level partnerships.
  The previous policy failed when partnerships had NULL product_id values.

  ## Changes Made
  
  ### Updated RLS Policy
  - Replaces the "Affiliates can review companies they work with or send leads to" policy
  - New policy checks company_id directly on affiliate_partnerships table
  - Supports both company-level partnerships (product_id = NULL) and product-level partnerships
  - Allows reviews if affiliate has:
    1. An approved partnership with the company (directly via company_id), OR
    2. Sent at least one contact submission through any partnership with the company
  
  ## Rationale
  The previous policy joined through the products table, which failed when product_id was NULL.
  This fix checks the company_id directly on the affiliate_partnerships table, which works
  for both company-level and product-level partnerships.
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "Affiliates can review companies they work with or send leads to" ON company_reviews;

-- Create new policy that checks company_id directly
CREATE POLICY "Affiliates can review companies they partner with or send leads to"
  ON company_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = reviewer_id AND
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'affiliate'
    ) AND
    (
      -- Condition 1: Has approved partnership with company (checks company_id directly)
      EXISTS (
        SELECT 1 FROM affiliate_partnerships ap
        WHERE ap.affiliate_id = auth.uid() 
        AND ap.company_id = company_reviews.company_id
        AND ap.status = 'approved'
      )
      OR
      -- Condition 2: Has sent at least one contact submission to the company
      EXISTS (
        SELECT 1 FROM contact_submissions cs
        INNER JOIN affiliate_partnerships ap ON cs.partnership_id = ap.id
        WHERE ap.affiliate_id = auth.uid()
        AND ap.company_id = company_reviews.company_id
      )
    )
  );