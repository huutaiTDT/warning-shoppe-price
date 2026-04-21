/** @format */

import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export const getRawBearerToken = (req) => {
  const authHeader = req.headers?.authorization || "";
  const [type, token] = authHeader.split(" ");
  if (!type || !token || type.toLowerCase() !== "bearer") {
    return null;
  }

  return token.toString().trim() || null;
};

export const getAuthContext = (req) => {
  if (req.auth) return req.auth;

  const token = getRawBearerToken(req);
  if (!token) return null;

  try {
    const claims = jwt.verify(token, JWT_SECRET);
    const auth = {
      userId: claims.sub,
      username: claims.username,
      type: claims.type || "STAFF",
      mustChangePassword: Boolean(claims.must_change_password),
      token,
      claims,
    };
    req.auth = auth;
    return auth;
  } catch {
    return null;
  }
};

export const getAuthUserId = (req) => {
  const auth = getAuthContext(req);
  return auth?.userId || null;
};

export const isAdmin = (auth) => {
  return auth?.type === "ADMIN";
};

export const requireAuth = (req, res) => {
  const auth = getAuthContext(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return auth;
};

export const requireRole =
  (roles = []) =>
  (req, res, next) => {
    const auth = requireAuth(req, res);
    if (!auth) return;

    if (roles.length > 0 && !roles.includes(auth.type)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    next();
  };

export const signAuthToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      type: user.type || "STAFF",
      must_change_password: Boolean(user.must_change_password),
    },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
  );
};

export const requireSelfOrAdmin = (req, res, targetUserId) => {
  const auth = requireAuth(req, res);
  if (!auth) return null;

  if (!isAdmin(auth) && auth.userId !== targetUserId) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }

  return auth;
};

export const requireAuthUserId = (req, res) => {
  const auth = requireAuth(req, res);
  if (!auth) return null;

  return {
    userId: auth.userId,
    type: auth.type,
  };
};
