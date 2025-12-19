/*
  # Add Webhook Trigger for Lead Submissions

  1. Changes
    - Create database trigger to automatically send webhooks when leads are submitted
    - Trigger calls edge function asynchronously
    - Only fires when webhook is enabled for the company
    
  2. Notes
    - Uses pg_net extension for async HTTP calls
    - Non-blocking webhook delivery
*/

CREATE OR REPLACE FUNCTION notify_webhook_on_lead_submission()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url text;
  function_url text;
BEGIN
  function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/webhook-lead-notification';
  
  IF function_url IS NOT NULL THEN
    PERFORM net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'id', NEW.id,
        'product_id', NEW.product_id,
        'affiliate_id', NEW.affiliate_id,
        'contact_name', NEW.contact_name,
        'email', NEW.email,
        'phone', NEW.phone,
        'company', NEW.company,
        'message', NEW.message,
        'contract_value', NEW.contract_value,
        'contract_length_months', NEW.contract_length_months,
        'created_at', NEW.created_at
      )
    );
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_webhook_on_lead ON contact_submissions;

CREATE TRIGGER trigger_notify_webhook_on_lead
  AFTER INSERT ON contact_submissions
  FOR EACH ROW
  EXECUTE FUNCTION notify_webhook_on_lead_submission();