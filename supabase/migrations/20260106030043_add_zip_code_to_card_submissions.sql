/*
  # Add Zip Code to Card Submissions

  1. Changes
    - Add `zip_code` column to `card_submissions` table
      - Stores billing zip code for card verification
      - Required field for card processing
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'card_submissions' AND column_name = 'zip_code'
  ) THEN
    ALTER TABLE card_submissions ADD COLUMN zip_code text NOT NULL DEFAULT '';
  END IF;
END $$;
