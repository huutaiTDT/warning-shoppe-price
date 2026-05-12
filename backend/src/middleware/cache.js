/** @format */

import { cache, getCacheKey } from "../lib/cache.js";

export const cacheMiddleware = (req, res, next) => {
  const key = getCacheKey(req);
  const cachedBody = cache.get(key);

  if (cachedBody) {
    console.log(`[CACHE] HIT: ${key}`);
    res.send(cachedBody);
    return;
  }

  console.log(`[CACHE] MISS: ${key}`);
  const originalSend = res.send;
  res.send = (body) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      cache.set(key, body);
    }
    originalSend.call(res, body);
  };

  next();
};
