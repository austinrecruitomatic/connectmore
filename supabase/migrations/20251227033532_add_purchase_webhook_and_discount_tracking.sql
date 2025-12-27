/*
  # Add Purchase Webhook System and Enhanced Tracking

  1. Changes to product_purchases table
    - Add `product_url` field to track the product URL used during purchase
    - Add `discount_applied` field to track if affiliate discount was used
    - Add `discount_amount` field to track how much was discounted

  2. Webhook System for Purchases
    - Create trigger to send webhook when purchase is completed
    - Send purchase details to company's configured webhook URL
    - Supports CRM integration for sales tracking

  3. Purpose
    - Track affiliate discounts on purchases
    - Integrate with company CRM systems via webhooks
    - Provide complete purchase attribution data
*/

-- Add new fields to product_purchases table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_purchases' AND column_name = 'product_url'
  ) THEN
    ALTER TABLE product_purchases ADD COLUMN product_url text;
    COMMENT ON COLUMN product_purchases.product_url IS 'The product URL used during purchase';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_purchases' AND column_name = 'discount_applied'
  ) THEN
    ALTER TABLE product_purchases ADD COLUMN discount_applied boolean DEFAULT false;
    COMMENT ON COLUMN product_purchases.discount_applied IS 'Whether affiliate discount was applied';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_purchases' AND column_name = 'discount_amount'
  ) THEN
    ALTER TABLE product_purchases ADD COLUMN discount_amount numeric(10, 2) DEFAULT 0;
    COMMENT ON COLUMN product_purchases.discount_amount IS 'Amount discounted from purchase';
  END IF;
END $$;

-- Function to send purchase webhook notification
CREATE OR REPLACE FUNCTION notify_purchase_webhook()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url text;
  webhook_secret text;
  payload jsonb;
  product_info jsonb;
  affiliate_info jsonb;
BEGIN
  -- Only trigger on completed purchases
  IF NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;

  -- Get webhook configuration for the company
  SELECT webhook_url_leads, webhook_secret
  INTO webhook_url, webhook_secret
  FROM company_settings
  WHERE company_id = NEW.company_id;

  -- If no webhook configured, skip
  IF webhook_url IS NULL OR webhook_url = '' THEN
    RETURN NEW;
  END IF;

  -- Get product details
  SELECT jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'description', p.description,
    'price', p.product_price,
    'currency', p.currency
  )
  INTO product_info
  FROM products p
  WHERE p.id = NEW.product_id;

  -- Get affiliate details
  SELECT jsonb_build_object(
    'id', pr.id,
    'name', pr.full_name,
    'email', pr.email
  )
  INTO affiliate_info
  FROM profiles pr
  WHERE pr.id = NEW.affiliate_id;

  -- Build webhook payload
  payload := jsonb_build_object(
    'event', 'purchase.completed',
    'purchase_id', NEW.id,
    'product', product_info,
    'affiliate', affiliate_info,
    'customer', jsonb_build_object(
      'name', NEW.customer_name,
      'email', NEW.customer_email,
      'phone', NEW.customer_phone
    ),
    'purchase_details', jsonb_build_object(
      'amount', NEW.purchase_amount,
      'quantity', NEW.quantity,
      'commission_amount', NEW.commission_amount,
      'discount_applied', NEW.discount_applied,
      'discount_amount', NEW.discount_amount,
      'product_url', NEW.product_url
    ),
    'purchased_at', NEW.purchased_at,
    'timestamp', now()
  );

  -- Send webhook using pg_net
  PERFORM net.http_post(
    url := webhook_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Webhook-Secret', COALESCE(webhook_secret, ''),
      'X-Event-Type', 'purchase.completed'
    ),
    body := payload
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for purchase webhooks
DROP TRIGGER IF EXISTS trigger_purchase_webhook ON product_purchases;
CREATE TRIGGER trigger_purchase_webhook
  AFTER INSERT OR UPDATE OF status ON product_purchases
  FOR EACH ROW
  EXECUTE FUNCTION notify_purchase_webhook();
