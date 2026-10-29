import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const stateDir = process.env.IGNYTE_STATE_DIR ?? (process.env.NODE_ENV === "production" ? "/var/lib/ignyte" : path.join(process.cwd(), ".local-data"));
const coverDir = path.join(stateDir, "instagram-covers");
const validId = (id: string) => /^\d{8,25}$/.test(id);

export async function cacheInstagramCover(id: string, url: string) {
  if (!validId(id)) throw new Error("Invalid media ID");
  const source = new URL(url);
  if (source.protocol !== "https:" || !(source.hostname === "cdninstagram.com" || source.hostname.endsWith(".cdninstagram.com") || source.hostname === "fbcdn.net" || source.hostname.endsWith(".fbcdn.net"))) throw new Error("Unapproved media host");
  const response = await fetch(source, { signal: AbortSignal.timeout(10000), cache: "no-store" });
  const contentType = response.headers.get("content-type")?.split(";")[0] ?? "";
  if (!response.ok || !["image/jpeg", "image/png", "image/webp"].includes(contentType)) throw new Error("Invalid cover response");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > 8 * 1024 * 1024) throw new Error("Cover exceeds size limit");
  await mkdir(coverDir, { recursive: true, mode: 0o750 });
  await writeFile(path.join(coverDir, `${id}.image`), bytes, { mode: 0o640 });
  await writeFile(path.join(coverDir, `${id}.type`), contentType, { mode: 0o640 });
  return `/api/instagram-cover/${id}`;
}

export async function readInstagramCover(id: string) {
  if (!validId(id)) return null;
  try {
    const [bytes, type] = await Promise.all([readFile(path.join(coverDir, `${id}.image`)), readFile(path.join(coverDir, `${id}.type`), "utf8")]);
    return { bytes, type };
  } catch { return null; }
}
