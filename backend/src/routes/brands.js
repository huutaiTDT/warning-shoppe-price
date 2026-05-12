/** @format */

import { Router } from "express";
import { db } from "../lib/db.js";
import { requireAuthUserId } from "../lib/requestAuth.js";

const router = Router();

router.get("/select-box", async (req, res) => {
  try {
    const { rows: brands } = await db.query(
      "SELECT id, name FROM brands WHERE is_active = true ORDER BY name ASC",
    );

    if (!brands) {
      return res.status(500).json({ error: "Failed to fetch brands" });
    }

    res.json(
      (brands || []).map((brand) => ({
        value: brand.id,
        label: brand.name,
        ...brand,
      })),
    );
  } catch (error) {
    console.error("Error fetching brand select box:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
// GET: List brands with pagination
router.get("/", async (req, res) => {
  try {
    const { userId, type } = requireAuthUserId(req);
    if (!userId) {
      res.status(500).message("Unauthorized");
      return;
    }
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 200);
    const search = (req.query.search || "").toString().trim();
    const active = (req.query.active || "").toString().trim();
    const offset = (page - 1) * limit;

    let query = "SELECT * FROM brands";
    let countQuery = "SELECT count(*) FROM brands";
    const params = [];
    const countParams = [];
    let whereClauses = [];

    if (type != "ADMIN") {
      const { rows: brandIds } = await db.query(
        "SELECT brand_id FROM account_brand_permissions WHERE user_id = $1",
        [userId],
      );
      const userBrandIds = brandIds.map((b) => b.brand_id);
      if (userBrandIds.length > 0) {
        whereClauses.push(`id IN (${userBrandIds.join(",")})`);
      } else {
        whereClauses.push("1=0"); // No brands assigned
      }
    }

    if (search) {
      whereClauses.push("name ILIKE $1");
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }

    if (active === "true") {
      whereClauses.push("is_active = true");
    } else if (active === "false") {
      whereClauses.push("is_active = false");
    }

    if (whereClauses.length > 0) {
      query += " WHERE " + whereClauses.join(" AND ");
      countQuery += " WHERE " + whereClauses.join(" AND ");
    }

    query +=
      " ORDER BY created_at DESC LIMIT $" +
      (params.length + 1) +
      " OFFSET $" +
      (params.length + 2);
    params.push(limit, offset);

    const { rows: brands } = await db.query(query, params);
    const { rows: countRows } = await db.query(countQuery, countParams);
    const count = countRows[0].count;

    if (!brands) {
      return res.status(500).json({ error: "Failed to fetch brands" });
    }

    res.json({
      brands: brands || [],
      total: count || 0,
      page,
      limit,
      pages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error("Error fetching brands:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET: Brand detail
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await db.query("SELECT * FROM brands WHERE id = $1", [id]);
    const brand = rows[0];

    if (!brand) {
      return res.status(404).json({ error: "Brand not found" });
    }

    res.json(brand);
  } catch (error) {
    console.error("Error fetching brand detail:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST: Create brand
router.post("/", async (req, res) => {
  try {
    const name = (req.body?.name || "").toString().trim();
    const code = (req.body?.code || "").toString().trim();
    const description = (req.body?.description || "").toString().trim();
    const is_active = req.body?.is_active ?? true;

    if (!name) {
      return res.status(400).json({ error: "Brand name is required" });
    }

    const { rows } = await db.query(
      "INSERT INTO brands (name, code, description, is_active) VALUES ($1, $2, $3, $4) RETURNING *",
      [name, code || null, description || null, Boolean(is_active)],
    );
    const brand = rows[0];

    if (!brand) {
      return res.status(500).json({ error: "Failed to create brand" });
    }

    res.status(201).json(brand);
  } catch (error) {
    console.error("Error creating brand:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT: Update brand
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const name = (req.body?.name || "").toString().trim();
    const code = (req.body?.code || "").toString().trim();
    const description = (req.body?.description || "").toString().trim();
    const is_active = req.body?.is_active;

    if (!name) {
      return res.status(400).json({ error: "Brand name is required" });
    }

    const { rows } = await db.query(
      "UPDATE brands SET name = $1, code = $2, description = $3, is_active = $4, updated_at = NOW() WHERE id = $5 RETURNING *",
      [
        name,
        code || null,
        description || null,
        is_active === undefined ? true : Boolean(is_active),
        id,
      ],
    );
    const brand = rows[0];

    if (!brand) {
      return res.status(404).json({ error: "Brand not found" });
    }

    res.json(brand);
  } catch (error) {
    console.error("Error updating brand:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE: Delete brand
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { rowCount } = await db.query("DELETE FROM brands WHERE id = $1", [
      id,
    ]);

    if (rowCount === 0) {
      return res.status(404).json({ error: "Brand not found" });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting brand:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET: Select box options
router.get("/select-box", async (req, res) => {
  try {
    const { rows: brands } = await db.query(
      "SELECT id, name FROM brands WHERE is_active = true ORDER BY name ASC",
    );

    if (!brands) {
      return res.status(500).json({ error: "Failed to fetch brands" });
    }

    res.json(
      (brands || []).map((brand) => ({
        value: brand.id,
        label: brand.name,
        ...brand,
      })),
    );
  } catch (error) {
    console.error("Error fetching brand select box:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
