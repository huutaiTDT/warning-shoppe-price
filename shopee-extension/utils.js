/**
 * Utility functions for Shopee Product Exporter
 * @format
 */

import { HTML_LABELS, PRODUCT_FIELDS, REGEX } from "./constants.js";

/**
 * Extract shop ID from current URL
 * @returns {string|null} Shop ID or null if not found
 */
export function getShopId() {
  const match = window.location.href.match(REGEX.SHOP_ID);
  return match ? match[1] : null;
}

/**
 * Check if current page is Shopee
 * @param {string} url - URL to check
 * @returns {boolean}
 */
export function isShopeeUrl(url) {
  return url.includes("shopee.vn");
}

/**
 * Parse Vietnamese price format (e.g., 123.456 or 123,456)
 * @param {string} priceText - Price text to parse
 * @returns {number} Price as integer
 */
export function parsePrice(priceText) {
  if (!priceText || !/\d/.test(priceText)) return 0;
  let numStr = priceText.replace(/[.,]/g, "");
  return parseInt(numStr, 10) || 0;
}

/**
 * Format price for display (e.g., 123456 -> "123k đ")
 * @param {number} price - Price to format
 * @returns {string}
 */
export function formatPrice(price) {
  if (price <= 0) return "0 đ";
  return Math.floor(price / 1000) + "k đ";
}

/**
 * Extract product data from HTML element
 * @param {Element} item - Product HTML element
 * @param {number} index - Product index
 * @returns {Object|null} Product object or null if invalid
 */
export function extractProductData(item, index) {
  const product = {
    [PRODUCT_FIELDS.ID]: index + 1,
    [PRODUCT_FIELDS.NAME]: extractProductName(item),
    [PRODUCT_FIELDS.PRICE]: 0,
    [PRODUCT_FIELDS.DISCOUNT]: 0,
    [PRODUCT_FIELDS.RATING]: 4.5,
    [PRODUCT_FIELDS.SOLD]: "0",
    [PRODUCT_FIELDS.STATUS]: "Hoạt động",
  };

  // Extract price
  const price = extractPrice(item);
  product[PRODUCT_FIELDS.PRICE] = formatPrice(price);

  // Extract discount
  const discount = extractDiscount(item);
  product[PRODUCT_FIELDS.DISCOUNT] = discount ? `${discount}%` : "0%";

  // Extract rating
  const rating = extractRating(item);
  product[PRODUCT_FIELDS.RATING] = rating;

  // Extract sold count
  product[PRODUCT_FIELDS.SOLD] = extractSoldCount(item);

  // Only return if we have essential data
  return product[PRODUCT_FIELDS.NAME] && price > 0 ? product : null;
}

/**
 * Extract product name from element
 * @param {Element} item - Product element
 * @returns {string}
 */
function extractProductName(item) {
  // Try from aria-label first
  const ariaLabel = item.querySelector("[aria-label*='Product card']");
  if (ariaLabel) {
    const label = ariaLabel.getAttribute("aria-label") || "";
    return label.replace(HTML_LABELS.PRODUCT_CARD, "").trim();
  }

  // Fallback to title element
  const titleEl = item.querySelector(".whitespace-normal.line-clamp-2");
  return titleEl?.textContent?.trim() || "";
}

/**
 * Extract price from element
 * @param {Element} item - Product element
 * @returns {number}
 */
function extractPrice(item) {
  const spans = item.querySelectorAll("span");
  for (let span of spans) {
    const text = span.textContent?.trim() || "";
    if (REGEX.PRICE.test(text)) {
      const price = parsePrice(text);
      if (price > 0) return price;
    }
  }
  return 0;
}

/**
 * Extract discount percentage from element
 * @param {Element} item - Product element
 * @returns {number|null}
 */
function extractDiscount(item) {
  const spans = item.querySelectorAll("span");
  for (let span of spans) {
    const text = span.textContent?.trim() || "";
    const match = text.match(REGEX.DISCOUNT);
    if (match) return parseInt(match[1]);
  }
  return null;
}

/**
 * Extract rating from element
 * @param {Element} item - Product element
 * @returns {number}
 */
function extractRating(item) {
  const spans = item.querySelectorAll("span");
  for (let span of spans) {
    const text = span.textContent?.trim() || "";
    if (REGEX.RATING.test(text)) {
      return parseFloat(text);
    }
  }
  return 4.5;
}

/**
 * Extract sold count from element
 * @param {Element} item - Product element
 * @returns {string}
 */
function extractSoldCount(item) {
  const allElements = item.querySelectorAll("*");
  for (let elem of allElements) {
    const text = elem.textContent?.trim() || "";
    if (text.includes(HTML_LABELS.SOLD)) {
      const match = text.match(REGEX.SOLD);
      if (match) return match[1];
    }
  }
  return "0";
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds
 * @returns {Promise}
 */
export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format filename with timestamp
 * @param {string} prefix - Filename prefix
 * @returns {string}
 */
export function getFilename(prefix = "shopee-products") {
  return `${prefix}-${new Date().getTime()}.xlsx`;
}
