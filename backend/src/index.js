/** @format */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

import cors from "cors";
import express from "express";

// Import routes
import authRoutes from "./routes/auth.js";
import crawlRoutes from "./routes/crawl.js";
import productsRoutes from "./routes/products.js";
import shopsRoutes from "./routes/shops.js";

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
app.use("/api/auth", authRoutes);
app.use("/api/shops", shopsRoutes);
app.use("/api/shops", crawlRoutes);
app.use("/api/products", productsRoutes);

// Error handling middleware
app.use((err, req, res) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(PORT, () => {
  console.log(`✓ Backend running on http://localhost:${PORT}`);
  console.log(`✓ Frontend should connect to http://localhost:${PORT}/api`);
});
