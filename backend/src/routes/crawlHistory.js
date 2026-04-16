/** @format */

import { Router } from "express";
import { supabase } from "../lib/supabase.js";

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
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 200);
    const status = (req.query.status || "").toString().trim();
    const shopId = (req.query.shopId || "").toString().trim();
    const offset = (page - 1) * limit;

    let query = supabase
      .from("crawl_history")
      .select(
        "id, shop_id, product_count, crawled_count, status, started_at, completed_at, error_message, shops:shop_id(id, name)",
        { count: "exact" },
      )
      .order("started_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    if (shopId) {
      query = query.eq("shop_id", shopId);
    }

    const {
      data: history,
      error,
      count,
    } = await query.range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: error.message });
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
    const { id } = req.params;

    const { data, error } = await supabase
      .from("crawl_history")
      .select(
        "id, shop_id, product_count, crawled_count, status, started_at, completed_at, error_message, shops:shop_id(id, name)",
      )
      .eq("id", id)
      .single();

    if (error) {
      return res.status(404).json({ error: error.message });
    }

    res.json(normalizeHistory(data));
  } catch (error) {
    console.error("Error fetching crawl history detail:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
