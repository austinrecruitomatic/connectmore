/*
  # Update Webhook Trigger to Fire on Lead Updates

  1. Changes
    - Modify trigger to fire on both INSERT and UPDATE operations
    - Add operation type to webhook payload (new_lead vs lead_update)
    - Include previous status if this is an update
    
  2. Notes
    - Webhooks will now fire whenever a lead is created OR updated
    - The payload includes an "event_type" field to distinguish between new leads and updates
*/

DROP TRIGGER IF EXISTS trigger_notify_webhook_on_lead ON contact_submissions;

CREATE OR REPLACE FUNCTION notify_webhook_on_lead_submission()
RETURNS TRIGGER AS $$
DECLARE
  v_supabase_url text;
  v_service_key text;
  v_function_url text;
  v_affiliate_id uuid;
  v_event_type text;
  v_payload jsonb;
BEGIN
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_service_key := current_setting('app.settings.service_role_key', true);
  
  IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
    RETURN NEW;
  END IF;

  -- Determine event type
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'new_lead';
  ELSE
    v_event_type := 'lead_update';
  END IF;

  -- Get affiliate_id from partnership
  SELECT affiliate_id INTO v_affiliate_id
  FROM affiliate_partnerships
  WHERE id = NEW.partnership_id;
  
  v_function_url := v_supabase_url || '/functions/v1/webhook-lead-notification';
  
  -- Build base payload
  v_payload := jsonb_build_object(
    'event_type', v_event_type,
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
    'status', NEW.status,
    'created_at', NEW.created_at,
    'updated_at', NEW.updated_at
  );

  -- Add previous values if this is an update
  IF TG_OP = 'UPDATE' THEN
    v_payload := v_payload || jsonb_build_object(
      'previous_status', OLD.status,
      'previous_contract_value', OLD.contract_value
    );
  END IF;
  
  PERFORM extensions.http_post(
    url := v_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := v_payload
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for both INSERT and UPDATE
CREATE TRIGGER trigger_notify_webhook_on_lead
  AFTER INSERT OR UPDATE ON contact_submissions
  FOR EACH ROW
  EXECUTE FUNCTION notify_webhook_on_lead_submission();