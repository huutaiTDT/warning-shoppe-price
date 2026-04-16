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
