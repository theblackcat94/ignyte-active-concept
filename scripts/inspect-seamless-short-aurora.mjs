// Read-only check of the exact IGN009 listing and its three variants.
import { createClient } from "@supabase/supabase-js";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
  throw new Error("Supabase server configuration is missing");
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data, error } = await db.from("products")
  .select("id,slug,name,category,color,description,status,image_path,gallery,product_variants(sku,size,price_cents,sale_price_cents,stock_on_hand,active)")
  .in("slug", ["seamless-short-jacaranda", "seamless-short-aurora"]);
if (error) throw new Error(error.message);
console.log(JSON.stringify(data, null, 2));
