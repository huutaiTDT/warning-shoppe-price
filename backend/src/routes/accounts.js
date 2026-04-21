/** @format */

import bcrypt from "bcrypt";
import { Router } from "express";
import { requireAuth } from "../lib/requestAuth.js";
import { supabase } from "../lib/supabase.js";
import { roleGuard } from "../middleware/roleGuard.js";

const router = Router();

// ADMIN: Get all accounts
router.get("/", roleGuard(["ADMIN"]), async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from("users")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

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

    // Create user
    const { data: user, error: createError } = await supabase
      .from("users")
      .insert({
        username,
        email,
        password_hash: hashedPassword,
        type,
        must_change_password: true,
        is_active: true,
      })
      .select()
      .single();

    if (createError) {
      return res.status(400).json({ error: createError.message });
    }

    // Assign shops if STAFF
    if (type === "STAFF" && Array.isArray(shopIds) && shopIds.length > 0) {
      const assignments = shopIds.map((shopId) => ({
        user_id: user.id,
        shop_id: shopId,
      }));

      const { error: assignError } = await supabase
        .from("account_shop_assignments")
        .insert(assignments);

      if (assignError) {
        console.error("Error assigning shops:", assignError);
      }
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

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get assigned shops for STAFF
    let shops = [];
    if (user.type === "STAFF") {
      const { data: assignments } = await supabase
        .from("account_shop_assignments")
        .select("shop_id")
        .eq("user_id", id);

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

    const updateData = {};
    if (email) updateData.email = email;
    if (type && ["STAFF", "ADMIN"].includes(type)) updateData.type = type;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (must_change_password !== undefined)
      updateData.must_change_password = must_change_password;

    const { data: user, error: updateError } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    // Update shop assignments if provided
    if (Array.isArray(shopIds)) {
      // Delete existing assignments
      await supabase
        .from("account_shop_assignments")
        .delete()
        .eq("user_id", id);

      // Create new assignments
      if (shopIds.length > 0) {
        const assignments = shopIds.map((shopId) => ({
          user_id: id,
          shop_id: shopId,
        }));

        await supabase.from("account_shop_assignments").insert(assignments);
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

    const { error } = await supabase.from("users").delete().eq("id", id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

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

    const { data, error } = await supabase
      .from("account_shop_assignments")
      .select("shop_id, shops!shop_id(*)")
      .eq("user_id", auth.userId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      shops: (data || []).map((item) => item.shops).filter(Boolean),
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

    const { data: permissions, error } = await supabase
      .from("account_brand_permissions")
      .select("id, brand_id, brands(id, name, code)")
      .eq("user_id", userId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      user_id: userId,
      brands: (permissions || []).map((p) => ({
        permissionId: p.id,
        ...p.brands,
      })),
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
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, type")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.type !== "STAFF") {
      return res
        .status(400)
        .json({ error: "Brand permissions can only be assigned to STAFF" });
    }

    // Delete existing permissions
    await supabase
      .from("account_brand_permissions")
      .delete()
      .eq("user_id", userId);

    // Insert new permissions
    if (brand_ids.length > 0) {
      const permissions = brand_ids.map((brand_id) => ({
        user_id: userId,
        brand_id,
      }));

      const { error: insertError } = await supabase
        .from("account_brand_permissions")
        .insert(permissions);

      if (insertError) {
        return res.status(400).json({ error: insertError.message });
      }
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

      const { error } = await supabase
        .from("account_brand_permissions")
        .delete()
        .eq("user_id", userId)
        .eq("brand_id", brand_id);

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.json({ success: true, message: "Brand removed from account" });
    } catch (error) {
      console.error("Error removing brand:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
