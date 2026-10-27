import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile, chmod } from "node:fs/promises";
import { join, resolve } from "node:path";

nextEnv.loadEnvConfig(process.cwd());
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const target = process.env.IGNYTE_BACKUP_DIR;
if (!url || !secret || !target) throw Error("Supabase URL, secret key and IGNYTE_BACKUP_DIR are required");
const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const directory = join(resolve(target), new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-"));
await mkdir(directory, { recursive: true, mode: 0o700 });
await chmod(directory, 0o700);
const tables = ["categories", "products", "product_variants", "orders", "order_items", "staff_members", "coupons", "shipping_rates", "support_tickets", "marketing_subscribers", "site_events"];
for (const table of tables) {
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db.from(table).select("*").range(offset, offset + 499);
    if (error) throw Error(`Backup failed at ${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < 500) break;
  }
  await writeFile(join(directory, `${table}.json`), JSON.stringify(rows), { mode: 0o600 });
}
async function storageFolder(prefix = "") {
  let offset = 0;
  for (;;) {
    const { data, error } = await db.storage.from("product-media").list(prefix, { limit: 100, offset });
    if (error) throw Error(`Media list failed: ${error.message}`);
    for (const item of data ?? []) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) await storageFolder(path);
      else {
        const { data: blob, error: downloadError } = await db.storage.from("product-media").download(path);
        if (downloadError || !blob) throw Error(`Media download failed: ${path}`);
        const destination = join(directory, "product-media", ...path.split("/"));
        await mkdir(resolve(destination, ".."), { recursive: true, mode: 0o700 });
        await writeFile(destination, Buffer.from(await blob.arrayBuffer()), { mode: 0o600 });
      }
    }
    if ((data?.length ?? 0) < 100) break;
    offset += 100;
  }
}
await storageFolder();
await writeFile(join(directory, "manifest.json"), JSON.stringify({ created_at: new Date().toISOString(), tables, bucket: "product-media", note: "Business-data export; not a full Postgres or Supabase Auth backup" }, null, 2), { mode: 0o600 });
console.log(`Store backup completed at ${directory}`);
