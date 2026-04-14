/** @format */

import ExcelJS from "exceljs";
/** @format */

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase credentials");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
export async function GET() {
  const { data, error } = await supabase
    .from("products_aff")
    .select("id, name, price_min, price_max, original_price");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Products");

  sheet.columns = [
    { header: "ID", key: "id", width: 50 },
    { header: "Tên", key: "name", width: 50 },
    { header: "Giá Min", key: "price_min", width: 15 },
    { header: "Giá Max", key: "price_max", width: 15 },
    { header: "Giá niêm yết", key: "original_price", width: 20 },
  ];

  data?.forEach((p: any) => sheet.addRow(p));

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=products.xlsx",
    },
  });
}
