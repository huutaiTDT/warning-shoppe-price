-- Migration: Add is_sys_product_by_link column to shops table
-- Date: 2026-04-20
-- Purpose: Track whether shop products are automatically crawled by link

-- Add column to shops table
ALTER TABLE shops
ADD COLUMN IF NOT EXISTS is_sys_product_by_link BOOLEAN DEFAULT FALSE;

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_shops_is_sys_product_by_link 
ON shops(is_sys_product_by_link);

-- Update existing rows to have default value
UPDATE shops 
SET is_sys_product_by_link = FALSE 
WHERE is_sys_product_by_link IS NULL;

-- Make column NOT NULL
ALTER TABLE shops
ALTER COLUMN is_sys_product_by_link SET NOT NULL;

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'shops' AND column_name = 'is_sys_product_by_link';


ALTER TABLE shop_products
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS platform VARCHAR(100),
ADD COLUMN IF NOT EXISTS image TEXT,
ADD COLUMN IF NOT EXISTS gallery JSONB DEFAULT '[]'::jsonb,

ADD COLUMN IF NOT EXISTS discount NUMERIC(5,2) DEFAULT 0,

ADD COLUMN IF NOT EXISTS sold_text VARCHAR(100),

ADD COLUMN IF NOT EXISTS external_link TEXT,

ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE crawl_histories
ADD COLUMN IF NOT EXISTS error_message TEXT;

ALTER TABLE brands
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL;