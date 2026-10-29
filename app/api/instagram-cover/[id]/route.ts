import { readInstagramCover } from "@/lib/instagram-cover-cache";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cover = await readInstagramCover(id);
  if (!cover) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(cover.bytes), { headers: { "Content-Type": cover.type, "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400", "X-Content-Type-Options": "nosniff" } });
}
