/** @format */

import bcrypt from "bcrypt";
import { Router } from "express";
import { requireAuth, signAuthToken } from "../lib/requestAuth.js";
import { supabase } from "../lib/supabase.js";
const salt = 12;

const router = Router();

// POST: Login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Missing credentials" });
    }

    // Get user from database
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify password
    // gen has for 1231123
    const hashPassword = await bcrypt.hash(password, salt);
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate token
    const token = signAuthToken(user);

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        type: user.type,
        mustChangePassword: user.must_change_password,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST: Change Password (required on first login)
router.post("/change-password", async (req, res) => {
  try {
    const auth = requireAuth(req, res);
    if (!auth) return;

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Missing password fields" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }

    // Fetch user
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", auth.userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user
    const { error: updateError } = await supabase
      .from("users")
      .update({
        password_hash: hashedPassword,
        must_change_password: false,
      })
      .eq("id", auth.userId);

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    // Generate new token
    const updatedUser = {
      ...user,
      password_hash: hashedPassword,
      must_change_password: false,
    };
    const newToken = signAuthToken(updatedUser);

    res.json({
      success: true,
      token: newToken,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST: Logout
router.post("/logout", (req, res) => {
  // Token is typically revoked on client-side for JWT
  res.json({ success: true, message: "Logged out" });
});

// GET: Current User
router.get("/me", async (req, res) => {
  try {
    const auth = requireAuth(req, res);
    if (!auth) return;

    const { data: user, error } = await supabase
      .from("users")
      .select(
        "id, username, email, type, must_change_password, is_active, created_at",
      )
      .eq("id", auth.userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST: Logout (old endpoint for compatibility)
router.post("/logout", (req, res) => {
  res.json({ success: true });
});

export default router;
