/*
  # Add Deal Payment Periods Tracking

  1. New Table
    - `deal_payment_periods`
      - Tracks each expected payment period for recurring contracts
      - Companies confirm when payment is received
      - Commission is generated upon payment confirmation
  
  2. Columns
    - `id` (uuid, primary key)
    - `deal_id` (uuid, references deals)
    - `period_number` (integer) - 1, 2, 3, etc.
    - `expected_payment_date` (date) - When payment is expected
    - `payment_confirmed` (boolean) - Whether company confirmed payment
    - `payment_confirmed_at` (timestamp) - When payment was confirmed
    - `payment_confirmed_by` (uuid, references profiles) - Who confirmed
    - `commission_id` (uuid, references commissions) - Generated commission
    - `created_at` (timestamp)
    - `updated_at` (timestamp)

  3. Security
    - Enable RLS
    - Companies can view and update their own payment periods
    - Affiliates can view payment periods for their deals
*/

CREATE TABLE IF NOT EXISTS deal_payment_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  period_number integer NOT NULL,
  expected_payment_date date NOT NULL,
  payment_confirmed boolean DEFAULT false,
  payment_confirmed_at timestamptz,
  payment_confirmed_by uuid REFERENCES profiles(id),
  commission_id uuid REFERENCES commissions(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(deal_id, period_number)
);

ALTER TABLE deal_payment_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies can view their payment periods"
  ON deal_payment_periods FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_payment_periods.deal_id
      AND deals.company_id IN (
        SELECT id FROM companies WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Companies can update their payment periods"
  ON deal_payment_periods FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_payment_periods.deal_id
      AND deals.company_id IN (
        SELECT id FROM companies WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_payment_periods.deal_id
      AND deals.company_id IN (
        SELECT id FROM companies WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Affiliates can view their payment periods"
  ON deal_payment_periods FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_payment_periods.deal_id
      AND deals.affiliate_id = auth.uid()
    )
  );

CREATE POLICY "System can insert payment periods"
  ON deal_payment_periods FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX idx_deal_payment_periods_deal_id ON deal_payment_periods(deal_id);
CREATE INDEX idx_deal_payment_periods_confirmed ON deal_payment_periods(payment_confirmed, expected_payment_date);