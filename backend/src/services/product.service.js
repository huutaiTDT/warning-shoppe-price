/** @format */
import db from "../lib/db.js";

const scanAndUpdateWarningProduct = async (productId) => {
  const { rows: productRows } = await db.query(
    "SELECT id, name, listed_price, variants FROM products WHERE id = $1",
    [productId],
  );
  const product = productRows[0];

  if (!product) {
    throw new Error("Product not found");
  }

  const price = product.listed_price || 0;
  const variants = product?.variants || [];

  let query = `
    SELECT id, name, price_min, price, price_max, shop_id 
    FROM shop_products 
    WHERE (price_min < $1 OR price < $1 OR price_max < $1)
  `;
  const params = [price];

  if (variants.length > 0) {
    const variantClauses = variants.map(
      (_, i) => `name ILIKE $${params.length + i + 1}`,
    );
    query += ` AND (${variantClauses.join(" OR ")})`;
    params.push(...variants.map((v) => `%${v.toString().trim()}%`));
  }

  const { rows: shopProducts } = await db.query(query, params);

  const isWarning = shopProducts?.length > 0;

  await db.query("UPDATE products SET is_warning = $1 WHERE id = $2", [
    isWarning,
    productId,
  ]);
};

export { scanAndUpdateWarningProduct };
