/** @format */

import { Router } from "express";
import { supabase } from "../lib/supabase.js";
import { processDuePostSchedules } from "../services/postScheduler.js";

const router = Router();

const ALLOWED_PLATFORMS = ["facebook", "tiktok", "threads", "instagram"];
const ALLOWED_STATUS = [
  "draft",
  "scheduled",
  "running",
  "completed",
  "partial_failed",
  "failed",
  "cancelled",
];

const normalizeSchedule = (item) => ({
  id: item.id,
  title: item.title,
  description: item.description || "",
  galleries: Array.isArray(item.galleries) ? item.galleries : [],
  publishDate: item.publish_date,
  status: item.status,
  retryMax: Number(item.retry_max || 3),
  retryCount: Number(item.retry_count || 0),
  errorMessage: item.error_message || "",
  productId: item.product_id,
  productName: item.products_aff?.name || null,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
  targets:
    item.post_schedule_targets?.map((target) => ({
      id: target.id,
      platform: target.platform,
      status: target.status,
      retryCount: Number(target.retry_count || 0),
      errorMessage: target.error_message || "",
      postedAt: target.posted_at,
      accountSettingId: target.account_setting_id,
      accountName: target.account_settings?.name || null,
    })) || [],
});

const parseJsonArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const createTargets = async ({
  scheduleId,
  accountSettingIds,
  platforms,
  publishDate,
}) => {
  let accountsQuery = supabase
    .from("account_settings")
    .select("id, platform, is_active")
    .eq("is_active", true);

  if (Array.isArray(accountSettingIds) && accountSettingIds.length > 0) {
    accountsQuery = accountsQuery.in("id", accountSettingIds);
  }

  if (Array.isArray(platforms) && platforms.length > 0) {
    accountsQuery = accountsQuery.in("platform", platforms);
  }

  const { data: accounts, error: accountsError } = await accountsQuery;

  if (accountsError) {
    throw new Error(accountsError.message);
  }

  if (!accounts || accounts.length === 0) {
    throw new Error("No active account settings found for selected options");
  }

  const targetRows = accounts.map((account) => ({
    post_schedule_id: scheduleId,
    account_setting_id: account.id,
    platform: account.platform,
    status: "pending",
    retry_count: 0,
    created_at: new Date(),
    updated_at: new Date(),
  }));

  const { error: targetError } = await supabase
    .from("post_schedule_targets")
    .insert(targetRows);

  if (targetError) {
    throw new Error(targetError.message);
  }

  return targetRows.length;
};

router.get("/", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 200);
    const status = (req.query.status || "").toString().trim();
    const search = (req.query.search || "").toString().trim();
    const offset = (page - 1) * limit;

    let query = supabase
      .from("post_schedules")
      .select(
        "id, title, description, galleries, publish_date, status, retry_max, retry_count, error_message, product_id, created_at, updated_at, products_aff:product_id(id, name), post_schedule_targets(id, account_setting_id, platform, status, retry_count, error_message, posted_at, account_settings:account_setting_id(id, name))",
        { count: "exact" },
      )
      .order("publish_date", { ascending: false });

    if (status && ALLOWED_STATUS.includes(status)) {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.ilike("title", `%${search}%`);
    }

    const { data, error, count } = await query.range(
      offset,
      offset + limit - 1,
    );

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      items: (data || []).map(normalizeSchedule),
      total: count || 0,
      page,
      limit,
      pages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error("Error fetching post schedules:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("post_schedules")
      .select(
        "id, title, description, galleries, publish_date, status, retry_max, retry_count, error_message, product_id, created_at, updated_at, products_aff:product_id(id, name), post_schedule_targets(id, account_setting_id, platform, status, retry_count, error_message, posted_at, account_settings:account_setting_id(id, name))",
      )
      .eq("id", id)
      .single();

    if (error) {
      return res.status(404).json({ error: error.message });
    }

    res.json(normalizeSchedule(data));
  } catch (error) {
    console.error("Error fetching post schedule detail:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const title = (req.body?.title || "").toString().trim();
    const description = (req.body?.description || "").toString().trim();
    const publishDate = (req.body?.publishDate || "").toString().trim();
    const productId = (req.body?.productId || "").toString().trim() || null;
    const retryMax = Math.max(1, Number(req.body?.retryMax || 3));
    const galleries = parseJsonArray(req.body?.galleries).filter(
      (item) => typeof item === "string",
    );
    const accountSettingIds = parseJsonArray(
      req.body?.accountSettingIds,
    ).filter((item) => typeof item === "string");
    const platforms = parseJsonArray(req.body?.platforms)
      .map((item) => item?.toString().trim().toLowerCase())
      .filter((item) => ALLOWED_PLATFORMS.includes(item));

    if (!title || !publishDate) {
      return res
        .status(400)
        .json({ error: "title and publishDate are required" });
    }

    const { data: schedule, error: scheduleError } = await supabase
      .from("post_schedules")
      .insert({
        title,
        description: description || null,
        galleries,
        publish_date: publishDate,
        product_id: productId,
        status: "scheduled",
        retry_max: retryMax,
        retry_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .select("*")
      .single();

    if (scheduleError) {
      return res.status(500).json({ error: scheduleError.message });
    }

    try {
      const targetsCount = await createTargets({
        scheduleId: schedule.id,
        accountSettingIds,
        platforms,
        publishDate,
      });

      res.status(201).json({
        ...normalizeSchedule({ ...schedule, post_schedule_targets: [] }),
        targetsCount,
      });
    } catch (error) {
      await supabase.from("post_schedules").delete().eq("id", schedule.id);
      return res.status(400).json({ error: error.message });
    }
  } catch (error) {
    console.error("Error creating post schedule:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {};

    if (req.body?.title !== undefined) {
      const title = (req.body.title || "").toString().trim();
      if (!title) {
        return res.status(400).json({ error: "title is required" });
      }
      updates.title = title;
    }

    if (req.body?.description !== undefined) {
      const description = (req.body.description || "").toString().trim();
      updates.description = description || null;
    }

    if (req.body?.publishDate !== undefined) {
      const publishDate = (req.body.publishDate || "").toString().trim();
      if (!publishDate) {
        return res.status(400).json({ error: "publishDate is required" });
      }
      updates.publish_date = publishDate;
    }

    if (req.body?.galleries !== undefined) {
      updates.galleries = parseJsonArray(req.body.galleries).filter(
        (item) => typeof item === "string",
      );
    }

    if (req.body?.status !== undefined) {
      const status = (req.body.status || "").toString().trim();
      if (!ALLOWED_STATUS.includes(status)) {
        return res.status(400).json({ error: "invalid status" });
      }
      updates.status = status;
    }

    if (req.body?.retryMax !== undefined) {
      updates.retry_max = Math.max(1, Number(req.body.retryMax || 3));
    }

    if (req.body?.productId !== undefined) {
      updates.product_id = (req.body.productId || "").toString().trim() || null;
    }

    updates.updated_at = new Date();

    const { data, error } = await supabase
      .from("post_schedules")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    console.error("Error updating post schedule:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("post_schedules")
      .delete()
      .eq("id", id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting post schedule:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/process-due", async (req, res) => {
  try {
    const result = await processDuePostSchedules();
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Error processing due post schedules:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/process", async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from("post_schedules")
      .update({
        publish_date: new Date().toISOString(),
        status: "scheduled",
        updated_at: new Date(),
      })
      .eq("id", id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const result = await processDuePostSchedules();
    res.json({ success: true, scheduleId: id, ...result });
  } catch (error) {
    console.error("Error processing schedule:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
