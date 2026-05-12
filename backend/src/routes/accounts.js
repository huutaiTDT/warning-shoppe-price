/** @format */

import bcrypt from "bcrypt";
import { Router } from "express";
import { db } from "../lib/db.js";
import { requireAuth } from "../lib/requestAuth.js";
import { roleGuard } from "../middleware/roleGuard.js";

const router = Router();

// ADMIN: Get all accounts
router.get("/", roleGuard(["ADMIN"]), async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const { rows: data } = await db.query(
      "SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2",
      [limit, offset],
    );
    const { rows: countRows } = await db.query("SELECT COUNT(*) FROM users");
    const count = countRows[0].count;

    res.json({
      items: (data || []).map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        type: u.type,
        is_active: u.is_active,
        must_change_password: u.must_change_password,
        created_at: u.created_at,
      })),
      total: count || 0,
      page,
      limit,
      pages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error("Error fetching accounts:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ADMIN: Create new employee account
router.post("/", roleGuard(["ADMIN"]), async (req, res) => {
  try {
    const { username, email, type, shopIds } = req.body;

    if (!username || !email || !type) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!["STAFF", "ADMIN"].includes(type)) {
      return res.status(400).json({ error: "Invalid account type" });
    }

    // Default password
    const defaultPassword = "123456";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const { rows } = await db.query(
      "INSERT INTO users (username, email, password_hash, type, must_change_password, is_active) VALUES ($1, $2, $3, $4, true, true) RETURNING *",
      [username, email, hashedPassword, type],
    );
    const user = rows[0];

    if (!user) {
      return res.status(500).json({ error: "Failed to create user" });
    }

    // Assign shops if STAFF
      if (shopIds.length > 0) {
        const values = shopIds.map(id => `(${user.id}, ${id})`).join(", ");
        await db.query(`INSERT INTO account_shop_assignments (user_id, shop_id) VALUES ${values}`);
      }

    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        type: user.type,
        mustChangePassword: user.must_change_password,
      },
      temporaryPassword: defaultPassword,
    });
  } catch (error) {
    console.error("Error creating account:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ADMIN: Get account by ID
router.get("/:id", roleGuard(["ADMIN"]), async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await db.query("SELECT * FROM users WHERE id = $1", [id]);
    const user = rows[0];

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get assigned shops for STAFF
    let shops = [];
    if (user.type === "STAFF") {
      const { rows: assignments } = await db.query(
        "SELECT shop_id FROM account_shop_assignments WHERE user_id = $1",
        [id]
      );
      shops = (assignments || []).map((a) => a.shop_id);
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      type: user.type,
      is_active: user.is_active,
      must_change_password: user.must_change_password,
      created_at: user.created_at,
      shopIds: shops,
    });
  } catch (error) {
    console.error("Error fetching account:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ADMIN: Update account
router.put("/:id", roleGuard(["ADMIN"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { email, type, is_active, shopIds, must_change_password } = req.body;

    const updates = [];
    const params = [];
    if (email) { params.push(email); updates.push(`email = $${params.length}`); }
    if (type && ["STAFF", "ADMIN"].includes(type)) { params.push(type); updates.push(`type = $${params.length}`); }
    if (is_active !== undefined) { params.push(is_active); updates.push(`is_active = $${params.length}`); }
    if (must_change_password !== undefined) { params.push(must_change_password); updates.push(`must_change_password = $${params.length}`); }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    params.push(id);
    const { rows } = await db.query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = $${params.length} RETURNING *`,
      params
    );
    const user = rows[0];

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    // Update shop assignments if provided
    if (Array.isArray(shopIds)) {
      // Delete existing assignments
      await db.query("DELETE FROM account_shop_assignments WHERE user_id = $1", [id]);

      // Create new assignments
      if (shopIds.length > 0) {
        const values = shopIds.map(shopId => `(${id}, ${shopId})`).join(", ");
        await db.query(`INSERT INTO account_shop_assignments (user_id, shop_id) VALUES ${values}`);
      }
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        type: user.type,
        is_active: user.is_active,
      },
    });
  } catch (error) {
    console.error("Error updating account:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ADMIN: Delete account
router.delete("/:id", roleGuard(["ADMIN"]), async (req, res) => {
  try {
    const { id } = req.params;

    await db.query("DELETE FROM users WHERE id = $1", [id]);

    res.json({ success: true, message: "Account deleted" });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get assigned shops (for STAFF)
router.get("/shops", async (req, res) => {
  try {
    const auth = requireAuth(req, res);
    if (!auth) return;

    const { rows: data } = await db.query(
      `SELECT s.* FROM account_shop_assignments asa JOIN shops s ON asa.shop_id = s.id WHERE asa.user_id = $1`,
      [auth.userId]
    );

    res.json({
      shops: data || [],
    });
  } catch (error) {
    console.error("Error fetching assigned shops:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * ADMIN: Get account's assigned brands
 * GET /accounts/:id/brands
 */
router.get("/:id/brands", roleGuard(["ADMIN"]), async (req, res) => {
  try {
    const { id: userId } = req.params;

    const { rows: permissions } = await db.query(
      `
      SELECT
        abp.id AS "permissionId",
        b.id,
        b.name,
        b.code
      FROM account_brand_permissions abp
      JOIN brands b ON abp.brand_id = b.id
      WHERE abp.user_id = $1
    `,
      [userId],
    );

    res.json({
      user_id: userId,
      brands: permissions || [],
    });
  } catch (error) {
    console.error("Error fetching account brands:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * ADMIN: Assign brands to account
 * POST /accounts/:id/brands
 * Body: { brand_ids: [id1, id2, ...] }
 */
router.post("/:id/brands", roleGuard(["ADMIN"]), async (req, res) => {
  try {
    const { id: userId } = req.params;
    const { brand_ids } = req.body;

    if (!Array.isArray(brand_ids)) {
      return res.status(400).json({ error: "brand_ids must be an array" });
    }

    // Verify user exists and is STAFF
    const { rows } = await db.query("SELECT id, type FROM users WHERE id = $1", [userId]);
    const user = rows[0];

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.type !== "STAFF") {
      return res
        .status(400)
        .json({ error: "Brand permissions can only be assigned to STAFF" });
    }

    // Delete existing permissions
    await db.query("DELETE FROM account_brand_permissions WHERE user_id = $1", [userId]);

    // Insert new permissions
    if (brand_ids.length > 0) {
      const values = brand_ids.map(brand_id => `(${userId}, ${brand_id})`).join(", ");
      await db.query(`INSERT INTO account_brand_permissions (user_id, brand_id) VALUES ${values}`);
    }

    res.json({
      success: true,
      message: `Assigned ${brand_ids.length} brand(s) to user`,
      assigned_count: brand_ids.length,
    });
  } catch (error) {
    console.error("Error assigning brands:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * ADMIN: Remove brand from account
 * DELETE /accounts/:id/brands/:brand_id
 */
router.delete(
  "/:id/brands/:brand_id",
  roleGuard(["ADMIN"]),
  async (req, res) => {
    try {
      const { id: userId, brand_id } = req.params;

      await db.query("DELETE FROM account_brand_permissions WHERE user_id = $1 AND brand_id = $2", [userId, brand_id]);

      res.json({ success: true, message: "Brand removed from account" });
    } catch (error) {
      console.error("Error removing brand:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
