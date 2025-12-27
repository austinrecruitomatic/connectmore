/*
  # Fix notify_on_lead_update_request Function

  1. Changes
    - Fix column reference from c.name to c.company_name in the notify_on_lead_update_request function
    
  2. Security
    - Maintains existing SECURITY DEFINER and search_path settings
*/

CREATE OR REPLACE FUNCTION public.notify_on_lead_update_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_company_id uuid;
  v_company_name text;
  v_affiliate_name text;
  v_lead_name text;
BEGIN
  -- Get company, affiliate, and lead info
  SELECT 
    ap.company_id,
    c.company_name,  -- Fixed: was c.name
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
      'affiliate_name', v_affiliate_name,
      'request_type', NEW.request_type,
      'requested_value', NEW.requested_value,
      'reason', NEW.reason
    )
  );

  RETURN NEW;
END;
$function$;
