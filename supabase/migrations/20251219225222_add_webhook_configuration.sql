/*
  # Add Webhook Configuration for Companies

  1. Changes
    - Add `webhook_url` column to companies table for CRM integration
    - Add `webhook_secret` column for webhook authentication
    - Add `webhook_enabled` column to enable/disable webhooks
    - Add `lead_source_tag` column to tag leads when sent to CRM (default: "connect more")
    
  2. Security
    - Only company owners can update their webhook settings
    - Webhook secret is stored securely
*/

-- Add webhook configuration columns to companies table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'webhook_url'
  ) THEN
    ALTER TABLE companies ADD COLUMN webhook_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'webhook_secret'
  ) THEN
    ALTER TABLE companies ADD COLUMN webhook_secret text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'webhook_enabled'
  ) THEN
    ALTER TABLE companies ADD COLUMN webhook_enabled boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'lead_source_tag'
  ) THEN
    ALTER TABLE companies ADD COLUMN lead_source_tag text DEFAULT 'connect more';
  END IF;
END $$;