/*
  # Add Affiliate Notes to Contact Submissions

  ## Overview
  Adds a field for affiliates to add their own follow-up notes about leads
  they've submitted. This allows affiliates to track their conversations with
  companies about deal outcomes and lead progress.

  ## Changes Made

  ### 1. New Columns
    - `affiliate_notes` (text, nullable)
      - Allows affiliates to add notes about their follow-up efforts
      - Separate from company notes field
      - Can include information about conversations with the company

  ## Security
  - No RLS changes needed - existing policies cover this field
  - Affiliates can update their own partnership's leads
*/

-- Add affiliate_notes column to contact_submissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contact_submissions' AND column_name = 'affiliate_notes'
  ) THEN
    ALTER TABLE contact_submissions 
    ADD COLUMN affiliate_notes text;
  END IF;
END $$;