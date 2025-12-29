/*
  # Make user_id optional for team members

  1. Changes
    - Make user_id nullable in team_members table
    - This allows adding team members who don't have accounts yet
    - Team members can be tracked by their contact info (first_name, last_name, email, phone)
    
  2. Security
    - No changes to RLS policies needed
*/

-- Make user_id nullable
ALTER TABLE team_members
ALTER COLUMN user_id DROP NOT NULL;

-- Add index for email lookups (we'll store email directly now)
CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(user_id);
