"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { legacyProductSlugs, money, products as conceptProducts, type Product } from "@/lib/catalog";
import { activeProducts, commerceConfigured } from "@/lib/commerce";

type BagItem = { slug: string; size: string; quantity: number };
type Store = {
  products: Product[];
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
  const [catalogPreview, setCatalogPreview] = useState(true);
  const [bag, setBag] = useState<BagItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [bagOpen, setBagOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    if (!commerceConfigured) return;
    void activeProducts().then(active => {
      if (active.length) { setProducts(active); setCatalogPreview(false); }
    }).catch(() => setCheckoutMessage("Products could not be loaded. Please refresh."));
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

  return (
    <StoreContext.Provider value={{ products, catalogPreview, bag, bagOpen, setBagOpen, addToBag, removeFromBag, clearBag, wishlist, toggleWishlist, searchOpen, setSearchOpen }}>
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
        })}</div> : <div className="empty-bag"><span>✳</span><h3>Nothing in your bag yet.</h3><p>Find your next training favourite.</p><Link href="/shop" className="button button-dark" onClick={() => setBagOpen(false)}>SHOP THE COLLECTION <span>↗</span></Link></div>}
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
