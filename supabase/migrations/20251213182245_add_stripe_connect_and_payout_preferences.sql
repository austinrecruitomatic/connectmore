/*
  # Stripe Connect Integration and Payout Preferences

  ## Overview
  Adds comprehensive Stripe Connect support and customizable payout preferences for affiliates.
  This enables automated, flexible payouts with multiple payout methods and frequencies.

  ## Changes

  1. **Profiles Table Updates (Stripe Connect)**
     - `stripe_connect_account_id` - Stripe Connect Express account ID
     - `stripe_account_status` - Verification status (pending, verified, restricted, disabled)
     - `stripe_onboarding_completed` - Whether onboarding is complete
     - `stripe_external_account_id` - Default bank/card for payouts
     - `stripe_external_account_last4` - Last 4 digits for display
     - `stripe_external_account_type` - Type (bank_account, debit_card)

  2. **New Payout Preferences Table**
     - `affiliate_id` - Reference to profile
     - `payout_frequency` - Weekly, bi-weekly, monthly, or custom
     - `payout_frequency_days` - Custom frequency in days
     - `minimum_payout_threshold` - Minimum amount before payout
     - `preferred_payout_method` - ACH standard, ACH instant, or debit instant
     - `auto_payout_enabled` - Whether to auto-process payouts
     - `next_scheduled_payout_date` - Calculated next payout date
     - `notification_preferences` - JSON for notification settings

  3. **Payouts Table Updates**
     - `stripe_transfer_id` - Already exists, ensuring it's properly indexed
     - `stripe_payout_id` - Stripe payout object ID
     - `stripe_external_account_id` - Account used for this payout
     - `payout_method` - Method used for this specific payout
     - `stripe_fee_amount` - Stripe's processing fee
     - `failure_reason` - Detailed error message for failed payouts
     - `processing_error_code` - Stripe error code
     - `retry_count` - Number of retry attempts
     - `last_retry_at` - Timestamp of last retry

  4. **New Payout Audit Log Table**
     - Tracks all payout-related events for compliance
     - `payout_id` - Reference to payout
     - `event_type` - Type of event (created, processing, completed, failed, etc.)
     - `event_data` - JSON with event details
     - `stripe_event_id` - Stripe webhook event ID
     - `performed_by` - User who triggered the event
     - `created_at` - Event timestamp

  ## Security
  - Enable RLS on all new tables
  - Affiliates can only view/update their own payout preferences
  - Only super admins can view audit logs
  - Stripe account details are read-only for affiliates

  ## Notes
  - Default payout frequency is monthly with $50 minimum
  - Auto payouts are enabled by default
  - Stripe Connect accounts must be verified before payouts
*/

-- Add Stripe Connect fields to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'stripe_connect_account_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN stripe_connect_account_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'stripe_account_status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN stripe_account_status text DEFAULT 'pending' CHECK (
      stripe_account_status IN ('pending', 'verified', 'restricted', 'disabled')
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'stripe_onboarding_completed'
  ) THEN
    ALTER TABLE profiles ADD COLUMN stripe_onboarding_completed boolean DEFAULT false NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'stripe_external_account_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN stripe_external_account_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'stripe_external_account_last4'
  ) THEN
    ALTER TABLE profiles ADD COLUMN stripe_external_account_last4 text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'stripe_external_account_type'
  ) THEN
    ALTER TABLE profiles ADD COLUMN stripe_external_account_type text CHECK (
      stripe_external_account_type IN ('bank_account', 'debit_card')
    );
  END IF;
END $$;

-- Create payout_preferences table
CREATE TABLE IF NOT EXISTS payout_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  payout_frequency text DEFAULT 'monthly' NOT NULL CHECK (
    payout_frequency IN ('weekly', 'bi_weekly', 'monthly', 'custom')
  ),
  payout_frequency_days integer DEFAULT 30 NOT NULL CHECK (payout_frequency_days >= 7 AND payout_frequency_days <= 90),
  minimum_payout_threshold decimal(10,2) DEFAULT 50.00 NOT NULL CHECK (minimum_payout_threshold >= 10),
  preferred_payout_method text DEFAULT 'ach_standard' NOT NULL CHECK (
    preferred_payout_method IN ('ach_standard', 'ach_instant', 'debit_instant')
  ),
  auto_payout_enabled boolean DEFAULT true NOT NULL,
  next_scheduled_payout_date date,
  notification_preferences jsonb DEFAULT '{"payout_scheduled": true, "payout_completed": true, "payout_failed": true}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Add Stripe-specific fields to payouts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payouts' AND column_name = 'stripe_payout_id'
  ) THEN
    ALTER TABLE payouts ADD COLUMN stripe_payout_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payouts' AND column_name = 'stripe_external_account_id'
  ) THEN
    ALTER TABLE payouts ADD COLUMN stripe_external_account_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payouts' AND column_name = 'payout_method'
  ) THEN
    ALTER TABLE payouts ADD COLUMN payout_method text CHECK (
      payout_method IN ('ach_standard', 'ach_instant', 'debit_instant')
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payouts' AND column_name = 'stripe_fee_amount'
  ) THEN
    ALTER TABLE payouts ADD COLUMN stripe_fee_amount decimal(10,2) DEFAULT 0 CHECK (stripe_fee_amount >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payouts' AND column_name = 'failure_reason'
  ) THEN
    ALTER TABLE payouts ADD COLUMN failure_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payouts' AND column_name = 'processing_error_code'
  ) THEN
    ALTER TABLE payouts ADD COLUMN processing_error_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payouts' AND column_name = 'retry_count'
  ) THEN
    ALTER TABLE payouts ADD COLUMN retry_count integer DEFAULT 0 NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payouts' AND column_name = 'last_retry_at'
  ) THEN
    ALTER TABLE payouts ADD COLUMN last_retry_at timestamptz;
  END IF;
END $$;

-- Create payout audit log table
CREATE TABLE IF NOT EXISTS payout_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id uuid REFERENCES payouts(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL CHECK (
    event_type IN ('created', 'scheduled', 'processing', 'completed', 'failed', 'retried', 'cancelled', 'refunded')
  ),
  event_data jsonb DEFAULT '{}'::jsonb,
  stripe_event_id text,
  performed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payout_preferences_affiliate_id ON payout_preferences(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_payout_preferences_next_scheduled ON payout_preferences(next_scheduled_payout_date) WHERE auto_payout_enabled = true;

CREATE INDEX IF NOT EXISTS idx_payouts_stripe_transfer_id ON payouts(stripe_transfer_id);
CREATE INDEX IF NOT EXISTS idx_payouts_stripe_payout_id ON payouts(stripe_payout_id);
CREATE INDEX IF NOT EXISTS idx_payouts_payout_method ON payouts(payout_method);

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_account_id ON profiles(stripe_connect_account_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_status ON profiles(stripe_account_status);

CREATE INDEX IF NOT EXISTS idx_payout_audit_log_payout_id ON payout_audit_log(payout_id);
CREATE INDEX IF NOT EXISTS idx_payout_audit_log_event_type ON payout_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_payout_audit_log_created_at ON payout_audit_log(created_at);

-- Enable RLS
ALTER TABLE payout_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payout_preferences
CREATE POLICY "Affiliates can view their own payout preferences"
  ON payout_preferences FOR SELECT
  TO authenticated
  USING (affiliate_id = auth.uid());

CREATE POLICY "Affiliates can insert their own payout preferences"
  ON payout_preferences FOR INSERT
  TO authenticated
  WITH CHECK (affiliate_id = auth.uid());

CREATE POLICY "Affiliates can update their own payout preferences"
  ON payout_preferences FOR UPDATE
  TO authenticated
  USING (affiliate_id = auth.uid())
  WITH CHECK (affiliate_id = auth.uid());

CREATE POLICY "Super admins can view all payout preferences"
  ON payout_preferences FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Super admins can update all payout preferences"
  ON payout_preferences FOR UPDATE
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- RLS Policies for payout_audit_log
CREATE POLICY "Super admins can view all payout audit logs"
  ON payout_audit_log FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "System can create audit logs"
  ON payout_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add trigger for payout_preferences updated_at
CREATE TRIGGER update_payout_preferences_updated_at
  BEFORE UPDATE ON payout_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create view for affiliate payout dashboard
CREATE OR REPLACE VIEW affiliate_payout_dashboard AS
SELECT 
  p.id as affiliate_id,
  p.full_name,
  p.email,
  p.stripe_connect_account_id,
  p.stripe_account_status,
  p.stripe_onboarding_completed,
  p.stripe_external_account_type,
  p.stripe_external_account_last4,
  pp.payout_frequency,
  pp.payout_frequency_days,
  pp.minimum_payout_threshold,
  pp.preferred_payout_method,
  pp.auto_payout_enabled,
  pp.next_scheduled_payout_date,
  COALESCE(SUM(CASE WHEN c.status = 'approved' THEN c.affiliate_payout_amount ELSE 0 END), 0) as pending_earnings,
  COALESCE(SUM(CASE WHEN c.status = 'paid' THEN c.affiliate_payout_amount ELSE 0 END), 0) as total_paid,
  COUNT(CASE WHEN c.status = 'approved' THEN 1 END) as pending_commission_count,
  (SELECT MAX(po.processed_at) FROM payouts po WHERE po.affiliate_id = p.id AND po.status = 'completed') as last_payout_date
FROM profiles p
LEFT JOIN payout_preferences pp ON pp.affiliate_id = p.id
LEFT JOIN commissions c ON c.affiliate_id = p.id
WHERE p.user_type = 'affiliate'
GROUP BY 
  p.id, p.full_name, p.email, p.stripe_connect_account_id, 
  p.stripe_account_status, p.stripe_onboarding_completed,
  p.stripe_external_account_type, p.stripe_external_account_last4,
  pp.payout_frequency, pp.payout_frequency_days, pp.minimum_payout_threshold,
  pp.preferred_payout_method, pp.auto_payout_enabled, pp.next_scheduled_payout_date;

-- Grant access to view
GRANT SELECT ON affiliate_payout_dashboard TO authenticated;

-- Function to calculate next payout date based on frequency
CREATE OR REPLACE FUNCTION calculate_next_payout_date(
  frequency text,
  frequency_days integer,
  last_payout_date date DEFAULT NULL
)
RETURNS date AS $$
DECLARE
  base_date date;
  next_date date;
BEGIN
  base_date := COALESCE(last_payout_date, CURRENT_DATE);
  
  CASE frequency
    WHEN 'weekly' THEN
      next_date := base_date + INTERVAL '7 days';
    WHEN 'bi_weekly' THEN
      next_date := base_date + INTERVAL '14 days';
    WHEN 'monthly' THEN
      next_date := base_date + INTERVAL '1 month';
    WHEN 'custom' THEN
      next_date := base_date + (frequency_days || ' days')::interval;
    ELSE
      next_date := base_date + INTERVAL '30 days';
  END CASE;
  
  RETURN next_date;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to automatically update next_scheduled_payout_date
CREATE OR REPLACE FUNCTION update_next_scheduled_payout()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate next payout date when preferences are created or updated
  NEW.next_scheduled_payout_date := calculate_next_payout_date(
    NEW.payout_frequency,
    NEW.payout_frequency_days,
    (SELECT MAX(processed_at)::date FROM payouts WHERE affiliate_id = NEW.affiliate_id AND status = 'completed')
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update next scheduled payout date
CREATE TRIGGER update_next_payout_date_trigger
  BEFORE INSERT OR UPDATE ON payout_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_next_scheduled_payout();
