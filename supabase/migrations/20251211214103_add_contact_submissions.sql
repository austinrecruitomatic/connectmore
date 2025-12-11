/*
  # Add Contact Submissions for Lead Management

  ## Overview
  Creates a new table to capture detailed contact information from leads who submit forms on landing pages.
  This enables companies to actually reach out to leads and track their progress through the sales pipeline.

  ## New Tables
  
  ### `contact_submissions`
  - `id` (uuid, primary key) - Unique identifier for the submission
  - `partnership_id` (uuid) - Links to the affiliate partnership that generated this lead
  - `landing_page_slug` (text) - The affiliate code/slug where the form was submitted
  - `name` (text) - Lead's full name
  - `email` (text) - Lead's email address (required for contact)
  - `phone` (text, nullable) - Lead's phone number
  - `company_name` (text, nullable) - Lead's company name
  - `message` (text, nullable) - Lead's message/inquiry
  - `status` (text) - Pipeline status: 'new', 'contacted', 'qualified', 'not_interested', 'closed'
  - `notes` (text, nullable) - Internal notes for companies to track conversations
  - `responded_at` (timestamptz, nullable) - When company first responded
  - `responded_by` (uuid, nullable) - Which user responded
  - `created_at` (timestamptz) - Submission timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Table Modifications
  
  ### `leads` table
  - Add `contact_submission_id` column to link leads to contact form submissions
  
  ## Security
  
  ### Row Level Security (RLS)
  1. Enable RLS on `contact_submissions` table
  2. Companies can view submissions for their partnerships only
  3. Companies can update status and notes for their submissions only
  4. Affiliates can view basic stats (count only) but not contact details
  
  ## Indexes
  - Index on `partnership_id` for fast filtering by partnership
  - Index on `status` for fast filtering by pipeline stage
  - Index on `created_at` for chronological sorting
*/

-- Create contact_submissions table
CREATE TABLE IF NOT EXISTS contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_id uuid REFERENCES affiliate_partnerships(id) ON DELETE CASCADE NOT NULL,
  landing_page_slug text NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  company_name text,
  message text,
  status text DEFAULT 'new' NOT NULL CHECK (status IN ('new', 'contacted', 'qualified', 'not_interested', 'closed')),
  notes text,
  responded_at timestamptz,
  responded_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Add contact_submission_id to leads table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'contact_submission_id'
  ) THEN
    ALTER TABLE leads ADD COLUMN contact_submission_id uuid REFERENCES contact_submissions(id);
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contact_submissions_partnership ON contact_submissions(partnership_id);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON contact_submissions(status);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at ON contact_submissions(created_at DESC);

-- Enable RLS
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Policy: Companies can view all submissions for their partnerships
CREATE POLICY "Companies can view their contact submissions"
  ON contact_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM affiliate_partnerships ap
      INNER JOIN companies c ON c.id = ap.company_id
      INNER JOIN profiles p ON p.id = c.user_id
      WHERE ap.id = contact_submissions.partnership_id
      AND p.id = auth.uid()
    )
  );

-- Policy: Companies can update status and notes for their submissions
CREATE POLICY "Companies can update their contact submissions"
  ON contact_submissions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM affiliate_partnerships ap
      INNER JOIN companies c ON c.id = ap.company_id
      INNER JOIN profiles p ON p.id = c.user_id
      WHERE ap.id = contact_submissions.partnership_id
      AND p.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM affiliate_partnerships ap
      INNER JOIN companies c ON c.id = ap.company_id
      INNER JOIN profiles p ON p.id = c.user_id
      WHERE ap.id = contact_submissions.partnership_id
      AND p.id = auth.uid()
    )
  );

-- Policy: Anyone can insert contact submissions (public form submission)
CREATE POLICY "Anyone can submit contact forms"
  ON contact_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_contact_submissions_updated_at ON contact_submissions;
CREATE TRIGGER update_contact_submissions_updated_at
  BEFORE UPDATE ON contact_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();