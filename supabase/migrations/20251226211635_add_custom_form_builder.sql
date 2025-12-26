/*
  # Custom Form Builder System
  
  This migration adds a comprehensive form builder system that allows admins to create
  custom forms and attach them to products for capturing additional lead information.

  ## New Tables
  
  1. **custom_forms**
     - `id` (uuid, primary key)
     - `company_id` (uuid, foreign key to profiles)
     - `name` (text) - Form name/title
     - `description` (text) - Optional description
     - `is_active` (boolean) - Enable/disable form
     - `created_at` (timestamptz)
     - `updated_at` (timestamptz)
  
  2. **custom_form_fields**
     - `id` (uuid, primary key)
     - `form_id` (uuid, foreign key to custom_forms)
     - `field_type` (text) - text, textarea, email, phone, number, select, multi_select, checkbox, date
     - `label` (text) - Field label shown to users
     - `placeholder` (text) - Optional placeholder text
     - `help_text` (text) - Optional help text
     - `required` (boolean) - Whether field is required
     - `options` (jsonb) - For select/multi-select fields
     - `validation_rules` (jsonb) - Additional validation rules
     - `field_order` (integer) - Display order
     - `created_at` (timestamptz)
  
  3. **form_submissions**
     - `id` (uuid, primary key)
     - `form_id` (uuid, foreign key to custom_forms)
     - `product_id` (uuid, foreign key to products) - Optional: which product this relates to
     - `contact_submission_id` (uuid, foreign key to contact_submissions) - Optional: linked contact
     - `product_purchase_id` (uuid, foreign key to product_purchases) - Optional: linked purchase
     - `submitted_by` (uuid, foreign key to profiles) - Person who filled out the form
     - `responses` (jsonb) - The actual form responses
     - `submitted_at` (timestamptz)
  
  4. **products table update**
     - Add `form_id` (uuid) - Optional form to show when product is accessed/purchased

  ## Security
  
  - Enable RLS on all tables
  - Companies can manage their own forms
  - Authenticated users can view forms attached to products they have access to
  - Anyone can submit forms (for lead capture)
  - Companies can view submissions for their forms
*/

-- Create custom_forms table
CREATE TABLE IF NOT EXISTS custom_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create custom_form_fields table
CREATE TABLE IF NOT EXISTS custom_form_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid REFERENCES custom_forms(id) ON DELETE CASCADE NOT NULL,
  field_type text NOT NULL CHECK (field_type IN ('text', 'textarea', 'email', 'phone', 'number', 'select', 'multi_select', 'checkbox', 'date', 'url')),
  label text NOT NULL,
  placeholder text DEFAULT '',
  help_text text DEFAULT '',
  required boolean DEFAULT false,
  options jsonb DEFAULT '[]'::jsonb,
  validation_rules jsonb DEFAULT '{}'::jsonb,
  field_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create form_submissions table
CREATE TABLE IF NOT EXISTS form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid REFERENCES custom_forms(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  contact_submission_id uuid REFERENCES contact_submissions(id) ON DELETE SET NULL,
  product_purchase_id uuid REFERENCES product_purchases(id) ON DELETE SET NULL,
  submitted_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_at timestamptz DEFAULT now()
);

-- Add form_id to products table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'form_id'
  ) THEN
    ALTER TABLE products ADD COLUMN form_id uuid REFERENCES custom_forms(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE custom_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for custom_forms

-- Companies can view their own forms
CREATE POLICY "Companies can view own forms"
  ON custom_forms FOR SELECT
  TO authenticated
  USING (company_id = auth.uid());

-- Companies can create forms
CREATE POLICY "Companies can create forms"
  ON custom_forms FOR INSERT
  TO authenticated
  WITH CHECK (company_id = auth.uid());

-- Companies can update their own forms
CREATE POLICY "Companies can update own forms"
  ON custom_forms FOR UPDATE
  TO authenticated
  USING (company_id = auth.uid())
  WITH CHECK (company_id = auth.uid());

-- Companies can delete their own forms
CREATE POLICY "Companies can delete own forms"
  ON custom_forms FOR DELETE
  TO authenticated
  USING (company_id = auth.uid());

-- Affiliates can view forms attached to products they have access to
CREATE POLICY "Affiliates can view forms for accessible products"
  ON custom_forms FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products p
      INNER JOIN affiliate_partnerships ap ON ap.company_id = p.company_id
      WHERE p.form_id = custom_forms.id
      AND ap.affiliate_id = auth.uid()
      AND ap.status = 'approved'
    )
  );

-- RLS Policies for custom_form_fields

-- View fields if you can view the form
CREATE POLICY "Users can view fields for accessible forms"
  ON custom_form_fields FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM custom_forms
      WHERE custom_forms.id = custom_form_fields.form_id
      AND (
        custom_forms.company_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM products p
          INNER JOIN affiliate_partnerships ap ON ap.company_id = p.company_id
          WHERE p.form_id = custom_forms.id
          AND ap.affiliate_id = auth.uid()
          AND ap.status = 'approved'
        )
      )
    )
  );

-- Companies can manage fields for their forms
CREATE POLICY "Companies can insert fields for own forms"
  ON custom_form_fields FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM custom_forms
      WHERE custom_forms.id = custom_form_fields.form_id
      AND custom_forms.company_id = auth.uid()
    )
  );

CREATE POLICY "Companies can update fields for own forms"
  ON custom_form_fields FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM custom_forms
      WHERE custom_forms.id = custom_form_fields.form_id
      AND custom_forms.company_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM custom_forms
      WHERE custom_forms.id = custom_form_fields.form_id
      AND custom_forms.company_id = auth.uid()
    )
  );

CREATE POLICY "Companies can delete fields for own forms"
  ON custom_form_fields FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM custom_forms
      WHERE custom_forms.id = custom_form_fields.form_id
      AND custom_forms.company_id = auth.uid()
    )
  );

-- RLS Policies for form_submissions

-- Anyone can submit forms (for lead capture)
CREATE POLICY "Anyone can submit forms"
  ON form_submissions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Companies can view submissions for their forms
CREATE POLICY "Companies can view submissions for own forms"
  ON form_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM custom_forms
      WHERE custom_forms.id = form_submissions.form_id
      AND custom_forms.company_id = auth.uid()
    )
  );

-- Users can view their own submissions
CREATE POLICY "Users can view own submissions"
  ON form_submissions FOR SELECT
  TO authenticated
  USING (submitted_by = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_custom_forms_company_id ON custom_forms(company_id);
CREATE INDEX IF NOT EXISTS idx_custom_form_fields_form_id ON custom_form_fields(form_id);
CREATE INDEX IF NOT EXISTS idx_custom_form_fields_order ON custom_form_fields(form_id, field_order);
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_product_id ON form_submissions(product_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_contact_id ON form_submissions(contact_submission_id);
CREATE INDEX IF NOT EXISTS idx_products_form_id ON products(form_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_custom_forms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_custom_forms_updated_at_trigger ON custom_forms;
CREATE TRIGGER update_custom_forms_updated_at_trigger
  BEFORE UPDATE ON custom_forms
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_forms_updated_at();
