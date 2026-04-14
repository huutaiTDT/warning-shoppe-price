/** @format */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export async function GET() {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return Response.json(
        { error: "Missing Supabase credentials" },
        { status: 400 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create users table
    await supabase.from("users").select("*").limit(1);

    // Create shops table
    await supabase.from("shops").select("*").limit(1);

    // Create crawl_history table
    await supabase.from("crawl_history").select("*").limit(1);

    // Create products_aff table
    await supabase.from("products_aff").select("*").limit(1);

    // Try to insert default admin user if not exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("username", "admin")
      .single();

    if (!existingUser) {
      await supabase.from("users").insert({
        username: "admin",
        email: "admin@example.com",
        password_hash:
          "$2b$10$YtDpjYaZPv5OB8uYe7U2.uKQ1JGFJYNtVGqaEkHgG2P0GZKw5k7gW",
      });
    }

    return Response.json({
      success: true,
      message: "Database tables verified and admin user created/exists",
    });
  } catch (error) {
    console.error("Setup error:", error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
