/** @format */

import express from "express";
import { db } from "../lib/db.js";

const router = express.Router();

// List guides with optional pagination
router.get("/", async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const result = await db.query(
      `SELECT id, title, code, content, created_at, updated_at FROM guides ORDER BY id DESC LIMIT $1 OFFSET $2`,
      [Number(limit), offset],
    );
    res.json({ items: result.rows });
  } catch (err) {
    next(err);
  }
});

// Get single guide
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT id, title, code, content, created_at, updated_at FROM guides WHERE id = $1 LIMIT 1`,
      [id],
    );
    if (!result.rows.length)
      return res.status(404).json({ error: "Not found" });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// Create guide
router.post("/", async (req, res, next) => {
  try {
    const { title, code, content } = req.body;
    const result = await db.query(
      `INSERT INTO guides (title, code, content) VALUES ($1, $2, $3) RETURNING id, title, code, content, created_at, updated_at`,
      [title, code, content || ""],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// Update guide
router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, code, content } = req.body;
    const result = await db.query(
      `UPDATE guides SET title = $1, code = $2, content = $3 WHERE id = $4 RETURNING id, title, code, content, created_at, updated_at`,
      [title, code, content || "", id],
    );
    if (!result.rows.length)
      return res.status(404).json({ error: "Not found" });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// Delete guide
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query(`DELETE FROM guides WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
