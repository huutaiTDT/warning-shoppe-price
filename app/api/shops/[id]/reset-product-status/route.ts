/** @format */

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase credentials");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// POST: Reset product extraction status for a shop
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const shopId = params.id;

    const { data, error } = await supabase
      .from("shops")
      .update({ is_sys_product_by_link: false })
      .eq("id", shopId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, shop: data });
  } catch (error) {
    console.error("Error resetting product status:", error);
    return NextResponse.json(
      { error: "Lỗi khi đặt lại trạng thái" },
      { status: 500 },
    );
  }
}
