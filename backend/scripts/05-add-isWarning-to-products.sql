-- Add isWarning column to products table
ALTER TABLE products
ADD COLUMN is_warning BOOLEAN DEFAULT FALSE;

CREATE INDEX idx_products_is_warning ON products(is_warning);

CREATE TABLE agency_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  normalized_name TEXT
);

ALTER TABLE shop_products add column normalized_name TEXT;

CREATE TABLE product_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_product_id UUID REFERENCES agency_products(id),
  shop_product_id UUID REFERENCES shop_products(id),
  confidence_score FLOAT,
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE (agency_product_id, shop_product_id)
);

CREATE INDEX idx_agency_name_trgm
ON agency_products USING gin (normalized_name gin_trgm_ops);

CREATE INDEX idx_shop_name_trgm
ON shop_products USING gin (normalized_name gin_trgm_ops);
