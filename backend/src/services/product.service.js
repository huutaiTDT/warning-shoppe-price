/** @format */
import { supabase } from "../lib/supabase.js";

const scanAndUpdateWarningProduct = async (productId) => {
  const { data: product, error: getError } = await supabase
    .from("products")
    .select("id, name, listed_price")
    .eq("id", productId)
    .single();
  if (getError || !product) {
    throw new Error("Product not found");
  }
  const name = product.name || "";
  const price = product.listed_price || 0;
  const { data: shopProducts, error: shopProductError } = await supabase
    .from("shop_products")
    .select("id, name, price_min, price, price_max")
    .ilike("name", `%${name}%`)
    .or(`price_min.lt.${price},price.lt.${price},price_max.lt.${price}`);
  const isWarning = shopProducts?.length > 0 ? true : false;
  await supabase
    .from("products")
    .update({
      is_warning: isWarning,
    })
    .eq("id", productId);
};

export { scanAndUpdateWarningProduct };
