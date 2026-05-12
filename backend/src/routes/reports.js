/** @format */

import { Router } from "express";
import { db } from "../lib/db.js";
import { requireAuthUserId } from "../lib/requestAuth.js";

const router = Router();

/**
 * GET /reports/price-fluctuations
 * Báo cáo biến động giá
 * Query params:
 * - page, limit
 * - startDate, endDate (YYYY-MM-DD)
 * - shopId
 * - productId (master product id)
 */
router.get("/price-fluctuations", async (req, res) => {
  try {
    const { userId } = requireAuthUserId(req);

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    const offset = (page - 1) * limit;

    const { startDate, endDate, shopId } = req.query;

    const params = [];
    const whereClauses = [];

    if (startDate) {
      whereClauses.push(`ph.crawled_at >= $${params.length + 1}`);
      params.push(startDate);
    }

    if (endDate) {
      whereClauses.push(`ph.crawled_at <= $${params.length + 1}`);
      params.push(endDate);
    }

    if (shopId) {
      whereClauses.push(`sp.shop_id = $${params.length + 1}`);
      params.push(shopId);
    }

    const whereSQL =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const query = `
      WITH price_changes AS (
        SELECT
          ph.id,
          ph.shop_product_id,

          sp.name AS product_name,
          s.name AS shop_name,

          ((ph.price_min + ph.price_max) / 2.0) AS price,
          ph.crawled_at AS created_at,

          LAG(((ph.price_min + ph.price_max) / 2.0))
          OVER (
            PARTITION BY ph.shop_product_id
            ORDER BY ph.crawled_at
          ) AS previous_price

        FROM price_histories ph
        JOIN shop_products sp
          ON ph.shop_product_id = sp.id

        JOIN shops s
          ON sp.shop_id = s.id

        ${whereSQL}
      )

      SELECT
        *,
        (price - previous_price) AS change_amount,

        CASE
          WHEN previous_price IS NULL
          OR previous_price = 0
          THEN 0
          ELSE ROUND(
            ((price - previous_price)
            / previous_price) * 100,
            2
          )
        END AS change_percent

      FROM price_changes

      WHERE previous_price IS NOT NULL
      AND price != previous_price

      ORDER BY created_at DESC

      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `;

    params.push(limit, offset);

    const countQuery = `
      WITH price_changes AS (
        SELECT
          ph.id,

          ((ph.price_min + ph.price_max) / 2.0) AS price,

          LAG(((ph.price_min + ph.price_max) / 2.0))
          OVER (
            PARTITION BY ph.shop_product_id
            ORDER BY ph.crawled_at
          ) AS previous_price

        FROM price_histories ph
        JOIN shop_products sp
          ON ph.shop_product_id = sp.id

        ${whereSQL}
      )

      SELECT COUNT(*)
      FROM price_changes
      WHERE previous_price IS NOT NULL
      AND price != previous_price
    `;

    const countParams = params.slice(0, -2);

    const { rows } = await db.query(query, params);

    const { rows: countRows } = await db.query(countQuery, countParams);

    const total = Number(countRows[0].count || 0);

    res.json({
      items: rows,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching price fluctuations:", error);

    res.status(500).json({
      error: "Internal server error",
    });
  }
});

/**
 * GET /reports/monthly-summary
 * Báo cáo chi tiết giá hàng tháng
 * Query params:
 * - year (e.g., 2026)
 * - month (1-12)
 * - shopId
 */
router.get("/monthly-summary", async (req, res) => {
  try {
    const { userId } = requireAuthUserId(req);

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    const year = parseInt(req.query.year) || new Date().getFullYear();

    const month = parseInt(req.query.month) || new Date().getMonth() + 1;

    const { shopId } = req.query;

    const params = [year, month];

    let shopFilter = "";

    if (shopId) {
      shopFilter = `AND sp.shop_id = $3`;
      params.push(shopId);
    }

    const query = `
      SELECT
        sp.id AS shop_product_id,

        sp.name AS product_name,

        s.name AS shop_name,

        DATE_TRUNC(
          'month',
          ph.crawled_at
        ) AS report_month,

        MIN((ph.price_min + ph.price_max) / 2.0) AS min_price,

        MAX((ph.price_min + ph.price_max) / 2.0) AS max_price,

        ROUND(AVG((ph.price_min + ph.price_max) / 2.0), 2) AS avg_price,

        COUNT(*) AS price_points

      FROM price_histories ph

      JOIN shop_products sp
        ON ph.shop_product_id = sp.id

      JOIN shops s
        ON sp.shop_id = s.id

      WHERE EXTRACT(YEAR FROM ph.crawled_at) = $1
      AND EXTRACT(MONTH FROM ph.crawled_at) = $2

      ${shopFilter}

      GROUP BY
        sp.id,
        sp.name,
        s.name,
        report_month

      ORDER BY
        product_name ASC
    `;

    const { rows } = await db.query(query, params);

    res.json({
      year,
      month,
      summary: rows,
    });
  } catch (error) {
    console.error("Error fetching monthly price summary:", error);

    res.status(500).json({
      error: "Internal server error",
    });
  }
});

export default router;
