/*
  # Company Contracts System

  1. New Tables
    - `company_contracts`
      - `id` (uuid, primary key)
      - `company_id` (uuid, references companies)
      - `title` (text) - Contract name/title
      - `content` (text) - Full contract text
      - `is_active` (boolean) - Whether this contract is currently active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `partnership_contract_acceptances`
      - `id` (uuid, primary key)
      - `partnership_id` (uuid, references affiliate_partnerships)
      - `contract_id` (uuid, references company_contracts)
      - `affiliate_id` (uuid, references profiles)
      - `accepted` (boolean) - Whether contract was accepted
      - `accepted_at` (timestamptz)
      - `ip_address` (text) - IP address of acceptance for legal record
      - `contract_snapshot` (text) - Copy of contract at time of acceptance

  2. Security
    - Enable RLS on both tables
    - Companies can manage their own contracts
    - Affiliates can view active contracts when applying
    - Both parties can view accepted contracts for their partnerships
    - Super admins can view all contracts
*/

-- Create company_contracts table
CREATE TABLE IF NOT EXISTS company_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL DEFAULT 'Affiliate Partnership Agreement',
  content text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create partnership_contract_acceptances table
CREATE TABLE IF NOT EXISTS partnership_contract_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_id uuid REFERENCES affiliate_partnerships(id) ON DELETE CASCADE NOT NULL,
  contract_id uuid REFERENCES company_contracts(id) ON DELETE SET NULL,
  affiliate_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  accepted boolean NOT NULL,
  accepted_at timestamptz DEFAULT now(),
  ip_address text,
  contract_snapshot text NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_company_contracts_company_id ON company_contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_company_contracts_active ON company_contracts(company_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_partnership_acceptances_partnership ON partnership_contract_acceptances(partnership_id);
CREATE INDEX IF NOT EXISTS idx_partnership_acceptances_affiliate ON partnership_contract_acceptances(affiliate_id);

-- Enable RLS
ALTER TABLE company_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE partnership_contract_acceptances ENABLE ROW LEVEL SECURITY;

-- Policies for company_contracts

-- Companies can view their own contracts
CREATE POLICY "Companies can view own contracts"
  ON company_contracts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_contracts.company_id
      AND companies.user_id = auth.uid()
    )
  );

-- Companies can insert their own contracts
CREATE POLICY "Companies can create own contracts"
  ON company_contracts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_contracts.company_id
      AND companies.user_id = auth.uid()
    )
  );

-- Companies can update their own contracts
CREATE POLICY "Companies can update own contracts"
  ON company_contracts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_contracts.company_id
      AND companies.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_contracts.company_id
      AND companies.user_id = auth.uid()
    )
  );

-- Companies can delete their own contracts
CREATE POLICY "Companies can delete own contracts"
  ON company_contracts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_contracts.company_id
      AND companies.user_id = auth.uid()
    )
  );

-- Affiliates can view active contracts when considering partnership
CREATE POLICY "Affiliates can view active contracts"
  ON company_contracts FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Super admins can view all contracts
CREATE POLICY "Super admins can view all contracts"
  ON company_contracts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

-- Policies for partnership_contract_acceptances

-- Affiliates can view their own acceptances
CREATE POLICY "Affiliates can view own acceptances"
  ON partnership_contract_acceptances FOR SELECT
  TO authenticated
  USING (affiliate_id = auth.uid());

-- Companies can view acceptances for their partnerships
CREATE POLICY "Companies can view partnership acceptances"
  ON partnership_contract_acceptances FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM affiliate_partnerships ap
      JOIN companies c ON c.id = ap.company_id
      WHERE ap.id = partnership_contract_acceptances.partnership_id
      AND c.user_id = auth.uid()
    )
  );

-- Affiliates can create acceptances
CREATE POLICY "Affiliates can create acceptances"
  ON partnership_contract_acceptances FOR INSERT
  TO authenticated
  WITH CHECK (affiliate_id = auth.uid());

-- Super admins can view all acceptances
CREATE POLICY "Super admins can view all acceptances"
  ON partnership_contract_acceptances FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

-- Add updated_at trigger for company_contracts
CREATE OR REPLACE FUNCTION update_company_contracts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_company_contracts_updated_at
  BEFORE UPDATE ON company_contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_company_contracts_updated_at();
