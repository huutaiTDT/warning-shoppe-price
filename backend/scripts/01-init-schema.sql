-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================
-- USERS
-- ========================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================
-- SHOPS
-- ========================
CREATE TABLE IF NOT EXISTS shops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  platform VARCHAR(50) NOT NULL,
  is_sys_product_by_link BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================
-- CRAWL HISTORY
-- ========================
CREATE TABLE IF NOT EXISTS crawl_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  product_count INTEGER DEFAULT 0,
  crawled_count INTEGER DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT
);

-- ========================
-- PRODUCTS MASTER (DATA GỐC)
-- ========================
CREATE TABLE IF NOT EXISTS products_aff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 🔥 liên kết shop
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  -- định danh ngoài (unique theo shop)
  external_id VARCHAR(255),

  name VARCHAR(500) NOT NULL,
  description TEXT,

  url TEXT,
  platform VARCHAR(50),

  image TEXT,
  gallery JSONB,

  -- pricing
  price DECIMAL(10,2) DEFAULT 0,
  original_price DECIMAL(10,2),
  price_min DECIMAL(10,2),
  price_max DECIMAL(10,2),
  discount INTEGER DEFAULT 0,
  
  -- product info
  rating DECIMAL(3,1) DEFAULT 0,
  sold INTEGER DEFAULT 0,
  sold_text VARCHAR(255),

  -- affiliate
  aff_link TEXT,
  aff_info JSONB,

  -- raw data
  raw JSONB,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- 🔥 chống duplicate theo shop
  CONSTRAINT unique_shop_external UNIQUE (shop_id, external_id)
);

-- ========================
-- CRAWL HISTORY PRODUCT (SNAPSHOT)
CREATE TABLE IF NOT EXISTS crawl_history_product (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  crawl_history_id UUID NOT NULL REFERENCES crawl_history(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products_aff(id) ON DELETE CASCADE,

  -- mapping nhanh
  external_id VARCHAR(255),

  -- thứ tự crawl
  index INTEGER,

  -- snapshot tại thời điểm crawl
  price DECIMAL(10,2),
  original_price DECIMAL(10,2),
  price_min DECIMAL(10,2),
  price_max DECIMAL(10,2),

  discount INTEGER DEFAULT 0,
  rating DECIMAL(3,1) DEFAULT 0,

  sold INTEGER DEFAULT 0,
  sold_text VARCHAR(255),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- 🔥 tránh duplicate trong 1 lần crawl
  CONSTRAINT unique_crawl_product UNIQUE (crawl_history_id, external_id)
);

-- ========================
-- INDEXES
-- ========================

-- crawl_history
CREATE INDEX IF NOT EXISTS idx_crawl_history_shop_id 
ON crawl_history(shop_id);

CREATE INDEX IF NOT EXISTS idx_crawl_history_status 
ON crawl_history(status);

CREATE INDEX IF NOT EXISTS idx_crawl_history_shop_status 
ON crawl_history(shop_id, status);

-- products_aff
CREATE INDEX IF NOT EXISTS idx_products_aff_shop_id 
ON products_aff(shop_id);

CREATE INDEX IF NOT EXISTS idx_products_aff_name 
ON products_aff(name);

CREATE INDEX IF NOT EXISTS idx_products_aff_external_id 
ON products_aff(external_id);

CREATE INDEX IF NOT EXISTS idx_products_aff_shop_external 
ON products_aff(shop_id, external_id);

-- crawl_history_product
CREATE INDEX IF NOT EXISTS idx_chp_crawl_history 
ON crawl_history_product(crawl_history_id);

CREATE INDEX IF NOT EXISTS idx_chp_product 
ON crawl_history_product(product_id);

CREATE INDEX IF NOT EXISTS idx_chp_external_id 
ON crawl_history_product(external_id);

CREATE INDEX IF NOT EXISTS idx_chp_price_range 
ON crawl_history_product(price_min, price_max);

-- ========================
-- DEFAULT ADMIN
-- ========================
INSERT INTO users (username, email, password_hash)
VALUES (
  'admin',
  'admin@example.com',
  '$2b$10$YtDpjYaZPv5OB8uYe7U2.uKQ1JGFJYNtVGqaEkHgG2P0GZKw5k7gW'
)
ON CONFLICT (username) DO NOTHING;

-- ========================
-- MIGRATION 03: SHOP CODE + SHOP_BRANDS (MANY-TO-MANY)
-- ========================

-- 1) Add code column to shops
ALTER TABLE shops
ADD COLUMN IF NOT EXISTS code VARCHAR(100);

-- Add unique constraint for shops.code (safe if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'shops_code_key'
  ) THEN
    ALTER TABLE shops
    ADD CONSTRAINT shops_code_key UNIQUE (code);
  END IF;
END $$;

-- Indexes for shops
CREATE INDEX IF NOT EXISTS idx_shops_code
ON shops(code);

CREATE INDEX IF NOT EXISTS idx_shops_platform
ON shops(platform);

-- 2) Create relation table: shop_brands
CREATE TABLE IF NOT EXISTS shop_brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES master_brands(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_shop_brand UNIQUE (shop_id, brand_id)
);

-- Indexes for relation table
CREATE INDEX IF NOT EXISTS idx_shop_brands_shop_id
ON shop_brands(shop_id);

CREATE INDEX IF NOT EXISTS idx_shop_brands_brand_id
ON shop_brands(brand_id);

-- 3) Optional backfill for existing rows (only when code is null/empty)
-- Priority:
--   a) derive from URL path slug
--   b) fallback from shop name
WITH generated AS (
  SELECT
    id,
    COALESCE(
      NULLIF(
        UPPER(
          REGEXP_REPLACE(
            SPLIT_PART(
              REGEXP_REPLACE(url, '^https?://[^/]+/?', ''),
              '/',
              1
            ),
            '[^A-Z0-9]+',
            '_',
            'g'
          )
        ),
        ''
      ),
      NULLIF(
        UPPER(REGEXP_REPLACE(name, '[^A-Z0-9]+', '_', 'g')),
        ''
      ),
      'SHOP'
    ) AS base_code
  FROM shops
  WHERE code IS NULL OR TRIM(code) = ''
),
dedup AS (
  SELECT
    id,
    base_code,
    ROW_NUMBER() OVER (PARTITION BY base_code ORDER BY id) AS rn
  FROM generated
)
UPDATE shops s
SET code =
  CASE
    WHEN d.base_code = '_' OR d.base_code = '' THEN
      'SHOP_' || SUBSTRING(s.id::text, 1, 8)
    WHEN d.rn = 1 THEN
      d.base_code
    ELSE
      d.base_code || '_' || d.rn
  END
FROM dedup d
WHERE s.id = d.id;


ALTER TABLE products_aff
ADD COLUMN IF NOT EXISTS brand VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_products_aff_brand
ON products_aff(brand);


ALTER TABLE products_aff
ADD COLUMN external_link TEXT;

CREATE TABLE product_price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  product_id UUID NOT NULL REFERENCES products_aff(id) ON DELETE CASCADE,

  price_min NUMERIC(12, 2),
  price_max NUMERIC(12, 2),
  price_original NUMERIC(12, 2),

  rating NUMERIC(3, 2),
  sold_count INTEGER,

  crawled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

drop table if exists crawl_history_product cascade;

CREATE INDEX idx_price_history_product_id 
ON product_price_history(product_id);

CREATE INDEX idx_price_history_crawled_at 
ON product_price_history(crawled_at);

CREATE INDEX idx_price_history_product_time 
ON product_price_history(product_id, crawled_at DESC);