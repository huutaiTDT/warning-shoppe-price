/** @format */

import axios from "axios";
import ExcelJS from "exceljs";
import { Router } from "express";
import multer from "multer";
import { requireAuthUserId } from "../lib/requestAuth.js";
import { supabase } from "../lib/supabase.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeProduct = (product) => {
  const fallbackPrice = toNumber(product.price, 0);
  const priceMin = toNumber(product.price_min, fallbackPrice);
  const priceMax = toNumber(product.price_max, fallbackPrice);
  const priceOriginal = toNumber(product.original_price, 0);
  const shopeeAvgPrice = (priceMin + priceMax) / 2;
  const isUnderOriginal = priceOriginal > 0 && shopeeAvgPrice < priceOriginal;
  const isAboveOriginal = priceOriginal > 0 && shopeeAvgPrice > priceOriginal;

  let priceTrend = "equal";
  if (isUnderOriginal) priceTrend = "down";
  else if (isAboveOriginal) priceTrend = "up";

  return {
    ...product,
    models: Array.isArray(product.models) ? product.models : [],
    variants: Array.isArray(product.variants) ? product.variants : [],
    priceMin,
    priceMax,
    priceOriginal,
    shopeeAvgPrice,
    priceDelta: shopeeAvgPrice - priceOriginal,
    priceTrend,
    isUnderOriginal,
    isAboveOriginal,
    shopId: product.shop_id,
    shopName: product.shops?.name || null,
    shopCode: product.shops?.code || null,
    shopPlatform: product.shops?.platform || null,
  };
};

const normalizeStringArray = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => (item || "").toString().trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const normalizeVariants = normalizeStringArray;
const normalizeModels = normalizeStringArray;

const matchSearch = (product, search) => {
  if (!search) return true;
  const q = search.toLowerCase();
  const name = (product?.name || "").toString().toLowerCase();
  const variants =
    Array.isArray(product?.variants) ?
      product.variants.map((item) => (item || "").toString().toLowerCase())
    : [];
  const models =
    Array.isArray(product?.models) ?
      product.models.map((item) => (item || "").toString().toLowerCase())
    : [];

  return (
    name.includes(q) ||
    variants.some((item) => item.includes(q)) ||
    models.some((item) => item.includes(q))
  );
};

const applyListFilters = (
  query,
  { search, minPrice, maxPrice, minRating, shopId, brand },
) => {
  let nextQuery = query;

  if (minPrice !== null) {
    nextQuery = nextQuery.gte("price_min", minPrice);
  }

  if (maxPrice !== null) {
    nextQuery = nextQuery.lte("price_max", maxPrice);
  }

  if (minRating !== null) {
    nextQuery = nextQuery.gte("rating", minRating);
  }

  if (shopId) {
    nextQuery = nextQuery.eq("shop_id", shopId);
  }

  if (brand) {
    nextQuery = nextQuery.ilike("brand", `%${brand}%`);
  }

  return nextQuery;
};

// GET: Count products under original price (DB-based)
router.get("/under-original-count", async (req, res) => {
  try {
    const { userId } = requireAuthUserId(req, res);
    if (!userId) return;

    const search = (req.query.search || "").toString().trim();
    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : null;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : null;
    const minRating =
      req.query.minRating ? parseFloat(req.query.minRating) : null;
    const shopId = (req.query.shop || "").toString();
    const brand = (req.query.brand || "").toString().trim();

    const filterParams = {
      search,
      minPrice,
      maxPrice,
      minRating,
      shopId,
      brand,
    };

    const baseQuery = supabase
      .from("shop_products")
      .select(
        "id, price, price_min, price_max, original_price, shops!shop_id(id, owner_id)",
      );

    const { data: products, error } = await applyListFilters(
      baseQuery,
      filterParams,
    );

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const count = (products || []).reduce((acc, product) => {
      if (product.shops?.owner_id !== userId) return acc;
      const normalized = normalizeProduct(product);
      return normalized.isUnderOriginal ? acc + 1 : acc;
    }, 0);

    return res.json({ count });
  } catch (error) {
    console.error("Error counting products under original price:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET: Export products to Excel (must be before GET /)
router.get("/export", async (req, res) => {
  try {
    const { userId } = requireAuthUserId(req, res);
    if (!userId) return;

    const { data: products, error } = await supabase
      .from("shop_products")
      .select(
        "id, name, models, variants, price_min, price_max, original_price, shops!shop_id(owner_id)",
      );

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Products");

    sheet.columns = [
      { header: "ID", key: "id", width: 50 },
      { header: "Tên", key: "name", width: 50 },
      { header: "Models", key: "models", width: 30 },
      { header: "Variants", key: "variants", width: 30 },
      { header: "Giá Min", key: "price_min", width: 15 },
      { header: "Giá Max", key: "price_max", width: 15 },
      { header: "Giá niêm yết", key: "original_price", width: 20 },
    ];

    (products || [])
      .filter((p) => p.shops?.owner_id === userId)
      .forEach((p) =>
        sheet.addRow({
          ...p,
          models: Array.isArray(p.models) ? p.models.join(", ") : "",
          variants: Array.isArray(p.variants) ? p.variants.join(", ") : "",
        }),
      );

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", "attachment; filename=products.xlsx");
    res.send(buffer);
  } catch (error) {
    console.error("Error exporting products:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST: Import products from Excel
router.post("/import", upload.single("file"), async (req, res) => {
  try {
    const { userId } = requireAuthUserId(req, res);
    if (!userId) return;

    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    const sheet = workbook.getWorksheet(1);
    const updates = [];

    sheet?.eachRow((row, i) => {
      if (i === 1) return; // skip header

      const id = row.getCell(1).value;
      const priceOriginal = row.getCell(5).value;

      if (id) {
        updates.push({
          id,
          original_price: Number(priceOriginal || 0),
        });
      }
    });

    for (const item of updates) {
      const existing = await supabase
        .from("shop_products")
        .select("id, shops!shop_id(owner_id)")
        .eq("id", item.id)
        .maybeSingle();

      if (existing.data?.shops?.owner_id !== userId) {
        continue;
      }

      await supabase
        .from("shop_products")
        .update({ original_price: item.original_price })
        .eq("id", item.id);
    }

    res.json({ success: true, updated: updates.length });
  } catch (error) {
    console.error("Error importing products:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST: Sync product info from Shopee link via external parser API
router.post("/sync-from-link", async (req, res) => {
  try {
    const link = (req.body?.link || "").toString().trim();

    if (!link) {
      return res.status(400).json({ error: "Shopee link is required" });
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(link);
    } catch {
      return res.status(400).json({ error: "Invalid URL" });
    }

    if (!parsedUrl.hostname.includes("shopee.vn")) {
      return res.status(400).json({ error: "Only Shopee links are supported" });
    }

    const externalBaseUrl =
      process.env.EXTERNAL_PRODUCT_API_URL ||
      "http://[::1]:3002/common/products";
    const externalUrl = `${externalBaseUrl}/${encodeURIComponent(link)}`;

    const { data } = await axios.get(externalUrl, {
      headers: { Accept: "*/*" },
      timeout: 30000,
    });

    const product = data?.product || {};
    const priceMin = toNumber(product.priceMin ?? product.price_min, 0);
    const priceMax = toNumber(product.priceMax ?? product.price_max, priceMin);
    const normalized = {
      name: product.name || "",
      title: product.name || "",
      brand: product.brand || null,
      variants: normalizeVariants(product.variants),
      image: product.image || "",
      thumbnail: product.image || "",
      gallery: Array.isArray(product.gallery) ? product.gallery : [],
      price: toNumber(product.price, priceMin),
      priceMin,
      priceMax,
      priceOriginal: toNumber(
        product.original_price ?? product.price_original,
        0,
      ),
      rating: toNumber(product.rating, 0),
      sold: toNumber(product.sold, 0),
      description: product.description || "",
      url: product.url || link,
      external_link: product.url || link,
      external_id: product.id ? String(product.id) : null,
      raw: data,
    };

    res.json(normalized);
  } catch (error) {
    const status = error.response?.status || 500;
    const detail =
      error.response?.data?.message ||
      error.message ||
      "Failed to sync from link";

    console.error("Error syncing product from link:", detail);
    res.status(status).json({ error: detail });
  }
});

// GET: List products with filters
router.get("/", async (req, res) => {
  try {
    const { userId } = requireAuthUserId(req, res);
    if (!userId) return;

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const search = (req.query.search || "").toString().trim();
    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : null;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : null;
    const minRating =
      req.query.minRating ? parseFloat(req.query.minRating) : null;
    const shopId = (req.query.shop || "").toString();
    const brand = (req.query.brand || "").toString().trim();
    const aboveOriginal = req.query.aboveOriginal == "true";
    const underOriginal = req.query.underOriginal == "true";
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 25, 1), 200);
    const offset = (page - 1) * limit;

    const filterParams = {
      search,
      minPrice,
      maxPrice,
      minRating,
      shopId,
      brand,
    };

    if (aboveOriginal || underOriginal) {
      const baseQuery = supabase
        .from("shop_products")
        .select("*, shops!shop_id(id, name, code, platform)")
        .order("created_at", { ascending: false });

      const { data: allProducts, error } = await applyListFilters(
        baseQuery,
        filterParams,
      );

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      const filteredProducts = (allProducts || [])
        .map(normalizeProduct)
        .filter((product) => {
          if (product.shops?.owner_id !== userId) return false;
          if (!matchSearch(product, search)) return false;
          if (aboveOriginal) return product.isAboveOriginal;
          return product.isUnderOriginal;
        });

      const pagedProducts = filteredProducts.slice(offset, offset + limit);

      return res.json({
        products: pagedProducts,
        total: filteredProducts.length,
        page,
        limit,
        pages: Math.ceil(filteredProducts.length / limit),
      });
    }

    if (search) {
      const fullQuery = supabase
        .from("shop_products")
        .select("*, shops!shop_id(id, name, code, platform, owner_id)")
        .order("created_at", { ascending: false });

      const { data: allProducts, error } = await applyListFilters(
        fullQuery,
        filterParams,
      );

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      const filteredProducts = (allProducts || [])
        .map(normalizeProduct)
        .filter(
          (product) =>
            product.shops?.owner_id === userId && matchSearch(product, search),
        );

      const pagedProducts = filteredProducts.slice(offset, offset + limit);

      return res.json({
        products: pagedProducts,
        total: filteredProducts.length,
        page,
        limit,
        pages: Math.ceil(filteredProducts.length / limit),
      });
    }

    const query = supabase
      .from("shop_products")
      .select("*, shops!shop_id(id, name, code, platform, owner_id)", {
        count: "exact",
      });

    const sortedQuery = applyListFilters(query, filterParams).order(
      "created_at",
      {
        ascending: false,
      },
    );
    const {
      data: products,
      error,
      count,
    } = await sortedQuery.range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const normalizedProducts = (products || [])
      .map(normalizeProduct)
      .filter((product) => product.shops?.owner_id === userId);

    res.json({
      products: normalizedProducts,
      total: normalizedProducts.length,
      page,
      limit,
      pages: Math.ceil(normalizedProducts.length / limit),
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET: Product detail
router.get("/:id", async (req, res) => {
  try {
    const { userId } = requireAuthUserId(req, res);
    if (!userId) return;

    const { id } = req.params;

    const { data: product, error } = await supabase
      .from("shop_products")
      .select("*, shops!shop_id(id, name, code, platform, owner_id)")
      .eq("id", id)
      .single();

    if (error || product?.shops?.owner_id !== userId) {
      return res.status(404).json({ error: error.message });
    }

    res.json(normalizeProduct(product));
  } catch (error) {
    console.error("Error fetching product detail:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET: Product price history
router.get("/:id/price-history", async (req, res) => {
  try {
    const { userId } = requireAuthUserId(req, res);
    if (!userId) return;

    const { id } = req.params;
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 100, 1), 500);

    const { data: history, error } = await supabase
      .from("price_histories")
      .select("id, product_id, price_min, price_max, created_at")
      .eq("product_id", id)
      .order("crawled_at", { ascending: false })
      .limit(limit);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const { data: product } = await supabase
      .from("shop_products")
      .select("id, shops!shop_id(owner_id)")
      .eq("id", id)
      .maybeSingle();

    if (!product || product.shops?.owner_id !== userId) {
      return res
        .status(403)
        .json({ error: "Không có quyền truy cập sản phẩm" });
    }

    const items = (history || []).map((item) => {
      const min = toNumber(item.price_min, 0);
      const max = toNumber(item.price_max, 0);
      const original = toNumber(item.price_original, 0);
      const avg = (min + max) / 2;

      return {
        id: item.id,
        productId: item.product_id,
        priceMin: min,
        priceMax: max,
        priceOriginal: original,
        shopeeAvgPrice: avg,
        priceDelta: avg - original,
        rating: toNumber(item.rating, 0),
        soldCount: Number(item.sold_count || 0),
        crawledAt: item.crawled_at,
        createdAt: item.created_at,
      };
    });

    res.json({
      productId: id,
      items,
      total: items.length,
    });
  } catch (error) {
    console.error("Error fetching product price history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST: Create product
router.post("/", async (req, res) => {
  try {
    const { userId } = requireAuthUserId(req, res);
    if (!userId) return;

    const {
      name,
      priceMin,
      priceMax,
      price,
      rating,
      sold,
      image,
      external_link,
      original_price,
      description,
      external_id,
      shop_id,
      brand,
      models,
      variants,
    } = req.body;

    if (!name || priceMin === undefined || priceMax === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!shop_id) {
      return res.status(400).json({ error: "Shop ID required" });
    }

    const { data: shop } = await supabase
      .from("shops")
      .select("id, owner_id")
      .eq("id", shop_id)
      .maybeSingle();

    if (!shop || shop.owner_id !== userId) {
      return res
        .status(403)
        .json({ error: "Không có quyền thêm sản phẩm vào shop này" });
    }

    const normalizedBrand = (brand || "").toString().trim().toLowerCase();
    if (!normalizedBrand) {
      return res
        .status(403)
        .json({ error: "Không có quyền với thương hiệu này" });
    }
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT: Update product
router.put("/:id", async (req, res) => {
  try {
    const { userId } = requireAuthUserId(req, res);
    if (!userId) return;

    const { id } = req.params;
    const {
      name,
      priceMin,
      priceMax,
      price,
      rating,
      sold,
      image,
      external_link,
      original_price,
      description,
      external_id,
      shop_id,
      brand,
      models,
      variants,
    } = req.body;

    const { data: existing } = await supabase
      .from("shop_products")
      .select("id, shop_id, brand, shops!shop_id(owner_id)")
      .eq("id", id)
      .maybeSingle();

    if (!existing || existing.shops?.owner_id !== userId) {
      return res
        .status(403)
        .json({ error: "Không có quyền cập nhật sản phẩm này" });
    }

    if (shop_id !== undefined) {
      const { data: nextShop } = await supabase
        .from("shops")
        .select("id, owner_id")
        .eq("id", shop_id)
        .maybeSingle();

      if (!nextShop || nextShop.owner_id !== userId) {
        return res
          .status(403)
          .json({ error: "Không có quyền chuyển sản phẩm sang shop này" });
      }
    }

    const updates = {
      ...(name !== undefined ? { name } : {}),
      ...(shop_id !== undefined ? { shop_id } : {}),
      ...(priceMin !== undefined ? { price_min: toNumber(priceMin, 0) } : {}),
      ...(priceMax !== undefined ? { price_max: toNumber(priceMax, 0) } : {}),
      ...(price !== undefined ? { price: toNumber(price, 0) } : {}),
      ...(rating !== undefined ? { rating: toNumber(rating, 0) } : {}),
      ...(sold !== undefined ? { sold: toNumber(sold, 0) } : {}),
      ...(image !== undefined ? { image } : {}),
      ...(external_link !== undefined ? { external_link } : {}),
      ...(original_price !== undefined ?
        { original_price: toNumber(original_price, 0) }
      : {}),
      ...(description !== undefined ? { description } : {}),
      ...(external_id !== undefined ? { external_id } : {}),
      ...(brand !== undefined ? { brand } : {}),
      ...(models !== undefined ? { models: normalizeModels(models) } : {}),
      ...(variants !== undefined ?
        { variants: normalizeVariants(variants) }
      : {}),
      updated_at: new Date(),
    };

    if (Object.keys(updates).length === 1) {
      return res.status(400).json({ error: "No fields to update" });
    }

    if (updates.price_min !== undefined && updates.price_max !== undefined) {
      updates.price = (updates.price_min + updates.price_max) / 2;
    }

    const { data: product, error } = await supabase
      .from("shop_products")
      .update(updates)
      .eq("id", id)
      .select("*, shops!shop_id(id, name, code, platform)")
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (external_id !== undefined && shop_id) {
      await supabase
        .from("shops")
        .update({ is_sys_product_by_link: true })
        .eq("id", shop_id);
    }

    res.json(normalizeProduct(product));
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE: Delete product
router.delete("/:id", async (req, res) => {
  try {
    const { userId } = requireAuthUserId(req, res);
    if (!userId) return;

    const { id } = req.params;

    const { data: existing } = await supabase
      .from("shop_products")
      .select("id, shops!shop_id(owner_id)")
      .eq("id", id)
      .maybeSingle();

    if (!existing || existing.shops?.owner_id !== userId) {
      return res.status(403).json({ error: "Không có quyền xóa sản phẩm này" });
    }

    const { error } = await supabase
      .from("shop_products")
      .delete()
      .eq("id", id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
