/** @format */

import { Router } from "express";
import { getAuthContext, requireAuthUserId } from "../lib/requestAuth.js";
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
    const { userId, type } = requireAuthUserId(req, res);
    if (!userId) return;

    const auth = getAuthContext(req);
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 1000);
    const search = (req.query.search || "").toString().trim();
    const offset = (page - 1) * limit;

    let query = supabase
      .from("shops")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    // STAFF: Only show assigned shops
    // if (auth?.type === "STAFF") {
    //   const { data: assigned } = await supabase
    //     .from("shop_")
    //     .select("shop_id")
    //     .eq("user_id", userId);
    const assigned = [];
    if (assigned.length > 0) {
      const shopIds = (assigned || []).map((a) => a.shop_id);
      if (shopIds.length === 0) {
        return res.json({
          shops: [],
          total: 0,
          page,
          limit,
          pages: 0,
        });
      }
      query = query.in("id", shopIds);
    }

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,url.ilike.%${search}%,code.ilike.%${search}%,platform.ilike.%${search}%`,
      );
    }
    if (type != "ADMIN") {
      query.eq("owner_id", userId);
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
    const { userId, type } = requireAuthUserId(req, res);
    if (!userId) return;

    const { id } = req.params;

    const query = supabase.from("shops").select("*").eq("id", id);

    if (type != "ADMIN") {
      query.eq("owner_id", userId);
    }
    const { data: shop, error } = await query.single();

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
    const { userId } = requireAuthUserId(req, res);
    if (!userId) return;

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
        owner_id: userId,
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
    const { userId } = requireAuthUserId(req, res);
    if (!userId) return;

    const { id } = req.params;
    const { name, url, platform, code, brand_ids } = req.body;

    const { data: shop, error } = await supabase
      .from("shops")
      .update({
        name,
        url,
        platform,
        code: code || generateShopCode(url),
      })
      .eq("id", id)
      .eq("owner_id", userId)
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
    const { userId } = requireAuthUserId(req, res);
    if (!userId) return;

    const { id } = req.params;

    const { error } = await supabase
      .from("shops")
      .delete()
      .eq("id", id)
      .eq("owner_id", userId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting shop:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET: Get shop products with pagination
router.get("/:id/products", async (req, res) => {
  try {
    const { userId } = requireAuthUserId(req, res);
    if (!userId) return;

    const { id } = req.params;
    const countOnly = req.query.count === "true";
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 200);
    const offset = (page - 1) * limit;

    const { data: ownedShop, error: shopError } = await supabase
      .from("shops")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (countOnly) {
      const { count, error } = await supabase
        .from("shop_products")
        .select("*", { count: "exact", head: true })
        .eq("shop_id", id);

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.json({ count: count || 0 });
    }

    const {
      data: products,
      error,
      count,
    } = await supabase
      .from("shop_products")
      .select("*", { count: "exact" })
      .eq("shop_id", id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      products: products || [],
      total: count || 0,
      page,
      limit,
      pages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error("Error fetching shop products:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST: Reset product status
router.post("/:id/reset-product-status", async (req, res) => {
  try {
    const { userId } = requireAuthUserId(req, res);
    if (!userId) return;

    const { id } = req.params;

    const { data: shop, error } = await supabase
      .from("shops")
      .update({ is_sys_product_by_link: false })
      .eq("id", id)
      .eq("owner_id", userId)
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
