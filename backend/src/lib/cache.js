/** @format */

import { LRUCache } from "lru-cache";

// 1 GB max size
const options = {
  maxSize: 1024 * 1024 * 1024,
  // How to calculate size of items
  sizeCalculation: (value, key) => {
    if (!value) return 1;
    if (typeof value === "string") {
      return value.length;
    }
    // Approximate size of object
    return JSON.stringify(value).length;
  },
  // how long to live in ms
  ttl: 1000 * 60 * 5, // 5 minutes
};

export const cache = new LRUCache(options);

export function getCacheKey(req) {
  return `__express__${req.originalUrl || req.url}`;
}

export function clearCache() {
  cache.clear();
  console.log("[CACHE] Cleared all cache");
}
