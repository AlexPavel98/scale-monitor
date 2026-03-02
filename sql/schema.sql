-- Scale Monitor — Full Schema
-- Supabase (shared instance with unitech-monitor)
-- All tables prefixed with scale_ to avoid conflicts

-- ===== PROFILES =====
CREATE TABLE scale_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  role text NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'operator')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE scale_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read all profiles" ON scale_profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON scale_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can insert profiles" ON scale_profiles FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM scale_profiles WHERE id = auth.uid() AND role = 'admin')
  OR NOT EXISTS (SELECT 1 FROM scale_profiles)
);

-- ===== VEHICLES =====
CREATE TABLE scale_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plate_number text UNIQUE NOT NULL,
  carrier_name text,
  address1 text,
  address2 text,
  phone text,
  tare_weight integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE scale_vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD vehicles" ON scale_vehicles FOR ALL USING (auth.uid() IS NOT NULL);

-- ===== CUSTOMERS =====
CREATE TABLE scale_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id text,
  customer_number text UNIQUE NOT NULL,
  pin_code text,
  name text NOT NULL,
  address1 text,
  address2 text,
  email text,
  cvr_number text,
  p_number text,
  ticket_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE scale_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD customers" ON scale_customers FOR ALL USING (auth.uid() IS NOT NULL);

-- ===== PRODUCTS =====
CREATE TABLE scale_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text,
  product_number text UNIQUE NOT NULL,
  name text NOT NULL,
  density numeric,
  control1 text,
  control2 text,
  control3 text,
  control4 text,
  control5 text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE scale_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD products" ON scale_products FOR ALL USING (auth.uid() IS NOT NULL);

-- ===== CARDS =====
CREATE TABLE scale_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_number text UNIQUE NOT NULL,
  vehicle_id uuid REFERENCES scale_vehicles(id) ON DELETE SET NULL,
  plate_number text,
  tare_weight integer,
  carrier_name text,
  carrier_addr1 text,
  carrier_addr2 text,
  customer_id uuid REFERENCES scale_customers(id) ON DELETE SET NULL,
  customer_number text,
  customer_name text,
  customer_addr1 text,
  customer_addr2 text,
  product_id uuid REFERENCES scale_products(id) ON DELETE SET NULL,
  product_number text,
  product_name text,
  workplace_number text,
  workplace_name text,
  case_number text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE scale_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD cards" ON scale_cards FOR ALL USING (auth.uid() IS NOT NULL);

-- ===== WEIGHINGS =====
CREATE TABLE scale_weighings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weighing_number serial UNIQUE,
  status text DEFAULT 'first' CHECK (status IN ('first', 'complete', 'cancelled')),
  direction text DEFAULT 'in' CHECK (direction IN ('in', 'out')),

  -- Vehicle
  vehicle_id uuid REFERENCES scale_vehicles(id) ON DELETE SET NULL,
  plate_number text,
  carrier_name text,
  carrier_addr1 text,
  carrier_addr2 text,

  -- Customer
  customer_id uuid REFERENCES scale_customers(id) ON DELETE SET NULL,
  customer_number text,
  customer_name text,
  customer_addr1 text,
  customer_addr2 text,
  cvr_number text,
  p_number text,

  -- Product
  product_id uuid REFERENCES scale_products(id) ON DELETE SET NULL,
  product_number text,
  product_name text,
  control1 text,
  control2 text,
  control3 text,
  control4 text,
  control5 text,

  -- Card
  card_number text,

  -- Weighing data
  first_date timestamptz,
  first_weight integer,
  second_date timestamptz,
  second_weight integer,
  net_weight integer,
  volume_m3 numeric,

  -- Running totals
  running_total_kg integer,
  running_total_m3 numeric,

  -- Additional
  delivery_note text,
  department text,
  workplace text,
  customer_case text,
  work_case text,
  notes text,

  -- Audit
  operator_id uuid REFERENCES scale_profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE scale_weighings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD weighings" ON scale_weighings FOR ALL USING (auth.uid() IS NOT NULL);

-- Index for common queries
CREATE INDEX idx_scale_weighings_status ON scale_weighings(status);
CREATE INDEX idx_scale_weighings_first_date ON scale_weighings(first_date DESC);
CREATE INDEX idx_scale_weighings_plate ON scale_weighings(plate_number);
CREATE INDEX idx_scale_weighings_customer ON scale_weighings(customer_id);

-- ===== WEIGH LOG =====
CREATE TABLE scale_weigh_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weighing_id uuid REFERENCES scale_weighings(id) ON DELETE CASCADE,
  action text NOT NULL,
  operator_id uuid REFERENCES scale_profiles(id) ON DELETE SET NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE scale_weigh_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read/insert log" ON scale_weigh_log FOR ALL USING (auth.uid() IS NOT NULL);

-- ===== MUNICIPALITIES =====
CREATE TABLE scale_municipalities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE scale_municipalities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD municipalities" ON scale_municipalities FOR ALL USING (auth.uid() IS NOT NULL);

-- ===== WASTE CODES =====
CREATE TABLE scale_waste_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  category text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE scale_waste_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD waste codes" ON scale_waste_codes FOR ALL USING (auth.uid() IS NOT NULL);

-- ===== WASTE REPORTS =====
CREATE TABLE scale_waste_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporting_year integer NOT NULL,
  municipality_id uuid REFERENCES scale_municipalities(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES scale_customers(id) ON DELETE SET NULL,
  cvr_number text,
  p_number text,
  method text CHECK (method IN ('import', 'export', 'receiver', 'collector', 'col_and_rec')),
  total_weight_kg integer,
  record_count integer,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'error')),
  error_details jsonb,
  submitted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE scale_waste_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD waste reports" ON scale_waste_reports FOR ALL USING (auth.uid() IS NOT NULL);

-- ===== FACILITY =====
CREATE TABLE scale_facility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address1 text,
  address2 text,
  cvr_number text,
  p_number text,
  contact_person text,
  contact_phone text,
  is_import boolean DEFAULT false,
  is_export boolean DEFAULT false,
  is_receiver boolean DEFAULT false,
  is_collector boolean DEFAULT false,
  is_col_and_rec boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE scale_facility ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD facility" ON scale_facility FOR ALL USING (auth.uid() IS NOT NULL);

-- ===== DEBTORS =====
CREATE TABLE scale_debtors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_number text,
  customer_name text,
  subtotal numeric DEFAULT 0,
  grand_total numeric DEFAULT 0,
  date date,
  address1 text,
  address2 text,
  cvr_number text,
  p_number text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE scale_debtors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD debtors" ON scale_debtors FOR ALL USING (auth.uid() IS NOT NULL);

-- ===== SETTINGS =====
CREATE TABLE scale_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL
);

ALTER TABLE scale_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read settings" ON scale_settings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can modify settings" ON scale_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM scale_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ===== TRIGGER: auto-update updated_at =====
CREATE OR REPLACE FUNCTION scale_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER scale_vehicles_updated BEFORE UPDATE ON scale_vehicles FOR EACH ROW EXECUTE FUNCTION scale_update_timestamp();
CREATE TRIGGER scale_customers_updated BEFORE UPDATE ON scale_customers FOR EACH ROW EXECUTE FUNCTION scale_update_timestamp();
CREATE TRIGGER scale_products_updated BEFORE UPDATE ON scale_products FOR EACH ROW EXECUTE FUNCTION scale_update_timestamp();
CREATE TRIGGER scale_cards_updated BEFORE UPDATE ON scale_cards FOR EACH ROW EXECUTE FUNCTION scale_update_timestamp();
CREATE TRIGGER scale_weighings_updated BEFORE UPDATE ON scale_weighings FOR EACH ROW EXECUTE FUNCTION scale_update_timestamp();
CREATE TRIGGER scale_facility_updated BEFORE UPDATE ON scale_facility FOR EACH ROW EXECUTE FUNCTION scale_update_timestamp();

-- ===== DEFAULT SETTINGS =====
INSERT INTO scale_settings (key, value) VALUES
  ('company_info', '{"name": "Palm Kartofler", "address1": "", "address2": "", "phone": "", "cvr": ""}'),
  ('ticket_config', '{"showLogo": true, "copies": 1}'),
  ('control_field_labels', '{"control1": "Kontrol 1", "control2": "Kontrol 2", "control3": "Kontrol 3", "control4": "Kontrol 4", "control5": "Kontrol 5"}'),
  ('scale_config', '{"comPort": "COM1", "baudRate": 9600, "dataBits": 8, "parity": "none", "stopBits": 1, "weightRegex": "(\\\\d+\\\\.?\\\\d*)\\\\s*kg"}')
ON CONFLICT (key) DO NOTHING;
