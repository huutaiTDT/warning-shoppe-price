/** @format */

import axios from "axios";
import ExcelJS from "exceljs";
import { Router } from "express";
import multer from "multer";
import { db } from "../lib/db.js";
import { requireAuthUserId } from "../lib/requestAuth.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const normalizeProduct = (product) => {
  const fallbackPrice = toNumber(product.price, 0);
  const priceMin = toNumber(product.price_min, fallbackPrice);
  const priceMax = toNumber(product.price_max, fallbackPrice);
  const priceOriginal = toNumber(product.original_price, 0);
  const shopeeAvgPrice = (priceMin + priceMax) / 2;
  const isUnderOriginal = priceOriginal > 0 && shopeeAvgPrice < priceOriginal;
  const isAboveOriginal = priceOriginal > 0 && shopeeAvgPrice > priceOriginal;

  let priceTrend = "equal";
  if (isUnderOriginal) priceTrend = "down";
  else if (isAboveOriginal) priceTrend = "up";

  return {
    ...product,
    models: Array.isArray(product.models) ? product.models : [],
    variants: Array.isArray(product.variants) ? product.variants : [],
    priceMin,
    priceMax,
    priceOriginal,
    shopeeAvgPrice,
    priceDelta: shopeeAvgPrice - priceOriginal,
    priceTrend,
    isUnderOriginal,
    isAboveOriginal,
    shopId: product.shop_id,
    shopName: product.shopName || product.shops?.name || null,
    shopCode: product.shopCode || product.shops?.code || null,
    shopPlatform: product.shopPlatform || product.shops?.platform || null,
  };
};

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

const normalizeVariants = normalizeStringArray;
const normalizeModels = normalizeStringArray;

const matchSearch = (product, search) => {
  if (!search) return true;
  const q = search.toLowerCase();
  const name = (product?.name || "").toString().toLowerCase();
  const variants =
    Array.isArray(product?.variants) ?
      product.variants.map((item) => (item || "").toString().toLowerCase())
    : [];
  const models =
    Array.isArray(product?.models) ?
      product.models.map((item) => (item || "").toString().toLowerCase())
    : [];

  return (
    name.includes(q) ||
    variants.some((item) => item.includes(q)) ||
    models.some((item) => item.includes(q))
  );
};

const applyListFilters = (
  query,
  { search, minPrice, maxPrice, minRating, shopId, brand },
) => {
  let nextQuery = query;

  if (minPrice !== null) {
    nextQuery = nextQuery.gte("price_min", minPrice);
  }

  if (maxPrice !== null) {
    nextQuery = nextQuery.lte("price_max", maxPrice);
  }

  if (minRating !== null) {
    nextQuery = nextQuery.gte("rating", minRating);
  }

  if (shopId) {
    nextQuery = nextQuery.eq("shop_id", shopId);
  }

  if (brand) {
    nextQuery = nextQuery.ilike("brand", `%${brand}%`);
  }

  return nextQuery;
};

// GET: Count products under original price (DB-based)
router.get("/under-original-count", async (req, res) => {
  try {
    const { userId, type } = requireAuthUserId(req, res);
    if (!userId) return;

    const search = (req.query.search || "").toString().trim();
    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : null;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : null;
    const minRating =
      req.query.minRating ? parseFloat(req.query.minRating) : null;
    const shopId = (req.query.shop || "").toString();
    const brand = (req.query.brand || "").toString().trim();

    let query = `
      SELECT sp.id, sp.price, sp.price_min, sp.price_max, sp.original_price
      FROM shop_products sp
      JOIN shops s ON sp.shop_id = s.id
      WHERE sp.original_price > 0 AND ((sp.price_min + sp.price_max) / 2) < sp.original_price
    `;
    const params = [];

    if (type !== "ADMIN") {
      query += " AND sp.shop_id IN (SELECT shop_id FROM user_shop_mappings WHERE user_id = $1)";
      params.push(userId);
    }

    if (search) {
      query += ` AND sp.name ILIKE $${params.length + 1}`;
      params.push(`%${search}%`);
    }
    if (minPrice !== null) {
      query += ` AND sp.price_min >= $${params.length + 1}`;
      params.push(minPrice);
    }
    if (maxPrice !== null) {
      query += ` AND sp.price_max <= $${params.length + 1}`;
      params.push(maxPrice);
    }
    if (minRating !== null) {
      query += ` AND sp.rating >= $${params.length + 1}`;
      params.push(minRating);
    }
    if (shopId) {
      query += ` AND sp.shop_id = $${params.length + 1}`;
      params.push(shopId);
    }
    if (brand) {
      query += ` AND sp.brand ILIKE $${params.length + 1}`;
      params.push(`%${brand}%`);
    }

    const { rows } = await db.query(query, params);

    return res.json({ count: rows.length });
  } catch (error) {
    console.error("Error counting products under original price:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET: Export products to Excel (must be before GET /)
router.get("/export", async (req, res) => {
  try {
    const { userId, type } = requireAuthUserId(req, res);
    if (!userId) return;

    let query = `
      SELECT p.id, p.name, p.models, p.variants, p.price_min, p.price_max, p.original_price
      FROM shop_products p
      JOIN shops s ON p.shop_id = s.id
    `;
    const params = [];

    if (type !== "ADMIN") {
      query += " WHERE s.id IN (SELECT shop_id FROM user_shop_mappings WHERE user_id = $1)";
      params.push(userId);
    }

    const { rows: products } = await db.query(query, params);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Products");

    sheet.columns = [
      { header: "ID", key: "id", width: 50 },
      { header: "Tên", key: "name", width: 50 },
      { header: "Models", key: "models", width: 30 },
      { header: "Variants", key: "variants", width: 30 },
      { header: "Giá Min", key: "price_min", width: 15 },
      { header: "Giá Max", key: "price_max", width: 15 },
      { header: "Giá niêm yết", key: "original_price", width: 20 },
    ];

    (products || [])
      .forEach((p) =>
        sheet.addRow({
          ...p,
          models: Array.isArray(p.models) ? p.models.join(", ") : "",
          variants: Array.isArray(p.variants) ? p.variants.join(", ") : "",
        }),
      );

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", "attachment; filename=products.xlsx");
    res.send(buffer);
  } catch (error) {
    console.error("Error exporting products:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST: Import products from Excel
router.post("/import", upload.single("file"), async (req, res) => {
  try {
    const { userId, type } = requireAuthUserId(req, res);
    if (!userId) return;

    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    const sheet = workbook.getWorksheet(1);
    const updates = [];

    sheet?.eachRow((row, i) => {
      if (i === 1) return; // skip header

      const id = row.getCell(1).value;
      const priceOriginal = row.getCell(5).value;

      if (id) {
        updates.push({
          id,
          original_price: Number(priceOriginal || 0),
        });
      }
    });

    for (const item of updates) {
      let checkQuery = `SELECT sp.id FROM shop_products sp JOIN shops s ON sp.shop_id = s.id WHERE sp.id = $1`;
      const checkParams = [item.id];
      if (type !== "ADMIN") {
        checkQuery += ` AND s.id IN (SELECT shop_id FROM user_shop_mappings WHERE user_id = $2)`;
        checkParams.push(userId);
      }
      const { rows: existingRows } = await db.query(checkQuery, checkParams);

      if (existingRows.length === 0) {
        continue;
      }

      await db.query(
        "UPDATE shop_products SET original_price = $1 WHERE id = $2",
        [item.original_price, item.id],
      );
    }

    res.json({ success: true, updated: updates.length });
  } catch (error) {
    console.error("Error importing products:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST: Sync product info from Shopee link via external parser API
router.post("/sync-from-link", async (req, res) => {
  try {
    const link = (req.body?.link || "").toString().trim();

    if (!link) {
      return res.status(400).json({ error: "Shopee link is required" });
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(link);
    } catch {
      return res.status(400).json({ error: "Invalid URL" });
    }

    if (!parsedUrl.hostname.includes("shopee.vn")) {
      return res.status(400).json({ error: "Only Shopee links are supported" });
    }

    const externalBaseUrl =
      process.env.EXTERNAL_PRODUCT_API_URL ||
      "https://tool-api.gitlabserver.id.vn/common/products";
    const externalUrl = `${externalBaseUrl}/${encodeURIComponent(link)}`;

    const { data } = await axios.get(externalUrl, {
      headers: { Accept: "*/*" },
      timeout: 30000,
    });

    const product = data?.product || {};
    const priceMin = toNumber(product.priceMin ?? product.price_min, 0);
    const priceMax = toNumber(product.priceMax ?? product.price_max, priceMin);
    const normalized = {
      name: product.name || "",
      title: product.name || "",
      brand: product.brand || null,
      variants: normalizeVariants(product.variants),
      image: product.image || "",
      thumbnail: product.image || "",
      gallery: Array.isArray(product.gallery) ? product.gallery : [],
      price: toNumber(product.price, priceMin),
      priceMin,
      priceMax,
      priceOriginal: toNumber(
        product.original_price ?? product.price_original,
        0,
      ),
      rating: toNumber(product.rating, 0),
      sold: toNumber(product.sold, 0),
      description: product.description || "",
      url: product.url || link,
      external_link: product.url || link,
      external_id: product.id ? String(product.id) : null,
      raw: data,
    };

    res.json(normalized);
  } catch (error) {
    const status = error.response?.status || 500;
    const detail =
      error.response?.data?.message ||
      error.message ||
      "Failed to sync from link";

    console.error("Error syncing product from link:", detail);
    res.status(status).json({ error: detail });
  }
});

// GET: Product detail
router.get("/:id", async (req, res) => {
  try {
    const { userId, type } = requireAuthUserId(req, res);
    if (!userId) return;

    const { id } = req.params;

    let query = `
      SELECT p.*, s.name as "shopName", s.code as "shopCode", s.platform as "shopPlatform"
      FROM shop_products p
      JOIN shops s ON p.shop_id = s.id
      WHERE p.id = $1
    `;
    const params = [id];

    if (type !== "ADMIN") {
      query += " AND s.id IN (SELECT shop_id FROM user_shop_mappings WHERE user_id = $2)";
      params.push(userId);
    }

    const { rows } = await db.query(query, params);
    const product = rows[0];

    if (!product) {
      return res
        .status(404)
        .json({ error: "Product not found or not authorized" });
    }

    res.json(normalizeProduct(product));
  } catch (error) {
    console.error("Error fetching product detail:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET: Product price history
router.get("/:id/price-history", async (req, res) => {
  try {
    const { userId, type } = requireAuthUserId(req, res);
    if (!userId) return;

    const { id } = req.params;

    if (type !== "ADMIN") {
      // Check if product belongs to a shop assigned to the user
      const { rows: productRows } = await db.query(
        "SELECT 1 FROM shop_products sp JOIN user_shop_mappings usm ON sp.shop_id = usm.shop_id WHERE sp.id = $1 AND usm.user_id = $2 LIMIT 1",
        [id, userId],
      );
      if (productRows.length === 0) {
        return res.status(403).json({ error: "Forbidden: You do not have access to this product's price history" });
      }
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit) || 100, 1), 500);

    const { rows: history } = await db.query(
      "SELECT id, shop_product_id, price_min, price_max, crawled_at FROM price_histories WHERE shop_product_id = $1 ORDER BY crawled_at DESC LIMIT $2",
      [id, limit],
    );

    const items = (history || []).map((item) => {
      const min = toNumber(item.price_min, 0);
      const max = toNumber(item.price_max, 0);
      const avg = (min + max) / 2;

      return {
        id: item.id,
        shopProductId: item.shop_product_id,
        priceMin: min,
        priceMax: max,
        shopeeAvgPrice: avg,
        priceDelta: 0,
        crawledAt: item.crawled_at,
        createdAt: item.crawled_at,
      };
    });

    res.json({
      productId: id,
      items,
      total: items.length,
    });
  } catch (error) {
    console.error("Error fetching product price history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST: Create product
router.post("/", async (req, res) => {
  try {
    const { userId, type } = requireAuthUserId(req, res);
    if (!userId) return;

    const {
      name,
      priceMin,
      priceMax,
      price,
      rating,
      sold,
      image,
      external_link,
      original_price,
      description,
      external_id,
      shop_id,
      brand,
      models,
      variants,
    } = req.body;

    if (!name || priceMin === undefined || priceMax === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!shop_id) {
      return res.status(400).json({ error: "Shop ID required" });
    }

    let shopQuery = "SELECT id FROM shops WHERE id = $1";
    const shopParams = [shop_id];
    if (type !== "ADMIN") {
      shopQuery += " AND id IN (SELECT shop_id FROM user_shop_mappings WHERE user_id = $2)";
      shopParams.push(userId);
    }

    const { rows: shopRows } = await db.query(shopQuery, shopParams);

    if (shopRows.length === 0) {
      return res
        .status(403)
        .json({ error: "Không có quyền thêm sản phẩm vào shop này" });
    }

    const normalizedBrand = (brand || "").toString().trim().toLowerCase();
    if (!normalizedBrand) {
      return res
        .status(403)
        .json({ error: "Không có quyền với thương hiệu này" });
    }

    const insertQuery = `
      INSERT INTO shop_products(name, price_min, price_max, price, rating, sold, image, external_link, original_price, description, external_id, shop_id, brand, models, variants, created_by)
      VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;
    const insertParams = [
      name,
      toNumber(priceMin, 0),
      toNumber(priceMax, 0),
      toNumber(price, 0),
      toNumber(rating, 0),
      toNumber(sold, 0),
      image,
      external_link,
      toNumber(original_price, 0),
      description,
      external_id,
      shop_id,
      brand,
      normalizeModels(models),
      normalizeVariants(variants),
      userId,
    ];

    const { rows: newProductRows } = await db.query(insertQuery, insertParams);
    const newProduct = newProductRows[0];

    res.status(201).json(normalizeProduct(newProduct));
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT: Update product
router.put("/:id", async (req, res) => {
  try {
    const { userId, type } = requireAuthUserId(req, res);
    if (!userId) return;

    const { id } = req.params;
    const {
      name,
      priceMin,
      priceMax,
      price,
      rating,
      sold,
      image,
      external_link,
      original_price,
      description,
      external_id,
      shop_id,
      brand,
      models,
      variants,
    } = req.body;

    let existingQuery = "SELECT sp.id, sp.shop_id, sp.brand FROM shop_products sp JOIN shops s ON sp.shop_id = s.id WHERE sp.id = $1";
    const existingParams = [id];
    if (type !== "ADMIN") {
      existingQuery += " AND s.id IN (SELECT shop_id FROM user_shop_mappings WHERE user_id = $2)";
      existingParams.push(userId);
    }
    const { rows: existingRows } = await db.query(existingQuery, existingParams);
    const existing = existingRows[0];

    if (!existing) {
      return res
        .status(403)
        .json({ error: "Không có quyền cập nhật sản phẩm này" });
    }

    if (shop_id !== undefined) {
      let nextShopQuery = "SELECT id FROM shops WHERE id = $1";
      const nextShopParams = [shop_id];
      if (type !== "ADMIN") {
        nextShopQuery += " AND id IN (SELECT shop_id FROM user_shop_mappings WHERE user_id = $2)";
        nextShopParams.push(userId);
      }
      const { rows: nextShopRows } = await db.query(nextShopQuery, nextShopParams);
      if (nextShopRows.length === 0) {
        return res
          .status(403)
          .json({ error: "Không có quyền chuyển sản phẩm sang shop này" });
      }
    }

    const updates = {
      ...(name !== undefined ? { name } : {}),
      ...(shop_id !== undefined ? { shop_id } : {}),
      ...(priceMin !== undefined ? { price_min: toNumber(priceMin, 0) } : {}),
      ...(priceMax !== undefined ? { price_max: toNumber(priceMax, 0) } : {}),
      ...(price !== undefined ? { price: toNumber(price, 0) } : {}),
      ...(rating !== undefined ? { rating: toNumber(rating, 0) } : {}),
      ...(sold !== undefined ? { sold: toNumber(sold, 0) } : {}),
      ...(image !== undefined ? { image } : {}),
      ...(external_link !== undefined ? { external_link } : {}),
      ...(original_price !== undefined ?
        { original_price: toNumber(original_price, 0) }
      : {}),
      ...(description !== undefined ? { description } : {}),
      ...(external_id !== undefined ? { external_id } : {}),
      ...(brand !== undefined ? { brand } : {}),
      ...(models !== undefined ? { models: normalizeModels(models) } : {}),
      ...(variants !== undefined ?
        { variants: normalizeVariants(variants) }
      : {}),
      updated_at: new Date(),
    };

    if (Object.keys(updates).length === 1) {
      return res.status(400).json({ error: "No fields to update" });
    }

    if (updates.price_min !== undefined && updates.price_max !== undefined) {
      updates.price = (updates.price_min + updates.price_max) / 2;
    }

    const updateEntries = Object.entries(updates);
    const setClause = updateEntries
      .map(([key, value], i) => `${key} = $${i + 1}`)
      .join(", ");
    const updateParams = updateEntries.map(([, value]) => value);
    updateParams.push(id);

    const { rows: productRows } = await db.query(
      `UPDATE shop_products SET ${setClause} WHERE id = $${updateParams.length} RETURNING *`,
      updateParams,
    );
    const product = productRows[0];

    if (external_id !== undefined && shop_id) {
      await db.query(
        "UPDATE shops SET is_sys_product_by_link = true WHERE id = $1",
        [shop_id],
      );
    }

    const { rows: finalProductRows } = await db.query(
      `SELECT p.*, s.name as "shopName", s.code as "shopCode", s.platform as "shopPlatform" FROM shop_products p JOIN shops s ON p.shop_id = s.id WHERE p.id = $1`,
      [product.id],
    );

    res.json(normalizeProduct(finalProductRows[0]));
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE: Delete product
router.delete("/:id", async (req, res) => {
  try {
    const { userId, type } = requireAuthUserId(req, res);
    if (!userId) return;

    const { id } = req.params;

    let existingQuery = "SELECT sp.id FROM shop_products sp JOIN shops s ON sp.shop_id = s.id WHERE sp.id = $1";
    const existingParams = [id];
    if (type !== "ADMIN") {
      existingQuery += " AND s.id IN (SELECT shop_id FROM user_shop_mappings WHERE user_id = $2)";
      existingParams.push(userId);
    }
    const { rows: existingRows } = await db.query(existingQuery, existingParams);

    if (existingRows.length === 0) {
      return res.status(403).json({ error: "Không có quyền xóa sản phẩm này" });
    }

    await db.query("DELETE FROM shop_products WHERE id = $1", [id]);

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
