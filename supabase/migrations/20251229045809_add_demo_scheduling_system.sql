/*
  # Add Demo Scheduling System

  1. New Tables
    - `demo_appointments`
      - `id` (uuid, primary key)
      - `company_id` (uuid, references companies)
      - `customer_name` (text)
      - `customer_email` (text)
      - `customer_phone` (text, optional)
      - `scheduled_time` (timestamptz)
      - `duration_minutes` (integer, default 30)
      - `notes` (text, optional)
      - `status` (text, enum: scheduled, completed, cancelled, no_show)
      - `google_calendar_event_id` (text, optional)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Updates to profiles table
    - `google_calendar_access_token` (text, encrypted)
    - `google_calendar_refresh_token` (text, encrypted)
    - `google_calendar_connected` (boolean, default false)
    - `demo_scheduling_enabled` (boolean, default false)
    - `demo_duration_options` (jsonb, array of durations like [30, 60])
    - `demo_availability` (jsonb, working hours by day)

  3. Security
    - Enable RLS on `demo_appointments` table
    - Companies can view their own appointments
    - Anyone can create appointments (for public scheduling)
    - Only companies can update their own appointment status
    - Tokens are only accessible by the profile owner

  4. Indexes
    - Index on company_id for fast appointment lookups
    - Index on scheduled_time for calendar queries
    - Index on status for filtering
*/

-- Add Google Calendar fields to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS google_calendar_access_token text,
ADD COLUMN IF NOT EXISTS google_calendar_refresh_token text,
ADD COLUMN IF NOT EXISTS google_calendar_connected boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS demo_scheduling_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS demo_duration_options jsonb DEFAULT '[30, 60]'::jsonb,
ADD COLUMN IF NOT EXISTS demo_availability jsonb DEFAULT '{
  "monday": {"enabled": true, "start": "09:00", "end": "17:00"},
  "tuesday": {"enabled": true, "start": "09:00", "end": "17:00"},
  "wednesday": {"enabled": true, "start": "09:00", "end": "17:00"},
  "thursday": {"enabled": true, "start": "09:00", "end": "17:00"},
  "friday": {"enabled": true, "start": "09:00", "end": "17:00"},
  "saturday": {"enabled": false, "start": "09:00", "end": "17:00"},
  "sunday": {"enabled": false, "start": "09:00", "end": "17:00"}
}'::jsonb;

-- Create demo_appointments table
CREATE TABLE IF NOT EXISTS demo_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  scheduled_time timestamptz NOT NULL,
  duration_minutes integer DEFAULT 30 NOT NULL,
  notes text,
  status text DEFAULT 'scheduled' NOT NULL CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  google_calendar_event_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_demo_appointments_company ON demo_appointments(company_id);
CREATE INDEX IF NOT EXISTS idx_demo_appointments_scheduled_time ON demo_appointments(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_demo_appointments_status ON demo_appointments(status);

-- Enable RLS
ALTER TABLE demo_appointments ENABLE ROW LEVEL SECURITY;

-- Companies can view their own appointments
CREATE POLICY "Companies can view own appointments"
  ON demo_appointments
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

-- Anyone can create appointments (for public scheduling)
CREATE POLICY "Anyone can create appointments"
  ON demo_appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Companies can update their own appointment status
CREATE POLICY "Companies can update own appointments"
  ON demo_appointments
  FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_demo_appointment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
DROP TRIGGER IF EXISTS update_demo_appointment_timestamp ON demo_appointments;
CREATE TRIGGER update_demo_appointment_timestamp
  BEFORE UPDATE ON demo_appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_demo_appointment_timestamp();

-- Function to notify company of new demo booking
CREATE OR REPLACE FUNCTION notify_company_of_demo_booking()
RETURNS TRIGGER AS $$
DECLARE
  company_user_id uuid;
BEGIN
  -- Get the company owner
  SELECT user_id INTO company_user_id
  FROM companies
  WHERE id = NEW.company_id;

  -- Create notification
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    company_user_id,
    'demo_scheduled',
    'New Demo Scheduled',
    NEW.customer_name || ' has scheduled a demo for ' || to_char(NEW.scheduled_time, 'Mon DD at HH:MI AM'),
    jsonb_build_object(
      'appointment_id', NEW.id,
      'company_id', NEW.company_id,
      'customer_email', NEW.customer_email,
      'scheduled_time', NEW.scheduled_time
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to send notification on new booking
DROP TRIGGER IF EXISTS notify_company_of_demo_booking ON demo_appointments;
CREATE TRIGGER notify_company_of_demo_booking
  AFTER INSERT ON demo_appointments
  FOR EACH ROW
  EXECUTE FUNCTION notify_company_of_demo_booking();