/**
 * Background Service Worker
 * Xử lý các tác vụ chạy nền
 *
 * @format
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log("Shopee Product Exporter - Extension installed");
});
