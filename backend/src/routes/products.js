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
      return res.status(400).json({ error: "Không có file được tải lên" });
    }

    // Validate file type
    if (
      !req.file.mimetype.includes("sheet") &&
      !req.file.originalname.endsWith(".xlsx")
    ) {
      return res
        .status(400)
        .json({ error: "Chỉ chấp nhận file Excel (.xlsx)" });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.getWorksheet(1);

    if (!sheet) {
      return res.status(400).json({ error: "File không có sheet nào" });
    }

    let imported = 0;
    let errors = [];
    const startRow = 2;

    const brands = [];
    for (let i = startRow; i <= sheet.rowCount; i++) {
      const brand = (sheet.getRow(i).getCell(3).value || "").toString().trim();
      if (brand && !brands.includes(brand)) {
        brands.push(brand);
      }
    }
    // add brand if it not exist
    for (const brandName of brands) {
      const { data: existingBrand } = await supabase
        .from("brands")
        .select("id")
        .eq("name", brandName)
        .single();

      if (!existingBrand) {
        const { data: newBrand, error: brandError } = await supabase
          .from("brands")
          .insert({
            name: brandName,
            code: brandName.toLowerCase(),
          })
          .select("*")
          .single();

        if (brandError) {
          console.error(`Error inserting brand ${brandName}:`, brandError);
          continue;
        }
        // add account_brand_permissions for new brand
        const { error: permError } = await supabase
          .from("account_brand_permissions")
          .insert({
            user_id: userId,
            brand_id: newBrand.id,
          });

        if (permError) {
          console.error(
            `Error inserting brand permission for ${brandName}:`,
            permError,
          );
        }

        console.log(`Inserted new brand: ${brandName} with id ${newBrand.id}`);
      }
    }
    const brandFound = await supabase
      .from("brands")
      .select("id, name")
      .in("name", brands);

    const brandMap = {};
    (brandFound.data || []).forEach((b) => {
      brandMap[b.name] = b.id;
    });

    for (let i = startRow; i <= sheet.rowCount; i++) {
      try {
        const row = sheet.getRow(i);
        const name = (row.getCell(1).value || "").toString().trim();
        if (!name) {
          errors.push(`Hàng ${i}: Tên sản phẩm không được để trống`);
          continue;
        }
        const brand = (row.getCell(3).value || "").toString().trim();
        const variants =
          (row.getCell(2).value || "")
            .toString()
            ?.split(",")
            ?.map((x) => x.trim())
            .filter(Boolean) || [];
        const listedPrice = toNumber(row.getCell(4).value, 0);

        // Validate required fields
        if (!name) {
          errors.push(`Hàng ${i}: Tên sản phẩm không được để trống`);
          continue;
        }

        if (listedPrice <= 0) {
          errors.push(`Hàng ${i}: Giá phải lớn hơn 0`);
          continue;
        }

        const brandId = brandMap[brand] || null;
        // Insert product
        const { data: insertedProduct, error: insertError } = await supabase
          .from("products")
          .insert({
            owner_id: userId,
            name,
            brand_id: brandId,
            models: [],
            variants: variants,
            listed_price: listedPrice,
            is_active: true,
            is_warning: false,
            created_at: new Date(),
          })
          .select("*")
          .single();

        if (insertError) {
          errors.push(`Hàng ${i}: ${insertError.message}`);
          continue;
        }

        // Scan for warnings after insert
        if (insertedProduct?.id) {
          await scanAndUpdateWarningProduct(insertedProduct.id);
        }

        await logTenantAccess(
          userId,
          "CREATE",
          "PRODUCT",
          insertedProduct?.id,
          {
            name,
            source: "import",
          },
        );

        imported++;
      } catch (rowError) {
        errors.push(`Hàng ${i}: ${rowError.message}`);
      }
    }

    res.json({
      success: true,
      imported,
      total: sheet.rowCount - startRow + 1,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error importing master products:", error);
    res.status(500).json({ error: "Lỗi khi import: " + error.message });
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
    const variants = product?.variants;
    const warnings = [];
    const query = supabase
      .from("shop_products")
      .select("id, name, price_min, price, price_max, shop_id")
      .or(`price_min.lt.${price},price.lt.${price},price_max.lt.${price}`);
    for (const row of variants || []) {
      const variantString = row.toString().trim()?.toLowerCase();
      if (variantString) {
        query.or(`name.ilike.%${variantString}%`);
      }
    }
    const { data: shopProducts, error: shopProductError } = await query;

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

// ========================
// TEMPLATE - Download import template
// ========================
router.get("/template/download", async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("MasterProducts");

    // Set up columns
    sheet.columns = [
      { header: "Tên sản phẩm", key: "name", width: 20 },
      {
        header: "Phân loại(cách nhau bằng dấu phẩy)",
        key: "variants",
        width: 40,
      },
      { header: "Thương hiệu", key: "brand", width: 20 },
      { header: "Giá niêm yết", key: "listed_price", width: 20 },
    ];

    // Format header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    headerRow.alignment = {
      horizontal: "center",
      vertical: "center",
      wrapText: true,
    };

    // Format data rows
    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF2F2F2" },
      };
      row.alignment = { wrapText: true, vertical: "top" };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=mau-import-san-pham.xlsx",
    );
    res.send(buffer);
  } catch (error) {
    console.error("Error generating template:", error);
    res.status(500).json({ error: "Lỗi tạo template" });
  }
});

export default router;
