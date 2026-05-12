/**
 * Constants for Shopee Product Exporter
 * @format
 */

export const CONFIG = {
  SHOPEE_URL: "shopee.vn",
  SHOPEE_API: "https://shopee.vn/api/v4/shop/search_items",
  ITEMS_PER_PAGE: 50,
  API_DELAY: 500, // Milliseconds to avoid rate limit
};

export const SELECTORS = {
  PRODUCT_ITEM: ".shop-search-result-view__item",
  PRODUCT_ITEM_FALLBACK: "[role='group'][aria-label*='Product card']",
  PRODUCT_TITLE: ".whitespace-normal.line-clamp-2",
  PRODUCTS_CONTAINER: ".shop-search-result-view",
};

export const REGEX = {
  PRICE: /^\d+[.,]\d{3}/,
  DISCOUNT: /-(\d+)%/,
  RATING: /^[4-5]\.\d$/,
  SOLD: /(\d+[kKmM]\+?|\d+)/,
  SHOP_ID: /shop\/(\d+)/,
};

export const HTML_LABELS = {
  PRODUCT_CARD: "Product card: ",
  SOLD: "Đã bán",
};

export const PRODUCT_FIELDS = {
  ID: "ID",
  NAME: "Tên sản phẩm",
  PRICE: "Giá",
  DISCOUNT: "Chiết khấu",
  RATING: "Đánh giá",
  SOLD: "Đã bán",
  STOCK: "Kho",
  STATUS: "Trạng thái",
};

export const UI_TEXT = {
  LOADING: "Đang lấy dữ liệu...",
  NO_SHOPEE: "❌ Vui lòng truy cập shopee.vn",
  CONNECTION_ERROR: "❌ Lỗi kết nối",
  PARSE_ERROR: "❌ Lỗi parse HTML: ",
  NO_PRODUCTS_HTML: "❌ Không tìm thấy sản phẩm. Kiểm tra trang web Shopee",
  NO_PRODUCTS_API: "❌ Không lấy được sản phẩm",
  SUCCESS_HTML: "✅ Đã lấy thành công <strong>%s</strong> sản phẩm từ HTML",
  SUCCESS_API: "✅ Đã lấy thành công <strong>%s</strong> sản phẩm",
  LOADING_PROGRESS: "⏳ Đã lấy %s sản phẩm...",
  EXPORT_SUCCESS: "✅ Xuất file thành công: <strong>%s</strong>",
  EXPORT_ERROR: "❌ Lỗi xuất file: ",
};

export const COLORS = {
  PRIMARY_GRADIENT: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  SECONDARY_GRADIENT: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
};
