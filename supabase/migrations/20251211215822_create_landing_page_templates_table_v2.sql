/*
  # Create Landing Page Templates System

  ## Overview
  Allows companies to create multiple landing page templates for their products.
  Affiliates can then choose from these pre-designed templates when creating their landing pages.

  ## New Tables
  
  ### `landing_page_templates`
  - `id` (uuid, primary key) - Unique identifier
  - `product_id` (uuid) - References the product this template is for
  - `company_id` (uuid) - References the company that created it
  - `name` (text) - Template name (e.g., "Bold Modern", "Minimal Clean")
  - `headline` (text) - Pre-written headline
  - `description` (text) - Pre-written description
  - `cta_text` (text) - Call-to-action button text
  - `hero_image_url` (text, nullable) - Hero/product image URL
  - `theme_style` (text) - Visual style: 'modern', 'minimal', 'bold', 'elegant'
  - `primary_color` (text) - Primary brand color (hex)
  - `secondary_color` (text, nullable) - Secondary accent color
  - `is_default` (boolean) - Whether this is the default template for the product
  - `is_active` (boolean) - Whether affiliates can use this template
  - `usage_count` (integer) - Track how many times this template has been used
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Table Modifications
  
  ### `landing_pages` table
  - Add `template_id` column to link landing pages to their template
  
  ## Security
  
  ### Row Level Security (RLS)
  1. Enable RLS on `landing_page_templates` table
  2. Companies can manage (create, read, update, delete) their own templates
  3. Affiliates can view active templates for companies they have partnerships with
  4. Public can view templates used on published landing pages (for rendering)
  
  ## Indexes
  - Index on `product_id` for fast filtering by product
  - Index on `company_id` for fast filtering by company
  - Index on `is_active` for filtering available templates
*/

-- Create landing_page_templates table
CREATE TABLE IF NOT EXISTS landing_page_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  headline text NOT NULL,
  description text DEFAULT '' NOT NULL,
  cta_text text DEFAULT 'Get Started' NOT NULL,
  hero_image_url text,
  theme_style text DEFAULT 'modern' NOT NULL CHECK (theme_style IN ('modern', 'minimal', 'bold', 'elegant')),
  primary_color text DEFAULT '#007AFF' NOT NULL,
  secondary_color text,
  is_default boolean DEFAULT false NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  usage_count integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Add template_id to landing_pages table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'landing_pages' AND column_name = 'template_id'
  ) THEN
    ALTER TABLE landing_pages ADD COLUMN template_id uuid REFERENCES landing_page_templates(id);
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_templates_product ON landing_page_templates(product_id);
CREATE INDEX IF NOT EXISTS idx_templates_company ON landing_page_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_templates_active ON landing_page_templates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_templates_default ON landing_page_templates(product_id, is_default) WHERE is_default = true;

-- Enable RLS
ALTER TABLE landing_page_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Companies can view their own templates
CREATE POLICY "Companies can view own templates"
  ON landing_page_templates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies c
      INNER JOIN profiles p ON p.id = c.user_id
      WHERE c.id = landing_page_templates.company_id
      AND p.id = auth.uid()
    )
  );

-- Policy: Companies can create templates for their products
CREATE POLICY "Companies can create templates"
  ON landing_page_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products pr
      INNER JOIN companies c ON c.id = pr.company_id
      INNER JOIN profiles p ON p.id = c.user_id
      WHERE pr.id = landing_page_templates.product_id
      AND c.id = landing_page_templates.company_id
      AND p.id = auth.uid()
    )
  );

-- Policy: Companies can update their own templates
CREATE POLICY "Companies can update own templates"
  ON landing_page_templates
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies c
      INNER JOIN profiles p ON p.id = c.user_id
      WHERE c.id = landing_page_templates.company_id
      AND p.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies c
      INNER JOIN profiles p ON p.id = c.user_id
      WHERE c.id = landing_page_templates.company_id
      AND p.id = auth.uid()
    )
  );

-- Policy: Companies can delete their own templates
CREATE POLICY "Companies can delete own templates"
  ON landing_page_templates
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies c
      INNER JOIN profiles p ON p.id = c.user_id
      WHERE c.id = landing_page_templates.company_id
      AND p.id = auth.uid()
    )
  );

-- Policy: Affiliates can view active templates for companies they partner with
CREATE POLICY "Affiliates can view available templates"
  ON landing_page_templates
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM affiliate_partnerships ap
      WHERE ap.company_id = landing_page_templates.company_id
      AND ap.affiliate_id = auth.uid()
      AND ap.status = 'approved'
    )
  );

-- Policy: Public can view templates used on published landing pages (for rendering)
CREATE POLICY "Public can view templates on published pages"
  ON landing_page_templates
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM landing_pages lp
      WHERE lp.template_id = landing_page_templates.id
      AND lp.is_published = true
    )
  );

-- Add trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_landing_page_templates_updated_at ON landing_page_templates;
CREATE TRIGGER update_landing_page_templates_updated_at
  BEFORE UPDATE ON landing_page_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to ensure only one default template per product
CREATE OR REPLACE FUNCTION ensure_single_default_template()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE landing_page_templates
    SET is_default = false
    WHERE product_id = NEW.product_id
    AND id != NEW.id
    AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce single default template
DROP TRIGGER IF EXISTS ensure_default_template ON landing_page_templates;
CREATE TRIGGER ensure_default_template
  BEFORE INSERT OR UPDATE ON landing_page_templates
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION ensure_single_default_template();