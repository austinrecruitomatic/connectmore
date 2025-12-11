/*
  # Add Company Categories and Reviews

  ## Overview
  Enhances the affiliate marketplace by adding business categories and a review system for companies.
  This allows affiliates to browse companies by category and make informed decisions based on reviews.

  ## Changes Made

  ### 1. Add business_category to companies table
    - Adds `business_category` column to categorize companies
    - Categories: 'ecommerce', 'saas', 'digital_products', 'services', 'education', 'health', 'finance', 'other'
    - Defaults to 'other' for existing records
    - Add index for efficient category filtering

  ### 2. Create company_reviews table
    - `id` (uuid, primary key) - Review ID
    - `company_id` (uuid, references companies) - Company being reviewed
    - `reviewer_id` (uuid, references profiles) - Affiliate who wrote the review
    - `rating` (integer) - Rating from 1-5 stars
    - `title` (text) - Review title
    - `comment` (text) - Detailed review text
    - `created_at` (timestamptz) - Review timestamp
    - `updated_at` (timestamptz) - Last update timestamp

  ### 3. Add aggregate columns to companies
    - `average_rating` (decimal) - Computed average rating
    - `total_reviews` (integer) - Total number of reviews
    - These will be updated via triggers

  ## Security
    - Enable RLS on company_reviews table
    - Only affiliates can create reviews
    - Only affiliates who have partnerships with a company can review it
    - Anyone can read reviews
    - Reviewers can update/delete their own reviews
*/

-- Add business_category to companies table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'business_category'
  ) THEN
    ALTER TABLE companies ADD COLUMN business_category text DEFAULT 'other' 
    CHECK (business_category IN ('ecommerce', 'saas', 'digital_products', 'services', 'education', 'health', 'finance', 'other'));
  END IF;
END $$;

-- Add aggregate columns to companies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'average_rating'
  ) THEN
    ALTER TABLE companies ADD COLUMN average_rating decimal(3,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'total_reviews'
  ) THEN
    ALTER TABLE companies ADD COLUMN total_reviews integer DEFAULT 0;
  END IF;
END $$;

-- Create index for business category
CREATE INDEX IF NOT EXISTS idx_companies_business_category ON companies(business_category);

-- Create company_reviews table
CREATE TABLE IF NOT EXISTS company_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text NOT NULL,
  comment text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, reviewer_id)
);

ALTER TABLE company_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for company_reviews
CREATE POLICY "Anyone can view reviews"
  ON company_reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Affiliates can create reviews for companies they partner with"
  ON company_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = reviewer_id AND
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'affiliate'
    ) AND
    EXISTS (
      SELECT 1 FROM affiliate_partnerships ap
      INNER JOIN products p ON ap.product_id = p.id
      WHERE ap.affiliate_id = auth.uid() 
      AND p.company_id = company_id
      AND ap.status = 'approved'
    )
  );

CREATE POLICY "Reviewers can update their own reviews"
  ON company_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = reviewer_id)
  WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Reviewers can delete their own reviews"
  ON company_reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = reviewer_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_reviews_company_id ON company_reviews(company_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON company_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON company_reviews(rating);

-- Function to update company rating aggregates
CREATE OR REPLACE FUNCTION update_company_rating_aggregates()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the company's aggregate rating data
  UPDATE companies
  SET 
    average_rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM company_reviews
      WHERE company_id = COALESCE(NEW.company_id, OLD.company_id)
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM company_reviews
      WHERE company_id = COALESCE(NEW.company_id, OLD.company_id)
    )
  WHERE id = COALESCE(NEW.company_id, OLD.company_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers to update aggregates
DROP TRIGGER IF EXISTS update_company_rating_on_insert ON company_reviews;
CREATE TRIGGER update_company_rating_on_insert
  AFTER INSERT ON company_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_company_rating_aggregates();

DROP TRIGGER IF EXISTS update_company_rating_on_update ON company_reviews;
CREATE TRIGGER update_company_rating_on_update
  AFTER UPDATE ON company_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_company_rating_aggregates();

DROP TRIGGER IF EXISTS update_company_rating_on_delete ON company_reviews;
CREATE TRIGGER update_company_rating_on_delete
  AFTER DELETE ON company_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_company_rating_aggregates();
