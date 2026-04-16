/** @format */

import { Router } from "express";
import { supabase } from "../lib/supabase.js";

const router = Router();

// GET: List brands with pagination
router.get("/", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 200);
    const search = (req.query.search || "").toString().trim();
    const active = (req.query.active || "").toString().trim();
    const offset = (page - 1) * limit;

    let query = supabase
      .from("master_brands")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
    }

    if (active === "true") {
      query = query.eq("is_active", true);
    } else if (active === "false") {
      query = query.eq("is_active", false);
    }

    const {
      data: brands,
      error,
      count,
    } = await query.range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      brands: brands || [],
      total: count || 0,
      page,
      limit,
      pages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error("Error fetching brands:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET: Brand detail
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data: brand, error } = await supabase
      .from("master_brands")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return res.status(404).json({ error: error.message });
    }

    res.json(brand);
  } catch (error) {
    console.error("Error fetching brand detail:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST: Create brand
router.post("/", async (req, res) => {
  try {
    const name = (req.body?.name || "").toString().trim();
    const code = (req.body?.code || "").toString().trim();
    const description = (req.body?.description || "").toString().trim();
    const is_active = req.body?.is_active ?? true;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const { data: brand, error } = await supabase
      .from("master_brands")
      .insert({
        name,
        code: code || null,
        description: description || null,
        is_active: Boolean(is_active),
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json(brand);
  } catch (error) {
    console.error("Error creating brand:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT: Update brand
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const name = (req.body?.name || "").toString().trim();
    const code = (req.body?.code || "").toString().trim();
    const description = (req.body?.description || "").toString().trim();
    const is_active = req.body?.is_active;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const { data: brand, error } = await supabase
      .from("master_brands")
      .update({
        name,
        code: code || null,
        description: description || null,
        is_active: is_active === undefined ? true : Boolean(is_active),
        updated_at: new Date(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(brand);
  } catch (error) {
    console.error("Error updating brand:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE: Delete brand
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("master_brands")
      .delete()
      .eq("id", id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting brand:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
