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

export { scanPrice, WEBHOOK_SECRET, webhookHandler };
export default { scanPrice, webhookHandler };
