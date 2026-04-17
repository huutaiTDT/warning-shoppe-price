/** @format */

import axios from "axios";
import { supabase } from "../lib/supabase.js";

let isProcessing = false;

const toIsoNow = () => new Date().toISOString();

const deriveScheduleStatus = (targets) => {
  const total = targets.length;
  const posted = targets.filter((item) => item.status === "posted").length;
  const failed = targets.filter((item) => item.status === "failed").length;
  const pending = targets.filter(
    (item) => item.status === "pending" || item.status === "posting",
  ).length;

  if (total === 0) return "failed";
  if (posted === total) return "completed";
  if (failed === total) return "failed";
  if (posted > 0 && failed > 0) return "partial_failed";
  if (pending > 0) return "running";
  return "scheduled";
};

const updateScheduleSummary = async (scheduleId) => {
  const { data: targets, error: targetsError } = await supabase
    .from("post_schedule_targets")
    .select("id, status, retry_count")
    .eq("post_schedule_id", scheduleId);

  if (targetsError) {
    throw new Error(targetsError.message);
  }

  const nextStatus = deriveScheduleStatus(targets || []);
  const retryCount = Math.max(
    ...(targets || []).map((t) => t.retry_count || 0),
    0,
  );

  const { error: updateError } = await supabase
    .from("post_schedules")
    .update({
      status: nextStatus,
      retry_count: retryCount,
      updated_at: toIsoNow(),
    })
    .eq("id", scheduleId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return nextStatus;
};

const postTarget = async ({ schedule, target, account, endpoint }) => {
  const { error: markPostingError } = await supabase
    .from("post_schedule_targets")
    .update({
      status: "posting",
      updated_at: toIsoNow(),
    })
    .eq("id", target.id);

  if (markPostingError) {
    throw new Error(markPostingError.message);
  }

  try {
    const response = await axios.post(
      endpoint,
      {
        title: schedule.title,
        description: schedule.description || "",
        galleries: Array.isArray(schedule.galleries) ? schedule.galleries : [],
      },
      {
        headers: {
          "Content-Type": "application/json",
          ...(account?.token ?
            { Authorization: `Bearer ${account.token}` }
          : {}),
        },
        timeout: 30000,
      },
    );

    const { error: markDoneError } = await supabase
      .from("post_schedule_targets")
      .update({
        status: "posted",
        response_payload: response.data || {},
        posted_at: toIsoNow(),
        error_message: null,
        updated_at: toIsoNow(),
      })
      .eq("id", target.id);

    if (markDoneError) {
      throw new Error(markDoneError.message);
    }

    return { success: true };
  } catch (error) {
    const errorMessage =
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message ||
      "Post failed";

    const { error: markFailedError } = await supabase
      .from("post_schedule_targets")
      .update({
        status: "failed",
        retry_count: Number(target.retry_count || 0) + 1,
        error_message: errorMessage,
        updated_at: toIsoNow(),
      })
      .eq("id", target.id);

    if (markFailedError) {
      throw new Error(markFailedError.message);
    }

    return { success: false, errorMessage };
  }
};

export const processDuePostSchedules = async () => {
  if (isProcessing) {
    return { processed: 0, skipped: true };
  }

  const endpoint = process.env.AFF_POST_PUBLISH_API_URL;
  if (!endpoint) {
    return { processed: 0, skipped: true, reason: "missing-endpoint" };
  }

  isProcessing = true;

  try {
    const nowIso = toIsoNow();

    const { data: dueTargets, error: dueError } = await supabase
      .from("post_schedule_targets")
      .select(
        "id, post_schedule_id, account_setting_id, platform, status, retry_count, post_schedules!post_schedule_id(id, title, description, galleries, publish_date, status, retry_max, retry_count), account_settings!account_setting_id(id, name, token, platform, is_active)",
      )
      .in("status", ["pending", "failed"])
      .lte("post_schedules.publish_date", nowIso)
      .order("created_at", { ascending: true })
      .limit(200);

    if (dueError) {
      throw new Error(dueError.message);
    }

    let processed = 0;

    for (const target of dueTargets || []) {
      const schedule = target.post_schedules;
      const account = target.account_settings;

      if (!schedule || !account || !account.is_active) {
        continue;
      }

      if (Number(target.retry_count || 0) >= Number(schedule.retry_max || 3)) {
        continue;
      }

      await postTarget({ schedule, target, account, endpoint });
      await updateScheduleSummary(schedule.id);
      processed += 1;
    }

    return { processed, skipped: false };
  } finally {
    isProcessing = false;
  }
};

export const startPostScheduler = () => {
  const enabled = (process.env.AFF_POST_SCHEDULER_ENABLED || "true") === "true";
  if (!enabled) {
    return null;
  }

  const intervalMs = Math.max(
    10000,
    Number(process.env.AFF_POST_SCHEDULER_INTERVAL_MS || 60000),
  );

  const timer = setInterval(() => {
    processDuePostSchedules().catch((error) => {
      console.error("[PostScheduler] Error processing due schedules:", error);
    });
  }, intervalMs);

  return timer;
};
