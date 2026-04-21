/** @format */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

import cors from "cors";
import express from "express";

// Import routes
import { tenantContextMiddleware } from "./middleware/tenantContext.js";
import accountsRoutes from "./routes/accounts.js";
import authRoutes from "./routes/auth.js";
import brandPermissionsRoutes from "./routes/brandPermissions.js";
import masterDataBrandsRoutes from "./routes/brands.js";
import crawlRoutes from "./routes/crawl.js";
import crawlHistoryRoutes from "./routes/crawlHistory.js";
import productsRoutes from "./routes/products-shop.js";
import masterProductsRoutes from "./routes/products.js";
import masterDataShopsRoutes from "./routes/shops.js";

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  "*",
  "http://localhost:5173",
  "https://warning-shoppe-price.vercel.app",
  "https://warning-price.gitlabserver.id.vn",
  ...(process.env.CORS_ORIGIN ? [process.env.CORS_ORIGIN] : []),
  ...(process.env.CORS_ORIGINS ?
    process.env.CORS_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  : []),
];

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
};

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date() });
});

// API Routes
app.use("/auth", authRoutes);
app.use("/accounts", accountsRoutes);
app.use("/master-data/brands", masterDataBrandsRoutes);
app.use(
  "/master-data/brand-permissions",
  tenantContextMiddleware,
  brandPermissionsRoutes,
);
app.use("/master-data/shops", crawlRoutes);
app.use("/products", tenantContextMiddleware, productsRoutes);
app.use("/crawl-history", crawlHistoryRoutes);
app.use("/master-data/products", tenantContextMiddleware, masterProductsRoutes);
app.use("/master-data/shops", masterDataShopsRoutes);

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
  console.log(`✓ Backend running on http://localhost:${PORT}`);
  console.log(`✓ Frontend should connect to http://localhost:${PORT}/api`);
});
