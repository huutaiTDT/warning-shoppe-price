/** @format */

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase credentials");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// POST: Trigger shop crawl via external API
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const par = await params;
    const shopId = par.id;
    console.log({
      par,
    });

    // Get shop details
    const { data: shop, error: shopError } = await supabase
      .from("shops")
      .select("*")
      .eq("id", shopId)
      .single();
    if (shopError || !shop) {
      return NextResponse.json(
        { error: "Không tìm thấy cửa hàng" },
        { status: 404 },
      );
    }
    const { data: totalProductInShop, error: countError } = await supabase
      .from("products_aff")
      .select("*", { count: "exact", head: true })
      .eq("shop_id", shopId)
      .single();
    const totalProducts = totalProductInShop?.count || 0;
    // 🔥 CHỈ UPDATE NẾU > 0
    if (totalProducts > 0) {
      const { data: updatedShop, error: updateError } = await supabase
        .from("shops")
        .update({ is_sys_product_by_link: true })
        .eq("id", shopId)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        shop: updatedShop,
        message: "✓ Crawl thành công & update trạng thái",
      });
    }

    // Call external crawl API
    const crawlResponse = await fetch(
      "https://tool-api.gitlabserver.id.vn/common/shop-crawl-data",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "*/*",
        },
        body: JSON.stringify([
          {
            url: shop.url,
            shopId: shopId,
          },
        ]),
      },
    );

    if (!crawlResponse.ok) {
      const errorText = await crawlResponse.text();
      console.error("Crawl API error response:", errorText);
      return NextResponse.json(
        { error: `Lỗi từ API: ${errorText || "Unknown error"}` },
        { status: 500 },
      );
    }

    // Try to parse JSON, but handle empty responses
    let crawlData = null;
    const responseText = await crawlResponse.text();
    if (responseText) {
      try {
        crawlData = JSON.parse(responseText);
      } catch (parseError) {
        console.error(
          "Failed to parse crawl API response:",
          parseError,
          responseText,
        );
      }
    } else {
      console.warn("Crawl API returned empty response");
    }

    // If crawl successful, update shop status
    const { data: updatedShop, error: updateError } = await supabase
      .from("shops")
      .update({ is_sys_product_by_link: true })
      .eq("id", shopId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      shop: updatedShop,
      crawlData: crawlData || {},
      message: "✓ Crawl thành công & update trạng thái",
    });
  } catch (error) {
    console.error("Error triggering shop crawl:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Lỗi khi gọi API crawl",
      },
      { status: 500 },
    );
  }
}
