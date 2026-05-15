/** @format */

import ExcelJS from "exceljs";
import { Router } from "express";
import { db } from "../lib/db.js";
import { getAuthContext, requireAuthUserId } from "../lib/requestAuth.js";
import { normalizeProduct } from "./products-shop.js";
const router = Router();

// Helper: Generate shop code from URL
const generateShopCode = (url) => {
  try {
    const urlObj = new URL(url);

    const pathname = urlObj.pathname;

    const shopSlug = pathname.replace(/^\//, "").split("?")[0];

    if (!shopSlug) return null;

    const baseCode = shopSlug
      .split("/")[0]
      .toUpperCase()
      .replace(/-/g, "_")
      .replace(/[^A-Z0-9_]/g, "");

    // DDYYMMHH
    const now = new Date();

    const dd = String(now.getDate()).padStart(2, "0");

    const yy = String(now.getFullYear()).slice(-2);

    const mm = String(now.getMonth() + 1).padStart(2, "0");

    const hh = String(now.getHours()).padStart(2, "0");
    const datetimeCode = `${dd}${yy}${mm}${hh}`;
    return `${baseCode}_${datetimeCode}`;
  } catch {
    return null;
  }
};

//GET select box
router.get("/select-box", async (req, res) => {
  try {
    const { userId, type } = requireAuthUserId(req, res);
    if (!userId) return;

    const auth = getAuthContext(req);
    let query = "SELECT id, name, code FROM shops";
    const params = [];
    let whereClauses = [];

    // STAFF: Only show assigned shops
    if (type === "STAFF") {
      // Assuming you have a join table `user_shops`
      whereClauses.push(
        "id IN (SELECT shop_id FROM user_shops WHERE user_id = $" +
          (params.length + 1) +
          ")",
      );
      params.push(userId);
    }

    if (type != "ADMIN") {
      whereClauses.push("owner_id = $" + (params.length + 1));
      params.push(userId);
    }

    if (whereClauses.length > 0) {
      query += " WHERE " + whereClauses.join(" AND ");
    }

    query += " ORDER BY name ASC";

    const { rows } = await db.query(query, params);

    if (!rows) {
      return res.status(500).json({ error: "Failed to fetch shops" });
    }

    res.json({
      shops: rows || [],
    });
  } catch (error) {
    console.error("Error fetching shops:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

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

    let query = `
      SELECT 
        s.*, 
        (SELECT COUNT(*) FROM shop_products sp WHERE sp.shop_id = s.id) as product_count
      FROM shops s
    `;
    let countQuery = "SELECT count(*) FROM shops";
    const params = [];
    const countParams = [];
    let whereClauses = [];

    // STAFF: Only show assigned shops
    if (type === "STAFF") {
      // Assuming you have a join table `user_shops`
      whereClauses.push(
        "id IN (SELECT shop_id FROM user_shops WHERE user_id = $" +
          (params.length + 1) +
          ")",
      );
      params.push(userId);
      countParams.push(userId);
    }

    if (search) {
      whereClauses.push(
        "(name ILIKE $" +
          (params.length + 1) +
          " OR code ILIKE $" +
          (params.length + 1) +
          ")",
      );
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }

    if (type != "ADMIN") {
      whereClauses.push("owner_id = $" + (params.length + 1));
      params.push(userId);
      countParams.push(userId);
    }

    if (whereClauses.length > 0) {
      query += " WHERE " + whereClauses.join(" AND ");
      countQuery += " WHERE " + whereClauses.join(" AND ");
    }

    query +=
      " ORDER BY created_at DESC LIMIT $" +
      (params.length + 1) +
      " OFFSET $" +
      (params.length + 2);
    params.push(limit, offset);

    const { rows: shops } = await db.query(query, params);
    const { rows: countRows } = await db.query(countQuery, countParams);
    const count = countRows[0].count;

    if (!shops) {
      return res.status(500).json({ error: "Failed to fetch shops" });
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

    let query = "SELECT * FROM shops WHERE id = $1";
    const params = [id];

    if (type != "ADMIN") {
      query += " AND owner_id = $2";
      params.push(userId);
    }
    const { rows } = await db.query(query, params);
    const shop = rows[0];

    if (!shop) {
      return res.status(404).json({ error: "Shop not found" });
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

    let finalCode = generateShopCode(url);

    const { rows } = await db.query(
      "INSERT INTO shops (name, url, platform, code, owner_id, is_sys_product_by_link) VALUES ($1, $2, $3, $4, $5, false) RETURNING *",
      [name, url, platform, finalCode, userId],
    );
    const shop = rows[0];

    if (!shop) {
      return res.status(500).json({ error: "Failed to create shop" });
    }

    // Add brands if provided
    if (Array.isArray(brand_ids) && brand_ids.length > 0) {
      const brandValues = brand_ids
        .map((brand_id) => `(${shop.id}, ${brand_id})`)
        .join(", ");
      await db.query(
        `INSERT INTO shop_brands (shop_id, brand_id) VALUES ${brandValues}`,
      );
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
    const { userId, type } = requireAuthUserId(req, res);
    if (!userId) return;

    const { id } = req.params;
    const { name, url, platform, code, is_active, brand_ids } = req.body;

    if (!name || !url || !platform) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    let finalCode = code;
    if (!finalCode) {
      finalCode = generateShopCode(url);
    }

    let query =
      "UPDATE shops SET name = $1, url = $2, platform = $3, code = $4, is_active = $5 WHERE id = $6";
    const params = [
      name,
      url,
      platform,
      finalCode,
      is_active === undefined ? true : Boolean(is_active),
      id,
    ];

    if (type !== "ADMIN") {
      query += " AND owner_id = $7";
      params.push(userId);
    }

    query += " RETURNING *";

    const { rows } = await db.query(query, params);
    const shop = rows[0];

    if (!shop) {
      return res
        .status(404)
        .json({ error: "Shop not found or not authorized" });
    }

    // Update brands
    await db.query("DELETE FROM shop_brands WHERE shop_id = $1", [id]);
    if (Array.isArray(brand_ids) && brand_ids.length > 0) {
      const brandValues = brand_ids
        .map((brand_id) => `('${id}', '${brand_id}')`)
        .join(", ");
      await db.query(
        `INSERT INTO shop_brands (shop_id, brand_id) VALUES ${brandValues}`,
      );
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
    const { userId, type } = requireAuthUserId(req, res);
    if (!userId) return;

    const { id } = req.params;

    let query = "DELETE FROM shops WHERE id = $1";
    const params = [id];

    if (type !== "ADMIN") {
      query += " AND owner_id = $2";
      params.push(userId);
    }

    const { rowCount } = await db.query(query, params);

    if (rowCount === 0) {
      return res
        .status(404)
        .json({ error: "Shop not found or not authorized" });
    }

    // Also delete related product data
    await db.query("DELETE FROM shop_products WHERE shop_id = $1", [id]);
    await db.query("DELETE FROM shop_brands WHERE shop_id = $1", [id]);

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting shop:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET: Get shop products with pagination and search
router.get("/:id/products", async (req, res) => {
  try {
    const { id: shopId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 1000);
    const search = (req.query.search || "").toString().trim();
    const offset = (page - 1) * limit;

    let query = "SELECT * FROM shop_products WHERE shop_id = $1";
    let countQuery = "SELECT count(*) FROM shop_products WHERE shop_id = $1";
    const params = [shopId];
    const countParams = [shopId];

    if (search) {
      query += " AND name ILIKE $2";
      countQuery += " AND name ILIKE $2";
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }

    query +=
      " ORDER BY created_at DESC LIMIT $" +
      (params.length + 1) +
      " OFFSET $" +
      (params.length + 2);
    params.push(limit, offset);

    const { rows: products } = await db.query(query, params);
    const { rows: countRows } = await db.query(countQuery, countParams);
    const count = countRows[0].count;
    if (!products) {
      return res.status(500).json({ error: "Failed to fetch products" });
    }
    if (products.length === 0) {
      return res.json({
        products: [],
        total: 0,
        page,
        limit,
        pages: 0,
      });
    }
    res.json({
      products: products.map(normalizeProduct),
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
    const { id: shopId } = req.params;

    const { rowCount } = await db.query(
      "UPDATE shop_products SET is_warning_checked = false, is_under_original = false WHERE shop_id = $1",
      [shopId],
    );

    if (rowCount === 0) {
      console.log(`No products found for shop ${shopId} to reset status.`);
    }

    const { rows } = await db.query(
      "UPDATE shops SET is_sys_product_by_link = false WHERE id = $1 RETURNING *",
      [shopId],
    );
    const updatedShop = rows[0];

    res.json({
      success: true,
      message: `Reset status for ${rowCount} products.`,
      shop: updatedShop,
    });
  } catch (error) {
    console.error("Error resetting product status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST: Import products from Excel
router.post("/:id/import-products", async (req, res) => {
  try {
    const { id: shopId } = req.params;
    const { userId } = requireAuthUserId(req, res);
    if (!userId) return;

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.getWorksheet(1);

    if (!worksheet) {
      return res.status(400).json({ error: "No worksheet found in the file" });
    }

    const productsToInsert = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const name = row.getCell(1).value?.toString().trim();
      const original_price = parseFloat(row.getCell(2).value);

      if (name && !isNaN(original_price)) {
        productsToInsert.push({
          shop_id: shopId,
          name,
          original_price,
          is_manual: true,
          created_by: userId,
        });
      }
    });

    if (productsToInsert.length === 0) {
      return res
        .status(400)
        .json({ error: "No valid product data found in the file" });
    }

    const columns = [
      "shop_id",
      "name",
      "original_price",
      "is_manual",
      "created_by",
    ].join(", ");
    const values = productsToInsert
      .map(
        (p) =>
          `(${p.shop_id}, '${p.name.replace(/'/g, "''")}', ${p.original_price}, ${p.is_manual}, '${p.created_by}')`,
      )
      .join(", ");

    const query = `INSERT INTO shop_products (${columns}) VALUES ${values} ON CONFLICT (shop_id, name) DO UPDATE SET original_price = EXCLUDED.original_price, is_manual = EXCLUDED.is_manual, updated_at = NOW()`;

    await db.query(query);

    res.json({
      success: true,
      message: `Successfully imported/updated ${productsToInsert.length} products.`,
    });
  } catch (error) {
    console.error("Error importing products:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
