/** @format */

import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: "./.env" });

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

pool.on("connect", () => {
  console.log("Connected to PostgreSQL database!");
});

pool.on("error", (err) => {
  console.error("Error connecting to PostgreSQL database:", err);
});

export const db = {
  query: (text, params) => pool.query(text, params),
};

export default pool;
