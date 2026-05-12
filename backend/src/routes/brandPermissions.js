/** @format */

import { Router } from "express";
import { db } from "../lib/db.js";
import { requireAuth } from "../lib/requestAuth.js";
import { roleGuard } from "../middleware/roleGuard.js";
import { logTenantAccess } from "../middleware/tenantContext.js";

const router = Router();

/**
 * ADMIN: Assign brand to account
 * POST /brand-permissions
 * Body: { user_id, brand_id }
 */
router.post("/", roleGuard(["ADMIN"]), async (req, res) => {
  try {
    const { user_id, brand_id } = req.body;

    if (!user_id || !brand_id) {
      return res
        .status(400)
        .json({ error: "user_id and brand_id are required" });
    }

    const { rows: userRows } = await db.query(
      "SELECT id, type FROM users WHERE id = $1",
      [user_id],
    );
    const user = userRows[0];

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Only ADMINs can have brand permissions assigned
    if (user.type !== "STAFF") {
      return res
        .status(400)
        .json({ error: "Brand permissions can only be assigned to STAFF" });
    }

    const { rows: brandRows } = await db.query(
      "SELECT id, name FROM brands WHERE id = $1",
      [brand_id],
    );
    const brand = brandRows[0];

    if (!brand) {
      return res.status(404).json({ error: "Brand not found" });
    }

    const { rows: permissionRows } = await db.query(
      "INSERT INTO account_brand_permissions (user_id, brand_id) VALUES ($1, $2) RETURNING *",
      [user_id, brand_id],
    );
    const permission = permissionRows[0];

    if (!permission) {
      return res.status(500).json({ error: "Failed to assign brand" });
    }

    await logTenantAccess(
      req.tenantContext?.userId,
      "CREATE",
      "BRAND_ASSIGNMENT",
      permission.id,
      { user_id, brand_id, brand_name: brand.name },
    );

    res.status(201).json({
      success: true,
      permission,
      message: `Brand "${brand.name}" assigned to user`,
    });
  } catch (error) {
    console.error("Error assigning brand:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * ADMIN: Remove brand from account
 * DELETE /brand-permissions/:id
 */
router.delete("/:id", roleGuard(["ADMIN"]), async (req, res) => {
  try {
    const { id } = req.params;

    await db.query("DELETE FROM account_brand_permissions WHERE id = $1", [id]);

    await logTenantAccess(
      req.tenantContext?.userId,
      "DELETE",
      "BRAND_ASSIGNMENT",
      id,
    );

    res.json({ success: true, message: "Brand permission removed" });
  } catch (error) {
    console.error("Error removing brand permission:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * ADMIN: Get account's assigned brands
 * GET /brand-permissions/account/:user_id
 */
router.get("/account/:user_id", roleGuard(["ADMIN"]), async (req, res) => {
  try {
    const { user_id } = req.params;

    const { rows: permissions } = await db.query(
      `
      SELECT abp.id, abp.brand_id, b.id as "brandId", b.name, b.code
      FROM account_brand_permissions abp
      JOIN brands b ON abp.brand_id = b.id
      WHERE abp.user_id = $1
    `,
      [user_id],
    );

    if (!permissions) {
      return res.status(500).json({ error: "Failed to fetch permissions" });
    }

    res.json({
      user_id,
      brands: (permissions || []).map((p) => ({
        permissionId: p.id,
        ...p.brands,
      })),
    });
  } catch (error) {
    console.error("Error fetching brand permissions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Get current user's assigned brands
 * GET /brand-permissions/my-brands
 */
router.get("/my-brands", async (req, res) => {
  try {
    const auth = requireAuth(req, res);
    if (!auth) return;

    const { rows: userRows } = await db.query(
      "SELECT type FROM users WHERE id = $1",
      [auth.userId],
    );
    const user = userRows[0];

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let query;
    const params = [];

    if (user.type === "STAFF") {
      query = `
        SELECT b.id, b.name, b.code 
        FROM brands b
        JOIN account_brand_permissions abp ON b.id = abp.brand_id
        WHERE abp.user_id = $1
        ORDER BY b.name ASC
      `;
      params.push(auth.userId);
    } else {
      // ADMIN gets all brands
      query = `SELECT id, name, code FROM brands ORDER BY name ASC`;
    }

    const { rows: brands } = await db.query(query, params);

    if (!brands) {
      return res.status(500).json({ error: "Failed to fetch brands" });
    }

    res.json(brands || []);
  } catch (error) {
    console.error("Error fetching user brands:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
