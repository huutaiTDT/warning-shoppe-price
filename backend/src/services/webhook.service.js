/** @format */

import { db } from "../lib/db.js";

const WEBHOOK_SECRET = "WPR";

async function scanPrice(productInsertHistoryPrice) {
  console.log("🚀 Starting price scan...");
  try {
    // Insert price histories into PostgreSQL
    if (productInsertHistoryPrice.length > 0) {
      const values = productInsertHistoryPrice
        .map((_, idx) => `($${idx * 3 + 1}, $${idx * 3 + 2}, $${idx * 3 + 3})`)
        .join(",");

      const flatValues = productInsertHistoryPrice.flatMap((item) => [
        item.shop_product_id,
        item.price_min,
        item.price_max,
      ]);

      await db.query(
        `INSERT INTO price_histories (shop_product_id, price_min, price_max) 
         VALUES ${values}
         RETURNING *`,
        flatValues,
      );

      console.log(
        `Scanned price for ${productInsertHistoryPrice.length} products`,
      );
    }

    // Update warning flags on products
    const productsResult = await db.query(
      "SELECT id, name, listed_price, variants FROM products",
    );
    const products = productsResult.rows;

    for (const product of products) {
      const name = product.name || "";
      const price = product.listed_price || 0;
      const variants = product?.variants || [];

      // Get shop products matching the price criteria
      const shopProductsResult = await db.query(
        `SELECT id, name, price_min, price, price_max FROM shop_products
         WHERE price_min < $1 OR price < $1 OR price_max < $1`,
        [price],
      );

      let shopProducts = shopProductsResult.rows;

      // Filter by variant names if variants exist
      if (variants.length > 0) {
        shopProducts = shopProducts.filter((shopProduct) => {
          const shopName = (shopProduct.name || "").toLowerCase();
          return variants.some((variant) => {
            const variantString = variant.toString().trim().toLowerCase();
            return (
              variantString &&
              (shopName.includes(variantString) ||
                shopName.includes(name.toLowerCase()))
            );
          });
        });
      }

      const isWarning = shopProducts.length > 0;
      await db.query("UPDATE products SET is_warning = $1 WHERE id = $2", [
        isWarning,
        product.id,
      ]);
    }

    console.log("✅ Price scan completed successfully");
  } catch (error) {
    console.error("❌ Error during price scan:", error);
    throw error;
  }
}

/**
 * Webhook handler for price scan requests
 * Validates requests using the WPR secret key
 */
async function webhookHandler(req, res) {
  try {
    // Validate secret key from header or query
    const secretKey =
      req.headers["x-webhook-secret"] || req.query.secret || req.body?.secret;

    if (!secretKey || secretKey !== WEBHOOK_SECRET) {
      console.warn("❌ Unauthorized webhook request");
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Invalid or missing secret key",
      });
    }

    // Extract product data from request body
    const { productInsertHistoryPrice } = req.body;

    if (
      !productInsertHistoryPrice ||
      !Array.isArray(productInsertHistoryPrice)
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid request: productInsertHistoryPrice array is required",
      });
    }

    // Execute price scan
    await scanPrice(productInsertHistoryPrice);

    return res.status(200).json({
      success: true,
      message: "Price scan executed successfully",
      recordsProcessed: productInsertHistoryPrice.length,
    });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

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

const parsePriceString = (s) => {
  if (s === undefined || s === null) return 0;
  if (typeof s === "number") return s;
  const str = s.toString().toLowerCase();
  // remove currency symbols
  const cleaned = str.replace(/[,\s]+/g, "").replace(/đ/g, "");
  // handle k notation
  const kMatch = cleaned.match(/([0-9.]+)k/);
  if (kMatch) return Number(kMatch[1]) * 1000;
  const numMatch = cleaned.match(/([0-9.]+)/);
  return numMatch ? Number(numMatch[1]) : 0;
};

/**
 * Webhook handler to import an array of products into a shop.
 * Expects body: { products: [ ... ], shopUrl: 'https://shopee.vn/shop/...' }
 * Skips products where `external_id` / `Product ID` already exists for the shop.
 */
async function importProductsWebhookHandler(req, res) {
  try {
    const secretKey =
      req.headers["x-webhook-secret"] || req.query.secret || req.body?.secret;
    if (!secretKey || secretKey !== WEBHOOK_SECRET) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Invalid or missing secret key",
      });
    }

    let products = req.body?.products || req.body?.data?.products || [];
    const shopUrl =
      req.body?.shopUrl || req.body?.shop_url || req.body?.shop || null;

    if (!products || !Array.isArray(products)) {
      return res.status(400).json({
        success: false,
        error: "Invalid request: products array is required",
      });
    }

    // flatten if wrapped in an extra array
    if (products.length === 1 && Array.isArray(products[0]))
      products = products[0];

    // find shop
    let shopId = null;
    if (shopUrl) {
      const { rows: shopRows } = await db.query(
        "SELECT id, code, url FROM shops WHERE url = $1 LIMIT 1",
        [shopUrl],
      );
      if (shopRows && shopRows.length > 0) shopId = shopRows[0].id;
      else {
        const code = generateShopCode(shopUrl);
        if (code) {
          const { rows: codeRows } = await db.query(
            "SELECT id FROM shops WHERE code = $1 LIMIT 1",
            [code],
          );
          if (codeRows && codeRows.length > 0) shopId = codeRows[0].id;
        }
      }
    }

    if (!shopId) {
      return res.status(404).json({
        success: false,
        error: "Shop not found for provided shopUrl",
        shopUrl,
      });
    }

    const inserted = [];
    const skipped = [];

    for (const p of products) {
      const external_id = (
        p["Product ID"] ||
        p.external_id ||
        p["external_id"] ||
        ""
      ).toString();
      if (!external_id) {
        skipped.push({ reason: "missing_external_id", product: p });
        continue;
      }

      // check existing
      const { rows: exist } = await db.query(
        "SELECT id FROM shop_products WHERE external_id = $1 AND shop_id = $2 LIMIT 1",
        [external_id, shopId],
      );
      if (exist && exist.length > 0) {
        skipped.push({ external_id, reason: "already_exists" });
        continue;
      }

      const name = p["Tên sản phẩm"] || p.name || "";
      const url = p.URL || p.url || null;
      const price = parsePriceString(p["Giá"] || p.price || 0);
      const rating = p["Đánh giá"] ? Number(p["Đánh giá"]) : null;
      const sold =
        p["Đã bán"] ? Number(String(p["Đã bán"]).replace(/\D/g, "")) : 0;
      const image = p["image"] || p.image || null;

      const insertQuery = `
        INSERT INTO shop_products(name, price_min, price_max, price, rating, sold, image, external_link,  description, external_id, shop_id, brand, models, variants)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        RETURNING *
      `;

      const insertParams = [
        name,
        price,
        price,
        price,
        rating,
        sold,
        image,
        url,
        null,
        external_id,
        shopId,
        null,
        [],
        [],
      ];

      const { rows: newRows } = await db.query(insertQuery, insertParams);
      inserted.push(newRows[0]);
    }

    // fetech to
    //tool-api.gitlabserver.id.vn/common/test?shopUrl=''
    fetch(
      `http://tool-api.gitlabserver.id.vn/common/test?shopUrl=${encodeURIComponent(
        shopUrl,
      )}`,
    );

    https: return res.status(200).json({
      success: true,
      inserted: inserted.length,
      skipped: skipped.length,
      details: { inserted, skipped },
    });
  } catch (error) {
    console.error("❌ importProductsWebhookHandler error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export {
  importProductsWebhookHandler,
  scanPrice,
  WEBHOOK_SECRET,
  webhookHandler,
};
export default { scanPrice, webhookHandler, importProductsWebhookHandler };
