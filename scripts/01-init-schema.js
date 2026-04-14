/** @format */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const statements = [
  // ========================
  // USERS
  // ========================
  `CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // ========================
  // SHOPS
  // ========================
  `CREATE TABLE IF NOT EXISTS shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    platform VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // ========================
  // CRAWL HISTORY
  // ========================
  `CREATE TABLE IF NOT EXISTS crawl_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT
  )`,

  // ========================
  // PRODUCTS MASTER
  // ========================
  `CREATE TABLE IF NOT EXISTS products_aff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

    external_id VARCHAR(255),

    name VARCHAR(500) NOT NULL,
    description TEXT,

    url TEXT,
    platform VARCHAR(50),

    image TEXT,
    gallery JSONB,

    aff_link TEXT,
    aff_info JSONB,

    raw JSONB,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_shop_external UNIQUE (shop_id, external_id)
  )`,

  // ========================
  // CRAWL SNAPSHOT
  // ========================
  `CREATE TABLE IF NOT EXISTS crawl_history_product (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    crawl_history_id UUID NOT NULL REFERENCES crawl_history(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products_aff(id) ON DELETE CASCADE,

    external_id VARCHAR(255),
    index INTEGER,

    price DECIMAL(10,2),
    original_price DECIMAL(10,2),
    price_min DECIMAL(10,2),
    price_max DECIMAL(10,2),

    discount INTEGER DEFAULT 0,
    rating DECIMAL(3,1) DEFAULT 0,

    sold INTEGER DEFAULT 0,
    sold_text VARCHAR(255),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_crawl_product UNIQUE (crawl_history_id, external_id)
  )`,

  // ========================
  // INDEXES
  // ========================

  // shops
  `CREATE INDEX IF NOT EXISTS idx_shops_user_id ON shops(user_id)`,

  // crawl_history
  `CREATE INDEX IF NOT EXISTS idx_crawl_history_shop_id ON crawl_history(shop_id)`,
  `CREATE INDEX IF NOT EXISTS idx_crawl_history_status ON crawl_history(status)`,
  `CREATE INDEX IF NOT EXISTS idx_crawl_history_shop_status ON crawl_history(shop_id, status)`,

  // products_aff
  `CREATE INDEX IF NOT EXISTS idx_products_aff_shop_id ON products_aff(shop_id)`,
  `CREATE INDEX IF NOT EXISTS idx_products_aff_name ON products_aff(name)`,
  `CREATE INDEX IF NOT EXISTS idx_products_aff_external_id ON products_aff(external_id)`,
  `CREATE INDEX IF NOT EXISTS idx_products_aff_shop_external ON products_aff(shop_id, external_id)`,

  // crawl_history_product
  `CREATE INDEX IF NOT EXISTS idx_chp_crawl_history ON crawl_history_product(crawl_history_id)`,
  `CREATE INDEX IF NOT EXISTS idx_chp_product ON crawl_history_product(product_id)`,
  `CREATE INDEX IF NOT EXISTS idx_chp_external_id ON crawl_history_product(external_id)`,
  `CREATE INDEX IF NOT EXISTS idx_chp_price_range ON crawl_history_product(price_min, price_max)`,
];

async function runMigration() {
  try {
    console.log("🚀 Starting database migration...");

    for (const statement of statements) {
      const { error } = await supabase.rpc("exec_sql", {
        query: statement,
      });

      if (error) {
        console.error("❌ Migration error:", error.message);
      } else {
        console.log("✓ Executed");
      }
    }

    // ========================
    // DEFAULT ADMIN
    // ========================
    const { error: insertError } = await supabase.from("users").insert({
      username: "admin",
      email: "admin@example.com",
      password_hash:
        "$2b$10$YtDpjYaZPv5OB8uYe7U2.uKQ1JGFJYNtVGqaEkHgG2P0GZKw5k7gW",
    });

    if (insertError && !insertError.message.includes("duplicate")) {
      console.error("❌ Insert error:", insertError.message);
    } else {
      console.log("✓ Admin ready");
    }

    console.log("✅ Migration completed!");
  } catch (err) {
    console.error("🔥 Fatal error:", err);
    process.exit(1);
  }
}

runMigration();
