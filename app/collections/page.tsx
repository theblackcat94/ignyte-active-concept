import Link from "next/link";
import { categories as previewCategories } from "@/lib/catalog";
import { activeCategories, commerceConfigured } from "@/lib/commerce";
import { publicCollections } from "@/lib/collections";
import "./collections.css";

export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  const [curated, liveCategories] = await Promise.all([
    publicCollections(),
    commerceConfigured ? activeCategories() : Promise.resolve([]),
  ]);
  const categories: { id: string; label: string; cover: string; coverAlt?: string }[] = commerceConfigured
    ? liveCategories.map(category => ({
        id: category.slug,
        label: category.name,
        cover: category.cover_path,
        coverAlt: category.cover_alt ?? "",
      }))
    : previewCategories.filter(category => category.id !== "all");

  return <div className="collections-page section-wrap">
    <div className="breadcrumb"><Link href="/">HOME</Link><span>/</span><span>COLLECTIONS</span></div>
    <span className="eyebrow">IGNYTE / CURATED</span>
    <h1>THE COLLECTION<span>.</span></h1>
    <p>Explore curated edits and the pieces made for your next move.</p>
    {curated.length > 0 && <section aria-labelledby="shop-by-collection">
      <h2 id="shop-by-collection" className="collections-section-heading">SHOP BY COLLECTION_</h2>
      <div className="collections-grid">{curated.map(collection =>
        <Link href={`/collections/${collection.slug}`} className="collections-tile" key={collection.id}>
          {collection.cover_path && <img src={collection.cover_path} alt={collection.cover_alt} style={{ objectPosition: `${collection.focal_x}% ${collection.focal_y}%` }} />}
          <span>{collection.name.toUpperCase()} <b>↗</b></span>
        </Link>)}</div>
    </section>}
    {categories.length > 0 && <section aria-labelledby="shop-by-category">
      <h2 id="shop-by-category" className="collections-section-heading">SHOP BY CATEGORY_</h2>
      <div className="collections-grid">{categories.map(category =>
        <Link href={`/shop/${category.id}`} className="collections-tile" key={category.id}>
          <img src={category.cover} alt={category.coverAlt || ""} />
          <span>{category.label.toUpperCase()} <b>↗</b></span>
        </Link>)}</div>
    </section>}
    <Link className="button button-dark" href="/shop">SHOP ALL ↗</Link>
  </div>;
}
