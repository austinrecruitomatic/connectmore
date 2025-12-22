/*
  # Add Lead Update Requests
  
  1. New Tables
    - `lead_update_requests`
      - `id` (uuid, primary key)
      - `contact_submission_id` (uuid, foreign key to contact_submissions)
      - `affiliate_id` (uuid, foreign key to profiles)
      - `company_id` (uuid, foreign key to companies)
      - `requested_at` (timestamptz)
      - `resolved_at` (timestamptz, nullable)
      
  2. Security
    - Enable RLS on `lead_update_requests` table
    - Affiliates can create requests for their own leads
    - Companies can view requests for their leads
    - Both can see their own requests
*/

-- Create lead_update_requests table
CREATE TABLE IF NOT EXISTS lead_update_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_submission_id uuid NOT NULL REFERENCES contact_submissions(id) ON DELETE CASCADE,
  affiliate_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  requested_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- Enable RLS
ALTER TABLE lead_update_requests ENABLE ROW LEVEL SECURITY;

-- Affiliates can create requests for their own leads
CREATE POLICY "Affiliates can create their own update requests"
  ON lead_update_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = affiliate_id
  );

-- Affiliates can view their own requests
CREATE POLICY "Affiliates can view their own update requests"
  ON lead_update_requests
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = affiliate_id
  );

-- Companies can view requests for their leads
CREATE POLICY "Companies can view update requests for their leads"
  ON lead_update_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = lead_update_requests.company_id
      AND companies.user_id = auth.uid()
    )
  );

-- Companies can mark requests as resolved
CREATE POLICY "Companies can update requests for their leads"
  ON lead_update_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = lead_update_requests.company_id
      AND companies.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = lead_update_requests.company_id
      AND companies.user_id = auth.uid()
    )
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_lead_update_requests_contact_submission 
  ON lead_update_requests(contact_submission_id);
CREATE INDEX IF NOT EXISTS idx_lead_update_requests_affiliate 
  ON lead_update_requests(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_lead_update_requests_company 
  ON lead_update_requests(company_id);