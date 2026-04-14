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
    const overOriginal =
      searchParams.get("overOriginal") === "true" ||
      searchParams.get("underOriginal") === "true";
    const limit = 25;
    const offset = (page - 1) * limit;

    let query = supabase.from("products_aff").select(
      `
        *,
        crawl_history!inner (
          shop_id,
          shops!inner (id, name)
        )
      `,
      { count: "exact" },
    );

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    if (minPrice) {
      query = query.gte("priceMin", parseFloat(minPrice));
    }

    if (maxPrice) {
      query = query.lte("priceMax", parseFloat(maxPrice));
    }

    if (minRating) {
      query = query.gte("rating", parseFloat(minRating));
    }

    if (shopId) {
      query = query.eq("crawl_history.shop_id", shopId);
    }

    const sortedQuery = query.order("created_at", { ascending: false });
    const response =
      overOriginal ?
        await sortedQuery
      : await sortedQuery.range(offset, offset + limit - 1);

    const { data: products, error, count } = response;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const normalizedProducts = (products || []).map((product: any) => {
      const fallbackPrice = Number(product.price) || 0;
      const priceMin = Number(
        product.priceMin ?? product.price_min ?? fallbackPrice,
      );
      const priceMax = Number(
        product.priceMax ?? product.price_max ?? fallbackPrice,
      );
      const priceOriginal = Number(
        product.priceOriginal ??
          product.price_original ??
          product.original_price ??
          0,
      );
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
        shopId: product.crawl_history?.shop_id || null,
        shopName: product.crawl_history?.shops?.name || null,
      };
    });

    const filteredProducts =
      overOriginal ?
        normalizedProducts.filter((product: any) => product.isAboveOriginal)
      : normalizedProducts;

    const finalTotal = overOriginal ? filteredProducts?.length : count || 0;
    const finalProducts =
      overOriginal ?
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
