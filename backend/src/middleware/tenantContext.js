/** @format */

import { getAuthContext } from "../lib/requestAuth.js";
import { supabase } from "../lib/supabase.js";

/**
 * Tenant isolation context middleware
 * Adds tenantContext to request with user's brands and shops
 */
export const tenantContextMiddleware = async (req, res, next) => {
  try {
    const auth = getAuthContext(req);
    if (!auth?.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get user's brand permissions
    const { data: brandPermissions, error: brandError } = await supabase
      .from("account_brand_permissions")
      .select("brand_id")
      .eq("user_id", auth.userId);

    if (brandError) {
      console.error("Error fetching brand permissions:", brandError);
      return res.status(500).json({ error: "Failed to load tenant context" });
    }

    // Get user's assigned shops
    const { data: shopAssignments, error: shopError } = await supabase
      .from("user_shop_mappings")
      .select("shop_id")
      .eq("user_id", auth.userId);

    if (shopError) {
      console.error("Error fetching shop assignments:", shopError);
      return res.status(500).json({ error: "Failed to load tenant context" });
    }

    // Get user details for ADMIN check
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("type")
      .eq("id", auth.userId)
      .single();

    if (userError) {
      console.error("Error fetching user type:", userError);
      return res.status(500).json({ error: "Failed to load tenant context" });
    }

    // Attach tenant context to request
    req.tenantContext = {
      userId: auth.userId,
      userType: user.type,
      isAdmin: user.type === "ADMIN",
      brandIds: (brandPermissions || []).map((p) => p.brand_id),
      shopIds: (shopAssignments || []).map((s) => s.shop_id),
    };

    next();
  } catch (error) {
    console.error("Tenant context error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Check if user can access a product based on ownership or brand permission
 */
export const canAccessProduct = async (
  userId,
  productOwnerId,
  productBrandId,
) => {
  // Owner can always access their products
  if (userId === productOwnerId) {
    return true;
  }

  // Check brand permission
  if (productBrandId) {
    const { data, error } = await supabase
      .from("account_brand_permissions")
      .select("id")
      .eq("user_id", userId)
      .eq("brand_id", productBrandId)
      .limit(1);

    if (!error && data?.length > 0) {
      return true;
    }
  }

  // Check if user is ADMIN
  const { data: user, error } = await supabase
    .from("users")
    .select("type")
    .eq("id", userId)
    .single();

  return !error && user?.type === "ADMIN";
};

/**
 * Check if user can access a shop
 */
export const canAccessShop = async (userId, shopOwnerId) => {
  // Owner can access their own shop
  if (userId === shopOwnerId) {
    return true;
  }

  // Check if assigned to shop
  const { data, error } = await supabase
    .from("user_shop_mappings")
    .select("id")
    .eq("user_id", userId)
    .eq("shop_id", shopOwnerId)
    .limit(1);

  if (!error && data?.length > 0) {
    return true;
  }

  // Check if user is ADMIN
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("type")
    .eq("id", userId)
    .single();

  return !userError && user?.type === "ADMIN";
};

/**
 * Filter products by tenant context
 * Returns only products the user can access
 */
export const buildProductAccessFilter = (tenantContext) => {
  const { userId, isAdmin, brandIds } = tenantContext;

  // Admin can see all products
  if (isAdmin) {
    return null; // No filter needed
  }

  // Staff can see:
  // 1. Products they own
  // 2. Products with brands they have permission for
  return {
    userCanAccess: (product) => {
      // Own products
      if (product.owner_id === userId) {
        return true;
      }

      // Brand permission
      if (product.brand_id && brandIds.includes(product.brand_id)) {
        return true;
      }

      return false;
    },
  };
};

/**
 * Log tenant access for audit trail
 */
export const logTenantAccess = async (
  userId,
  action,
  resourceType,
  resourceId,
  details = {},
) => {
  try {
    await supabase.from("tenant_access_logs").insert({
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details,
      ip_address: null, // Optionally extract from request
      created_at: new Date(),
    });
  } catch (error) {
    console.error("Error logging tenant access:", error);
    // Don't throw - this is audit-only
  }
};

export default {
  tenantContextMiddleware,
  canAccessProduct,
  canAccessShop,
  buildProductAccessFilter,
  logTenantAccess,
};
