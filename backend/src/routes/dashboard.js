/** @format */

import { Router } from "express";
import { supabase } from "../lib/supabase.js";

const router = Router();

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

router.get("/overview", async (req, res) => {
  try {
    const [
      shopsCountRes,
      productsCountRes,
      crawlCountRes,
      productsRes,
      crawlRes,
    ] = await Promise.all([
      supabase.from("shops").select("id", { count: "exact", head: true }),
      supabase
        .from("products_aff")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("crawl_history")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("products_aff")
        .select(
          "id, name, price_min, price_max, original_price, rating, shop_id, shops!shop_id(id, name, code, platform)",
        ),
      supabase
        .from("crawl_history")
        .select("id, status")
        .order("started_at", { ascending: false })
        .limit(500),
    ]);

    if (shopsCountRes.error || productsCountRes.error || crawlCountRes.error) {
      return res.status(500).json({
        error:
          shopsCountRes.error?.message ||
          productsCountRes.error?.message ||
          crawlCountRes.error?.message ||
          "Failed to fetch dashboard counts",
      });
    }

    if (productsRes.error) {
      return res.status(500).json({ error: productsRes.error.message });
    }

    if (crawlRes.error) {
      return res.status(500).json({ error: crawlRes.error.message });
    }

    const products = productsRes.data || [];
    const crawls = crawlRes.data || [];

    const underPriceProducts = [];
    const platformMap = new Map();
    const shopMap = new Map();

    let totalWithOriginalPrice = 0;
    let totalUnderPrice = 0;
    let totalAbovePrice = 0;

    for (const product of products) {
      const priceMin = toNumber(product.price_min, 0);
      const priceMax = toNumber(product.price_max, priceMin);
      const originalPrice = toNumber(product.original_price, 0);
      const avgPrice = (priceMin + priceMax) / 2;
      const hasOriginal = originalPrice > 0;
      const isUnder = hasOriginal && avgPrice < originalPrice;
      const isAbove = hasOriginal && avgPrice > originalPrice;

      if (hasOriginal) totalWithOriginalPrice += 1;
      if (isUnder) totalUnderPrice += 1;
      if (isAbove) totalAbovePrice += 1;

      const shopId = product.shop_id;
      const shopName = product.shops?.name || "Không rõ";
      const shopCode = product.shops?.code || null;
      const platform = product.shops?.platform || "other";

      if (!platformMap.has(platform)) {
        platformMap.set(platform, {
          platform,
          totalWithOriginal: 0,
          underCount: 0,
        });
      }

      if (hasOriginal) {
        platformMap.get(platform).totalWithOriginal += 1;
      }
      if (isUnder) {
        platformMap.get(platform).underCount += 1;
      }

      if (!shopMap.has(shopId)) {
        shopMap.set(shopId, {
          shopId,
          shopName,
          shopCode,
          platform,
          totalWithOriginal: 0,
          underCount: 0,
          aboveCount: 0,
        });
      }

      if (hasOriginal) {
        shopMap.get(shopId).totalWithOriginal += 1;
      }
      if (isUnder) {
        shopMap.get(shopId).underCount += 1;
      }
      if (isAbove) {
        shopMap.get(shopId).aboveCount += 1;
      }

      if (isUnder) {
        underPriceProducts.push({
          id: product.id,
          name: product.name || "",
          priceMin,
          priceMax,
          priceOriginal: originalPrice,
          rating: toNumber(product.rating, 0),
          shopId,
          shopName,
          shopCode,
          discountAmount: originalPrice - avgPrice,
        });
      }
    }

    const topShopsUnderPrice = Array.from(shopMap.values())
      .map((item) => ({
        ...item,
        underRate:
          item.totalWithOriginal > 0 ?
            item.underCount / item.totalWithOriginal
          : 0,
      }))
      .sort((a, b) => {
        if (b.underCount !== a.underCount) return b.underCount - a.underCount;
        return b.underRate - a.underRate;
      })
      .slice(0, 10);

    const platformUnderSummary = Array.from(platformMap.values())
      .map((item) => ({
        ...item,
        underRate:
          item.totalWithOriginal > 0 ?
            item.underCount / item.totalWithOriginal
          : 0,
      }))
      .sort((a, b) => b.underCount - a.underCount);

    const crawlStatusSummary = crawls.reduce(
      (acc, item) => {
        const status = (item.status || "pending").toLowerCase();
        if (status === "completed") acc.completed += 1;
        else if (status === "failed") acc.failed += 1;
        else acc.pending += 1;
        return acc;
      },
      { completed: 0, failed: 0, pending: 0 },
    );

    const underPricePreview = underPriceProducts
      .sort((a, b) => b.discountAmount - a.discountAmount)
      .slice(0, 12);

    res.json({
      stats: {
        totalShops: shopsCountRes.count || 0,
        totalProducts: productsCountRes.count || 0,
        totalCrawls: crawlCountRes.count || 0,
        totalWithOriginalPrice,
        totalUnderPrice,
        totalAbovePrice,
      },
      topShopsUnderPrice,
      platformUnderSummary,
      crawlStatusSummary,
      underPricePreview,
    });
  } catch (error) {
    console.error("Error fetching dashboard overview:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
