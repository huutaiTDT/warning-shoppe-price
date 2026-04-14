/** @format */

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase credentials");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET: Get products for a shop (with optional count)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { searchParams } = new URL(request.url);
    const countOnly = searchParams.get("count") === "true";

    const shopId = params.id;

    if (countOnly) {
      // Just return count
      const { data, error, count } = await supabase
        .from("products_aff")
        .select("*", { count: "exact", head: true })
        .eq("shop_id", shopId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ count: count || 0 });
    }

    // Return full products
    const { data: products, error } = await supabase
      .from("products_aff")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ products: products || [] });
  } catch (error) {
    console.error("Error fetching shop products:", error);
    return NextResponse.json(
      { error: "Lỗi khi tải sản phẩm" },
      { status: 500 },
    );
  }
}
