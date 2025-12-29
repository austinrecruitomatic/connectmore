/*
  # Add Company Team Members System

  1. New Tables
    - `team_members`
      - `id` (uuid, primary key)
      - `company_id` (uuid, references companies)
      - `user_id` (uuid, references profiles)
      - `role` (text: 'admin', 'member')
      - `can_manage_leads` (boolean, default true)
      - `can_manage_deals` (boolean, default true)
      - `can_manage_appointments` (boolean, default true)
      - `invited_by` (uuid, references profiles)
      - `invited_at` (timestamptz)
      - `accepted_at` (timestamptz)
      - `status` (text: 'pending', 'active', 'inactive')
      - `created_at` (timestamptz)

  2. Changes
    - Add `assigned_to_user_id` to `demo_appointments` table
    - Add `calendar_mode` to `companies` table ('shared' or 'individual')

  3. Security
    - Enable RLS on `team_members` table
    - Add policies for company owners and team members
    - Update policies for leads, deals, and appointments to support team members
*/

-- Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  can_manage_leads boolean DEFAULT true,
  can_manage_deals boolean DEFAULT true,
  can_manage_appointments boolean DEFAULT true,
  invited_by uuid REFERENCES profiles(id),
  invited_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, user_id)
);

-- Add assigned_to_user_id to demo_appointments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'demo_appointments' AND column_name = 'assigned_to_user_id'
  ) THEN
    ALTER TABLE demo_appointments ADD COLUMN assigned_to_user_id uuid REFERENCES profiles(id);
  END IF;
END $$;

-- Add calendar_mode to companies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'calendar_mode'
  ) THEN
    ALTER TABLE companies ADD COLUMN calendar_mode text DEFAULT 'shared' CHECK (calendar_mode IN ('shared', 'individual'));
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_team_members_company_id ON team_members(company_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status);
CREATE INDEX IF NOT EXISTS idx_demo_appointments_assigned_to ON demo_appointments(assigned_to_user_id);

-- Enable RLS
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_members

-- Company owners can view all team members for their company
CREATE POLICY "Company owners can view their team members"
  ON team_members FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

-- Team members can view other members in their company
CREATE POLICY "Team members can view their company team"
  ON team_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    company_id IN (
      SELECT company_id FROM team_members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Company owners can insert team members
CREATE POLICY "Company owners can add team members"
  ON team_members FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

-- Company owners and admins can update team members
CREATE POLICY "Company owners and admins can update team members"
  ON team_members FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    ) OR
    (company_id IN (
      SELECT company_id FROM team_members 
      WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
    ))
  );

-- Company owners and admins can delete team members
CREATE POLICY "Company owners and admins can delete team members"
  ON team_members FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    ) OR
    (company_id IN (
      SELECT company_id FROM team_members 
      WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
    ))
  );

-- Update contact_submissions policy to allow team members to view
DROP POLICY IF EXISTS "Companies can view their partnership submissions" ON contact_submissions;
CREATE POLICY "Companies and team members can view submissions"
  ON contact_submissions FOR SELECT
  TO authenticated
  USING (
    partnership_id IN (
      SELECT ap.id FROM affiliate_partnerships ap
      JOIN companies c ON c.id = ap.company_id
      WHERE c.user_id = auth.uid()
    ) OR
    partnership_id IN (
      SELECT ap.id FROM affiliate_partnerships ap
      JOIN team_members tm ON tm.company_id = ap.company_id
      WHERE tm.user_id = auth.uid() AND tm.status = 'active' AND tm.can_manage_leads = true
    )
  );

-- Update contact_submissions update policy to allow team members
DROP POLICY IF EXISTS "Companies can update their submissions" ON contact_submissions;
CREATE POLICY "Companies and team members can update submissions"
  ON contact_submissions FOR UPDATE
  TO authenticated
  USING (
    partnership_id IN (
      SELECT ap.id FROM affiliate_partnerships ap
      JOIN companies c ON c.id = ap.company_id
      WHERE c.user_id = auth.uid()
    ) OR
    partnership_id IN (
      SELECT ap.id FROM affiliate_partnerships ap
      JOIN team_members tm ON tm.company_id = ap.company_id
      WHERE tm.user_id = auth.uid() AND tm.status = 'active' AND tm.can_manage_leads = true
    )
  );

-- Update deals policies to allow team members
DROP POLICY IF EXISTS "Companies can view their deals" ON deals;
CREATE POLICY "Companies and team members can view deals"
  ON deals FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    ) OR
    company_id IN (
      SELECT company_id FROM team_members 
      WHERE user_id = auth.uid() AND status = 'active' AND can_manage_deals = true
    )
  );

DROP POLICY IF EXISTS "Companies can update their deals" ON deals;
CREATE POLICY "Companies and team members can update deals"
  ON deals FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    ) OR
    company_id IN (
      SELECT company_id FROM team_members 
      WHERE user_id = auth.uid() AND status = 'active' AND can_manage_deals = true
    )
  );

-- Update demo_appointments policies to allow team members
DROP POLICY IF EXISTS "Companies can view their appointments" ON demo_appointments;
CREATE POLICY "Companies and team members can view appointments"
  ON demo_appointments FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    ) OR
    company_id IN (
      SELECT company_id FROM team_members 
      WHERE user_id = auth.uid() AND status = 'active' AND can_manage_appointments = true
    ) OR
    assigned_to_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Companies can update their appointments" ON demo_appointments;
CREATE POLICY "Companies and team members can update appointments"
  ON demo_appointments FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    ) OR
    company_id IN (
      SELECT company_id FROM team_members 
      WHERE user_id = auth.uid() AND status = 'active' AND can_manage_appointments = true
    ) OR
    assigned_to_user_id = auth.uid()
  );
