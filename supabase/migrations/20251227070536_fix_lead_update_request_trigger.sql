/*
  # Fix Lead Update Request Notification Trigger
  
  1. Updates
    - Fix notify_on_lead_update_request function to remove references to non-existent fields
    - Remove request_type, requested_value, and reason from the notification data
    
  2. Notes
    - These fields don't exist in the lead_update_requests table
    - The trigger was causing errors when inserting new update requests
*/

-- =====================================================
-- Fix the Trigger Function
-- =====================================================

CREATE OR REPLACE FUNCTION notify_on_lead_update_request()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id uuid;
  v_company_name text;
  v_affiliate_name text;
  v_lead_name text;
BEGIN
  -- Get company, affiliate, and lead info
  SELECT 
    ap.company_id,
    c.company_name,
    p.full_name,
    cs.name
  INTO v_company_id, v_company_name, v_affiliate_name, v_lead_name
  FROM contact_submissions cs
  JOIN affiliate_partnerships ap ON ap.id = cs.partnership_id
  JOIN companies c ON c.id = ap.company_id
  LEFT JOIN profiles p ON p.id = ap.affiliate_id
  WHERE cs.id = NEW.contact_submission_id;

  -- Create notification for company owner
  PERFORM notify_company_owner(
    v_company_id,
    'lead_update_request',
    'Lead Update Request',
    format('%s requested an update for lead: %s', COALESCE(v_affiliate_name, 'An affiliate'), v_lead_name),
    jsonb_build_object(
      'update_request_id', NEW.id,
      'contact_submission_id', NEW.contact_submission_id,
      'lead_name', v_lead_name,
      'affiliate_name', v_affiliate_name
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;