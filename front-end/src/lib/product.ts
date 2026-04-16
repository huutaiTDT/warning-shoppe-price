/** @format */

export const normalizeProduct = (product: any) => {
  const priceMin = Number(
    product.priceMin ?? product.price_min ?? product.price ?? 0,
  );
  const priceMax = Number(
    product.priceMax ?? product.price_max ?? product.price ?? 0,
  );
  const priceOriginal = Number(
    product.priceOriginal ??
      product.original_price ??
      product.price_original ??
      0,
  );

  const shopeeAvgPrice = (priceMin + priceMax) / 2;
  const priceDelta = shopeeAvgPrice - priceOriginal;
  const isUnderOriginal = priceOriginal > 0 && shopeeAvgPrice < priceOriginal;
  const isOverOriginal = priceOriginal > 0 && shopeeAvgPrice > priceOriginal;

  const priceTrend =
    isUnderOriginal ? "down"
    : isOverOriginal ? "up"
    : "equal";

  return {
    ...product,
    priceMin,
    priceMax,
    priceOriginal,
    shopeeAvgPrice,
    priceDelta,
    priceTrend,
    isUnderOriginal,
    isOverOriginal,
    shopId: product.shopId ?? product.shop_id ?? product.shops?.id,
    shopName: product.shopName ?? product.shops?.name ?? "Không rõ shop",
    thumbnail: product.thumbnail ?? product.image ?? "",
    brand:
      product.brand ??
      product.brandName ??
      product.shopName ??
      product.shops?.name ??
      "Không rõ",
  };
};
