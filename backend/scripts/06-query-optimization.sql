


-- =========================================
-- QUERY OPTIMIZATION SCRIPT
-- Date: 2026-05-12
-- Purpose:
--   Add indexes to optimize frequently used queries
--   and improve DB performance.
-- =========================================

-- IMPORTANT:
-- pg_trgm extension should NOT be inside transaction
-- because if transaction aborts, extension creation also fails.

ROLLBACK;

-- =========================================
-- ENABLE EXTENSIONS
-- =========================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =========================================
-- START TRANSACTION
-- =========================================
BEGIN;

-- =========================================
-- USERS
-- =========================================
-- Optimizes login lookup by username
CREATE INDEX IF NOT EXISTS idx_users_username
    ON users(username);

-- =========================================
-- SHOPS
-- =========================================
-- Optimizes fuzzy search / ILIKE on shop names
CREATE INDEX IF NOT EXISTS idx_shops_name_trgm
    ON shops
    USING gin (name gin_trgm_ops);

-- =========================================
-- SHOP_PRODUCTS
-- =========================================

-- Optimizes filtering by shop + brand
CREATE INDEX IF NOT EXISTS idx_shop_products_shop_brand
    ON shop_products(shop_id, brand);


-- Optimizes fuzzy product name search
CREATE INDEX IF NOT EXISTS idx_shop_products_name_trgm
    ON shop_products
    USING gin (name gin_trgm_ops);

-- =========================================
-- PRODUCTS
-- =========================================

-- Optimizes filtering by brand
CREATE INDEX IF NOT EXISTS idx_products_brand_id
    ON products(brand_id);

-- Optimizes fuzzy search on product names
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
    ON products
    USING gin (name gin_trgm_ops);

-- =========================================
-- CRAWL_HISTORIES
-- =========================================

-- Optimizes filtering crawl history by shop
CREATE INDEX IF NOT EXISTS idx_crawl_histories_shop_id
    ON crawl_histories(shop_id);

-- =========================================
-- PRICE_HISTORIES
-- =========================================

-- Optimizes fetching latest price history
CREATE INDEX IF NOT EXISTS idx_price_histories_product_created
    ON price_histories(shop_product_id, crawled_at DESC);

-- =========================================
-- COMMIT
-- =========================================
COMMIT;