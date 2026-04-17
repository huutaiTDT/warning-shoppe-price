/** @format */

import { Router } from "express";
import { supabase } from "../lib/supabase.js";
const router = Router();

// POST: Login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Missing credentials" });
    }

    // For demo: simple credential check (replace with proper auth)
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .maybeSingle();

    if (error || !user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    // const isValid = await bcrypt.compare(password, user.password_hash);

    // if (!isValid) {
    //   return res.status(401).json({ error: "Invalid credentials" });
    // }
    // In production, validate password hash
    const userDto = {
      token: user.id,
      id: user.id,
      username: user.username,
      email: user.email,
      created_at: user.created_at,
      is_aff: Boolean(user.is_aff),
    };

    res.json({
      success: true,
      user: userDto,
    });
  } catch (error) {
    console.error("Login error:", error);
    res?.status(500).json({ error: "Internal server error" });
  }
});

// POST: Logout
router.post("/logout", (req, res) => {
  res.json({ success: true });
});

export default router;
