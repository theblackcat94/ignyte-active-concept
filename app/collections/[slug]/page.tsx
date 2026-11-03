import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { publicCollections } from "@/lib/collections";
import { adminDb, commerceConfigured } from "@/lib/commerce";
import CollectionDetail from "@/components/collection-detail";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const collection = (await publicCollections().catch(() => [])).find(item => item.slug === slug);
  if (!collection) return { title: "Collection unavailable", robots: { index: false } };
  return { title: collection.seo_title || collection.name, description: collection.seo_description || collection.description, alternates: { canonical: `/collections/${collection.slug}/` } };
}

export default async function CollectionPage({ params }: Props) {
  const { slug } = await params;
  const collection = (await publicCollections().catch(() => [])).find(item => item.slug === slug);
  if (!collection) {
    if (commerceConfigured) {
      const { data: old } = await adminDb().from("collection_redirects").select("destination").eq("old_slug", slug).maybeSingle();
      if (old?.destination) permanentRedirect(old.destination);
    }
    notFound();
  }
  return <CollectionDetail collection={collection} />;
}
