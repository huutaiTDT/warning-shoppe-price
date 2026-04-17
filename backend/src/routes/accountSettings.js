/** @format */

import { Router } from "express";
import { supabase } from "../lib/supabase.js";

const router = Router();

const ALLOWED_PLATFORMS = ["facebook", "tiktok", "threads", "instagram"];

router.get("/", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 200);
    const search = (req.query.search || "").toString().trim();
    const platform = (req.query.platform || "").toString().trim();
    const active = (req.query.active || "").toString().trim();
    const offset = (page - 1) * limit;

    let query = supabase
      .from("account_settings")
      .select(
        "id, name, external_id, page_id, platform, is_active, created_at, updated_at",
        {
          count: "exact",
        },
      )
      .order("created_at", { ascending: false });

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,external_id.ilike.%${search}%,page_id.ilike.%${search}%`,
      );
    }

    if (platform) {
      query = query.eq("platform", platform);
    }

    if (active === "true") query = query.eq("is_active", true);
    if (active === "false") query = query.eq("is_active", false);

    const { data, error, count } = await query.range(
      offset,
      offset + limit - 1,
    );

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      items: data || [],
      total: count || 0,
      page,
      limit,
      pages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error("Error fetching account settings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("account_settings")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return res.status(404).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    console.error("Error fetching account setting detail:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const name = (req.body?.name || "").toString().trim();
    const external_id = (req.body?.external_id || "").toString().trim();
    const page_id = (req.body?.page_id || "").toString().trim();
    const token = (req.body?.token || "").toString().trim();
    const platform = (req.body?.platform || "").toString().trim().toLowerCase();
    const is_active = req.body?.is_active ?? true;

    if (!name || !platform || !ALLOWED_PLATFORMS.includes(platform)) {
      return res.status(400).json({ error: "Invalid name or platform" });
    }

    const { data, error } = await supabase
      .from("account_settings")
      .insert({
        name,
        external_id: external_id || null,
        page_id: page_id || null,
        token: token || null,
        platform,
        is_active: Boolean(is_active),
      })
      .select(
        "id, name, external_id, page_id, platform, is_active, created_at, updated_at",
      )
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json(data);
  } catch (error) {
    console.error("Error creating account setting:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const updates = {};

    if (req.body?.name !== undefined) {
      updates.name = (req.body.name || "").toString().trim();
      if (!updates.name) {
        return res.status(400).json({ error: "Name is required" });
      }
    }

    if (req.body?.external_id !== undefined) {
      const value = (req.body.external_id || "").toString().trim();
      updates.external_id = value || null;
    }

    if (req.body?.page_id !== undefined) {
      const value = (req.body.page_id || "").toString().trim();
      updates.page_id = value || null;
    }

    if (req.body?.token !== undefined) {
      const value = (req.body.token || "").toString().trim();
      updates.token = value || null;
    }

    if (req.body?.platform !== undefined) {
      const value = (req.body.platform || "").toString().trim().toLowerCase();
      if (!ALLOWED_PLATFORMS.includes(value)) {
        return res.status(400).json({ error: "Invalid platform" });
      }
      updates.platform = value;
    }

    if (req.body?.is_active !== undefined) {
      updates.is_active = Boolean(req.body.is_active);
    }

    updates.updated_at = new Date();

    const { data, error } = await supabase
      .from("account_settings")
      .update(updates)
      .eq("id", id)
      .select(
        "id, name, external_id, page_id, platform, is_active, created_at, updated_at",
      )
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    console.error("Error updating account setting:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("account_settings")
      .delete()
      .eq("id", id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting account setting:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
