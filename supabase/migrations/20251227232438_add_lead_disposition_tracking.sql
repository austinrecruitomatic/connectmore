/*
  # Add Lead Disposition Tracking and Overdue System

  1. Updated Tables
    - `contact_submissions` - Add timestamp tracking for status updates
      - `last_status_update` (timestamptz) - When the status was last changed
      - Defaults to created_at for existing records
      
  2. New Functions
    - `get_overdue_leads` - Returns leads that haven't been updated in 7+ days
      - Only returns leads in 'new' or 'contacted' status
      - Returns full lead details for company owners
      
  3. Triggers
    - Auto-update `last_status_update` when status column changes
    
  4. Security
    - Function uses SECURITY DEFINER to check company ownership
    - Only returns leads for companies owned by the authenticated user
*/

-- =====================================================
-- Add Last Status Update Timestamp
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contact_submissions' AND column_name = 'last_status_update'
  ) THEN
    ALTER TABLE contact_submissions 
      ADD COLUMN last_status_update timestamptz DEFAULT now();
    
    -- Set initial values to created_at for existing records
    UPDATE contact_submissions 
    SET last_status_update = created_at 
    WHERE last_status_update IS NULL;
  END IF;
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_contact_submissions_last_status_update 
  ON contact_submissions(last_status_update);

-- =====================================================
-- Trigger: Update Last Status Update Timestamp
-- =====================================================

CREATE OR REPLACE FUNCTION update_last_status_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update timestamp if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.last_status_update = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_last_status_update ON contact_submissions;
CREATE TRIGGER trigger_update_last_status_update
  BEFORE UPDATE ON contact_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_last_status_update();

-- =====================================================
-- Function: Get Overdue Leads for Company Owner
-- =====================================================

CREATE OR REPLACE FUNCTION get_overdue_leads()
RETURNS TABLE (
  id uuid,
  name text,
  email text,
  phone text,
  message text,
  status text,
  created_at timestamptz,
  last_status_update timestamptz,
  days_overdue integer,
  company_id uuid,
  company_name text,
  partnership_id uuid,
  affiliate_name text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.id,
    cs.name,
    cs.email,
    cs.phone,
    cs.message,
    cs.status,
    cs.created_at,
    cs.last_status_update,
    EXTRACT(DAY FROM (now() - cs.last_status_update))::integer as days_overdue,
    c.id as company_id,
    c.company_name,
    ap.id as partnership_id,
    p.full_name as affiliate_name
  FROM contact_submissions cs
  JOIN affiliate_partnerships ap ON ap.id = cs.partnership_id
  JOIN companies c ON c.id = ap.company_id
  LEFT JOIN profiles p ON p.id = ap.affiliate_id
  WHERE c.user_id = auth.uid()
    AND cs.status IN ('new', 'contacted')
    AND cs.last_status_update < now() - interval '7 days'
  ORDER BY cs.last_status_update ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- =====================================================
-- Function: Mark Lead as Dispositioned (Helper)
-- =====================================================

CREATE OR REPLACE FUNCTION disposition_lead(
  p_lead_id uuid,
  p_new_status text
)
RETURNS json AS $$
DECLARE
  v_company_id uuid;
  v_result json;
BEGIN
  -- Check if user owns the company for this lead
  SELECT c.id INTO v_company_id
  FROM contact_submissions cs
  JOIN affiliate_partnerships ap ON ap.id = cs.partnership_id
  JOIN companies c ON c.id = ap.company_id
  WHERE cs.id = p_lead_id
    AND c.user_id = auth.uid();
    
  IF v_company_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Lead not found or access denied'
    );
  END IF;
  
  -- Update the lead status
  UPDATE contact_submissions
  SET status = p_new_status,
      last_status_update = now()
  WHERE id = p_lead_id;
  
  RETURN json_build_object(
    'success', true,
    'lead_id', p_lead_id,
    'new_status', p_new_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;