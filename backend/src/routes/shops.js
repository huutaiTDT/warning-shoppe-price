/** @format */

import { Router } from "express";
import { supabase } from "../lib/supabase.js";

const router = Router();

// GET: List shops with pagination
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 1000);
    const search = (req.query.search || "").toString().trim();
    const offset = (page - 1) * limit;

    let query = supabase
      .from("shops")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,url.ilike.%${search}%,platform.ilike.%${search}%`,
      );
    }

    const {
      data: shops,
      error,
      count,
    } = await query.range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      shops: shops || [],
      total: count || 0,
      page,
      limit,
      pages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error("Error fetching shops:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET: Shop detail
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data: shop, error } = await supabase
      .from("shops")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return res.status(404).json({ error: error.message });
    }

    res.json(shop);
  } catch (error) {
    console.error("Error fetching shop detail:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST: Create shop
router.post("/", async (req, res) => {
  try {
    const { name, url, platform } = req.body;

    if (!name || !url || !platform) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const { data: shop, error } = await supabase
      .from("shops")
      .insert({
        name,
        url,
        platform,
        is_sys_product_by_link: false,
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json(shop);
  } catch (error) {
    console.error("Error creating shop:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT: Update shop
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, url, platform } = req.body;

    const { data: shop, error } = await supabase
      .from("shops")
      .update({ name, url, platform, updated_at: new Date() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(shop);
  } catch (error) {
    console.error("Error updating shop:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE: Delete shop
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase.from("shops").delete().eq("id", id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting shop:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET: Get shop products
router.get("/:id/products", async (req, res) => {
  try {
    const { id } = req.params;
    const countOnly = req.query.count === "true";

    if (countOnly) {
      const { count, error } = await supabase
        .from("products_aff")
        .select("*", { count: "exact", head: true })
        .eq("shop_id", id);

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.json({ count: count || 0 });
    }

    const { data: products, error } = await supabase
      .from("products_aff")
      .select("*")
      .eq("shop_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ products: products || [] });
  } catch (error) {
    console.error("Error fetching shop products:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST: Reset product status
router.post("/:id/reset-product-status", async (req, res) => {
  try {
    const { id } = req.params;

    const { data: shop, error } = await supabase
      .from("shops")
      .update({ is_sys_product_by_link: false })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, shop });
  } catch (error) {
    console.error("Error resetting product status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
