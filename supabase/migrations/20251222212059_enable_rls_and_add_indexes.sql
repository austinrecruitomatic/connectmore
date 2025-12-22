/*
  # Critical Security and Performance Fixes

  ## 1. Critical Security Fix
    - Enable RLS on contact_submissions table (CRITICAL - prevents unauthorized data access!)

  ## 2. Performance Optimization
    - Add missing indexes on all foreign keys for improved query performance
    - These indexes will significantly speed up JOIN operations and foreign key lookups
*/

-- =====================================================
-- CRITICAL: Enable RLS on contact_submissions
-- =====================================================
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Add Missing Foreign Key Indexes
-- =====================================================

-- Commissions indexes
CREATE INDEX IF NOT EXISTS idx_commissions_partnership_id
  ON commissions(partnership_id);

-- Contact submissions indexes
CREATE INDEX IF NOT EXISTS idx_contact_submissions_responded_by
  ON contact_submissions(responded_by);

-- Customer referrals indexes
CREATE INDEX IF NOT EXISTS idx_customer_referrals_commission_id
  ON customer_referrals(commission_id);
CREATE INDEX IF NOT EXISTS idx_customer_referrals_original_partnership_id
  ON customer_referrals(original_partnership_id);

-- Customers indexes
CREATE INDEX IF NOT EXISTS idx_customers_original_partnership_id
  ON customers(original_partnership_id);

-- Deal payment periods indexes
CREATE INDEX IF NOT EXISTS idx_deal_payment_periods_commission_id
  ON deal_payment_periods(commission_id);
CREATE INDEX IF NOT EXISTS idx_deal_payment_periods_payment_confirmed_by
  ON deal_payment_periods(payment_confirmed_by);

-- Landing pages indexes
CREATE INDEX IF NOT EXISTS idx_landing_pages_partnership_id
  ON landing_pages(partnership_id);
CREATE INDEX IF NOT EXISTS idx_landing_pages_template_id
  ON landing_pages(template_id);

-- Leads indexes
CREATE INDEX IF NOT EXISTS idx_leads_contact_submission_id
  ON leads(contact_submission_id);

-- Payout audit log indexes
CREATE INDEX IF NOT EXISTS idx_payout_audit_log_performed_by
  ON payout_audit_log(performed_by);

-- Product affiliate access indexes
CREATE INDEX IF NOT EXISTS idx_product_affiliate_access_granted_by
  ON product_affiliate_access(granted_by);

-- Product purchases indexes
CREATE INDEX IF NOT EXISTS idx_product_purchases_tracking_link_id
  ON product_purchases(tracking_link_id);

-- Product refunds indexes
CREATE INDEX IF NOT EXISTS idx_product_refunds_refunded_by
  ON product_refunds(refunded_by);