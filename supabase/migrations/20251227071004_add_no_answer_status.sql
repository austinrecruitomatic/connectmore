/*
  # Add No Answer Status to Contact Submissions
  
  1. Updates
    - Add 'no_answer' status to contact_submissions status constraint
    - Update the CHECK constraint to include the new status
    
  2. Status Values
    - 'new' - Initial submission
    - 'contacted' - Company reached out
    - 'qualified' - Lead meets criteria
    - 'no_answer' - Lead not responding (NEW)
    - 'not_interested' - Lead declined
    - 'closed' - Deal closed/won
    
  3. Notes
    - This allows companies to track leads that aren't responding to outreach attempts
    - Helps distinguish between leads who declined vs those who simply don't respond
*/

-- Drop the existing constraint
ALTER TABLE contact_submissions 
DROP CONSTRAINT IF EXISTS contact_submissions_status_check;

-- Add the new constraint with 'no_answer' status
ALTER TABLE contact_submissions
ADD CONSTRAINT contact_submissions_status_check 
CHECK (status IN ('new', 'contacted', 'qualified', 'no_answer', 'not_interested', 'closed'));