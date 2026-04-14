/** @format */

import { createClient } from "@supabase/supabase-js";
import ExcelJS from "exceljs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase credentials");
}
const supabase = createClient(supabaseUrl, supabaseServiceKey);
export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  const buffer = Buffer.from(await file.arrayBuffer());

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);

  const sheet = workbook.getWorksheet(1);

  const updates: any[] = [];

  sheet?.eachRow((row, i) => {
    if (i === 1) return; // skip header

    const id = row.getCell(1).value;
    const priceOriginal = row.getCell(5).value;

    if (id) {
      updates.push({
        id,
        original_price: Number(priceOriginal || 0),
      });
    }
  });

  for (const item of updates) {
    await supabase
      .from("products_aff")
      .update({ original_price: item.original_price })
      .eq("id", item.id);
  }

  return Response.json({ success: true, updated: updates.length });
}
