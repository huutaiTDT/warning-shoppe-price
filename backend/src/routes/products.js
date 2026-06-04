/** @format */

import ExcelJS from "exceljs";
import { Router } from "express";
import multer from "multer";
import { db } from "../lib/db.js";
import { getAuthContext, requireAuthUserId } from "../lib/requestAuth.js";
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
    const isWarning = req.query.is_warning;

    // ========================
    // GET BRAND PERMISSION
    // ========================
    const { rows: brandPermissionRows } = await db.query(
      "SELECT brand_id FROM account_brand_permissions WHERE user_id = $1",
      [userId],
    );

    if (!brandPermissionRows) {
      return res
        .status(500)
        .json({ error: "Failed to fetch brand permissions" });
    }

    const userBrandIds = (brandPermissionRows || []).map(
      (p) => `'${p.brand_id}'`,
    );
    const isAdmin = auth?.type === "ADMIN";

    // ========================
    // BASE QUERY
    // ========================
    let query = "SELECT * FROM products";
    let countQuery = "SELECT count(*) FROM products";
    const params = [];
    const countParams = [];
    let whereClauses = [];

    // ========================
    // SEARCH
    // ========================
    if (search) {
      whereClauses.push("name ILIKE $" + (params.length + 1));
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }

    // ========================
    // FILTERS (🔥 FIX CHÍNH)
    // ========================
    if (brandId) {
      whereClauses.push("brand_id = $" + (params.length + 1));
      params.push(brandId);
      countParams.push(brandId);
    }
    if (models.length > 0) {
      const modelClauses = models.map(
        (_, i) => "models @> ARRAY[$" + (params.length + i + 1) + "]",
      );
      whereClauses.push(`(${modelClauses.join(" OR ")})`);
      params.push(...models);
      countParams.push(...models);
    }

    // ========================
    // FUZZY FILTER VARIANTS
    // ========================
    if (variants.length > 0) {
      const variantClauses = variants.map(
        (_, i) => "variants && ARRAY[$" + (params.length + i + 1) + "]",
      );
      whereClauses.push(`(${variantClauses.join(" OR ")})`);
      params.push(...variants);
      countParams.push(...variants);
    }

    if (isWarning !== undefined && isWarning !== "") {
      whereClauses.push("is_warning = $" + (params.length + 1));
      const warningBool = isWarning === "true";
      params.push(warningBool);
      countParams.push(warningBool);
    }

    // ========================
    // MULTI-TENANT
    // ========================
    if (!isAdmin) {
      if (userBrandIds.length > 0) {
        whereClauses.push(`brand_id IN (${userBrandIds.join(",")})`);
      } else {
        // If not admin and no brand access, return empty
        whereClauses.push("1=0");
      }
    }

    if (whereClauses.length > 0) {
      query += " WHERE " + whereClauses.join(" AND ");
      countQuery += " WHERE " + whereClauses.join(" AND ");
    }

    // ========================
    // EXECUTE
    // ========================
    query +=
      " ORDER BY is_warning DESC, created_at DESC LIMIT $" +
      (params.length + 1) +
      " OFFSET $" +
      (params.length + 2);
    params.push(limit, offset);

    const { rows: data } = await db.query(query, params);
    const { rows: countRows } = await db.query(countQuery, countParams);
    const count = countRows[0].count;

    if (!data) {
      return res.status(500).json({ error: "Failed to list products" });
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

    const { rows } = await db.query("SELECT * FROM products WHERE id = $1", [
      id,
    ]);
    const product = rows[0];

    if (!product) {
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
      const { rows } = await db.query("SELECT id FROM brands WHERE id = $1", [
        brand_id,
      ]);
      const brand = rows[0];

      if (!brand) {
        return res.status(400).json({ error: "Invalid brand_id" });
      }
    }

    const models = normalizeStringArray(req.body?.models);
    const variants = normalizeStringArray(req.body?.variants);
    const listed_price = toNumber(req.body?.listed_price, 0);

    const { rows } = await db.query(
      `INSERT INTO products (owner_id, name, brand_id, models, variants, listed_price, is_active, is_warning, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING *`,
      [
        userId,
        name,
        brand_id,
        models,
        variants,
        listed_price,
        is_active,
        false,
      ],
    );
    const data = rows[0];

    if (!data) {
      return res.status(500).json({ error: "Failed to create product" });
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
    const { rows: prodRows } = await db.query(
      "SELECT * FROM products WHERE id = $1",
      [id],
    );
    const product = prodRows[0];

    if (!product) {
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
      const { rows } = await db.query("SELECT id FROM brands WHERE id = $1", [
        req.body.brand_id,
      ]);
      const brand = rows[0];

      if (!brand) {
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

    const updateKeys = Object.keys(updates);
    if (updateKeys.length === 0) {
      return res.json(product);
    }

    const setClauses = updateKeys.map((key, idx) => `${key} = $${idx + 1}`);
    const values = updateKeys.map((key) => updates[key]);

    const { rows } = await db.query(
      `UPDATE products SET ${setClauses.join(", ")} WHERE id = $${values.length + 1} RETURNING *`,
      [...values, id],
    );
    const data = rows[0];

    if (!data) {
      return res.status(500).json({ error: "Failed to update product" });
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
    const { rows } = await db.query("SELECT * FROM products WHERE id = $1", [
      id,
    ]);
    const product = rows[0];

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Only owner can delete
    if (product.owner_id !== userId) {
      return res
        .status(403)
        .json({ error: "Forbidden - only owner can delete" });
    }

    await db.query("DELETE FROM products WHERE id = $1", [id]);

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
      const { rows: existingRows } = await db.query(
        "SELECT id FROM brands WHERE name = $1",
        [brandName],
      );
      const existingBrand = existingRows[0];

      if (!existingBrand) {
        try {
          const { rows: newRows } = await db.query(
            "INSERT INTO brands (name, code) VALUES ($1, $2) RETURNING *",
            [brandName, brandName.toLowerCase()],
          );
          const newBrand = newRows[0];

          // add account_brand_permissions for new brand
          await db.query(
            "INSERT INTO account_brand_permissions (user_id, brand_id) VALUES ($1, $2)",
            [userId, newBrand.id],
          );

          console.log(
            `Inserted new brand: ${brandName} with id ${newBrand.id}`,
          );
        } catch (err) {
          console.error(`Error inserting brand ${brandName}:`, err);
        }
      }
    }

    let brandFoundData = [];
    if (brands.length > 0) {
      const placeholders = brands.map((_, idx) => `$${idx + 1}`).join(",");
      const { rows } = await db.query(
        `SELECT id, name FROM brands WHERE name IN (${placeholders})`,
        brands,
      );
      brandFoundData = rows;
    }

    const brandMap = {};
    (brandFoundData || []).forEach((b) => {
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
        let insertedProduct;
        try {
          const { rows } = await db.query(
            `INSERT INTO products (owner_id, name, brand_id, models, variants, listed_price, is_active, is_warning, created_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING *`,
            [userId, name, brandId, [], variants, listedPrice, true, false],
          );
          insertedProduct = rows[0];
        } catch (insertError) {
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

    const { rows: data } = await db.query(
      `SELECT p.name, b.name as brand, p.models, p.variants, p.listed_price, p.description 
       FROM products p 
       LEFT JOIN brands b ON p.brand_id = b.id 
       WHERE p.owner_id = $1 
       ORDER BY p.created_at DESC`,
      [userId],
    );

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
    const { rows: prodRows } = await db.query(
      "SELECT * FROM products WHERE id = $1",
      [id],
    );
    const product = prodRows[0];

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    const name = product.name || "";
    const price = product.listed_price || 0;
    const variants = product?.variants;
    const warnings = [];

    let shopProducts = [];
    try {
      const conditions = [`(price_min < $1 OR price < $1 OR price_max < $1)`];
      const conditionsOr = [];
      const params = [price];

      for (const row of variants || []) {
        const variantString = row.toString().trim()?.toLowerCase();
        if (variantString) {
          conditionsOr.push(`name ILIKE '%${variantString}%'`);
        }
      }

      const finalQuery = `SELECT id, external_link, name, url, price_min, price, price_max, shop_id, rating, sold 
         FROM shop_products 
         WHERE (${conditions.join(" OR ")}) AND (${conditionsOr.join(" OR ")})`;
      const { rows } = await db.query(finalQuery, params);

      shopProducts = rows;
    } catch (shopProductError) {
      return res.status(500).json({ error: shopProductError.message });
    }

    for (const sp of shopProducts || []) {
      let shopInfo = null;
      try {
        const { rows: shopRows } = await db.query(
          "SELECT id, name, url FROM shops WHERE id = $1",
          [sp.shop_id],
        );
        shopInfo = shopRows[0];
      } catch (e) {
        console.error("Error fetching shop info:", e);
      }

      warnings.push({
        shop_product_id: sp.id,
        shop_product_name: sp.name,
        shop_product_url: sp.url,
        external_link: sp.external_link,
        price_min: sp.price_min,
        price: sp.price,
        price_max: sp.price_max,
        rating: sp.rating,
        sold: sp.sold,
        listed_price: price,
        shop_id: sp.shop_id,
        shopInfo,
      });
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
