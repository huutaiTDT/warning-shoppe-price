/** @format */

import axios from "axios";
import { Router } from "express";
import { requireAuthUserId } from "../lib/requestAuth.js";
import { supabase } from "../lib/supabase.js";

const router = Router();

// POST: Trigger shop crawl via external API
router.post("/:id/crawl", async (req, res) => {
  let crawlHistoryId = null;

  try {
    const { userId } = requireAuthUserId(req, res);
    if (!userId) return;

    const shopId = req.params.id;

    // Get shop details
    const { data: shop, error: shopError } = await supabase
      .from("shops")
      .select("*")
      .eq("id", shopId)
      .single();

    if (shopError || !shop) {
      return res.status(404).json({ error: "Không tìm thấy cửa hàng" });
    }

    // Create crawl history record when crawl starts.
    const { data: createdHistory, error: historyCreateError } = await supabase
      .from("crawl_histories")
      .insert({
        shop_id: shopId,
        status: "pending",
        started_at: new Date(),
      })
      .select()
      .single();

    if (!historyCreateError) {
      crawlHistoryId = createdHistory?.id || null;
    }

    // Check if products already exist
    const { count } = await supabase
      .from("shop_products")
      .select("*", { count: "exact", head: true })
      .eq("shop_id", shopId);

    if (count && count > 0) {
      const { data: updatedShop, error: updateError } = await supabase
        .from("shops")
        .update({ is_sys_product_by_link: true })
        .eq("id", shopId)
        .select()
        .single();

      if (updateError) {
        return res.status(500).json({ error: updateError.message });
      }

      if (crawlHistoryId) {
        await supabase
          .from("crawl_histories")
          .update({
            product_count: count || 0,
            crawled_count: count || 0,
            status: "completed",
            completed_at: new Date(),
            error_message: null,
          })
          .eq("id", crawlHistoryId);
      }

      return res.json({
        success: true,
        shop: updatedShop,
        crawlHistoryId,
        message: "✓ Crawl thành công & update trạng thái",
      });
    }

    // Call external crawl API
    const crawlApiUrl =
      process.env.EXTERNAL_CRAWL_API_URL ||
      "https://tool-api.gitlabserver.id.vn/common/shop-crawl-data";
    console.log("Crawl API URL:", crawlApiUrl);
    if (!crawlApiUrl) {
      return res
        .status(500)
        .json({ error: "URL API crawl chưa được cấu hình" });
    }
    let crawlData = null;
    try {
      const crawlResponse = await axios.post(
        crawlApiUrl,
        [
          {
            url: shop.url,
            shopId: shopId,
          },
        ],
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "*/*",
          },
        },
      );

      crawlData = crawlResponse.data;
    } catch (crawlError) {
      const errorMessage =
        crawlError.response?.data?.message ||
        crawlError.message ||
        "Unknown error from crawl API";

      if (crawlHistoryId) {
        await supabase
          .from("crawl_histories")
          .update({
            status: "failed",
            completed_at: new Date(),
            error_message: errorMessage,
          })
          .eq("id", crawlHistoryId);
      }

      console.error("Crawl API error:", errorMessage);
      return res.status(500).json({ error: `Lỗi từ API: ${errorMessage}` });
    }

    // Update shop status
    const { data: updatedShop, error: updateError } = await supabase
      .from("shops")
      .update({ is_sys_product_by_link: true })
      .eq("id", shopId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    const { count: crawledCount } = await supabase
      .from("shop_products")
      .select("*", { count: "exact", head: true })
      .eq("shop_id", shopId);

    if (crawlHistoryId) {
      await supabase
        .from("crawl_histories")
        .update({
          product_count: crawledCount || 0,
          crawled_count: crawledCount || 0,
          status: "completed",
          completed_at: new Date(),
          error_message: null,
        })
        .eq("id", crawlHistoryId);
    }

    res.json({
      success: true,
      shop: updatedShop,
      crawlData: crawlData || {},
      crawlHistoryId,
      message: "✓ Crawl thành công & update trạng thái",
    });
  } catch (error) {
    console.error("Error triggering shop crawl:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Lỗi khi gọi API crawl";

    if (crawlHistoryId) {
      await supabase
        .from("crawl_histories")
        .update({
          status: "failed",
          completed_at: new Date(),
          error_message: errorMessage,
        })
        .eq("id", crawlHistoryId);
    }

    res.status(500).json({ error: errorMessage });
  }
});

export default router;
