/*
  # Commission and Payout System with Platform Fees

  ## Overview
  Creates a complete commission tracking and payout system where:
  - Companies create deals from qualified leads
  - Commissions are automatically calculated with platform fees
  - Affiliates receive batched payouts with full transparency
  - Supports both one-time and recurring revenue deals

  ## New Tables

  ### `deals`
  Tracks contracts between companies and customers referred by affiliates
  - `id` (uuid, primary key) - Unique deal identifier
  - `contact_submission_id` (uuid) - Links to the lead that converted
  - `partnership_id` (uuid) - The affiliate partnership that generated this deal
  - `company_id` (uuid) - Company that owns this deal
  - `affiliate_id` (uuid) - Affiliate who referred the customer
  - `deal_value` (decimal) - Total contract value
  - `contract_type` (text) - 'one_time' or 'recurring'
  - `billing_frequency` (text) - For recurring: 'monthly', 'quarterly', 'annual'
  - `status` (text) - 'active', 'cancelled', 'completed'
  - `contract_start_date` (date) - When contract begins
  - `contract_end_date` (date, nullable) - When contract ends (if applicable)
  - `notes` (text) - Additional deal information
  - `created_at` (timestamptz) - Deal creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `commissions`
  Individual commission records for each payment received
  - `id` (uuid, primary key) - Commission record ID
  - `deal_id` (uuid) - The deal that generated this commission
  - `partnership_id` (uuid) - Partnership associated with commission
  - `affiliate_id` (uuid) - Affiliate earning this commission
  - `company_id` (uuid) - Company paying the commission
  - `commission_amount` (decimal) - Total commission before platform fee
  - `platform_fee_amount` (decimal) - Platform's cut
  - `affiliate_payout_amount` (decimal) - What affiliate receives
  - `commission_type` (text) - 'initial' or 'recurring'
  - `period_start` (date, nullable) - For recurring: period start
  - `period_end` (date, nullable) - For recurring: period end
  - `status` (text) - 'pending', 'approved', 'paid'
  - `expected_payout_date` (date) - When affiliate should receive payment
  - `paid_at` (timestamptz, nullable) - Actual payment timestamp
  - `created_at` (timestamptz) - Commission creation timestamp

  ### `payouts`
  Batched payments to affiliates combining multiple commissions
  - `id` (uuid, primary key) - Payout batch ID
  - `affiliate_id` (uuid) - Affiliate receiving payment
  - `total_amount` (decimal) - Total payout amount
  - `platform_fee_total` (decimal) - Total platform fees from included commissions
  - `commission_ids` (uuid[]) - Array of commission IDs included in this payout
  - `status` (text) - 'scheduled', 'processing', 'completed', 'failed'
  - `scheduled_date` (date) - When payout is scheduled
  - `processed_at` (timestamptz, nullable) - When payout was completed
  - `stripe_transfer_id` (text, nullable) - Stripe transfer reference
  - `notes` (text) - Payout notes or error messages
  - `created_at` (timestamptz) - Payout creation timestamp

  ### `company_settings`
  Commission configuration per company
  - `company_id` (uuid, primary key) - Company these settings belong to
  - `commission_rate` (decimal) - Default commission percentage (e.g., 10 for 10%)
  - `platform_fee_rate` (decimal) - Platform's percentage of commission (e.g., 20 for 20%)
  - `payout_frequency_days` (integer) - Days between payouts (e.g., 30 for monthly)
  - `auto_approve_commissions` (boolean) - Auto-approve or require manual review
  - `stripe_account_id` (text, nullable) - Connected Stripe account
  - `created_at` (timestamptz) - Settings creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security
  - Enable RLS on all tables
  - Companies can manage their own deals and commissions
  - Affiliates can view their own commissions and payouts
  - Platform admins can view all records (future enhancement)

  ## Indexes
  - Index on commission status, affiliate_id, company_id for fast queries
  - Index on expected_payout_date for batch processing
  - Index on deal status and type for reporting
*/

-- Create deals table
CREATE TABLE IF NOT EXISTS deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_submission_id uuid REFERENCES contact_submissions(id) ON DELETE SET NULL,
  partnership_id uuid REFERENCES affiliate_partnerships(id) ON DELETE CASCADE NOT NULL,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  affiliate_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  deal_value decimal(10,2) NOT NULL CHECK (deal_value >= 0),
  contract_type text NOT NULL CHECK (contract_type IN ('one_time', 'recurring')),
  billing_frequency text CHECK (billing_frequency IN ('monthly', 'quarterly', 'annual')),
  status text DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'cancelled', 'completed')),
  contract_start_date date NOT NULL DEFAULT CURRENT_DATE,
  contract_end_date date,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create commissions table
CREATE TABLE IF NOT EXISTS commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  partnership_id uuid REFERENCES affiliate_partnerships(id) ON DELETE CASCADE NOT NULL,
  affiliate_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  commission_amount decimal(10,2) NOT NULL CHECK (commission_amount >= 0),
  platform_fee_amount decimal(10,2) NOT NULL DEFAULT 0 CHECK (platform_fee_amount >= 0),
  affiliate_payout_amount decimal(10,2) NOT NULL CHECK (affiliate_payout_amount >= 0),
  commission_type text NOT NULL CHECK (commission_type IN ('initial', 'recurring')),
  period_start date,
  period_end date,
  status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'paid')),
  expected_payout_date date NOT NULL,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create payouts table
CREATE TABLE IF NOT EXISTS payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  total_amount decimal(10,2) NOT NULL CHECK (total_amount >= 0),
  platform_fee_total decimal(10,2) NOT NULL DEFAULT 0 CHECK (platform_fee_total >= 0),
  commission_ids uuid[] NOT NULL DEFAULT '{}',
  status text DEFAULT 'scheduled' NOT NULL CHECK (status IN ('scheduled', 'processing', 'completed', 'failed')),
  scheduled_date date NOT NULL,
  processed_at timestamptz,
  stripe_transfer_id text,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create company_settings table
CREATE TABLE IF NOT EXISTS company_settings (
  company_id uuid PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  commission_rate decimal(5,2) DEFAULT 10.00 NOT NULL CHECK (commission_rate >= 0 AND commission_rate <= 100),
  platform_fee_rate decimal(5,2) DEFAULT 20.00 NOT NULL CHECK (platform_fee_rate >= 0 AND platform_fee_rate <= 100),
  payout_frequency_days integer DEFAULT 30 NOT NULL CHECK (payout_frequency_days > 0),
  auto_approve_commissions boolean DEFAULT false NOT NULL,
  stripe_account_id text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_deals_company_id ON deals(company_id);
CREATE INDEX IF NOT EXISTS idx_deals_affiliate_id ON deals(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_deals_partnership_id ON deals(partnership_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_contact_submission_id ON deals(contact_submission_id);

CREATE INDEX IF NOT EXISTS idx_commissions_deal_id ON commissions(deal_id);
CREATE INDEX IF NOT EXISTS idx_commissions_affiliate_id ON commissions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_commissions_company_id ON commissions(company_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_expected_payout_date ON commissions(expected_payout_date);

CREATE INDEX IF NOT EXISTS idx_payouts_affiliate_id ON payouts(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_scheduled_date ON payouts(scheduled_date);

-- Enable RLS
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for deals
CREATE POLICY "Companies can view their deals"
  ON deals FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Affiliates can view their deals"
  ON deals FOR SELECT
  TO authenticated
  USING (affiliate_id = auth.uid());

CREATE POLICY "Companies can create deals"
  ON deals FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Companies can update their deals"
  ON deals FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for commissions
CREATE POLICY "Companies can view their commissions"
  ON commissions FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Affiliates can view their commissions"
  ON commissions FOR SELECT
  TO authenticated
  USING (affiliate_id = auth.uid());

CREATE POLICY "Companies can create commissions"
  ON commissions FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Companies can update their commissions"
  ON commissions FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for payouts
CREATE POLICY "Affiliates can view their payouts"
  ON payouts FOR SELECT
  TO authenticated
  USING (affiliate_id = auth.uid());

CREATE POLICY "System can manage payouts"
  ON payouts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for company_settings
CREATE POLICY "Companies can view their settings"
  ON company_settings FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Companies can insert their settings"
  ON company_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Companies can update their settings"
  ON company_settings FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

-- Add triggers for updated_at columns
CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON company_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();