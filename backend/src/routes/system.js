/** @format */

import express from "express";
import { clearCache } from "../lib/cache.js";

const router = express.Router();

// Clear all cache
router.post("/cache/clear", (req, res) => {
  try {
    clearCache();
    res.json({ success: true, message: "Cache cleared successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
