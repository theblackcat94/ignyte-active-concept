"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { categories as conceptCategories, legacyProductSlugs, money, products as conceptProducts, type Product } from "@/lib/catalog";
import { activeCategories, activeProducts, commerceConfigured } from "@/lib/commerce";
import { track } from "@/lib/analytics-client";
import { bagRecommendations } from "@/lib/product-merchandising";
import "@/app/bag-recommendations.css";

type BagItem = { slug: string; size: string; quantity: number };
type Store = {
  products: Product[];
  categories: { id: string; label: string; cover: string }[];
  catalogPreview: boolean;
  bag: BagItem[];
  bagOpen: boolean;
  setBagOpen: (open: boolean) => void;
  addToBag: (slug: string, size: string) => void;
  removeFromBag: (slug: string, size: string) => void;
  clearBag: () => void;
  wishlist: string[];
  toggleWishlist: (slug: string) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>(conceptProducts);
  const [categories, setCategories] = useState(conceptCategories);
  const [catalogPreview, setCatalogPreview] = useState(true);
  const [bag, setBag] = useState<BagItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [bagOpen, setBagOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const [recommendationSizes, setRecommendationSizes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!commerceConfigured) return;
    void activeProducts().then(active => {
      if (active.length) { setProducts(active); setCatalogPreview(false); }
    }).catch(() => setCheckoutMessage("Products could not be loaded. Please refresh."));
    void activeCategories().then(active => {
      if (active.length) setCategories([
        conceptCategories[0],
        ...active.map(category => ({ id: category.slug, label: category.name, cover: category.cover_path })),
      ]);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        setBag((JSON.parse(localStorage.getItem("ignyte-concept-bag") || "[]") as BagItem[]).map(item => ({ ...item, slug: legacyProductSlugs[item.slug] || item.slug })));
        setWishlist((JSON.parse(localStorage.getItem("ignyte-concept-wishlist") || "[]") as string[]).map(slug => legacyProductSlugs[slug] || slug));
      } catch { /* A fresh bag is safe if browser storage is unavailable. */ }
      setStorageReady(true);
    });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => { if (storageReady) localStorage.setItem("ignyte-concept-bag", JSON.stringify(bag)); }, [bag, storageReady]);
  useEffect(() => { if (storageReady) localStorage.setItem("ignyte-concept-wishlist", JSON.stringify(wishlist)); }, [wishlist, storageReady]);

  const addToBag = (slug: string, size: string) => {
    const product = products.find(item => item.slug === slug);
    if (product && commerceConfigured && !product.variants?.some(variant => variant.size === size && variant.stock > 0)) return;
    setBag(current => {
      const found = current.find(item => item.slug === slug && item.size === size);
      return found
        ? current.map(item => item === found ? { ...item, quantity: item.quantity + 1 } : item)
        : [...current, { slug, size, quantity: 1 }];
    });
    setBagOpen(true);
    track("add_to_bag", `/product/${slug}/`);
  };
  const removeFromBag = (slug: string, size: string) => setBag(current => current.filter(item => !(item.slug === slug && item.size === size)));
  const clearBag = useCallback(() => setBag([]), []);
  const toggleWishlist = (slug: string) => setWishlist(current => current.includes(slug) ? current.filter(item => item !== slug) : [...current, slug]);

  const validBag = bag.filter(item => products.some(product => product.slug === item.slug &&
    (!commerceConfigured || product.variants?.some(variant => variant.size === item.size && variant.stock >= item.quantity))));
  const subtotal = validBag.reduce((sum, item) => {
    const product = products.find(product => product.slug === item.slug);
    return sum + (product?.variants?.find(variant => variant.size === item.size)?.price ?? product?.price ?? 0) * item.quantity;
  }, 0);
  const recommendations = bagRecommendations(bag.map(item => item.slug), products);

  return (
    <StoreContext.Provider value={{ products, categories, catalogPreview, bag, bagOpen, setBagOpen, addToBag, removeFromBag, clearBag, wishlist, toggleWishlist, searchOpen, setSearchOpen }}>
      {children}
      {bagOpen && <div className="drawer-backdrop" onClick={() => setBagOpen(false)} />}
      <aside className={`bag-drawer ${bagOpen ? "is-open" : ""}`} aria-label="Shopping bag" aria-hidden={!bagOpen}>
        <div className="drawer-head"><div><span className="eyebrow">YOUR EDIT</span><h2>YOUR BAG ({bag.reduce((sum, item) => sum + item.quantity, 0)})</h2></div><button className="icon-button" onClick={() => setBagOpen(false)} aria-label="Close bag">×</button></div>
        {bag.length ? <div className="bag-list">{bag.map(item => {
          const product = products.find(p => p.slug === item.slug);
          if (!product) return <div className="bag-row" key={`${item.slug}-${item.size}`}><div><strong>Unavailable product</strong><button className="text-button" onClick={() => removeFromBag(item.slug, item.size)}>Remove</button></div></div>;
          const price = product.variants?.find(variant => variant.size === item.size)?.price ?? product.price;
          return <div className="bag-row" key={`${item.slug}-${item.size}`}>
            <img src={product.image} alt={product.name} />
            <div><strong>{product.name}</strong><span>{product.color} / {item.size}</span><span>Qty {item.quantity} · {money(price * item.quantity)}</span><button className="text-button" onClick={() => removeFromBag(item.slug, item.size)}>Remove</button></div>
          </div>;
        })}{recommendations.length > 0 && <section className="bag-recommendations" aria-label="You may also like"><h3>YOU MAY ALSO LIKE</h3>{recommendations.map(product => {
          const chosen = recommendationSizes[product.slug] ?? "";
          const variants = product.variants ?? [];
          return <div className="bag-recommendation" key={product.slug}><Link href={`/product/${product.slug}`} onClick={() => setBagOpen(false)}><img src={product.image} alt="" /></Link><div><Link href={`/product/${product.slug}`} onClick={() => setBagOpen(false)}><strong>{product.name}</strong></Link><span>{product.color} · {money(product.price)}</span><div className="bag-recommendation-sizes" aria-label={`Choose ${product.name} size`}>{variants.map(variant => <button type="button" key={variant.id} disabled={variant.stock <= 0} aria-label={`${variant.size}${variant.stock <= 0 ? ", out of stock" : ""}`} aria-pressed={chosen === variant.size} onClick={() => setRecommendationSizes(current => ({ ...current, [product.slug]: variant.size }))}>{variant.size}</button>)}</div><button type="button" className="bag-recommendation-add" disabled={!variants.some(variant => variant.size === chosen && variant.stock > 0)} onClick={() => { addToBag(product.slug, chosen); setRecommendationSizes(current => ({ ...current, [product.slug]: "" })); }}>ADD TO BAG ↗</button></div></div>;
        })}</section>}</div> : <div className="empty-bag"><span>✳</span><h3>Nothing in your bag yet.</h3><p>Find your next training favourite.</p><Link href="/shop" className="button button-dark" onClick={() => setBagOpen(false)}>SHOP THE COLLECTION <span>↗</span></Link></div>}
        <div className="drawer-foot"><div><span>SUBTOTAL</span><strong>{money(subtotal)}</strong></div><p>Australian delivery only. Shipping is quoted after your order request; no payment is taken at checkout.</p>{checkoutMessage && <p role="status">{checkoutMessage}</p>}<button className="button button-orange" disabled={!validBag.length} onClick={() => { setBagOpen(false); router.push("/checkout"); }}>CHECKOUT ↗</button></div>
      </aside>
    </StoreContext.Provider>
  );
}

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("StoreProvider is required");
  return context;
};
