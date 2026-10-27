import { z } from "zod";

const image = z.string().trim().min(1).max(1000).refine(value =>
  value.startsWith("/images/") || value.startsWith("https://"), "Use a local image path or HTTPS URL");

export const productInput = z.object({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(120),
  name: z.string().trim().min(1).max(160),
  category: z.enum(["sports-bras", "tops", "leggings", "shorts"]),
  color: z.string().trim().min(1).max(80),
  description: z.string().trim().max(5000),
  status: z.enum(["draft", "active", "archived"]),
  label: z.string().trim().max(80).nullable(),
  image_path: image,
  gallery: z.array(z.object({ image, alt: z.string().trim().max(200) })).max(12),
  variants: z.array(z.object({
    id: z.string().uuid().optional(),
    sku: z.string().trim().min(1).max(120),
    size: z.string().trim().min(1).max(40),
    price_cents: z.number().int().min(0).max(10000000),
    stock_on_hand: z.number().int().min(0).max(1000000),
    stock_revision: z.number().int().min(0).optional(),
    active: z.boolean(),
  })).max(50),
});
