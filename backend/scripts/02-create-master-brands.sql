-- ========================
-- MASTER DATA: BRANDS
-- ========================
CREATE TABLE IF NOT EXISTS master_brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(100) UNIQUE,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_master_brands_name
ON master_brands(name);

CREATE INDEX IF NOT EXISTS idx_master_brands_active
ON master_brands(is_active);

CREATE INDEX IF NOT EXISTS idx_master_brands_created_at
ON master_brands(created_at);
