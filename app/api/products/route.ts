/** @format */

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase credentials");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const search = searchParams.get("search") || "";
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const minRating = searchParams.get("minRating");
    const shopId = searchParams.get("shop") || "";
    const underOriginal =
      searchParams.get("underOriginal") === "true" ||
      searchParams.get("overOriginal") === "true";
    const limit = 25;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("products_aff")
      .select("*, shops!shop_id(id, name)", { count: "exact" });

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    if (minPrice) {
      query = query.gte("price_min", parseFloat(minPrice));
    }

    if (maxPrice) {
      query = query.lte("price_max", parseFloat(maxPrice));
    }

    if (minRating) {
      query = query.gte("rating", parseFloat(minRating));
    }

    if (shopId) {
      query = query.eq("shop_id", shopId);
    }

    const sortedQuery = query.order("created_at", { ascending: false });
    const response =
      underOriginal ?
        await sortedQuery
      : await sortedQuery.range(offset, offset + limit - 1);

    const { data: products, error, count } = response;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const normalizedProducts = (products || []).map((product: any) => {
      const fallbackPrice = Number(product.price) || 0;
      const priceMin = Number(product.price_min ?? fallbackPrice);
      const priceMax = Number(product.price_max ?? fallbackPrice);
      const priceOriginal = Number(product.original_price ?? 0);
      const shopeeAvgPrice = (priceMin + priceMax) / 2;
      const priceDelta = shopeeAvgPrice - priceOriginal;
      const isAboveOriginal = priceOriginal > 0 && priceMin > priceOriginal;

      let priceTrend: "up" | "down" | "equal" = "equal";
      if (priceOriginal > 0) {
        if (priceMax < priceOriginal) priceTrend = "down";
        else if (priceMin > priceOriginal) priceTrend = "up";
      }

      return {
        ...product,
        priceMin,
        priceMax,
        priceOriginal,
        shopeeAvgPrice,
        priceDelta,
        priceTrend,
        isAboveOriginal,
        shopId: product.shop_id,
        shopName: product.shops?.name || null,
      };
    });

    const filteredProducts =
      underOriginal ?
        normalizedProducts.filter((product: any) => !product.isAboveOriginal)
      : normalizedProducts;

    const finalTotal = underOriginal ? filteredProducts?.length : count || 0;
    const finalProducts =
      underOriginal ?
        filteredProducts.slice(offset, offset + limit)
      : filteredProducts;

    return NextResponse.json({
      products: finalProducts,
      total: finalTotal,
      page,
      limit,
      pages: Math.ceil(finalTotal / limit),
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
