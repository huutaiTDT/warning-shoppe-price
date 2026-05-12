/**
 * Product Service - Handle data fetching and parsing
 * @format
 */

import { SELECTORS } from "./constants.js";
import { extractProductData } from "./utils.js";

/**
 * Parse products from HTML content
 * @param {string} htmlContent - HTML string to parse
 * @returns {Array} Array of product objects
 */
export function parseProductsFromHTML(htmlContent) {
  const products = [];

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");

    // Try primary selector first, then fallback
    let productItems = doc.querySelectorAll(SELECTORS.PRODUCT_ITEM);
    if (productItems.length === 0) {
      productItems = doc.querySelectorAll(SELECTORS.PRODUCT_ITEM_FALLBACK);
    }

    console.log(`Found ${productItems.length} products in HTML`);

    productItems.forEach((item, index) => {
      try {
        const product = extractProductData(item, index);
        if (product) products.push(product);
      } catch (error) {
        console.warn(`Error parsing product item ${index}:`, error);
      }
    });
  } catch (error) {
    console.error("Error parsing HTML:", error);
    throw error;
  }

  return products;
}
