/** @format */

import axios from "axios";
import { Router } from "express";
import { supabase } from "../lib/supabase.js";

const router = Router();

// POST: Trigger shop crawl via external API
router.post("/:id/crawl", async (req, res) => {
  try {
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

    // Check if products already exist
    const { count } = await supabase
      .from("products_aff")
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

      return res.json({
        success: true,
        shop: updatedShop,
        message: "✓ Crawl thành công & update trạng thái",
      });
    }

    // Call external crawl API
    let crawlData = null;
    try {
      const crawlResponse = await axios.post(
        process.env.EXTERNAL_CRAWL_API_URL ||
          "http://localhost:3000/common/shop-crawl-data",
        {
          url: shop.url,
          shopId: shopId,
        },
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

    res.json({
      success: true,
      shop: updatedShop,
      crawlData: crawlData || {},
      message: "✓ Crawl thành công & update trạng thái",
    });
  } catch (error) {
    console.error("Error triggering shop crawl:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Lỗi khi gọi API crawl";
    res.status(500).json({ error: errorMessage });
  }
});

export default router;
