/** @format */

import ExcelJS from "exceljs";
import { Router } from "express";
import multer from "multer";
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
  };
};

const applyListFilters = (
  query,
  { search, minPrice, maxPrice, minRating, shopId },
) => {
  let nextQuery = query;

  if (search) {
    nextQuery = nextQuery.ilike("name", `%${search}%`);
  }

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

  return nextQuery;
};

// GET: Export products to Excel (must be before GET /)
router.get("/export", async (req, res) => {
  try {
    const { data: products, error } = await supabase
      .from("products_aff")
      .select("id, name, price_min, price_max, original_price");

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Products");

    sheet.columns = [
      { header: "ID", key: "id", width: 50 },
      { header: "Tên", key: "name", width: 50 },
      { header: "Giá Min", key: "price_min", width: 15 },
      { header: "Giá Max", key: "price_max", width: 15 },
      { header: "Giá niêm yết", key: "original_price", width: 20 },
    ];

    products?.forEach((p) => sheet.addRow(p));

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
      await supabase
        .from("products_aff")
        .update({ original_price: item.original_price })
        .eq("id", item.id);
    }

    res.json({ success: true, updated: updates.length });
  } catch (error) {
    console.error("Error importing products:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET: List products with filters
router.get("/", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const search = (req.query.search || "").toString().trim();
    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : null;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : null;
    const minRating =
      req.query.minRating ? parseFloat(req.query.minRating) : null;
    const shopId = (req.query.shop || "").toString();
    const aboveOriginal = req.query.aboveOriginal == "true";
    const underOriginal = req.query.underOriginal == "true";
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 25, 1), 200);
    const offset = (page - 1) * limit;

    const filterParams = { search, minPrice, maxPrice, minRating, shopId };

    if (aboveOriginal || underOriginal) {
      const baseQuery = supabase
        .from("products_aff")
        .select("*, shops!shop_id(id, name)")
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

    const query = supabase
      .from("products_aff")
      .select("*, shops!shop_id(id, name)", { count: "exact" });

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

    const normalizedProducts = (products || []).map(normalizeProduct);

    res.json({
      products: normalizedProducts,
      total: count || 0,
      page,
      limit,
      pages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET: Product detail
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data: product, error } = await supabase
      .from("products_aff")
      .select("*, shops!shop_id(id, name)")
      .eq("id", id)
      .single();

    if (error) {
      return res.status(404).json({ error: error.message });
    }

    res.json(normalizeProduct(product));
  } catch (error) {
    console.error("Error fetching product detail:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST: Create product
router.post("/", async (req, res) => {
  try {
    const {
      name,
      priceMin,
      priceMax,
      price,
      rating,
      sold,
      image,
      aff_link,
      original_price,
      description,
      external_id,
      shop_id,
    } = req.body;

    if (!name || priceMin === undefined || priceMax === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!shop_id) {
      return res.status(400).json({ error: "Shop ID required" });
    }

    const normalizedMin = toNumber(priceMin, 0);
    const normalizedMax = toNumber(priceMax, 0);
    const normalizedPrice =
      price !== undefined ?
        toNumber(price, 0)
      : (normalizedMin + normalizedMax) / 2;

    const { data: product, error } = await supabase
      .from("products_aff")
      .insert({
        shop_id,
        name,
        price_min: normalizedMin,
        price_max: normalizedMax,
        price: normalizedPrice,
        rating: toNumber(rating, 0),
        sold: toNumber(sold, 0),
        image,
        aff_link,
        original_price: toNumber(original_price, 0),
        description,
        external_id,
        created_at: new Date(),
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Update shop status if external_id provided
    if (external_id) {
      await supabase
        .from("shops")
        .update({ is_sys_product_by_link: true })
        .eq("id", shop_id);
    }

    res.status(201).json(product);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT: Update product
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      priceMin,
      priceMax,
      price,
      rating,
      sold,
      image,
      aff_link,
      original_price,
      description,
      external_id,
      shop_id,
    } = req.body;

    const updates = {
      ...(name !== undefined ? { name } : {}),
      ...(shop_id !== undefined ? { shop_id } : {}),
      ...(priceMin !== undefined ? { price_min: toNumber(priceMin, 0) } : {}),
      ...(priceMax !== undefined ? { price_max: toNumber(priceMax, 0) } : {}),
      ...(price !== undefined ? { price: toNumber(price, 0) } : {}),
      ...(rating !== undefined ? { rating: toNumber(rating, 0) } : {}),
      ...(sold !== undefined ? { sold: toNumber(sold, 0) } : {}),
      ...(image !== undefined ? { image } : {}),
      ...(aff_link !== undefined ? { aff_link } : {}),
      ...(original_price !== undefined ?
        { original_price: toNumber(original_price, 0) }
      : {}),
      ...(description !== undefined ? { description } : {}),
      ...(external_id !== undefined ? { external_id } : {}),
      updated_at: new Date(),
    };

    if (Object.keys(updates).length === 1) {
      return res.status(400).json({ error: "No fields to update" });
    }

    if (updates.price_min !== undefined && updates.price_max !== undefined) {
      updates.price = (updates.price_min + updates.price_max) / 2;
    }

    const { data: product, error } = await supabase
      .from("products_aff")
      .update(updates)
      .eq("id", id)
      .select("*, shops!shop_id(id, name)")
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
    const { id } = req.params;

    const { error } = await supabase.from("products_aff").delete().eq("id", id);

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
