"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { categories as conceptCategories, legacyProductSlugs, money, products as conceptProducts, type Product } from "@/lib/catalog";
import { activeCategories, activeProducts, commerceConfigured } from "@/lib/commerce";
import { track } from "@/lib/analytics-client";
import { bagRecommendations } from "@/lib/product-merchandising";
import "@/app/bag-recommendations.css";
import FreeShippingProgress from "./free-shipping-progress";

type BagItem = { slug: string; size: string; quantity: number };
type Store = {
  products: Product[];
  categories: { id: string; label: string; cover: string }[];
  catalogPreview: boolean;
  catalogLoading: boolean;
  catalogError: boolean;
  bag: BagItem[];
  bagOpen: boolean;
  setBagOpen: (open: boolean) => void;
  addToBag: (slug: string, size: string) => void;
  addSetToBag: (braSlug: string, braSize: string, bottomSlug: string, bottomSize: string) => boolean;
  changeBagQuantity: (slug: string, size: string, change: number) => void;
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
  const [catalogLoading, setCatalogLoading] = useState(commerceConfigured);
  const [catalogError, setCatalogError] = useState(false);
  const [bag, setBag] = useState<BagItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [bagOpen, setBagOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const [recommendationSizes, setRecommendationSizes] = useState<Record<string, string>>({});
  const [actionNotice, setActionNotice] = useState<{ message: string; id: number } | null>(null);
  const noticeSequence = useRef(0);
  const setAddLocked = useRef(false);

  useEffect(() => {
    if (!actionNotice) return;
    const timer = window.setTimeout(() => setActionNotice(null), 2800);
    return () => window.clearTimeout(timer);
  }, [actionNotice]);

  useEffect(() => {
    if (!commerceConfigured) return;
    void activeProducts().then(active => {
      if (active.length) { setProducts(active); setCatalogPreview(false); }
    }).catch(() => { setCatalogError(true); setCheckoutMessage("Products could not be loaded. Please refresh."); }).finally(() => setCatalogLoading(false));
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
    const availableStock = product?.variants?.find(variant => variant.size === size)?.stock;
    if (product && commerceConfigured && (!availableStock || availableStock <= 0)) return;
    setBag(current => {
      const found = current.find(item => item.slug === slug && item.size === size);
      if (found && availableStock !== undefined && found.quantity >= availableStock) return current;
      return found
        ? current.map(item => item === found ? { ...item, quantity: item.quantity + 1 } : item)
        : [...current, { slug, size, quantity: 1 }];
    });
    setBagOpen(true);
    setActionNotice({ message: `${product?.name ?? "Item"} added to your bag`, id: ++noticeSequence.current });
    track("add_to_bag", `/product/${slug}/`);
  };
  const addSetToBag = (braSlug: string, braSize: string, bottomSlug: string, bottomSize: string) => {
    if (setAddLocked.current || !braSize || !bottomSize || braSlug === bottomSlug) return false;
    const bra = products.find(item => item.slug === braSlug);
    const bottom = products.find(item => item.slug === bottomSlug);
    const braVariant = bra?.variants?.find(item => item.size === braSize);
    const bottomVariant = bottom?.variants?.find(item => item.size === bottomSize);
    if (!bra || !bottom || !braVariant || !bottomVariant || braVariant.stock <= 0 || bottomVariant.stock <= 0) return false;
    if (bag.find(item => item.slug === braSlug && item.size === braSize)?.quantity === braVariant.stock ||
        bag.find(item => item.slug === bottomSlug && item.size === bottomSize)?.quantity === bottomVariant.stock) return false;
    setAddLocked.current = true;
    window.setTimeout(() => { setAddLocked.current = false; }, 700);
    setBag(current => {
      const entries = [[braSlug, braSize, braVariant.stock], [bottomSlug, bottomSize, bottomVariant.stock]] as const;
      if (entries.some(([slug, size, stock]) => (current.find(item => item.slug === slug && item.size === size)?.quantity ?? 0) >= stock)) return current;
      const next = [...current];
      for (const [slug, size] of entries) {
        const index = next.findIndex(item => item.slug === slug && item.size === size);
        if (index < 0) next.push({ slug, size, quantity: 1 });
        else next[index] = { ...next[index], quantity: next[index].quantity + 1 };
      }
      return next;
    });
    setBagOpen(true);
    setActionNotice({ message: "Set added to your bag", id: ++noticeSequence.current });
    track("add_to_bag", `/product/${braSlug}/`);
    return true;
  };
  const removeFromBag = (slug: string, size: string) => setBag(current => current.filter(item => !(item.slug === slug && item.size === size)));
  const changeBagQuantity = (slug: string, size: string, change: number) => {
    const product = products.find(item => item.slug === slug);
    const stock = product?.variants?.find(variant => variant.size === size)?.stock;
    setBag(current => current.flatMap(item => {
      if (item.slug !== slug || item.size !== size) return [item];
      const quantity = item.quantity + change;
      if (quantity <= 0) return [];
      if (change > 0 && stock !== undefined && quantity > stock) return [item];
      return [{ ...item, quantity }];
    }));
  };
  const clearBag = useCallback(() => setBag([]), []);
  const toggleWishlist = (slug: string) => {
    const product = products.find(item => item.slug === slug);
    const saved = wishlist.includes(slug);
    setWishlist(current => saved ? current.filter(item => item !== slug) : [...current, slug]);
    setActionNotice({ message: `${product?.name ?? "Item"} ${saved ? "removed from" : "saved to"} your wishlist`, id: ++noticeSequence.current });
  };

  const validBag = bag.filter(item => products.some(product => product.slug === item.slug &&
    (!commerceConfigured || product.variants?.some(variant => variant.size === item.size && variant.stock >= item.quantity))));
  const subtotal = validBag.reduce((sum, item) => {
    const product = products.find(product => product.slug === item.slug);
    return sum + (product?.variants?.find(variant => variant.size === item.size)?.price ?? product?.price ?? 0) * item.quantity;
  }, 0);
  const recommendations = bagRecommendations(bag.map(item => item.slug), products);

  return (
    <StoreContext.Provider value={{ products, categories, catalogPreview, catalogLoading, catalogError, bag, bagOpen, setBagOpen, addToBag, addSetToBag, changeBagQuantity, removeFromBag, clearBag, wishlist, toggleWishlist, searchOpen, setSearchOpen }}>
      {children}
      {actionNotice && <div key={actionNotice.id} className="store-action-toast" role="status" aria-live="polite"><span aria-hidden="true">✦</span>{actionNotice.message}</div>}
      {bagOpen && <div className="drawer-backdrop" onClick={() => setBagOpen(false)} />}
      <aside className={`bag-drawer ${bagOpen ? "is-open" : ""}`} aria-label="Shopping bag" aria-hidden={!bagOpen}>
        <div className="drawer-head"><div><span className="eyebrow">YOUR EDIT</span><h2>YOUR BAG ({bag.reduce((sum, item) => sum + item.quantity, 0)})</h2></div><button className="icon-button" onClick={() => setBagOpen(false)} aria-label="Close bag">×</button></div>
        {bag.length ? <div className="bag-list">{bag.map(item => {
          const product = products.find(p => p.slug === item.slug);
          if (!product) return <div className="bag-row" key={`${item.slug}-${item.size}`}><div><strong>Unavailable product</strong><button className="text-button" onClick={() => removeFromBag(item.slug, item.size)}>Remove</button></div></div>;
          const price = product.variants?.find(variant => variant.size === item.size)?.price ?? product.price;
          return <div className="bag-row" key={`${item.slug}-${item.size}`}>
            <Link href={`/product/${product.slug}`} onClick={() => setBagOpen(false)} aria-label={`View ${product.name}`}><img src={product.image} alt="" /></Link>
            <div><Link className="bag-product-name" href={`/product/${product.slug}`} onClick={() => setBagOpen(false)}>{product.name}</Link><span>{product.color} / {item.size}</span><div className="bag-quantity" aria-label={`${product.name} quantity`}><button type="button" onClick={() => changeBagQuantity(item.slug, item.size, -1)} aria-label={`Decrease ${product.name} quantity`}>−</button><span aria-live="polite">{item.quantity}</span><button type="button" onClick={() => changeBagQuantity(item.slug, item.size, 1)} disabled={Boolean(product.variants?.some(variant => variant.size === item.size && item.quantity >= variant.stock))} aria-label={`Increase ${product.name} quantity`}>+</button></div><span>{money(price * item.quantity)}</span><button className="text-button" onClick={() => removeFromBag(item.slug, item.size)}>Remove</button></div>
          </div>;
        })}{recommendations.length > 0 && <section className="bag-recommendations" aria-label="You may also like"><h3>YOU MAY ALSO LIKE</h3>{recommendations.map(product => {
          const variants = product.variants ?? [];
          const chosen = recommendationSizes[product.slug] ?? (variants.length === 1 && variants[0].stock > 0 ? variants[0].size : "");
          return <div className="bag-recommendation" key={product.slug}><Link href={`/product/${product.slug}`} onClick={() => setBagOpen(false)}><img src={product.image} alt="" /></Link><div><Link href={`/product/${product.slug}`} onClick={() => setBagOpen(false)}><strong>{product.name}</strong></Link><span>{product.color} · {money(product.price)}</span><div className="bag-recommendation-sizes" aria-label={`Choose ${product.name} size`}>{variants.map(variant => <button type="button" key={variant.id} disabled={variant.stock <= 0} aria-label={`${variant.size}${variant.stock <= 0 ? ", out of stock" : ""}`} aria-pressed={chosen === variant.size} onClick={() => setRecommendationSizes(current => ({ ...current, [product.slug]: variant.size }))}>{variant.size}</button>)}</div><button type="button" className="bag-recommendation-add" disabled={!variants.some(variant => variant.size === chosen && variant.stock > 0)} onClick={() => { addToBag(product.slug, chosen); setRecommendationSizes(current => ({ ...current, [product.slug]: "" })); }}>ADD TO BAG ↗</button></div></div>;
        })}</section>}</div> : <div className="empty-bag"><svg className="empty-bag-mark" viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" aria-hidden="true"><path d="M40 5v70M5 40h70M15 15l50 50M65 15 15 65" /></svg><h3>Nothing in your bag yet.</h3><p>Find your next training favourite.</p><Link href="/shop" className="button button-dark" onClick={() => setBagOpen(false)}>SHOP THE COLLECTION <span>↗</span></Link></div>}
        <div className="drawer-foot">{validBag.length > 0 && <FreeShippingProgress amountCents={Math.round(subtotal * 100)} />}<div><span>SUBTOTAL</span><strong>{money(subtotal)}</strong></div><p>Australian delivery only. Shipping is quoted after your order request; no payment is taken at checkout.</p>{checkoutMessage && <p role="status">{checkoutMessage}</p>}<button className="button button-orange" disabled={!validBag.length} onClick={() => { setBagOpen(false); router.push("/checkout"); }}>CHECKOUT ↗</button></div>
      </aside>
    </StoreContext.Provider>
  );
}

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("StoreProvider is required");
  return context;
};
