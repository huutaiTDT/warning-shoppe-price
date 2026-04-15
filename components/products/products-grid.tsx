/** @format */

import { Card } from "@/components/ui/card";
import { formatPrice, formatPriceRange } from "@/lib/utils";

interface ProductsGridProps {
  products: any[];
  loading: boolean;
  viewMode: "grid" | "list";
  onSelectProduct: (product: any) => void;
}

const toNumber = (value: unknown) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

type PriceState = "cheaper" | "higher" | "equal";

const getGalleryFirst = (gallery: unknown) => {
  if (!gallery) return "";
  if (Array.isArray(gallery)) {
    return typeof gallery[0] === "string" ? gallery[0] : "";
  }
  if (typeof gallery === "string") {
    try {
      const parsed = JSON.parse(gallery);
      if (Array.isArray(parsed)) {
        return typeof parsed[0] === "string" ? parsed[0] : "";
      }
    } catch {
      return "";
    }
  }
  return "";
};

const getProductThumbnail = (product: any) => {
  const candidates = [
    product?.thumbnail,
    product?.thumb,
    product?.image,
    product?.image_url,
    product?.raw?.thumbnail,
    product?.raw?.image,
    product?.raw?.image_url,
    getGalleryFirst(product?.gallery),
    getGalleryFirst(product?.raw?.gallery),
    getGalleryFirst(product?.raw?.images),
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  }

  return "";
};

const getProductBrand = (product: any) => {
  const candidates = [
    product?.brand,
    product?.brand_name,
    product?.brandName,
    product?.raw?.brand,
    product?.raw?.brand_name,
    product?.raw?.brandName,
    product?.raw?.brand?.name,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  }

  return "";
};

const getPriceMetrics = (product: any) => {
  const priceMin = toNumber(product.priceMin ?? product.price_min);
  const priceMax = toNumber(product.priceMax ?? product.price_max);
  const priceOriginal = toNumber(
    product.priceOriginal ?? product.price_original ?? product.original_price,
  );
  const currentPrice =
    toNumber(product.price) ||
    (priceMin + priceMax) / 2 ||
    priceMin ||
    priceMax;
  const diff = currentPrice - priceOriginal;

  let state: PriceState = "equal";
  if (priceOriginal > 0) {
    if (currentPrice < priceOriginal) state = "cheaper";
    else if (currentPrice > priceOriginal) state = "higher";
  }

  const percentage =
    priceOriginal > 0 ? Math.round((Math.abs(diff) / priceOriginal) * 100) : 0;

  return {
    priceMin,
    priceMax,
    priceOriginal,
    currentPrice,
    diff,
    state,
    percentage,
  };
};

const getStateUI = (state: PriceState) => {
  if (state === "cheaper") {
    return {
      trend: "↓",
      priceClass: "text-emerald-400",
      badgeClass:
        "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse",
      badgeText: "🔥 Deal",
      deltaLabel: "You save",
      deltaClass: "text-emerald-400",
    };
  }

  if (state === "higher") {
    return {
      trend: "↑",
      priceClass: "text-red-400",
      badgeClass: "bg-red-500/20 text-red-400 border border-red-500/30",
      badgeText: "⚠️ Price Up",
      deltaLabel: "Price increase",
      deltaClass: "text-red-400",
    };
  }

  return {
    trend: "↔",
    priceClass: "text-slate-400",
    badgeClass: "bg-slate-500/20 text-slate-400 border border-slate-500/30",
    badgeText: "Stable",
    deltaLabel: "Difference",
    deltaClass: "text-slate-400",
  };
};

export function ProductsGrid({
  products,
  loading,
  viewMode,
  onSelectProduct,
}: ProductsGridProps) {
  // ================= LOADING =================
  if (loading) {
    return (
      <div
        className={
          viewMode === "grid" ?
            "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3"
          : "space-y-3"
        }>
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className={`bg-muted animate-pulse rounded-lg ${
              viewMode === "grid" ? "aspect-square" : "h-24"
            }`}
          />
        ))}
      </div>
    );
  }

  // ================= EMPTY =================
  if (products?.length === 0) {
    return (
      <div className='text-center py-16'>
        <p className='text-muted-foreground text-sm'>Không tìm thấy sản phẩm</p>
      </div>
    );
  }

  // ================= LIST VIEW =================
  if (viewMode === "list") {
    return (
      <div className='space-y-3'>
        {products?.map((product) => {
          const metrics = getPriceMetrics(product);
          const stateUI = getStateUI(metrics.state);
          const thumbnail = getProductThumbnail(product);
          const brand = getProductBrand(product);

          return (
            <Card
              key={product.id}
              className='group cursor-pointer rounded-lg border border-slate-800 bg-slate-900 p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg'
              onClick={() => onSelectProduct(product)}>
              <div className='flex gap-3'>
                <div className='h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-800'>
                  {thumbnail && (
                    <img
                      src={thumbnail}
                      alt={product.name}
                      className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-105'
                      loading='lazy'
                    />
                  )}
                </div>

                <div className='flex-1 min-w-0'>
                  <h3 className='line-clamp-2 text-sm font-semibold text-slate-100'>
                    {product.name}
                  </h3>

                  <div className='mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400'>
                    <span className='rounded-full bg-amber-500/20 px-2 py-0.5 text-amber-400'>
                      ⭐ {product.rating?.toFixed(1) || 0}
                    </span>
                    {product.shopName && (
                      <span className='truncate'>Shop: {product.shopName}</span>
                    )}
                    {brand && <span className='truncate'>Brand: {brand}</span>}
                  </div>

                  <div className='mt-2 flex items-end gap-2'>
                    <p className={`text-lg font-bold ${stateUI.priceClass}`}>
                      {formatPrice(metrics.currentPrice)}
                    </p>
                    {metrics.priceOriginal > 0 && (
                      <p className='text-xs text-slate-500 line-through'>
                        {formatPrice(metrics.priceOriginal)}
                      </p>
                    )}
                  </div>

                  <p className='text-xs text-slate-500'>
                    Range:{" "}
                    {formatPriceRange(metrics.priceMin, metrics.priceMax)}
                  </p>

                  <div className='mt-2 flex flex-wrap items-center gap-1.5'>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] ${stateUI.badgeClass}`}>
                      {stateUI.trend} {stateUI.badgeText}
                    </span>
                    {metrics.state === "cheaper" && metrics.percentage > 0 && (
                      <span className='rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white'>
                        -{metrics.percentage}%
                      </span>
                    )}
                  </div>

                  {metrics.priceOriginal > 0 && metrics.state !== "equal" && (
                    <p
                      className={`mt-1 text-xs font-medium ${stateUI.deltaClass}`}>
                      {stateUI.deltaLabel} {formatPrice(Math.abs(metrics.diff))}
                    </p>
                  )}

                  <div className='max-h-0 overflow-hidden text-xs text-slate-500 transition-all duration-300 group-hover:mt-2 group-hover:max-h-24'>
                    <p>Current: {formatPrice(metrics.currentPrice)}</p>
                    <p>Original: {formatPrice(metrics.priceOriginal)}</p>
                    <p>
                      Range:{" "}
                      {formatPriceRange(metrics.priceMin, metrics.priceMax)}
                    </p>
                  </div>
                </div>

                <div className='text-right text-xs text-slate-500'>
                  {product.sold > 0 && <div>{product.sold} sold</div>}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    );
  }

  // ================= GRID VIEW =================
  return (
    <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3'>
      {products?.map((product) => {
        const metrics = getPriceMetrics(product);
        const stateUI = getStateUI(metrics.state);
        const thumbnail = getProductThumbnail(product);
        const brand = getProductBrand(product);

        return (
          <Card
            key={product.id}
            className='group cursor-pointer overflow-hidden rounded-lg border border-slate-800 bg-slate-900 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl'
            onClick={() => onSelectProduct(product)}>
            {thumbnail && (
              <div className='relative w-full aspect-square overflow-hidden bg-slate-800'>
                <img
                  src={thumbnail}
                  alt={product.name}
                  className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-105'
                  loading='lazy'
                />

                <div className='absolute left-2 top-2'>
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-medium backdrop-blur-sm ${stateUI.badgeClass}`}>
                    {stateUI.trend} {stateUI.badgeText}
                  </span>
                </div>
              </div>
            )}

            <div className='space-y-1.5 p-2.5'>
              <h3 className='min-h-8 line-clamp-2 text-xs font-medium text-slate-100'>
                {product.name}
              </h3>

              <div className='flex items-end gap-1.5'>
                <p className={`text-base font-bold ${stateUI.priceClass}`}>
                  {formatPrice(metrics.currentPrice)}
                </p>
                {metrics.state === "cheaper" && metrics.percentage > 0 && (
                  <span className='rounded bg-emerald-600 px-1 py-0.5 text-[10px] font-semibold text-white'>
                    -{metrics.percentage}%
                  </span>
                )}
              </div>

              {metrics.priceOriginal > 0 && (
                <p className='text-[11px] text-slate-500 line-through'>
                  {formatPrice(metrics.priceOriginal)}
                </p>
              )}

              <p className='text-[11px] text-slate-500'>
                {formatPriceRange(metrics.priceMin, metrics.priceMax)}
              </p>

              {metrics.priceOriginal > 0 && metrics.state !== "equal" && (
                <p className={`text-[11px] font-medium ${stateUI.deltaClass}`}>
                  {metrics.state === "cheaper" ? "You save" : "Price up"}{" "}
                  {formatPrice(Math.abs(metrics.diff))}
                </p>
              )}

              <div className='flex items-center justify-between text-[10px] text-slate-500'>
                <span className='rounded-full bg-amber-500/20 px-1.5 py-0.5 text-amber-400'>
                  ⭐ {product.rating?.toFixed(1) || 0}
                </span>
                <span className='truncate max-w-[48%]'>
                  {product.shopName || "Unknown"}
                </span>
              </div>

              {brand && (
                <p className='truncate text-[10px] text-slate-400'>
                  Brand: {brand}
                </p>
              )}

              <div className='max-h-0 overflow-hidden rounded-lg bg-slate-800/50 px-2 text-[10px] text-slate-500 transition-all duration-300 group-hover:max-h-20 group-hover:py-1.5'>
                <p>Current: {formatPrice(metrics.currentPrice)}</p>
                <p>Original: {formatPrice(metrics.priceOriginal)}</p>
                <p>Sold: {product.sold || 0}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
