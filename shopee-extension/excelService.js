/**
 * Excel Export Service
 * @format
 */

import { getFilename } from "./utils.js";

/**
 * Export products to Excel file
 * @param {Array} products - Array of product objects
 * @returns {string} Filename of exported file
 */
export function exportToExcel(products) {
  if (!products || products.length === 0) {
    throw new Error("No products to export");
  }

  if (!window.XLSX) {
    throw new Error("XLSX library not loaded");
  }

  try {
    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(products);

    // Set column widths
    worksheet["!cols"] = getColumnWidths();

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sản phẩm");

    // Generate filename and save
    const filename = getFilename("shopee-products");
    XLSX.writeFile(workbook, filename);

    return filename;
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    throw error;
  }
}

/**
 * Get column width configurations
 * @returns {Array} Column width array
 */
function getColumnWidths() {
  return [
    { wch: 12 }, // ID
    { wch: 40 }, // Tên sản phẩm
    { wch: 15 }, // Giá
    { wch: 12 }, // Chiết khấu
    { wch: 10 }, // Đánh giá
    { wch: 12 }, // Đã bán
    { wch: 10 }, // Kho
    { wch: 15 }, // Trạng thái
  ];
}
