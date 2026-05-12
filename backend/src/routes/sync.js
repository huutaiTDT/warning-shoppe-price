/** @format */

import { Router } from "express";
import { syncAllData } from "../services/sync.service.js";

const router = Router();

router.post("/run", async (req, res) => {
  try {
    console.log("Starting manual data synchronization...");
    const results = await syncAllData();
    console.log("Manual data synchronization finished.");
    res.json({
      message: "Synchronization process completed.",
      results,
    });
  } catch (error) {
    console.error("Error during manual data synchronization:", error);
    res.status(500).json({
      error: "An error occurred during synchronization.",
      details: error.message,
    });
  }
});

export default router;
