/** @format */

import axios from "axios";
import { Router } from "express";
import { db } from "../lib/db.js";
import { requireAuthUserId } from "../lib/requestAuth.js";

const router = Router();

// POST: Trigger shop crawl via external API
router.post("/:id/crawl", async (req, res) => {
  let crawlHistoryId = null;

  try {
    const { userId, type } = requireAuthUserId(req, res);
    if (!userId) return;

    const shopId = req.params.id;

    if (type !== "ADMIN") {
      const { rows: mapping } = await db.query(
        "SELECT 1 FROM user_shop_mappings WHERE user_id = $1 AND shop_id = $2 LIMIT 1",
        [userId, shopId],
      );
      if (mapping.length === 0) {
        return res.status(403).json({ error: "Forbidden: You do not have access to this shop" });
      }
    }

    const { rows: shopRows } = await db.query(
      "SELECT * FROM shops WHERE id = $1",
      [shopId],
    );
    const shop = shopRows[0];

    if (!shop) {
      return res.status(404).json({ error: "Không tìm thấy cửa hàng" });
    }

    const { rows: historyRows } = await db.query(
      "INSERT INTO crawl_histories (shop_id, status, started_at) VALUES ($1, 'pending', NOW()) RETURNING *",
      [shopId],
    );
    const createdHistory = historyRows[0];

    if (createdHistory) {
      crawlHistoryId = createdHistory.id;
    }

    const { rows: countRows } = await db.query(
      "SELECT COUNT(*) FROM shop_products WHERE shop_id = $1",
      [shopId],
    );
    const count = countRows[0].count;

    if (count && count > 0) {
      const { rows: updatedShopRows } = await db.query(
        "UPDATE shops SET is_sys_product_by_link = true WHERE id = $1 RETURNING *",
        [shopId],
      );
      const updatedShop = updatedShopRows[0];

      if (!updatedShop) {
        return res.status(500).json({ error: "Failed to update shop" });
      }

      if (crawlHistoryId) {
        await db.query(
          "UPDATE crawl_histories SET status = 'completed', completed_at = NOW() WHERE id = $1",
          [crawlHistoryId],
        );
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
      "https://tool-api.gitlabserver.id.vn/common/shop-crawl-data" ||
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
        await db.query(
          "UPDATE crawl_histories SET status = 'failed', completed_at = NOW(), error_message = $1 WHERE id = $2",
          [errorMessage, crawlHistoryId],
        );
      }

      console.error("Crawl API error:", errorMessage);
      return res.status(500).json({ error: `Lỗi từ API: ${errorMessage}` });
    }

    const { rows: updatedShopRows } = await db.query(
      "UPDATE shops SET is_sys_product_by_link = true WHERE id = $1 RETURNING *",
      [shopId],
    );
    const updatedShop = updatedShopRows[0];

    if (!updatedShop) {
      return res.status(500).json({ error: "Failed to update shop" });
    }

    const { rows: crawledCountRows } = await db.query(
      "SELECT COUNT(*) FROM shop_products WHERE shop_id = $1",
      [shopId],
    );
    const crawledCount = crawledCountRows[0].count;

    if (crawlHistoryId) {
      await db.query(
        "UPDATE crawl_histories SET product_count = $1, crawled_count = $1, status = 'completed', completed_at = NOW(), error_message = NULL WHERE id = $2",
        [crawledCount || 0, crawlHistoryId],
      );
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
      await db.query(
        "UPDATE crawl_histories SET status = 'failed', completed_at = NOW(), error_message = $1 WHERE id = $2",
        [errorMessage, crawlHistoryId],
      );
    }

    res.status(500).json({ error: errorMessage });
  }
});

export default router;
