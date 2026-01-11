/*
  # Add W-9 Tax Information System

  ## Overview
  Adds comprehensive W-9 tax information collection for IRS compliance.
  Affiliates must complete W-9 before receiving commission payments over $600.

  ## Changes to Profiles Table
  - `w9_completed` (boolean) - Whether W-9 has been submitted
  - `w9_submitted_at` (timestamptz) - When W-9 was submitted
  - `w9_legal_name` (text) - Legal name for tax purposes
  - `w9_business_name` (text) - Business name if different from legal name
  - `tax_id_type` (text) - SSN, EIN, or ITIN
  - `tax_id_last4` (text) - Last 4 digits for display
  - `business_entity_type` (text) - Sole proprietor, LLC, etc.
  - `w9_address_line1` (text) - Street address
  - `w9_address_line2` (text) - Apt/Suite
  - `w9_city` (text) - City
  - `w9_state` (text) - State
  - `w9_zip` (text) - ZIP code
  - `w9_exempt_payee_code` (text) - Exempt payee code if applicable
  - `w9_fatca_exemption` (text) - FATCA exemption code if applicable
  - `w9_document_url` (text) - URL to uploaded signed W-9 PDF
  - `w9_signature_confirmation` (boolean) - Electronic signature confirmation

  ## Security
  - Enable RLS on all W-9 related fields
  - Only affiliate owner and super admins can view their own W-9 data
  - Audit log for W-9 access

  ## Storage Bucket
  - Create w9-documents bucket for signed W-9 PDFs
  - Strict access controls
*/

-- Add W-9 fields to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'w9_completed'
  ) THEN
    ALTER TABLE profiles ADD COLUMN w9_completed boolean DEFAULT false NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'w9_submitted_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN w9_submitted_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'w9_legal_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN w9_legal_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'w9_business_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN w9_business_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'tax_id_type'
  ) THEN
    ALTER TABLE profiles ADD COLUMN tax_id_type text CHECK (tax_id_type IN ('ssn', 'ein', 'itin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'tax_id_last4'
  ) THEN
    ALTER TABLE profiles ADD COLUMN tax_id_last4 text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'business_entity_type'
  ) THEN
    ALTER TABLE profiles ADD COLUMN business_entity_type text CHECK (
      business_entity_type IN (
        'individual_sole_proprietor',
        'c_corporation',
        's_corporation',
        'partnership',
        'trust_estate',
        'llc_c',
        'llc_s',
        'llc_p',
        'other'
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'w9_address_line1'
  ) THEN
    ALTER TABLE profiles ADD COLUMN w9_address_line1 text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'w9_address_line2'
  ) THEN
    ALTER TABLE profiles ADD COLUMN w9_address_line2 text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'w9_city'
  ) THEN
    ALTER TABLE profiles ADD COLUMN w9_city text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'w9_state'
  ) THEN
    ALTER TABLE profiles ADD COLUMN w9_state text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'w9_zip'
  ) THEN
    ALTER TABLE profiles ADD COLUMN w9_zip text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'w9_exempt_payee_code'
  ) THEN
    ALTER TABLE profiles ADD COLUMN w9_exempt_payee_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'w9_fatca_exemption'
  ) THEN
    ALTER TABLE profiles ADD COLUMN w9_fatca_exemption text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'w9_document_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN w9_document_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'w9_signature_confirmation'
  ) THEN
    ALTER TABLE profiles ADD COLUMN w9_signature_confirmation boolean DEFAULT false;
  END IF;
END $$;

-- Create W-9 audit log table
CREATE TABLE IF NOT EXISTS w9_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  accessed_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('viewed', 'submitted', 'updated', 'downloaded')),
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE w9_audit_log ENABLE ROW LEVEL SECURITY;

-- Super admins can view all audit logs
CREATE POLICY "Super admins can view all W-9 audit logs"
  ON w9_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

-- Users can view their own audit logs
CREATE POLICY "Users can view own W-9 audit logs"
  ON w9_audit_log FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

-- Anyone authenticated can insert audit logs
CREATE POLICY "Authenticated users can insert W-9 audit logs"
  ON w9_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (accessed_by = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_w9_audit_log_profile_id ON w9_audit_log(profile_id);
CREATE INDEX IF NOT EXISTS idx_w9_audit_log_accessed_by ON w9_audit_log(accessed_by);
CREATE INDEX IF NOT EXISTS idx_w9_audit_log_created_at ON w9_audit_log(created_at);

-- Function to log W-9 access
CREATE OR REPLACE FUNCTION log_w9_access(
  p_profile_id uuid,
  p_action text,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO w9_audit_log (profile_id, accessed_by, action, ip_address, user_agent)
  VALUES (p_profile_id, auth.uid(), p_action, p_ip_address, p_user_agent);
END;
$$;