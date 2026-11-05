import { z } from "zod";
import { adminDb } from "@/lib/commerce";

export const journalBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("paragraph"), text: z.string().max(4000) }),
  z.object({ type: z.literal("heading"), text: z.string().max(240) }),
  z.object({ type: z.literal("subheading"), text: z.string().max(240) }),
  z.object({ type: z.literal("quote"), text: z.string().max(1000) }),
  z.object({ type: z.literal("list"), text: z.string().max(4000), ordered: z.boolean().default(false) }),
  z.object({ type: z.literal("image"), url: z.string().max(1000), alt: z.string().max(240) }),
  z.object({ type: z.literal("video"), url: z.string().max(1000), alt: z.string().max(240) }),
]);
export type JournalBlock = z.infer<typeof journalBlockSchema>;

export const journalArticleSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(120),
  title: z.string().trim().min(1).max(240), excerpt: z.string().max(700),
  category_id: z.string().uuid().nullable(),
  status: z.enum(["draft", "published"]), publish_at: z.string().datetime().nullable(),
  featured: z.boolean(), sort_order: z.number().int(), author: z.string().max(160),
  cover_url: z.string().max(1000), cover_alt: z.string().max(240), thumbnail_url: z.string().max(1000),
  body: z.array(journalBlockSchema).max(100),
  seo_title: z.string().max(160), seo_description: z.string().max(320),
  canonical_url: z.string().max(1000), og_image: z.string().max(1000),
  social_title: z.string().max(160), social_description: z.string().max(320),
  press_publication: z.string().max(200), press_date: z.string().nullable(), press_url: z.string().max(1000),
});
export type JournalArticleInput = z.infer<typeof journalArticleSchema>;
export type JournalArticle = JournalArticleInput & { id: string; created_at: string; updated_at: string; journal_categories?: { name: string; slug: string } | null };
export type JournalCard = Pick<JournalArticle, "id" | "slug" | "title" | "excerpt" | "featured" | "cover_url" | "cover_alt" | "thumbnail_url" | "status" | "publish_at" | "journal_categories">;
export const journalCardColumns = "id,slug,title,excerpt,featured,cover_url,cover_alt,thumbnail_url,status,publish_at,journal_categories(name,slug)";
export type JournalCategory = { id: string; slug: string; name: string; description: string; sort_order: number };

export const safeJournalUrl = (value: string) => !value || value.startsWith("/") && !value.startsWith("//") || /^https:\/\//i.test(value);
export const articleIsVisible = (article: Pick<JournalArticle, "status" | "publish_at">) => article.status === "published" && (!article.publish_at || new Date(article.publish_at).getTime() <= Date.now());

export async function journalVisibility(): Promise<"private" | "public"> {
  try {
    const { data, error } = await adminDb().from("journal_settings").select("visibility").eq("id", true).single();
    if (error) return "private";
    return data?.visibility === "public" ? "public" : "private";
  } catch { return "private"; }
}

export async function journalCategories(): Promise<JournalCategory[]> {
  const { data, error } = await adminDb().from("journal_categories").select("id,slug,name,description,sort_order").order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function journalArticles(): Promise<JournalArticle[]> {
  const { data, error } = await adminDb().from("journal_articles").select("*,journal_categories(name,slug)").order("sort_order").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
