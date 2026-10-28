import type { Product } from "@/lib/catalog";
import "@/app/pdp-stack-preview.css";

export default function StackedProductGallery({ product }: { product: Product }) {
  const photos = [
    { image: product.image, alt: `${product.name} in ${product.color}` },
    ...product.gallery,
  ];

  return <section className="pdp-stack-media" aria-label={`${product.name} stacked media gallery`}>
    <div className="pdp-stack-heading"><span>EXPLORE THE DETAILS</span><span>{photos.length + (product.pdp.video_url ? 1 : 0)} VIEWS</span></div>
    <div className="pdp-stack-grid">
      {photos.map((photo, index) => <figure className="pdp-stack-tile" key={`${photo.image}-${index}`}>
        <img src={photo.image} alt={photo.alt} loading={index === 0 ? "eager" : "lazy"} />
      </figure>)}
      {product.pdp.video_url && <figure className="pdp-stack-tile pdp-stack-video">
        <video src={product.pdp.video_url} poster={product.pdp.video_poster || undefined} controls playsInline preload="none" aria-label={`${product.name} product film`} />
        <figcaption>IGNYTE FILM</figcaption>
      </figure>}
    </div>
    <p className="pdp-stack-swipe">SWIPE TO EXPLORE MEDIA <span aria-hidden="true">↔</span></p>
  </section>;
}
