/** @format */

import { requireAuth } from "../lib/requestAuth.js";

/**
 * Express middleware for role-based access control
 * Usage: router.get("/admin-route", roleGuard(["ADMIN"]), handler)
 * @param {string[]} allowedRoles - Array of allowed role types
 */
export const roleGuard = (allowedRoles = []) => {
  return (req, res, next) => {
    const auth = requireAuth(req, res);
    if (!auth) return;

    if (allowedRoles.length > 0 && !allowedRoles.includes(auth.type)) {
      return res.status(403).json({
        error: "Forbidden",
        message: `This resource requires one of: ${allowedRoles.join(", ")}`,
      });
    }

    next();
  };
};
