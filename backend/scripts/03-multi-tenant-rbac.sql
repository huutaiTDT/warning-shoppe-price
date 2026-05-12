-- ========================
-- MULTI-TENANT RBAC MIGRATION
-- ========================

-- Ensure account_brand_permissions table exists for user-to-brand assignments
CREATE TABLE IF NOT EXISTS account_brand_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_account_brand UNIQUE (user_id, brand_id)
);

CREATE INDEX IF NOT EXISTS idx_account_brand_user ON account_brand_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_account_brand_brand ON account_brand_permissions(brand_id);

-- Update products table to use brand_id (if not already done)
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE SET NULL;

-- Create tenant_access_logs for audit trail
CREATE TABLE IF NOT EXISTS tenant_access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(50) NOT NULL, -- 'READ', 'CREATE', 'UPDATE', 'DELETE'
  resource_type VARCHAR(50) NOT NULL, -- 'PRODUCT', 'SHOP', 'BRAND_ASSIGNMENT'
  resource_id UUID,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_access_logs_user ON tenant_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_action ON tenant_access_logs(action);
CREATE INDEX IF NOT EXISTS idx_access_logs_created ON tenant_access_logs(created_at);

-- Update existing products to link to brands if they have brand field
-- This is a data migration - adjust brand field matching logic as needed
UPDATE products 
SET brand_id = b.id 
FROM products p 
LEFT JOIN brands b ON LOWER(b.name) = LOWER(p.brand_id::text)
WHERE products.id = p.id AND products.brand_id IS NULL;

-- Ensure indices for multi-tenant queries
CREATE INDEX IF NOT EXISTS idx_products_owner_brand ON products(owner_id, brand_id);
CREATE INDEX IF NOT EXISTS idx_shop_products_brand ON shop_products(brand);

-- Add RLS-style tenant isolation helpers (optional - for audit)
CREATE OR REPLACE FUNCTION can_access_product(
  p_user_id UUID,
  p_product_owner_id UUID,
  p_product_brand_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_has_brand_permission BOOLEAN;
BEGIN
  -- Check if user is the owner
  IF p_user_id = p_product_owner_id THEN
    RETURN TRUE;
  END IF;

  -- Check if user has brand permission
  IF p_product_brand_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM account_brand_permissions
      WHERE user_id = p_user_id AND brand_id = p_product_brand_id
    ) INTO v_has_brand_permission;
    RETURN v_has_brand_permission;
  END IF;

  -- Check if user is ADMIN
  SELECT type = 'ADMIN' INTO v_has_brand_permission
  FROM users WHERE id = p_user_id;
  
  RETURN COALESCE(v_has_brand_permission, FALSE);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create helper function to get user's accessible brands
CREATE OR REPLACE FUNCTION get_user_brands(p_user_id UUID) 
RETURNS TABLE(brand_id UUID, brand_name VARCHAR) AS $$
BEGIN
  RETURN QUERY
  SELECT b.id, b.name
  FROM brands b
  INNER JOIN account_brand_permissions abp ON b.id = abp.brand_id
  WHERE abp.user_id = p_user_id AND b.is_active = TRUE
  UNION ALL
  SELECT b.id, b.name
  FROM brands b
  WHERE EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND type = 'ADMIN')
    AND b.is_active = TRUE;
END;
$$ LANGUAGE plpgsql STABLE;

-- Insert default brands if not exists
INSERT INTO brands (name, code, is_active) VALUES
  ('Electronics', 'ELECTRONICS', TRUE),
  ('Fashion', 'FASHION', TRUE),
  ('Home & Garden', 'HOME_GARDEN', TRUE),
  ('Sports & Outdoors', 'SPORTS', TRUE),
  ('Books & Media', 'BOOKS', TRUE)
ON CONFLICT (name) DO NOTHING;
