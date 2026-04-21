-- Add isWarning column to products table
ALTER TABLE products
ADD COLUMN is_warning BOOLEAN DEFAULT FALSE;

CREATE INDEX idx_products_is_warning ON products(is_warning);
