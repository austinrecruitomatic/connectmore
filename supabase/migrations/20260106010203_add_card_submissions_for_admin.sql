/*
  # Add Card Submissions for Admin Billing

  1. New Tables
    - `card_submissions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `cardholder_name` (text)
      - `card_number` (text, encrypted card number)
      - `expiry_date` (text)
      - `cvv` (text)
      - `last_4` (text)
      - `processed` (boolean, default false)
      - `processed_at` (timestamptz)
      - `processed_by` (uuid, references profiles)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on `card_submissions` table
    - Allow users to insert their own card info
    - Allow super admins to view all submissions
    - Allow super admins to mark as processed
*/

CREATE TABLE IF NOT EXISTS card_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  cardholder_name text NOT NULL,
  card_number text NOT NULL,
  expiry_date text NOT NULL,
  cvv text NOT NULL,
  last_4 text NOT NULL,
  processed boolean DEFAULT false,
  processed_at timestamptz,
  processed_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE card_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own card info"
  ON card_submissions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admins can view all card submissions"
  ON card_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

CREATE POLICY "Super admins can update card submissions"
  ON card_submissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

CREATE INDEX idx_card_submissions_user_id ON card_submissions(user_id);
CREATE INDEX idx_card_submissions_processed ON card_submissions(processed);
CREATE INDEX idx_card_submissions_created_at ON card_submissions(created_at DESC);
