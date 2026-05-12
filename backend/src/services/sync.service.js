/** @format */

import { db } from "../lib/db.js";
import { supabase } from "../lib/supabase.js";

const BATCH_SIZE = 100;

async function syncTable(tableName, localTableName = tableName) {
  console.log(`🚀 Starting sync for table: ${tableName}`);
  let totalSynced = 0;
  let hasMore = true;
  let page = 0;

  while (hasMore) {
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .range(page * BATCH_SIZE, (page + 1) * BATCH_SIZE - 1);

    if (error) {
      console.error(`Error fetching ${tableName} from Supabase:`, error);
      throw error;
    }

    if (data && data.length > 0) {
      for (const item of data) {
        const columns = Object.keys(item).join(", ");
        const values = Object.values(item);
        const valuePlaceholders = values.map((_, i) => `$${i + 1}`).join(", ");

        const conflictColumns = "id";
        const updateColumns = Object.keys(item)
          .filter((key) => key !== "id")
          .map((key) => `${key} = EXCLUDED.${key}`)
          .join(", ");

        const query = `
          INSERT INTO ${localTableName} (${columns})
          VALUES (${valuePlaceholders})
          ON CONFLICT (${conflictColumns}) DO UPDATE SET
          ${updateColumns};
        `;

        try {
          await db.query(query, values);
        } catch (dbError) {
          console.error(
            `Error inserting/updating item in ${localTableName}:`,
            dbError,
          );
          console.error("Item:", item);
        }
      }
      totalSynced += data.length;
      console.log(
        `Synced ${data.length} records for ${tableName}. Total: ${totalSynced}`,
      );
      page++;
    } else {
      hasMore = false;
    }
  }
  console.log(
    `✅ Finished sync for table: ${tableName}. Total: ${totalSynced}`,
  );
  return totalSynced;
}

export const syncAllData = async () => {
  const results = {};
  const tablesToSync = [
    // "users",
    // "brands",
    // "shops",
    // "products",
    // "shop_products",
    // "crawl_histories",
    // "account_brand_permissions",
    "price_histories",
  ];

  for (const table of tablesToSync) {
    try {
      const count = await syncTable(table);
      results[table] = { status: "success", synced: count };
    } catch (error) {
      results[table] = { status: "failed", error: error.message };
    }
  }

  return results;
};
