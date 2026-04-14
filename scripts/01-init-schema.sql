-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shops table
CREATE TABLE IF NOT EXISTS shops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  platform VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crawl history table
CREATE TABLE IF NOT EXISTS crawl_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  product_count INTEGER DEFAULT 0,
  crawled_count INTEGER DEFAULT 0,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT
);

-- Products affiliate table
CREATE TABLE IF NOT EXISTS products_aff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  index INTEGER,
  crawl_history_id UUID NOT NULL REFERENCES crawl_history(id) ON DELETE CASCADE,
  external_id VARCHAR(255),
  name VARCHAR(500) NOT NULL,
  original_price DECIMAL(10, 2),
  price DECIMAL(10, 2) NOT NULL,
  discount INTEGER DEFAULT 0,
  rating DECIMAL(3, 1) DEFAULT 0,
  sold INTEGER DEFAULT 0,
  sold_text VARCHAR(255),
  aff_link TEXT,
  aff_info JSONB,
  description TEXT,
  url TEXT,
  platform VARCHAR(50),
  image TEXT,
  gallery JSONB,
  raw JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE products_aff
ADD COLUMN price_min DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN price_max DECIMAL(10, 2) DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_crawl_history_shop_id ON crawl_history(shop_id);
CREATE INDEX IF NOT EXISTS idx_crawl_history_status ON crawl_history(status);
CREATE INDEX IF NOT EXISTS idx_products_aff_crawl_history_id ON products_aff(crawl_history_id);
CREATE INDEX IF NOT EXISTS idx_products_aff_name ON products_aff(name);
CREATE INDEX IF NOT EXISTS idx_products_aff_shop_platform ON products_aff(platform);
CREATE INDEX IF NOT EXISTS idx_crawl_history_shop_status ON crawl_history(shop_id, status);

-- Insert default admin user (password: 123123, hashed with bcrypt)
INSERT INTO users (username, email, password_hash)
VALUES ('admin', 'admin@example.com', '$2b$10$YtDpjYaZPv5OB8uYe7U2.uKQ1JGFJYNtVGqaEkHgG2P0GZKw5k7gW')
ON CONFLICT (username) DO NOTHING;
