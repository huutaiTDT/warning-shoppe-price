/** @format */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

import cors from "cors";
import express from "express";
import fs from "fs";

// Import routes
import { cacheMiddleware } from "./middleware/cache.js";
import { tenantContextMiddleware } from "./middleware/tenantContext.js";
import accountsRoutes from "./routes/accounts.js";
import authRoutes from "./routes/auth.js";
import brandPermissionsRoutes from "./routes/brandPermissions.js";
import masterDataBrandsRoutes from "./routes/brands.js";
import crawlRoutes from "./routes/crawl.js";
import crawlHistoryRoutes from "./routes/crawlHistory.js";
import guidesRoutes from "./routes/guides.js";
import productsRoutes from "./routes/products-shop.js";
import masterProductsRoutes from "./routes/products.js";
import reportsRoutes from "./routes/reports.js";
import masterDataShopsRoutes from "./routes/shops.js";
import syncRoutes from "./routes/sync.js";
import systemRoutes from "./routes/system.js";
import webHookRoutes from "./routes/webhook.js";

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  "*",
  "https://shopee.vn",
  "https://tool-api.gitlabserver.id.vn",
  "http://localhost:5175",
  "http://localhost:5432",
  "http://localhost:5173",
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

// Apply cache to all GET requests
app.use((req, res, next) => {
  if (req.method === "GET") {
    return cacheMiddleware(req, res, next);
  }
  next();
});

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
app.use("/sync", syncRoutes);
app.use("/reports", reportsRoutes);
app.use("/webhook", webHookRoutes);
app.use("/master-data/guides", guidesRoutes);
app.use("/system", systemRoutes);

function printRoutes(app) {
  const logDir = path.join(__dirname, "..", "logs");
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
  }
  const logFile = path.join(logDir, "routes.log");

  let output = "==========================================\n";
  output += "      REGISTERED API ROUTES\n";
  output += `   (Updated at ${new Date().toISOString()})\n`;
  output += "==========================================\n";

  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      // Routes registered directly on the app
      const methods = Object.keys(middleware.route.methods)
        .join(", ")
        .toUpperCase();
      routes.push(`[${methods}] ${middleware.route.path}`);
    } else if (middleware.name === "router") {
      // Routes registered on a sub-router
      const servicePath = middleware.regexp
        .toString()
        .replace(/\\/g, "")
        .replace("?i", "")
        .slice(2, -1)
        .replace("(?:\\/)?", "")
        .replace("(?=\\/|$)", "");

      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          const methods = Object.keys(handler.route.methods)
            .join(", ")
            .toUpperCase();
          // Combine the sub-router path with the route path
          const fullPath = (
            servicePath + (handler.route.path === "/" ? "" : handler.route.path)
          ).replace("//", "/");
          routes.push(`[${methods}] ${fullPath}`);
        }
      });
    }
  });

  // Sort routes alphabetically for better readability
  routes.sort();
  output += routes.join("\n");
  output += "\n==========================================\n";

  fs.writeFileSync(logFile, output);
  console.log(`✓ API routes have been logged to ${logFile}`);
}

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
  printRoutes(app);
});
