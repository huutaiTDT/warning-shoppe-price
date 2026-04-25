/** @format */
import { supabase } from "../lib/supabase.js";

const scanAndUpdateWarningProduct = async (productId) => {
  const { data: product, error: getError } = await supabase
    .from("products")
    .select("id, name, listed_price, variants")
    .eq("id", productId)
    .single();
  if (getError || !product) {
    throw new Error("Product not found");
  }
  const name = product.name || "";
  const price = product.listed_price || 0;
  const variants = product?.variants;
  const warnings = [];
  const query = supabase
    .from("shop_products")
    .select("id, name, price_min, price, price_max, shop_id")
    .or(`price_min.lt.${price},price.lt.${price},price_max.lt.${price}`);
  let queryFilter = ``;
  for (const row of variants || []) {
    const variantString = row.toString().trim()?.toLowerCase();
    if (variantString) {
      if (queryFilter.length > 0) {
        queryFilter += ",";
      }
      queryFilter += `name.ilike.%${variantString}%`;
    }
  }
  const { data: shopProducts, error: shopProductError } =
    await query.or(queryFilter);
  if (shopProductError) {
    console.error(
      "Error fetching shop products for warning check:",
      shopProductError,
    );
    return;
  }
  const isWarning = shopProducts?.length > 0 ? true : false;
  await supabase
    .from("products")
    .update({
      is_warning: isWarning,
    })
    .eq("id", productId);
};

export { scanAndUpdateWarningProduct };
