/** @format */

import { Router } from "express";
import { requireAuth } from "../lib/requestAuth.js";
import { supabase } from "../lib/supabase.js";
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

    // Verify user exists and is not ADMIN
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, type")
      .eq("id", user_id)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Only ADMINs can have brand permissions assigned
    if (user.type !== "STAFF") {
      return res
        .status(400)
        .json({ error: "Brand permissions can only be assigned to STAFF" });
    }

    // Verify brand exists
    const { data: brand, error: brandError } = await supabase
      .from("brands")
      .select("id, name")
      .eq("id", brand_id)
      .single();

    if (brandError || !brand) {
      return res.status(404).json({ error: "Brand not found" });
    }

    // Create permission
    const { data: permission, error: permError } = await supabase
      .from("account_brand_permissions")
      .insert({
        user_id,
        brand_id,
      })
      .select()
      .single();

    if (permError) {
      // Check if it's a unique constraint violation
      if (permError.code === "23505") {
        return res
          .status(400)
          .json({ error: "User already has permission for this brand" });
      }
      return res.status(400).json({ error: permError.message });
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

    const { error } = await supabase
      .from("account_brand_permissions")
      .delete()
      .eq("id", id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

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

    const { data: permissions, error } = await supabase
      .from("account_brand_permissions")
      .select("id, brand_id, brands(id, name, code)")
      .eq("user_id", user_id);

    if (error) {
      return res.status(500).json({ error: error.message });
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

    // Check if user is ADMIN - admins can access all brands
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("type")
      .eq("id", auth.userId)
      .single();

    if (userError) {
      return res.status(500).json({ error: "Failed to check user type" });
    }

    let query = supabase.from("brands").select("id, name, code");

    if (user.type === "STAFF") {
      // STAFF: only their assigned brands
      query = query.innerJoin("account_brand_permissions", (join) =>
        join
          .on("brands.id", "account_brand_permissions.brand_id")
          .eq("account_brand_permissions.user_id", auth.userId),
      );
    } else {
      // ADMIN: all active brands
      query = query.eq("is_active", true);
    }

    const { data: brands, error } = await query.order("name", {
      ascending: true,
    });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(brands || []);
  } catch (error) {
    console.error("Error fetching user brands:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
