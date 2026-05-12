-- ========================
-- EXTENSIONS
-- ========================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================
-- ENUMS
-- ========================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_type_enum') THEN
    CREATE TYPE user_type_enum AS ENUM ('ADMIN', 'STAFF');
  END IF;
END$$;

-- ========================
-- USERS
-- ========================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,

  type user_type_enum NOT NULL DEFAULT 'STAFF',

  must_change_password BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_type ON users(type);
CREATE INDEX idx_users_active ON users(is_active);

-- ========================
-- SHOPS (MASTER DATA)
-- ========================
CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,

  name VARCHAR(255) NOT NULL,
  url TEXT,
  platform VARCHAR(50),
  code VARCHAR(100) UNIQUE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shops_owner ON shops(owner_id);
CREATE INDEX idx_shops_code ON shops(code);

-- ========================
-- BRANDS (MASTER DATA)
-- ========================
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) UNIQUE NOT NULL,
  code VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_brands_name ON brands(name);

-- ========================
-- PRODUCTS (MASTER - USER CREATED)
-- ========================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  name VARCHAR(500) NOT NULL,
  brand_id UUID REFERENCES brands(id),

  models TEXT[] DEFAULT ARRAY[]::TEXT[],
  variants TEXT[] DEFAULT ARRAY[]::TEXT[],

  listed_price NUMERIC(12,2),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_owner ON products(owner_id);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_models ON products USING GIN (models);
CREATE INDEX idx_products_variants ON products USING GIN (variants);

-- ========================
-- SHOP PRODUCTS (RUNTIME - CRAWLED DATA)
-- ========================
CREATE TABLE shop_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  external_id VARCHAR(255),
  name TEXT NOT NULL,
  url TEXT,

  price NUMERIC(12,2),
  price_min NUMERIC(12,2),
  price_max NUMERIC(12,2),

  rating NUMERIC(3,1),
  sold INTEGER,
  variants TEXT[] DEFAULT ARRAY[]::TEXT[],
  models TEXT[] DEFAULT ARRAY[]::TEXT[], 
  brand TEXT,
  raw JSONB,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shop_products_shop ON shop_products(shop_id);
CREATE INDEX idx_shop_products_name ON shop_products(name);

-- ========================
-- PRICE HISTORY (RUNTIME - CRAWLED DATA)
-- ========================
CREATE TABLE price_histories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_product_id UUID NOT NULL REFERENCES shop_products(id) ON DELETE CASCADE,
  price NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_price_histories_shop_product ON price_histories(shop_product_id);

-- ========================
-- CRAWL HISTORIES (RUNTIME)
-- ========================
CREATE TABLE crawl_histories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,

  status VARCHAR(20) DEFAULT 'pending',
  product_count INT DEFAULT 0,
  crawled_count INT DEFAULT 0,

  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX idx_crawl_shop ON crawl_histories(shop_id);
CREATE INDEX idx_crawl_status ON crawl_histories(status);

-- ========================
-- OPTIONAL: USER - SHOP MAPPING (MULTI SHOP SUPPORT)
-- ========================
CREATE TABLE user_shop_mappings (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (user_id, shop_id)
);

-- ========================
-- DEFAULT ADMIN
-- ========================
INSERT INTO users (username, email, password_hash, type, must_change_password)
VALUES (
  'admin',
  'admin@example.com',
  '$2b$12$NTI35uLS80UCgD.yDOyMCuoGl5j0fCmu8yrfzQ16xC2vXXZtLoQb2',
  'ADMIN',
  FALSE
)
ON CONFLICT (username) DO NOTHING;

-- ========================
-- RLS (OPTIONAL - DEV MODE)
-- ========================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', r.tablename);
    EXECUTE format('DROP POLICY IF EXISTS "Allow all" ON %I;', r.tablename);
    EXECUTE format('CREATE POLICY "Allow all" ON %I FOR ALL USING (true) WITH CHECK (true);', r.tablename);
  END LOOP;
END $$;

ALTER TABLE products
ADD COLUMN is_active BOOLEAN DEFAULT TRUE;