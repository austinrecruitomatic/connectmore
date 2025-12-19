/*
  # Update Webhook Trigger with Correct Schema

  1. Changes
    - Update trigger to work with affiliate_partnerships schema
    - Extract affiliate_id and company info from partnership
    - Call webhook edge function with correct data structure
*/

DROP FUNCTION IF EXISTS notify_webhook_on_lead_submission() CASCADE;

CREATE OR REPLACE FUNCTION notify_webhook_on_lead_submission()
RETURNS TRIGGER AS $$
DECLARE
  v_supabase_url text;
  v_service_key text;
  v_function_url text;
  v_affiliate_id uuid;
BEGIN
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_service_key := current_setting('app.settings.service_role_key', true);
  
  IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT affiliate_id INTO v_affiliate_id
  FROM affiliate_partnerships
  WHERE id = NEW.partnership_id;
  
  v_function_url := v_supabase_url || '/functions/v1/webhook-lead-notification';
  
  PERFORM extensions.http_post(
    url := v_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := jsonb_build_object(
      'id', NEW.id,
      'product_id', NEW.product_id,
      'affiliate_id', v_affiliate_id,
      'contact_name', NEW.name,
      'email', NEW.email,
      'phone', NEW.phone,
      'company', NEW.company_name,
      'message', NEW.message,
      'contract_value', NEW.contract_value,
      'contract_length_months', NEW.contract_length_months,
      'created_at', NEW.created_at
    )
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_webhook_on_lead
  AFTER INSERT ON contact_submissions
  FOR EACH ROW
  EXECUTE FUNCTION notify_webhook_on_lead_submission();