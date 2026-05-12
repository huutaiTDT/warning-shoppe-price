/** @format */

import db from "../lib/db.js";
import { getAuthContext } from "../lib/requestAuth.js";

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
    const { rows: brandPermissions } = await db.query(
      "SELECT brand_id FROM account_brand_permissions WHERE user_id = $1",
      [auth.userId],
    );

    // Get user's assigned shops
    const { rows: shopAssignments } = await db.query(
      "SELECT shop_id FROM user_shop_mappings WHERE user_id = $1",
      [auth.userId],
    );

    // Get user details for ADMIN check
    const { rows: users } = await db.query(
      "SELECT type FROM users WHERE id = $1",
      [auth.userId],
    );
    const user = users[0];

    if (!user) {
      return res.status(404).json({ error: "User not found" });
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
    const { rows } = await db.query(
      "SELECT id FROM account_brand_permissions WHERE user_id = $1 AND brand_id = $2 LIMIT 1",
      [userId, productBrandId],
    );
    if (rows.length > 0) {
      return true;
    }
  }

  // Check if user is ADMIN
  const { rows } = await db.query("SELECT type FROM users WHERE id = $1", [
    userId,
  ]);
  const user = rows[0];

  return user?.type === "ADMIN";
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
  const { rows } = await db.query(
    "SELECT id FROM user_shop_mappings WHERE user_id = $1 AND shop_id = $2 LIMIT 1",
    [userId, shopOwnerId],
  );

  if (rows.length > 0) {
    return true;
  }

  // Check if user is ADMIN
  const { rows: userRows } = await db.query(
    "SELECT type FROM users WHERE id = $1",
    [userId],
  );
  const user = userRows[0];

  return user?.type === "ADMIN";
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
    await db.query(
      "INSERT INTO tenant_access_logs (user_id, action, resource_type, resource_id, details, ip_address, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [
        userId,
        action,
        resourceType,
        resourceId,
        details,
        null, // Optionally extract from request
        new Date(),
      ],
    );
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
