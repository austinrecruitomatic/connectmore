/*
  # Add Company Notifications System

  ## 1. New Tables
    - `notifications` - Stores all notifications for users
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `type` (text) - notification type (new_lead, lead_update_request, etc.)
      - `title` (text) - notification title
      - `message` (text) - notification message
      - `data` (jsonb) - additional data
      - `read` (boolean) - whether notification has been read
      - `created_at` (timestamptz)

  ## 2. Updated Tables
    - Add notification preferences to `profiles` table for companies
    - Add notification preferences to `company_settings` table

  ## 3. Triggers
    - Auto-create notifications when new leads are submitted
    - Auto-create notifications when lead update requests are created

  ## 4. Security
    - Enable RLS on notifications table
    - Add policies for users to view and update their own notifications
*/

-- =====================================================
-- Create Notifications Table
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read) WHERE read = false;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- Add Notification Preferences to Company Settings
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'notify_on_new_leads'
  ) THEN
    ALTER TABLE company_settings 
      ADD COLUMN notify_on_new_leads boolean DEFAULT true,
      ADD COLUMN notify_on_lead_updates boolean DEFAULT true,
      ADD COLUMN notify_on_deal_closed boolean DEFAULT true;
  END IF;
END $$;

-- =====================================================
-- Function: Create Notification for Company Owners
-- =====================================================

CREATE OR REPLACE FUNCTION notify_company_owner(
  p_company_id uuid,
  p_notification_type text,
  p_title text,
  p_message text,
  p_data jsonb DEFAULT '{}'::jsonb
) RETURNS void AS $$
DECLARE
  v_user_id uuid;
  v_notify_enabled boolean;
BEGIN
  -- Get company owner's user_id
  SELECT user_id INTO v_user_id
  FROM companies
  WHERE id = p_company_id;

  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Check notification preferences
  IF p_notification_type = 'new_lead' THEN
    SELECT COALESCE(notify_on_new_leads, true) INTO v_notify_enabled
    FROM company_settings
    WHERE company_id = p_company_id;
  ELSIF p_notification_type = 'lead_update_request' THEN
    SELECT COALESCE(notify_on_lead_updates, true) INTO v_notify_enabled
    FROM company_settings
    WHERE company_id = p_company_id;
  ELSIF p_notification_type = 'deal_closed' THEN
    SELECT COALESCE(notify_on_deal_closed, true) INTO v_notify_enabled
    FROM company_settings
    WHERE company_id = p_company_id;
  ELSE
    v_notify_enabled := true;
  END IF;

  -- Create notification if enabled
  IF COALESCE(v_notify_enabled, true) THEN
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (v_user_id, p_notification_type, p_title, p_message, p_data);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- =====================================================
-- Trigger: Notify on New Contact Submission
-- =====================================================

CREATE OR REPLACE FUNCTION notify_on_new_contact_submission()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id uuid;
  v_company_name text;
  v_affiliate_name text;
BEGIN
  -- Get company and affiliate info
  SELECT 
    ap.company_id,
    c.name,
    p.full_name
  INTO v_company_id, v_company_name, v_affiliate_name
  FROM affiliate_partnerships ap
  JOIN companies c ON c.id = ap.company_id
  LEFT JOIN profiles p ON p.id = ap.affiliate_id
  WHERE ap.id = NEW.partnership_id;

  -- Create notification for company owner
  PERFORM notify_company_owner(
    v_company_id,
    'new_lead',
    'New Lead Received',
    format('New lead from %s: %s', COALESCE(v_affiliate_name, 'affiliate'), NEW.name),
    jsonb_build_object(
      'contact_submission_id', NEW.id,
      'partnership_id', NEW.partnership_id,
      'lead_name', NEW.name,
      'lead_email', NEW.email,
      'affiliate_name', v_affiliate_name
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_notify_on_new_contact_submission ON contact_submissions;
CREATE TRIGGER trigger_notify_on_new_contact_submission
  AFTER INSERT ON contact_submissions
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_new_contact_submission();

-- =====================================================
-- Trigger: Notify on Lead Update Request
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
    c.name,
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_notify_on_lead_update_request ON lead_update_requests;
CREATE TRIGGER trigger_notify_on_lead_update_request
  AFTER INSERT ON lead_update_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_lead_update_request();

-- =====================================================
-- Helper Function: Mark Notification as Read
-- =====================================================

CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET read = true
  WHERE id = p_notification_id
    AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- =====================================================
-- Helper Function: Mark All Notifications as Read
-- =====================================================

CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET read = true
  WHERE user_id = auth.uid()
    AND read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- =====================================================
-- Helper Function: Get Unread Notification Count
-- =====================================================

CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS integer AS $$
  SELECT COUNT(*)::integer
  FROM notifications
  WHERE user_id = auth.uid()
    AND read = false;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, public;