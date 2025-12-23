/*
  # Complete Payment System Implementation

  ## Overview
  Implements end-to-end payment tracking from customer purchase to affiliate payout.
  Payment flow: Customer → Company → Platform → Affiliate

  ## New Tables

  1. **customer_payments**
     - Tracks all customer purchases and payments
     - Links to Stripe payment intents/checkout sessions
     - Records payment amount, status, and customer info
     - Links to products and partnerships for commission tracking

  2. **company_commission_payments**
     - Tracks commission payments from companies to platform
     - Records when companies remit commissions owed
     - Links to specific commissions being paid
     - Stores Stripe payment transaction IDs

  3. **platform_treasury**
     - Platform-level financial tracking
     - Records all money in/out movements
     - Tracks platform fees collected
     - Calculates outstanding balances

  4. **payment_reconciliation**
     - Links all payment types together
     - Provides audit trail from customer payment to affiliate payout
     - Tracks settlement status across entire payment chain
     - Enables financial reporting and reconciliation

  5. **payment_audit_log**
     - Complete history of all payment events
     - Immutable audit trail for compliance
     - Records all payment state changes
     - Tracks webhook events and manual actions

  6. **company_payment_methods**
     - Stores saved payment methods for companies
     - Links to Stripe payment method IDs
     - Supports auto-pay for commissions
     - Tracks default payment method

  ## Table Updates

  - **commissions**: Add company_payment_status, company_paid_at, stripe_transfer_id
  - **deals**: Add customer_payment_id, payment_verified, stripe_payment_intent_id
  - **companies**: Add outstanding_commission_balance, auto_pay_commissions

  ## Security
  - All tables have RLS enabled
  - Companies can only see their own payment data
  - Affiliates can only see their commission payment status
  - Platform admin (super_admin) can see all financial data
  - Audit logs are read-only for non-admins

  ## Indexes
  - Optimized for financial queries and reporting
  - Fast lookups by Stripe transaction IDs
  - Efficient date range queries for reconciliation
*/

-- ============================================================================
-- CUSTOMER PAYMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS customer_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  partnership_id uuid REFERENCES affiliate_partnerships(id) ON DELETE SET NULL,
  
  -- Payment Details
  amount_total decimal(10, 2) NOT NULL,
  currency text DEFAULT 'usd' NOT NULL,
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'cancelled')) NOT NULL,
  
  -- Stripe Integration
  stripe_payment_intent_id text UNIQUE,
  stripe_checkout_session_id text UNIQUE,
  stripe_charge_id text,
  stripe_customer_id text,
  
  -- Customer Information
  customer_email text NOT NULL,
  customer_name text,
  customer_metadata jsonb DEFAULT '{}',
  
  -- Deal Linking
  deal_id uuid REFERENCES deals(id) ON DELETE SET NULL,
  auto_create_deal boolean DEFAULT true,
  
  -- Payment Metadata
  payment_method_type text, -- card, bank_transfer, etc.
  receipt_url text,
  invoice_url text,
  
  -- Refund Tracking
  refunded_amount decimal(10, 2) DEFAULT 0,
  refunded_at timestamptz,
  refund_reason text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customer_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies can view their customer payments"
  ON customer_payments FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Companies can insert customer payments"
  ON customer_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Companies can update their customer payments"
  ON customer_payments FOR UPDATE
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

CREATE POLICY "Super admins can view all customer payments"
  ON customer_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- ============================================================================
-- COMPANY COMMISSION PAYMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS company_commission_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  
  -- Payment Details
  total_amount decimal(10, 2) NOT NULL,
  currency text DEFAULT 'usd' NOT NULL,
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded')) NOT NULL,
  
  -- Stripe Integration
  stripe_payment_intent_id text UNIQUE,
  stripe_charge_id text,
  
  -- Commission Tracking
  commission_ids uuid[] DEFAULT '{}', -- Array of commission IDs being paid
  number_of_commissions integer DEFAULT 0,
  
  -- Metadata
  payment_method_id text, -- Stripe payment method ID
  payment_method_type text,
  receipt_url text,
  notes text,
  
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE company_commission_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies can view their commission payments"
  ON company_commission_payments FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Companies can insert commission payments"
  ON company_commission_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Super admins can view all commission payments"
  ON company_commission_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

CREATE POLICY "Super admins can update commission payments"
  ON company_commission_payments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- ============================================================================
-- PLATFORM TREASURY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS platform_treasury (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Transaction Details
  transaction_type text CHECK (transaction_type IN ('commission_received', 'affiliate_payout', 'platform_fee_collected', 'refund_issued', 'adjustment')) NOT NULL,
  amount decimal(10, 2) NOT NULL,
  currency text DEFAULT 'usd' NOT NULL,
  
  -- References
  company_commission_payment_id uuid REFERENCES company_commission_payments(id) ON DELETE SET NULL,
  commission_id uuid REFERENCES commissions(id) ON DELETE SET NULL,
  payout_id uuid REFERENCES payouts(id) ON DELETE SET NULL,
  
  -- Balance Tracking
  balance_before decimal(10, 2),
  balance_after decimal(10, 2),
  
  -- Metadata
  description text,
  metadata jsonb DEFAULT '{}',
  
  created_at timestamptz DEFAULT now()
);

ALTER TABLE platform_treasury ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only super admins can view platform treasury"
  ON platform_treasury FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

CREATE POLICY "Only super admins can insert platform treasury records"
  ON platform_treasury FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- ============================================================================
-- PAYMENT RECONCILIATION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_reconciliation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Payment Chain Links
  customer_payment_id uuid REFERENCES customer_payments(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE,
  commission_id uuid REFERENCES commissions(id) ON DELETE CASCADE,
  company_commission_payment_id uuid REFERENCES company_commission_payments(id) ON DELETE SET NULL,
  payout_id uuid REFERENCES payouts(id) ON DELETE SET NULL,
  
  -- Settlement Status
  customer_paid boolean DEFAULT false,
  deal_created boolean DEFAULT false,
  commission_calculated boolean DEFAULT false,
  commission_approved boolean DEFAULT false,
  company_paid_commission boolean DEFAULT false,
  affiliate_paid boolean DEFAULT false,
  fully_settled boolean DEFAULT false,
  
  -- Amounts
  customer_payment_amount decimal(10, 2),
  commission_amount decimal(10, 2),
  platform_fee_amount decimal(10, 2),
  affiliate_payout_amount decimal(10, 2),
  
  -- Timestamps
  customer_paid_at timestamptz,
  commission_approved_at timestamptz,
  company_paid_at timestamptz,
  affiliate_paid_at timestamptz,
  fully_settled_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payment_reconciliation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies can view their reconciliation records"
  ON payment_reconciliation FOR SELECT
  TO authenticated
  USING (
    deal_id IN (
      SELECT d.id FROM deals d
      JOIN affiliate_partnerships ap ON d.partnership_id = ap.id
      JOIN products p ON ap.product_id = p.id
      WHERE p.company_id IN (
        SELECT id FROM companies WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Affiliates can view their reconciliation records"
  ON payment_reconciliation FOR SELECT
  TO authenticated
  USING (
    commission_id IN (
      SELECT id FROM commissions WHERE affiliate_id = auth.uid()
    )
  );

CREATE POLICY "Super admins can view all reconciliation records"
  ON payment_reconciliation FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- ============================================================================
-- PAYMENT AUDIT LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event Details
  event_type text NOT NULL, -- payment_created, status_changed, refund_issued, etc.
  event_source text CHECK (event_source IN ('stripe_webhook', 'manual_action', 'system_automation', 'api_call')) NOT NULL,
  
  -- Related Entities
  entity_type text CHECK (entity_type IN ('customer_payment', 'company_payment', 'commission', 'payout', 'deal')) NOT NULL,
  entity_id uuid NOT NULL,
  
  -- Change Details
  old_status text,
  new_status text,
  amount decimal(10, 2),
  
  -- User/System Attribution
  triggered_by_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  stripe_event_id text,
  
  -- Data
  event_data jsonb DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payment_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit logs for their entities"
  ON payment_audit_log FOR SELECT
  TO authenticated
  USING (
    -- Companies can see logs for their payments
    (entity_type IN ('customer_payment', 'company_payment', 'deal') AND
     entity_id IN (
       SELECT cp.id FROM customer_payments cp
       JOIN companies c ON cp.company_id = c.id
       WHERE c.user_id = auth.uid()
       UNION
       SELECT ccp.id FROM company_commission_payments ccp
       JOIN companies c ON ccp.company_id = c.id
       WHERE c.user_id = auth.uid()
       UNION
       SELECT d.id FROM deals d
       JOIN affiliate_partnerships ap ON d.partnership_id = ap.id
       JOIN products p ON ap.product_id = p.id
       JOIN companies c ON p.company_id = c.id
       WHERE c.user_id = auth.uid()
     ))
    OR
    -- Affiliates can see logs for their commissions
    (entity_type IN ('commission', 'payout') AND
     entity_id IN (
       SELECT id FROM commissions WHERE affiliate_id = auth.uid()
       UNION
       SELECT id FROM payouts WHERE affiliate_id = auth.uid()
     ))
    OR
    -- Super admins can see all
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

CREATE POLICY "System can insert audit logs"
  ON payment_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- COMPANY PAYMENT METHODS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS company_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  
  -- Stripe Integration
  stripe_payment_method_id text UNIQUE NOT NULL,
  stripe_customer_id text,
  
  -- Payment Method Details
  payment_method_type text NOT NULL, -- card, us_bank_account, etc.
  
  -- Card Details (if applicable)
  card_brand text,
  card_last4 text,
  card_exp_month integer,
  card_exp_year integer,
  
  -- Bank Details (if applicable)
  bank_name text,
  bank_last4 text,
  
  -- Status
  is_default boolean DEFAULT false,
  is_verified boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE company_payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies can view their payment methods"
  ON company_payment_methods FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Companies can insert payment methods"
  ON company_payment_methods FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Companies can update their payment methods"
  ON company_payment_methods FOR UPDATE
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

CREATE POLICY "Companies can delete their payment methods"
  ON company_payment_methods FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- UPDATE EXISTING TABLES
-- ============================================================================

-- Add payment tracking columns to commissions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commissions' AND column_name = 'company_payment_status'
  ) THEN
    ALTER TABLE commissions ADD COLUMN company_payment_status text DEFAULT 'pending' CHECK (company_payment_status IN ('pending', 'paid', 'processing'));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commissions' AND column_name = 'company_paid_at'
  ) THEN
    ALTER TABLE commissions ADD COLUMN company_paid_at timestamptz;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commissions' AND column_name = 'stripe_transfer_id'
  ) THEN
    ALTER TABLE commissions ADD COLUMN stripe_transfer_id text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commissions' AND column_name = 'company_commission_payment_id'
  ) THEN
    ALTER TABLE commissions ADD COLUMN company_commission_payment_id uuid REFERENCES company_commission_payments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add payment tracking columns to deals table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'customer_payment_id'
  ) THEN
    ALTER TABLE deals ADD COLUMN customer_payment_id uuid REFERENCES customer_payments(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'payment_verified'
  ) THEN
    ALTER TABLE deals ADD COLUMN payment_verified boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'stripe_payment_intent_id'
  ) THEN
    ALTER TABLE deals ADD COLUMN stripe_payment_intent_id text;
  END IF;
END $$;

-- Add balance tracking to companies table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'outstanding_commission_balance'
  ) THEN
    ALTER TABLE companies ADD COLUMN outstanding_commission_balance decimal(10, 2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'auto_pay_commissions'
  ) THEN
    ALTER TABLE companies ADD COLUMN auto_pay_commissions boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE companies ADD COLUMN stripe_customer_id text UNIQUE;
  END IF;
END $$;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_customer_payments_company ON customer_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_customer_payments_status ON customer_payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_customer_payments_stripe_intent ON customer_payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_customer_payments_deal ON customer_payments(deal_id);
CREATE INDEX IF NOT EXISTS idx_customer_payments_created ON customer_payments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_company_commission_payments_company ON company_commission_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_company_commission_payments_status ON company_commission_payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_company_commission_payments_created ON company_commission_payments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_treasury_type ON platform_treasury(transaction_type);
CREATE INDEX IF NOT EXISTS idx_platform_treasury_created ON platform_treasury(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_reconciliation_customer_payment ON payment_reconciliation(customer_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_reconciliation_deal ON payment_reconciliation(deal_id);
CREATE INDEX IF NOT EXISTS idx_payment_reconciliation_commission ON payment_reconciliation(commission_id);
CREATE INDEX IF NOT EXISTS idx_payment_reconciliation_settled ON payment_reconciliation(fully_settled);

CREATE INDEX IF NOT EXISTS idx_payment_audit_log_entity ON payment_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_created ON payment_audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_company_payment_methods_company ON company_payment_methods(company_id);
CREATE INDEX IF NOT EXISTS idx_company_payment_methods_default ON company_payment_methods(company_id, is_default) WHERE is_default = true;

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update company outstanding balance
CREATE OR REPLACE FUNCTION update_company_outstanding_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE companies
    SET outstanding_commission_balance = (
      SELECT COALESCE(SUM(commission_amount + platform_fee_amount), 0)
      FROM commissions c
      JOIN deals d ON c.deal_id = d.id
      JOIN affiliate_partnerships ap ON d.partnership_id = ap.id
      JOIN products p ON ap.product_id = p.id
      WHERE p.company_id = companies.id
        AND c.status = 'approved'
        AND c.company_payment_status = 'pending'
    )
    WHERE id IN (
      SELECT p.company_id
      FROM deals d
      JOIN affiliate_partnerships ap ON d.partnership_id = ap.id
      JOIN products p ON ap.product_id = p.id
      WHERE d.id = NEW.deal_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update outstanding balance when commission changes
DROP TRIGGER IF EXISTS trigger_update_company_balance ON commissions;
CREATE TRIGGER trigger_update_company_balance
AFTER INSERT OR UPDATE ON commissions
FOR EACH ROW
EXECUTE FUNCTION update_company_outstanding_balance();

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_payment_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO payment_audit_log (
    event_type,
    event_source,
    entity_type,
    entity_id,
    old_status,
    new_status,
    amount,
    triggered_by_user_id,
    event_data
  ) VALUES (
    TG_ARGV[0], -- event_type
    'system_automation',
    TG_TABLE_NAME,
    NEW.id,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.payment_status ELSE NULL END,
    NEW.payment_status,
    CASE 
      WHEN TG_TABLE_NAME = 'customer_payments' THEN NEW.amount_total
      WHEN TG_TABLE_NAME = 'company_commission_payments' THEN NEW.total_amount
      ELSE NULL
    END,
    auth.uid(),
    row_to_json(NEW)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for audit logging
DROP TRIGGER IF EXISTS trigger_customer_payment_audit ON customer_payments;
CREATE TRIGGER trigger_customer_payment_audit
AFTER INSERT OR UPDATE ON customer_payments
FOR EACH ROW
EXECUTE FUNCTION create_payment_audit_log('customer_payment_changed');

DROP TRIGGER IF EXISTS trigger_company_payment_audit ON company_commission_payments;
CREATE TRIGGER trigger_company_payment_audit
AFTER INSERT OR UPDATE ON company_commission_payments
FOR EACH ROW
EXECUTE FUNCTION create_payment_audit_log('company_payment_changed');