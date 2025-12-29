/*
  # Add email to team members

  1. Changes
    - Add email column to team_members table
    - This allows storing email directly for team members without accounts
    
  2. Security
    - No changes to RLS policies needed
*/

-- Add email field
ALTER TABLE team_members
ADD COLUMN IF NOT EXISTS email text;

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_team_members_email_lookup ON team_members(email);
