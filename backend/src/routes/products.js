/** @format */

import ExcelJS from "exceljs";
import { Router } from "express";
import multer from "multer";
import { supabase } from "../lib/supabase.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

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
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search || "";
    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : null;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : null;
    const minRating =
      req.query.minRating ? parseFloat(req.query.minRating) : null;
    const shopId = req.query.shop || "";
    const overOriginal = req.query.overOriginal === "true";

    const limit = 25;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("products_aff")
      .select("*, shops!shop_id(id, name)", { count: "exact" });

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    if (minPrice !== null) {
      query = query.gte("price_min", minPrice);
    }

    if (maxPrice !== null) {
      query = query.lte("price_max", maxPrice);
    }

    if (minRating !== null) {
      query = query.gte("rating", minRating);
    }

    if (shopId) {
      query = query.eq("shop_id", shopId);
    }

    const sortedQuery = query.order("created_at", { ascending: false });
    const {
      data: products,
      error,
      count,
    } = await sortedQuery.range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const normalizedProducts = (products || []).map((product) => {
      const fallbackPrice = Number(product.price) || 0;
      const priceMin = Number(product.price_min ?? fallbackPrice);
      const priceMax = Number(product.price_max ?? fallbackPrice);
      const priceOriginal = Number(product.original_price ?? 0);
      const isAboveOriginal = priceOriginal > 0 && priceMin > priceOriginal;

      let priceTrend = "equal";
      if (priceOriginal > 0) {
        if (priceMax < priceOriginal) priceTrend = "down";
        else if (priceMin > priceOriginal) priceTrend = "up";
      }

      return {
        ...product,
        priceMin,
        priceMax,
        priceOriginal,
        shopeeAvgPrice: (priceMin + priceMax) / 2,
        priceDelta: (priceMin + priceMax) / 2 - priceOriginal,
        priceTrend,
        isAboveOriginal,
        shopId: product.shop_id,
        shopName: product.shops?.name || null,
      };
    });

    const filteredProducts =
      overOriginal ?
        normalizedProducts.filter((p) => !p.isAboveOriginal)
      : normalizedProducts;

    res.json({
      products: filteredProducts,
      total: overOriginal ? filteredProducts.length : count || 0,
      page,
      limit,
      pages: Math.ceil(
        (overOriginal ? filteredProducts.length : count || 0) / limit,
      ),
    });
  } catch (error) {
    console.error("Error fetching products:", error);
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

    if (!name || !priceMin || !priceMax) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!shop_id) {
      return res.status(400).json({ error: "Shop ID required" });
    }

    const { data: product, error } = await supabase
      .from("products_aff")
      .insert({
        shop_id,
        name,
        price_min: priceMin,
        price_max: priceMax,
        price: price || (priceMin + priceMax) / 2,
        rating: rating || 0,
        sold: sold || 0,
        image,
        aff_link,
        original_price: original_price || 0,
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

export default router;
