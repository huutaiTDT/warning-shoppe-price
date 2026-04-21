/** @format */

import ExcelJS from "exceljs";
import { Router } from "express";
import multer from "multer";
import { getAuthContext, requireAuthUserId } from "../lib/requestAuth.js";
import { supabase } from "../lib/supabase.js";
import {
  canAccessProduct,
  logTenantAccess,
} from "../middleware/tenantContext.js";
import { scanAndUpdateWarningProduct } from "../services/product.service.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const normalizeStringArray = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => (item || "").toString().trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

router.get("/", async (req, res) => {
  try {
    const { userId } = requireAuthUserId(req, res);
    if (!userId) return;

    const auth = getAuthContext(req);

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 200);
    const search = (req.query.search || "").toString().trim();
    const offset = (page - 1) * limit;

    // ✅ filter params
    const brandId = req.query.brand_id;
    const models = normalizeStringArray(req.query.models);
    const variants = normalizeStringArray(req.query.variants);

    // ========================
    // GET BRAND PERMISSION
    // ========================
    const { data: brandPermissions, error: brandError } = await supabase
      .from("account_brand_permissions")
      .select("brand_id")
      .eq("user_id", userId);

    if (brandError) {
      return res.status(500).json({ error: brandError.message });
    }

    const userBrandIds = (brandPermissions || []).map((p) => p.brand_id);
    const isAdmin = auth?.type === "ADMIN";

    // ========================
    // BASE QUERY
    // ========================
    let query = supabase
      .from("products")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    // ========================
    // SEARCH
    // ========================
    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    // ========================
    // FILTERS (🔥 FIX CHÍNH)
    // ========================
    if (brandId) {
      query = query.eq("brand_id", brandId);
    }
    if (models.length > 0) {
      const modelConditions = models
        .map((m) => `models.cs.{${m}}`) // fallback exact
        .join(",");

      const modelLikeConditions = models
        .map((m) => `name.ilike.%${m}%`) // 🔥 fuzzy theo name
        .join(",");

      query = query.or(`${modelConditions},${modelLikeConditions}`);
    }

    // ========================
    // FUZZY FILTER VARIANTS
    // ========================
    if (variants.length > 0) {
      const variantConditions = variants
        .map((v) => `variants.cs.{${v}}`)
        .join(",");

      const variantLikeConditions = variants
        .map((v) => `name.ilike.%${v}%`)
        .join(",");

      query = query.or(`${variantConditions},${variantLikeConditions}`);
    }

    // ========================
    // MULTI-TENANT
    // ========================
    if (!isAdmin) {
      const ownerFilter = `owner_id.eq.${userId}`;

      if (userBrandIds.length > 0) {
        query = query.or(
          `${ownerFilter},brand_id.in.(${userBrandIds.join(",")})`,
        );
      } else {
        query = query.eq("owner_id", userId);
      }
    }

    // ========================
    // EXECUTE
    // ========================
    const { data, error, count } = await query.range(
      offset,
      offset + limit - 1,
    );

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    await logTenantAccess(userId, "READ", "PRODUCT", null, {
      page,
      limit,
      search_term: search || null,
      filters: {
        brandId,
        models,
        variants,
      },
      result_count: data?.length || 0,
    });

    res.json({
      items: data || [],
      total: count || 0,
      page,
      limit,
      pages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error("Error listing products:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { userId } = requireAuthUserId(req, res);
    if (!userId) return;

    const auth = getAuthContext(req);
    const { id } = req.params;

    const { data: product, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Check access control
    const hasAccess = await canAccessProduct(
      userId,
      product.owner_id,
      product.brand_id,
    );
    if (!hasAccess) {
      return res
        .status(403)
        .json({ error: "Forbidden - no access to this product" });
    }

    await logTenantAccess(userId, "READ", "PRODUCT", id);

    res.json(product);
  } catch (error) {
    console.error("Error getting product:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { userId } = requireAuthUserId(req, res);
    if (!userId) return;

    const name = (req.body?.name || "").toString().trim();
    const brand_id = (req.body?.brand_id || "").toString().trim() || null;
    const is_active = req.body?.is_active !== false; // Default to true

    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }

    // Validate brand_id if provided
    if (brand_id) {
      const { data: brand, error: brandError } = await supabase
        .from("brands")
        .select("id")
        .eq("id", brand_id)
        .single();

      if (brandError || !brand) {
        return res.status(400).json({ error: "Invalid brand_id" });
      }
    }

    const { data, error } = await supabase
      .from("products")
      .insert({
        owner_id: userId,
        name,
        brand_id,
        models: normalizeStringArray(req.body?.models),
        variants: normalizeStringArray(req.body?.variants),
        listed_price: toNumber(req.body?.listed_price, 0),
        is_active,
        is_warning: false,
        created_at: new Date(),
      })
      .select("*")
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    await logTenantAccess(userId, "CREATE", "PRODUCT", data.id, {
      name,
      brand_id,
      is_active,
    });

    await scanAndUpdateWarningProduct(data.id);

    res.status(201).json(data);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { userId } = requireAuthUserId(req, res);
    if (!userId) return;

    const { id } = req.params;

    // Verify access
    const { data: product, error: getError } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (getError || !product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Only owner can update
    if (product.owner_id !== userId) {
      return res
        .status(403)
        .json({ error: "Forbidden - only owner can update" });
    }

    // Validate brand_id if provided
    if (req.body?.brand_id) {
      const { data: brand, error: brandError } = await supabase
        .from("brands")
        .select("id")
        .eq("id", req.body.brand_id)
        .single();

      if (brandError || !brand) {
        return res.status(400).json({ error: "Invalid brand_id" });
      }
    }

    const updates = {
      ...(req.body?.name !== undefined ? { name: req.body.name } : {}),
      ...(req.body?.brand_id !== undefined ?
        { brand_id: req.body.brand_id || null }
      : {}),
      ...(req.body?.models !== undefined ?
        { models: normalizeStringArray(req.body.models) }
      : {}),
      ...(req.body?.variants !== undefined ?
        { variants: normalizeStringArray(req.body.variants) }
      : {}),
      ...(req.body?.listed_price !== undefined ?
        { listed_price: toNumber(req.body.listed_price, 0) }
      : {}),
      ...(req.body?.is_active !== undefined ?
        { is_active: req.body.is_active }
      : {}),
      ...(req.body?.is_warning !== undefined ?
        { is_warning: req.body.is_warning }
      : {}),
    };

    const { data, error } = await supabase
      .from("products")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    await logTenantAccess(userId, "UPDATE", "PRODUCT", id, updates);
    await scanAndUpdateWarningProduct(data.id);

    res.json(data);
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { userId } = requireAuthUserId(req, res);
    if (!userId) return;

    const { id } = req.params;

    // Verify access
    const { data: product, error: getError } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (getError || !product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Only owner can delete
    if (product.owner_id !== userId) {
      return res
        .status(403)
        .json({ error: "Forbidden - only owner can delete" });
    }

    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    await logTenantAccess(userId, "DELETE", "PRODUCT", id);

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/import", upload.single("file"), async (req, res) => {
  try {
    const { userId } = requireAuthUserId(req, res);
    if (!userId) return;

    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.getWorksheet(1);

    let imported = 0;

    if (sheet) {
      for (let i = 2; i <= sheet.rowCount; i += 1) {
        const row = sheet.getRow(i);
        const name = (row.getCell(1).value || "").toString().trim();
        if (!name) continue;

        const brand = (row.getCell(2).value || "").toString().trim();
        const models = (row.getCell(3).value || "").toString();
        const variants = (row.getCell(4).value || "").toString();
        const listedPrice = toNumber(row.getCell(5).value, 0);
        const description = (row.getCell(6).value || "").toString().trim();

        const { error: insertError } = await supabase.from("products").insert({
          owner_id: userId,
          name,
          brand: brand || null,
          models: normalizeStringArray(models),
          variants: normalizeStringArray(variants),
          listed_price: listedPrice,
          description: description || null,
          created_at: new Date(),
        });

        if (!insertError) {
          imported += 1;
        }
      }
    }

    res.json({ success: true, imported });
  } catch (error) {
    console.error("Error importing master products:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/export/xlsx", async (req, res) => {
  try {
    const { userId } = requireAuthUserId(req, res);
    if (!userId) return;

    const { data, error } = await supabase
      .from("products")
      .select("name, brand, models, variants, listed_price, description")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("MasterProducts");

    sheet.columns = [
      { header: "Name", key: "name", width: 40 },
      { header: "Brand", key: "brand", width: 20 },
      { header: "Models", key: "models", width: 30 },
      { header: "Variants", key: "variants", width: 30 },
      { header: "ListedPrice", key: "listed_price", width: 20 },
      { header: "Description", key: "description", width: 50 },
    ];

    (data || []).forEach((item) => {
      sheet.addRow({
        ...item,
        models: Array.isArray(item.models) ? item.models.join(", ") : "",
        variants: Array.isArray(item.variants) ? item.variants.join(", ") : "",
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=master-products.xlsx",
    );
    res.send(buffer);
  } catch (error) {
    console.error("Error exporting master products:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id/get-warning", async (req, res) => {
  try {
    const { userId } = requireAuthUserId(req, res);
    if (!userId) return;

    const { id } = req.params;
    // Verify product exists and access
    const { data: product, error: getError } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (getError || !product) {
      return res.status(404).json({ error: "Product not found" });
    }
    const name = product.name || "";
    const price = product.listed_price || 0;
    const warnings = [];
    const { data: shopProducts, error: shopProductError } = await supabase
      .from("shop_products")
      .select("id, name, price_min, price, price_max, shop_id")
      .ilike("name", `%${name}%`)
      .or(`price_min.lt.${price},price.lt.${price},price_max.lt.${price}`);
    for (const sp of shopProducts || []) {
      let shopInfo = null;
      try {
        const { data: shop } = await supabase
          .from("shops")
          .select("id, name, url")
          .eq("id", sp.shop_id)
          .single();
        shopInfo = shop;
      } catch (e) {
        console.error("Error fetching shop info:", e);
      }

      warnings.push({
        shop_product_id: sp.id,
        shop_product_name: sp.name,
        price_min: sp.price_min,
        price: sp.price,
        price_max: sp.price_max,
        listed_price: price,
        shop_id: sp.shop_id,
        shopInfo,
      });
    }
    if (shopProductError) {
      return res.status(500).json({ error: shopProductError.message });
    }
    return res.status(200).json({ warnings });
  } catch (error) {
    console.error("Error fetching warnings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
