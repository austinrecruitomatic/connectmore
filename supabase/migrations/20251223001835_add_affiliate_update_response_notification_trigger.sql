/*
  # Add Affiliate Lead Update Response Notification Trigger
  
  1. New Function
    - notify_affiliate_on_update_response: Sends notification to affiliate when company responds to update request
    
  2. New Trigger
    - Fires when lead_update_requests.resolved_at is set (company responds)
    - Creates notification for affiliate if they have notifications enabled
    
  3. Security
    - Uses SECURITY DEFINER to allow notification creation
*/

-- =====================================================
-- Function: Notify Affiliate on Lead Update Response
-- =====================================================

CREATE OR REPLACE FUNCTION notify_affiliate_on_update_response()
RETURNS TRIGGER AS $$
DECLARE
  v_notify_enabled boolean;
  v_company_name text;
  v_lead_name text;
BEGIN
  -- Only notify when resolved_at changes from NULL to a timestamp (company responded)
  IF OLD.resolved_at IS NULL AND NEW.resolved_at IS NOT NULL THEN
    
    -- Check if affiliate has notifications enabled
    SELECT COALESCE(notification_lead_update_response, true) INTO v_notify_enabled
    FROM profiles
    WHERE id = NEW.affiliate_id;
    
    IF COALESCE(v_notify_enabled, true) THEN
      -- Get company name and lead name
      SELECT c.company_name, cs.name
      INTO v_company_name, v_lead_name
      FROM companies c
      JOIN contact_submissions cs ON cs.id = NEW.contact_submission_id
      WHERE c.id = NEW.company_id;
      
      -- Create notification for affiliate
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES (
        NEW.affiliate_id,
        'lead_update_response',
        'Lead Update Response',
        format('%s responded to your update request for lead: %s', 
          COALESCE(v_company_name, 'A company'), 
          COALESCE(v_lead_name, 'the lead')),
        jsonb_build_object(
          'update_request_id', NEW.id,
          'contact_submission_id', NEW.contact_submission_id,
          'company_id', NEW.company_id,
          'company_name', v_company_name,
          'lead_name', v_lead_name,
          'resolved_at', NEW.resolved_at
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- =====================================================
-- Trigger: Notify Affiliate on Update Response
-- =====================================================

DROP TRIGGER IF EXISTS trigger_notify_affiliate_on_update_response ON lead_update_requests;
CREATE TRIGGER trigger_notify_affiliate_on_update_response
  AFTER UPDATE ON lead_update_requests
  FOR EACH ROW
  WHEN (OLD.resolved_at IS NULL AND NEW.resolved_at IS NOT NULL)
  EXECUTE FUNCTION notify_affiliate_on_update_response();
