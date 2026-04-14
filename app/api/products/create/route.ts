/** @format */

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase credentials");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// POST: Create new product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      priceMin,
      priceMax,
      price,
      rating,
      sold,
      image,
      aff_link,
      original_price,
      crawl_history_id,
      category,
      description,
      external_id,
      shop_id,
    } = body;

    if (!name || !priceMin || !priceMax) {
      return NextResponse.json(
        { error: "Vui lòng nhập tên sản phẩm, giá tối thiểu và tối đa" },
        { status: 400 },
      );
    }

    if (!shop_id) {
      return NextResponse.json(
        { error: "Vui lòng chọn cửa hàng" },
        { status: 400 },
      );
    }

    const { data: product, error } = await supabase
      .from("products_aff")
      .insert({
        shop_id,
        name,
        price_min: priceMin,
        price_max: priceMax,
        price: price || (priceMin + priceMax) / 2,
        rating: rating || 0,
        sold: sold || 0,
        image,
        aff_link,
        original_price: original_price || 0,
        crawl_history_id,
        category,
        description,
        external_id,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update shop flag: set is_sys_product_by_link = true
    if (external_id) {
      await supabase
        .from("shops")
        .update({ is_sys_product_by_link: true })
        .eq("id", shop_id);
    }

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Lỗi khi tạo sản phẩm" },
      { status: 500 },
    );
  }
}
