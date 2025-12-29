/*
  # Add Contact Fields to Team Members

  1. Changes
    - Add first_name, last_name, and phone columns to team_members
    - These fields allow storing contact info for team members directly
    - Useful for team members who may not have created accounts yet
    
  2. Security
    - No changes to RLS policies needed
*/

-- Add contact fields to team_members
ALTER TABLE team_members
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS phone text;

-- Create index for phone lookups
CREATE INDEX IF NOT EXISTS idx_team_members_phone ON team_members(phone);
