/** @format */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

import cors from "cors";
import express from "express";

// Import routes
import accountSettingsRoutes from "./routes/accountSettings.js";
import authRoutes from "./routes/auth.js";
import brandsRoutes from "./routes/brands.js";
import crawlRoutes from "./routes/crawl.js";
import crawlHistoryRoutes from "./routes/crawlHistory.js";
import dashboardRoutes from "./routes/dashboard.js";
import postSchedulesRoutes from "./routes/postSchedules.js";
import productsRoutes from "./routes/products.js";
import shopsRoutes from "./routes/shops.js";
import { startPostScheduler } from "./services/postScheduler.js";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  }),
);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date() });
});

// API Routes
app.use("/auth", authRoutes);
app.use("/shops", shopsRoutes);
app.use("/shops", crawlRoutes);
app.use("/products", productsRoutes);
app.use("/crawl-history", crawlHistoryRoutes);
app.use("/master-data/brands", brandsRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/account-settings", accountSettingsRoutes);
app.use("/post-schedules", postSchedulesRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(PORT, () => {
  startPostScheduler();
  console.log(`✓ Backend running on http://localhost:${PORT}`);
  console.log(`✓ Frontend should connect to http://localhost:${PORT}/api`);
});
