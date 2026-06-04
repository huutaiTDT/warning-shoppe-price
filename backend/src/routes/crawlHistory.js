/** @format */

import { Router } from "express";
import { db } from "../lib/db.js";
import { requireAuthUserId } from "../lib/requestAuth.js";

const router = Router();

const normalizeHistory = (item) => ({
  id: item.id,
  shopId: item.shop_id,
  shopName: item.shops?.name || "Không rõ shop",
  productCount: Number(item.product_count || 0),
  crawledCount: Number(item.crawled_count || 0),
  status: item.status || "pending",
  createdAt: item.started_at,
  completedAt: item.completed_at,
  errorMessage: item.error_message || "",
});

// GET: List crawl history with pagination
router.get("/", async (req, res) => {
  try {
    const { userId, type } = requireAuthUserId(req, res);
    if (!userId) return;

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 200);
    const status = (req.query.status || "").toString().trim();
    const shopId = (req.query.shopId || "").toString().trim();
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        ch.id, ch.shop_id, ch.product_count, ch.crawled_count, ch.status, 
        ch.started_at, ch.completed_at, ch.error_message, s.name as "shopName"
      FROM crawl_histories ch
      LEFT JOIN shops s ON ch.shop_id = s.id
    `;
    let countQuery = "SELECT COUNT(*) FROM crawl_histories ch";
    const params = [];
    let whereClauses = [];

    if (type !== "ADMIN") {
      whereClauses.push("ch.shop_id IN (SELECT shop_id FROM user_shop_mappings WHERE user_id = $" + (params.length + 1) + ")");
      params.push(userId);
    }

    if (status) {
      whereClauses.push("status = $" + (params.length + 1));
      params.push(status);
    }

    if (shopId) {
      whereClauses.push("shop_id = $" + (params.length + 1));
      params.push(shopId);
    }

    if (whereClauses.length > 0) {
      const whereString = whereClauses.join(" AND ");
      query += " WHERE " + whereString;
      countQuery += " WHERE " + whereString;
    }

    query +=
      " ORDER BY started_at DESC LIMIT $" +
      (params.length + 1) +
      " OFFSET $" +
      (params.length + 2);
    params.push(limit, offset);

    const { rows: history } = await db.query(query, params);
    const { rows: countRows } = await db.query(
      countQuery,
      params.slice(0, params.length - 2),
    );
    const count = countRows[0].count;

    if (!history) {
      return res.status(500).json({ error: "Failed to fetch history" });
    }

    const normalized = (history || []).map(normalizeHistory);

    res.json({
      history: normalized,
      total: count || 0,
      page,
      limit,
      pages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error("Error fetching crawl history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET: Crawl history detail
router.get("/:id", async (req, res) => {
  try {
    const { userId, type } = requireAuthUserId(req, res);
    if (!userId) return;

    const { id } = req.params;

    const { rows } = await db.query(
      `
      SELECT 
        ch.id, ch.shop_id, ch.product_count, ch.crawled_count, ch.status, 
        ch.started_at, ch.completed_at, ch.error_message, s.name as "shopName"
      FROM crawl_histories ch
      LEFT JOIN shops s ON ch.shop_id = s.id
      WHERE ch.id = $1
    `,
      [id],
    );
    const data = rows[0];

    if (!data) {
      return res.status(404).json({ error: "History not found" });
    }

    if (type !== "ADMIN") {
      const { rows: mapping } = await db.query(
        "SELECT 1 FROM user_shop_mappings WHERE user_id = $1 AND shop_id = $2 LIMIT 1",
        [userId, data.shop_id],
      );
      if (mapping.length === 0) {
        return res.status(403).json({ error: "Forbidden: You do not have access to this shop's history" });
      }
    }

    res.json(normalizeHistory(data));
  } catch (error) {
    console.error("Error fetching crawl history detail:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
