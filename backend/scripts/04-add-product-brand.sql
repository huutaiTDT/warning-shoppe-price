-- ========================
-- MIGRATION 04: PRODUCT BRAND COLUMN
-- ========================

ALTER TABLE products_aff
ADD COLUMN IF NOT EXISTS brand VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_products_aff_brand
ON products_aff(brand);

-- Optional backfill for legacy rows from raw JSON or title fields can be added here later.
ALTER TABLE products
ADD COLUMN external_link TEXT;

CREATE TABLE product_price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

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