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
  // Create users table
  `CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // Create shops table
  `CREATE TABLE IF NOT EXISTS shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    platform VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // Create crawl_history table
  `CREATE TABLE IF NOT EXISTS crawl_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    product_count INTEGER DEFAULT 0,
    crawled_count INTEGER DEFAULT 0,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT
  )`,

  // Create products_aff table
  `CREATE TABLE IF NOT EXISTS products_aff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  )`,

  // Create indexes
  `CREATE INDEX IF NOT EXISTS idx_shops_user_id ON shops(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_crawl_history_shop_id ON crawl_history(shop_id)`,
  `CREATE INDEX IF NOT EXISTS idx_crawl_history_status ON crawl_history(status)`,
  `CREATE INDEX IF NOT EXISTS idx_products_aff_crawl_history_id ON products_aff(crawl_history_id)`,
  `CREATE INDEX IF NOT EXISTS idx_products_aff_name ON products_aff(name)`,
  `CREATE INDEX IF NOT EXISTS idx_products_aff_shop_platform ON products_aff(platform)`,
  `CREATE INDEX IF NOT EXISTS idx_crawl_history_shop_status ON crawl_history(shop_id, status)`,
];

async function runMigration() {
  try {
    console.log("Starting database migration...");

    for (const statement of statements) {
      const { error } = await supabase.rpc("exec_sql", {
        query: statement,
      });

      if (error) {
        console.error("Migration error:", error);
      } else {
        console.log("✓ Executed statement");
      }
    }

    // Insert default admin user
    const { error: insertError } = await supabase
      .from("users")
      .insert({
        username: "admin",
        email: "admin@example.com",
        password_hash:
          "$2b$10$YtDpjYaZPv5OB8uYe7U2.uKQ1JGFJYNtVGqaEkHgG2P0GZKw5k7gW",
      })
      .select();

    if (insertError && !insertError.message.includes("duplicate")) {
      console.error("Insert error:", insertError);
    } else {
      console.log("✓ Admin user created/verified");
    }

    console.log("Migration completed successfully!");
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

runMigration();
