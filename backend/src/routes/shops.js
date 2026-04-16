/** @format */

import { Router } from "express";
import { supabase } from "../lib/supabase.js";

const router = Router();

// Helper: Generate shop code from URL
const generateShopCode = (url) => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const shopSlug = pathname.replace(/^\//, "").split("?")[0];
    if (!shopSlug) return null;

    const code = shopSlug
      .split("/")[0]
      .toUpperCase()
      .replace(/-/g, "_")
      .replace(/[^A-Z0-9_]/g, "");

    return code || null;
  } catch {
    return null;
  }
};

// GET: List shops with pagination
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 1000);
    const search = (req.query.search || "").toString().trim();
    const offset = (page - 1) * limit;

    let query = supabase
      .from("shops")
      .select("*, shop_brands(brand_id, master_brands(*))", { count: "exact" })
      .order("created_at", { ascending: false });

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,url.ilike.%${search}%,code.ilike.%${search}%,platform.ilike.%${search}%`,
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
      .select("*, shop_brands(brand_id, master_brands(*))")
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
    const { name, url, platform, code, brand_ids } = req.body;

    if (!name || !url || !platform) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    let finalCode = code;
    if (!finalCode) {
      finalCode = generateShopCode(url);
    }

    const { data: shop, error } = await supabase
      .from("shops")
      .insert({
        name,
        url,
        platform,
        code: finalCode,
        is_sys_product_by_link: false,
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Add brands if provided
    if (Array.isArray(brand_ids) && brand_ids.length > 0) {
      const brandRecords = brand_ids.map((brand_id) => ({
        shop_id: shop.id,
        brand_id,
      }));

      const result = await supabase
        .from("shop_brands")
        .insert(brandRecords)
        .select();
      if (result.error) {
        console.error("Error associating brands:", result.error);
        res
          .status(500)
          .json({ error: "Shop updated but failed to associate brands" });
      }
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
    const { name, url, platform, code, brand_ids } = req.body;

    const { data: shop, error } = await supabase
      .from("shops")
      .update({
        name,
        url,
        platform,
        code: code || generateShopCode(url),
        updated_at: new Date(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Update brands if provided
    if (Array.isArray(brand_ids)) {
      // Delete existing brands
      await supabase.from("shop_brands").delete().eq("shop_id", id);

      // Add new brands
      if (brand_ids.length > 0) {
        const brandRecords = brand_ids.map((brand_id) => ({
          shop_id: id,
          brand_id,
        }));
        const result = await supabase
          .from("shop_brands")
          .insert(brandRecords)
          .select();
        if (result.error) {
          res
            .status(500)
            .json({ error: "Shop updated but failed to associate brands" });
        }
      }
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
