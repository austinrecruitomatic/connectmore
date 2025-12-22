/*
  # Infinite Downline Commission Structure

  ## Overview
  Updates the commission system so that sales reps get credit for ALL customers in their 
  downline network indefinitely. When a rep brings in Customer A, and Customer A refers 
  Friend B, and Friend B refers Friend C, the original rep earns commission on ALL of them.

  ## Changes

  ### Customer Tracking
  - Ensures `original_affiliate_id` is propagated through the entire referral chain
  - All customers in a network trace back to the original sales rep

  ### Commission Structure
  - When any customer in the network makes a purchase, the original rep earns commission
  - Customer who directly referred them also earns a smaller customer referral commission
  - Creates a true MLM-style network effect

  ### New Function: `propagate_original_affiliate`
  - Automatically sets the original affiliate when a customer refers another customer
  - Ensures the referral chain is maintained

  ### Updated Commission Logic
  - Commissions credit to original affiliate based on customer purchases
  - Direct referrer (customer) still gets their referral bonus
  - Rep sees earnings from entire network

  ## Example Flow
  1. Rep brings in Customer A → Customer A has `original_affiliate_id` = Rep
  2. Customer A refers Friend B → Friend B has `original_affiliate_id` = Rep (inherited)
  3. Friend B makes $1000 purchase:
     - Rep earns $100 (10% base commission)
     - Customer A earns $50 (5% customer referral)
  4. Friend B refers Friend C → Friend C has `original_affiliate_id` = Rep (inherited)
  5. Friend C makes $1000 purchase:
     - Rep earns $100 (10% base commission)
     - Friend B earns $50 (5% customer referral)
  
  This creates infinite passive income for the original rep!
*/

-- Function to propagate original affiliate through referral chain
CREATE OR REPLACE FUNCTION propagate_original_affiliate()
RETURNS trigger AS $$
DECLARE
  referring_customer_affiliate_id uuid;
BEGIN
  -- If the new customer was referred by another customer, inherit their original_affiliate_id
  IF NEW.referred_by_customer_id IS NOT NULL THEN
    SELECT original_affiliate_id INTO referring_customer_affiliate_id
    FROM customers
    WHERE id = NEW.referred_by_customer_id;
    
    -- Set the original_affiliate_id to match the referring customer's
    IF referring_customer_affiliate_id IS NOT NULL THEN
      NEW.original_affiliate_id := referring_customer_affiliate_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically propagate original affiliate
DROP TRIGGER IF EXISTS trigger_propagate_original_affiliate ON customers;
CREATE TRIGGER trigger_propagate_original_affiliate
  BEFORE INSERT ON customers
  FOR EACH ROW
  EXECUTE FUNCTION propagate_original_affiliate();

-- Update existing customers to propagate original affiliate retroactively
DO $$
DECLARE
  customer_record RECORD;
  referring_customer_affiliate_id uuid;
BEGIN
  FOR customer_record IN 
    SELECT c.id, c.referred_by_customer_id 
    FROM customers c 
    WHERE c.referred_by_customer_id IS NOT NULL 
    AND c.original_affiliate_id IS NULL
  LOOP
    SELECT original_affiliate_id INTO referring_customer_affiliate_id
    FROM customers
    WHERE id = customer_record.referred_by_customer_id;
    
    IF referring_customer_affiliate_id IS NOT NULL THEN
      UPDATE customers
      SET original_affiliate_id = referring_customer_affiliate_id
      WHERE id = customer_record.id;
    END IF;
  END LOOP;
END $$;

-- Update commission creation for contact submissions to credit original affiliate
CREATE OR REPLACE FUNCTION create_commission_from_contact()
RETURNS trigger AS $$
DECLARE
  partnership_record RECORD;
  settings_record RECORD;
  commission_amount numeric;
  customer_record RECORD;
  referring_customer_record RECORD;
  customer_commission_amount numeric;
BEGIN
  -- Only process when contract value is set and status is appropriate
  IF NEW.contract_value IS NOT NULL AND NEW.contract_value > 0 THEN
    
    -- Get the partnership details
    SELECT * INTO partnership_record
    FROM affiliate_partnerships
    WHERE id = NEW.partnership_id;
    
    IF partnership_record IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Get company settings
    SELECT cs.* INTO settings_record
    FROM company_settings cs
    INNER JOIN products p ON p.company_id = cs.company_id
    WHERE p.id = partnership_record.product_id;
    
    IF settings_record IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Calculate base commission for the original affiliate
    commission_amount := NEW.contract_value * (settings_record.commission_rate / 100);
    
    -- Get customer details if this is from a customer
    IF NEW.customer_id IS NOT NULL THEN
      SELECT * INTO customer_record
      FROM customers
      WHERE id = NEW.customer_id;
      
      -- Create commission for the ORIGINAL AFFILIATE (the rep who started the network)
      IF customer_record.original_affiliate_id IS NOT NULL THEN
        INSERT INTO commissions (
          affiliate_id,
          partnership_id,
          amount,
          status,
          referral_tier,
          contact_submission_id
        ) VALUES (
          customer_record.original_affiliate_id,
          customer_record.original_partnership_id,
          commission_amount,
          CASE 
            WHEN settings_record.auto_approve_commissions THEN 'approved'
            ELSE 'pending'
          END,
          'direct',
          NEW.id
        );
      END IF;
      
      -- If customer was referred by another customer, give the referring customer a bonus
      IF customer_record.referred_by_customer_id IS NOT NULL AND settings_record.enable_customer_referrals THEN
        SELECT * INTO referring_customer_record
        FROM customers
        WHERE id = customer_record.referred_by_customer_id;
        
        customer_commission_amount := NEW.contract_value * (settings_record.customer_referral_commission_rate / 100);
        
        -- Create commission for the referring customer
        INSERT INTO commissions (
          affiliate_id,
          partnership_id,
          amount,
          status,
          referral_tier,
          customer_referral_id
        ) VALUES (
          referring_customer_record.original_affiliate_id,
          referring_customer_record.original_partnership_id,
          customer_commission_amount,
          'pending',
          'customer_referral',
          NULL
        );
        
        -- Update referring customer's earnings
        UPDATE customers
        SET 
          total_earned = total_earned + customer_commission_amount,
          pending_balance = pending_balance + customer_commission_amount
        WHERE id = customer_record.referred_by_customer_id;
      END IF;
    ELSE
      -- Regular affiliate lead (not from a customer)
      INSERT INTO commissions (
        affiliate_id,
        partnership_id,
        amount,
        status,
        referral_tier,
        contact_submission_id
      ) VALUES (
        partnership_record.affiliate_id,
        NEW.partnership_id,
        commission_amount,
        CASE 
          WHEN settings_record.auto_approve_commissions THEN 'approved'
          ELSE 'pending'
        END,
        'direct',
        NEW.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger for contact submissions
DROP TRIGGER IF EXISTS trigger_create_commission_from_contact ON contact_submissions;
CREATE TRIGGER trigger_create_commission_from_contact
  AFTER INSERT OR UPDATE OF contract_value ON contact_submissions
  FOR EACH ROW
  EXECUTE FUNCTION create_commission_from_contact();

-- Add network depth tracking for analytics
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'network_depth'
  ) THEN
    ALTER TABLE customers ADD COLUMN network_depth integer DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- Function to calculate network depth
CREATE OR REPLACE FUNCTION calculate_network_depth()
RETURNS trigger AS $$
DECLARE
  referring_customer_depth integer;
BEGIN
  IF NEW.referred_by_customer_id IS NOT NULL THEN
    SELECT COALESCE(network_depth, 0) + 1 INTO referring_customer_depth
    FROM customers
    WHERE id = NEW.referred_by_customer_id;
    
    NEW.network_depth := referring_customer_depth;
  ELSE
    NEW.network_depth := 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for network depth calculation
DROP TRIGGER IF EXISTS trigger_calculate_network_depth ON customers;
CREATE TRIGGER trigger_calculate_network_depth
  BEFORE INSERT ON customers
  FOR EACH ROW
  EXECUTE FUNCTION calculate_network_depth();

-- Add enable_customer_referrals flag to company_settings if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'enable_customer_referrals'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN enable_customer_referrals boolean DEFAULT true NOT NULL;
  END IF;
END $$;
