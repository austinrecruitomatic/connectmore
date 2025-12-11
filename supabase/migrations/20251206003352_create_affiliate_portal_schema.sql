/*
  # Affiliate Portal Database Schema

  ## Overview
  Creates a complete database schema for an affiliate marketing portal where companies can list products
  and hire affiliates, while affiliates can create landing pages and track conversions.

  ## New Tables

  1. **profiles**
     - `id` (uuid, references auth.users) - User ID
     - `user_type` (text) - Either 'company' or 'affiliate'
     - `full_name` (text) - User's full name
     - `email` (text) - User's email
     - `avatar_url` (text) - Profile picture URL
     - `created_at` (timestamptz) - Account creation timestamp

  2. **companies**
     - `id` (uuid, primary key) - Company ID
     - `user_id` (uuid, references profiles) - Owner user ID
     - `company_name` (text) - Company name
     - `description` (text) - Company description
     - `website` (text) - Company website
     - `logo_url` (text) - Company logo
     - `created_at` (timestamptz) - Creation timestamp

  3. **products**
     - `id` (uuid, primary key) - Product ID
     - `company_id` (uuid, references companies) - Owning company
     - `name` (text) - Product name
     - `description` (text) - Product description
     - `image_url` (text) - Product image
     - `commission_rate` (decimal) - Commission percentage
     - `commission_type` (text) - 'percentage' or 'fixed'
     - `is_active` (boolean) - Whether product is active
     - `created_at` (timestamptz) - Creation timestamp

  4. **affiliate_partnerships**
     - `id` (uuid, primary key) - Partnership ID
     - `affiliate_id` (uuid, references profiles) - Affiliate user ID
     - `product_id` (uuid, references products) - Product being promoted
     - `status` (text) - 'pending', 'approved', 'rejected'
     - `affiliate_code` (text) - Unique affiliate tracking code
     - `created_at` (timestamptz) - Partnership request timestamp
     - `approved_at` (timestamptz) - Approval timestamp

  5. **landing_pages**
     - `id` (uuid, primary key) - Landing page ID
     - `affiliate_id` (uuid, references profiles) - Page creator
     - `partnership_id` (uuid, references affiliate_partnerships) - Associated partnership
     - `title` (text) - Page title
     - `slug` (text) - URL-friendly slug
     - `content` (jsonb) - Page content/configuration
     - `is_published` (boolean) - Whether page is live
     - `views` (integer) - View count
     - `created_at` (timestamptz) - Creation timestamp
     - `updated_at` (timestamptz) - Last update timestamp

  6. **leads**
     - `id` (uuid, primary key) - Lead ID
     - `landing_page_id` (uuid, references landing_pages) - Source landing page
     - `partnership_id` (uuid, references affiliate_partnerships) - Associated partnership
     - `lead_type` (text) - 'click', 'signup', 'conversion'
     - `lead_data` (jsonb) - Additional lead data
     - `ip_address` (text) - Visitor IP
     - `user_agent` (text) - Visitor browser info
     - `created_at` (timestamptz) - Lead timestamp

  ## Security
  - Enable RLS on all tables
  - Profiles: Users can read all profiles, but only update their own
  - Companies: Users can read all companies, but only manage their own
  - Products: Anyone can read active products, only company owners can manage
  - Partnerships: Affiliates and product owners can view their partnerships
  - Landing Pages: Public can view published pages, only creators can edit
  - Leads: Only relevant affiliates and companies can view their leads
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  user_type text NOT NULL CHECK (user_type IN ('company', 'affiliate')),
  full_name text NOT NULL,
  email text NOT NULL,
  avatar_url text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  description text DEFAULT '',
  website text DEFAULT '',
  logo_url text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view companies"
  ON companies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Company owners can insert their company"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Company owners can update their company"
  ON companies FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  image_url text DEFAULT '',
  commission_rate decimal(10,2) NOT NULL DEFAULT 0,
  commission_type text NOT NULL DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'fixed')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active products"
  ON products FOR SELECT
  TO authenticated
  USING (is_active = true OR company_id IN (
    SELECT id FROM companies WHERE user_id = auth.uid()
  ));

CREATE POLICY "Company owners can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (company_id IN (
    SELECT id FROM companies WHERE user_id = auth.uid()
  ));

CREATE POLICY "Company owners can update their products"
  ON products FOR UPDATE
  TO authenticated
  USING (company_id IN (
    SELECT id FROM companies WHERE user_id = auth.uid()
  ))
  WITH CHECK (company_id IN (
    SELECT id FROM companies WHERE user_id = auth.uid()
  ));

-- Create affiliate_partnerships table
CREATE TABLE IF NOT EXISTS affiliate_partnerships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  affiliate_code text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  approved_at timestamptz,
  UNIQUE(affiliate_id, product_id)
);

ALTER TABLE affiliate_partnerships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can view their partnerships"
  ON affiliate_partnerships FOR SELECT
  TO authenticated
  USING (
    auth.uid() = affiliate_id OR
    product_id IN (
      SELECT p.id FROM products p
      INNER JOIN companies c ON p.company_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "Affiliates can create partnership requests"
  ON affiliate_partnerships FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = affiliate_id);

CREATE POLICY "Company owners can update partnership status"
  ON affiliate_partnerships FOR UPDATE
  TO authenticated
  USING (
    product_id IN (
      SELECT p.id FROM products p
      INNER JOIN companies c ON p.company_id = c.id
      WHERE c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    product_id IN (
      SELECT p.id FROM products p
      INNER JOIN companies c ON p.company_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

-- Create landing_pages table
CREATE TABLE IF NOT EXISTS landing_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  partnership_id uuid NOT NULL REFERENCES affiliate_partnerships(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  content jsonb DEFAULT '{}',
  is_published boolean DEFAULT false,
  views integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published landing pages"
  ON landing_pages FOR SELECT
  TO anon, authenticated
  USING (is_published = true OR auth.uid() = affiliate_id);

CREATE POLICY "Affiliates can create their landing pages"
  ON landing_pages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = affiliate_id);

CREATE POLICY "Affiliates can update their landing pages"
  ON landing_pages FOR UPDATE
  TO authenticated
  USING (auth.uid() = affiliate_id)
  WITH CHECK (auth.uid() = affiliate_id);

CREATE POLICY "Affiliates can delete their landing pages"
  ON landing_pages FOR DELETE
  TO authenticated
  USING (auth.uid() = affiliate_id);

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landing_page_id uuid NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
  partnership_id uuid NOT NULL REFERENCES affiliate_partnerships(id) ON DELETE CASCADE,
  lead_type text NOT NULL CHECK (lead_type IN ('click', 'signup', 'conversion')),
  lead_data jsonb DEFAULT '{}',
  ip_address text DEFAULT '',
  user_agent text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can view leads from their landing pages"
  ON leads FOR SELECT
  TO authenticated
  USING (
    landing_page_id IN (
      SELECT id FROM landing_pages WHERE affiliate_id = auth.uid()
    ) OR
    partnership_id IN (
      SELECT ap.id FROM affiliate_partnerships ap
      INNER JOIN products p ON ap.product_id = p.id
      INNER JOIN companies c ON p.company_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can insert leads"
  ON leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_partnerships_affiliate_id ON affiliate_partnerships(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_partnerships_product_id ON affiliate_partnerships(product_id);
CREATE INDEX IF NOT EXISTS idx_partnerships_status ON affiliate_partnerships(status);
CREATE INDEX IF NOT EXISTS idx_landing_pages_affiliate_id ON landing_pages(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_landing_pages_slug ON landing_pages(slug);
CREATE INDEX IF NOT EXISTS idx_leads_landing_page_id ON leads(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_leads_partnership_id ON leads(partnership_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
