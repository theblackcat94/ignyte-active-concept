"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { categories as conceptCategories, legacyProductSlugs, money, products as conceptProducts, type Product } from "@/lib/catalog";
import { activeCategories, activeProducts, commerceConfigured } from "@/lib/commerce";
import { track } from "@/lib/analytics-client";
import { bagRecommendations, matchingBagProducts } from "@/lib/product-merchandising";
import { qualifiesForFreeShipping } from "@/lib/shipping-policy";
import { compareProductColours, productColourHex } from "@/lib/product-colors";
import "@/app/bag-recommendations.css";
import "@/app/shopping-microinteractions.css";
import FreeShippingProgress from "./free-shipping-progress";
import PurchaseReassurance from "./purchase-reassurance";

type BagItem = { slug: string; size: string; quantity: number };
type AddedItem = { slug: string; size: string; id: number; second?: { slug: string; size: string } };
type Store = {
  products: Product[];
  categories: { id: string; label: string; cover: string; coverAlt?: string; focalX?: number; focalY?: number }[];
  catalogPreview: boolean;
  catalogLoading: boolean;
  catalogError: boolean;
  bag: BagItem[];
  bagOpen: boolean;
  bagImpactId: number;
  setBagDiscount: (discount: { subtotalCents: number; discountCents: number } | null) => void;
  setBagOpen: (open: boolean) => void;
  addToBag: (slug: string, size: string) => boolean;
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
  const pathname = usePathname();
  const [products, setProducts] = useState<Product[]>(conceptProducts);
  const [categories, setCategories] = useState(conceptCategories);
  const [catalogPreview, setCatalogPreview] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(commerceConfigured);
  const [catalogError, setCatalogError] = useState(false);
  const [bag, setBag] = useState<BagItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [bagOpen, setBagOpenState] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const [bagDiscount, setBagDiscount] = useState<{ subtotalCents: number; discountCents: number } | null>(null);
  const [shippingCelebrationId, setShippingCelebrationId] = useState<number | null>(null);
  const shippingCelebrationSequence = useRef(0);
  const previousShippingEligibility = useRef<boolean | null>(null);
  const [recommendationSizes, setRecommendationSizes] = useState<Record<string, string>>({});
  const [recommendationColours, setRecommendationColours] = useState<Record<string, string>>({});
  const [actionNotice, setActionNotice] = useState<{ message: string; id: number; href?: string } | null>(null);
  const [lastAdded, setLastAdded] = useState<AddedItem | null>(null);
  const setBagOpen = (open: boolean) => { if (!open) setLastAdded(null); setBagOpenState(open); };
  const noticeSequence = useRef(0);
  const setAddLocked = useRef(false);
  const addLocks = useRef(new Set<string>());
  const [bagImpactId, setBagImpactId] = useState(0);
  const [ignition, setIgnition] = useState<{ x: number; y: number; dx: number; dy: number; distance: number; angle: number; targetX: number; targetY: number; id: number } | null>(null);
  const launchIgnition = () => {
    const id = ++noticeSequence.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) { setBagImpactId(id); return; }
    const active = document.activeElement;
    if (!(active instanceof HTMLButtonElement)) return;
    const origin = active.getBoundingClientRect();
    const header = document.querySelector(".bag-trigger")?.getBoundingClientRect();
    const headerVisible = !bagOpen && header && header.width > 0 && header.top >= 0 && header.bottom <= window.innerHeight && !document.querySelector(".site-header-hidden");
    const x = origin.left + origin.width / 2;
    const y = origin.top + origin.height / 2;
    const targetX = headerVisible ? header.left + header.width / 2 : window.innerWidth - Math.min(470, window.innerWidth) / 2;
    const targetY = headerVisible ? header.top + header.height / 2 : 140;
    const dx = targetX - x;
    const dy = targetY - y;
    setIgnition({ x, y, dx, dy, distance: Math.hypot(dx, dy), angle: Math.atan2(dy, dx) * 180 / Math.PI, targetX, targetY, id });
    window.setTimeout(() => setBagImpactId(id), 620);
    window.setTimeout(() => setIgnition(current => current?.id === id ? null : current), 1100);
  };

  useEffect(() => {
    if (!actionNotice) return;
    const timer = window.setTimeout(() => setActionNotice(null), 2800);
    return () => window.clearTimeout(timer);
  }, [actionNotice]);

  useEffect(() => {
    if (!commerceConfigured) return;
    let cancelled = false;
    const refresh = () => {
      void Promise.all([activeProducts(), activeCategories()]).then(([active, availableCategories]) => {
        if (cancelled) return;
        setProducts(active);
        setCategories([conceptCategories[0], ...availableCategories.map(category => ({ id: category.slug, label: category.name, cover: category.cover_path, coverAlt: category.cover_alt, focalX: category.focal_x, focalY: category.focal_y }))]);
        setCatalogPreview(false);
        setCatalogError(false);
      }).catch(() => { if (!cancelled) { setCatalogError(true); setCheckoutMessage("The catalog could not be loaded. Please refresh."); } })
        .finally(() => { if (!cancelled) setCatalogLoading(false); });
    };
    refresh();
    const onVisible = () => { if (!document.hidden) refresh(); };
    window.addEventListener("ignyte:catalog-changed", refresh);
    const onStorage = (event: StorageEvent) => { if (event.key === "ignyte:catalog-version") refresh(); };
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisible);
    return () => { cancelled = true; window.removeEventListener("ignyte:catalog-changed", refresh); window.removeEventListener("storage", onStorage); document.removeEventListener("visibilitychange", onVisible); };
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        setBag((JSON.parse(localStorage.getItem("ignyte-concept-bag") || "[]") as BagItem[]).map(item => ({ ...item, slug: legacyProductSlugs[item.slug] || item.slug, size: item.slug.includes("socks") && item.size.toLowerCase() === "one size" ? "One size" : item.size })));
        setWishlist((JSON.parse(localStorage.getItem("ignyte-concept-wishlist") || "[]") as string[]).map(slug => legacyProductSlugs[slug] || slug));
      } catch { /* A fresh bag is safe if browser storage is unavailable. */ }
      setStorageReady(true);
    });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => { if (storageReady) localStorage.setItem("ignyte-concept-bag", JSON.stringify(bag)); }, [bag, storageReady]);
  useEffect(() => { if (storageReady) localStorage.setItem("ignyte-concept-wishlist", JSON.stringify(wishlist)); }, [wishlist, storageReady]);

  const addToBag = (slug: string, size: string): boolean => {
    const product = products.find(item => item.slug === slug);
    const availableStock = product?.variants?.find(variant => variant.size === size)?.stock;
    if (!product || catalogLoading || catalogError || (commerceConfigured && (!availableStock || availableStock <= 0))) return false;
    const key = `${slug}:${size}`;
    if (addLocks.current.has(key)) return false;
    if (availableStock !== undefined && (bag.find(item => item.slug === slug && item.size === size)?.quantity ?? 0) >= availableStock) {
      setActionNotice({ message: "All available stock for this size is already in your bag.", id: ++noticeSequence.current });
      return false;
    }
    addLocks.current.add(key);
    window.setTimeout(() => addLocks.current.delete(key), 650);
    setBag(current => {
      const found = current.find(item => item.slug === slug && item.size === size);
      if (found && availableStock !== undefined && found.quantity >= availableStock) return current;
      return found
        ? current.map(item => item === found ? { ...item, quantity: item.quantity + 1 } : item)
        : [...current, { slug, size, quantity: 1 }];
    });
    launchIgnition();
    setBagOpen(true);
    setLastAdded({ slug, size, id: ++noticeSequence.current });
    track("add_to_bag", `/product/${slug}/`);
    return true;
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
    launchIgnition();
    setBagOpen(true);
    setLastAdded({ slug: braSlug, size: braSize, second: { slug: bottomSlug, size: bottomSize }, id: ++noticeSequence.current });
    track("add_to_bag", `/product/${braSlug}/`);
    return true;
  };
  const removeFromBag = (slug: string, size: string) => {
    setBag(current => current.filter(item => !(item.slug === slug && item.size === size)));
    setLastAdded(current => current && ((current.slug === slug && current.size === size) || (current.second?.slug === slug && current.second.size === size)) ? null : current);
  };
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
    if (change < 0 && bag.find(item => item.slug === slug && item.size === size)?.quantity === 1) {
      setLastAdded(current => current && ((current.slug === slug && current.size === size) || (current.second?.slug === slug && current.second.size === size)) ? null : current);
    }
  };
  const clearBag = useCallback(() => { setBag([]); setLastAdded(null); }, []);
  const toggleWishlist = (slug: string) => {
    const product = products.find(item => item.slug === slug);
    const saved = wishlist.includes(slug);
    setWishlist(current => saved ? current.filter(item => item !== slug) : [...current, slug]);
    setActionNotice({ message: `${product?.name ?? "Item"} ${saved ? "removed from" : "saved to"} your wishlist`, href: saved ? undefined : "/wishlist", id: ++noticeSequence.current });
  };

  const validBag = bag.filter(item => products.some(product => product.slug === item.slug &&
    (!commerceConfigured || product.variants?.some(variant => variant.size === item.size && variant.stock >= item.quantity))));
  const subtotal = validBag.reduce((sum, item) => {
    const product = products.find(product => product.slug === item.slug);
    return sum + (product?.variants?.find(variant => variant.size === item.size)?.price ?? product?.price ?? 0) * item.quantity;
  }, 0);
  const subtotalCents = Math.round(subtotal * 100);
  const shippingBasisCents = subtotalCents - (bagDiscount?.subtotalCents === subtotalCents ? bagDiscount.discountCents : 0);
  const shippingEligible = qualifiesForFreeShipping(shippingBasisCents);
  useEffect(() => {
    if (!storageReady || catalogLoading) return;
    if (previousShippingEligibility.current === false && shippingEligible && bagOpen) {
      setShippingCelebrationId(++shippingCelebrationSequence.current);
    } else if (!shippingEligible) {
      setShippingCelebrationId(null);
    }
    previousShippingEligibility.current = shippingEligible;
  }, [storageReady, catalogLoading, shippingEligible, bagOpen]);
  useEffect(() => {
    if (shippingCelebrationId === null) return;
    const timer = window.setTimeout(() => setShippingCelebrationId(null), 4000);
    return () => window.clearTimeout(timer);
  }, [shippingCelebrationId]);
  const bagSlugs = bag.map(item => item.slug);
  const matchingProducts = matchingBagProducts(lastAdded?.slug, bagSlugs, products);
  const recommendations = matchingProducts.length ? matchingProducts : bagRecommendations(bagSlugs, products);

  return (
    <StoreContext.Provider value={{ products, categories, catalogPreview, catalogLoading, catalogError, bag, bagOpen, bagImpactId, setBagOpen, setBagDiscount, addToBag, addSetToBag, changeBagQuantity, removeFromBag, clearBag, wishlist, toggleWishlist, searchOpen, setSearchOpen }}>
      {children}
      {ignition && <div key={ignition.id} className="ignyte-add-ignition" aria-hidden="true" style={{ "--ignition-x": `${ignition.x}px`, "--ignition-y": `${ignition.y}px`, "--ignition-target-x": `${ignition.targetX}px`, "--ignition-target-y": `${ignition.targetY}px`, "--ignition-distance": `${ignition.distance}px`, "--ignition-angle": `${ignition.angle}deg` } as CSSProperties}><span className="ignyte-add-flash" /><span className="ignyte-add-trail" /><span className="ignyte-add-mobile-edge"><i /><i /><i /><i /></span><span className="ignyte-add-impact" /></div>}
      {actionNotice && <div key={actionNotice.id} className="store-action-toast" role="status" aria-live="polite"><span aria-hidden="true">✦</span>{actionNotice.message}{actionNotice.href && <a href={actionNotice.href}>View Saved Items ↗</a>}</div>}
      {bagOpen && <div className="drawer-backdrop" onClick={() => setBagOpen(false)} />}
      <aside className={`bag-drawer ${bagOpen ? "is-open" : ""}${lastAdded ? " has-ignition" : ""}`} aria-label="Shopping bag" aria-hidden={!bagOpen}>
        <div className="drawer-head"><div><span className="eyebrow">YOUR EDIT</span><h2>YOUR BAG ({bag.reduce((sum, item) => sum + item.quantity, 0)})</h2></div><button className="icon-button" onClick={() => setBagOpen(false)} aria-label="Close bag">×</button></div>
        {bagOpen && lastAdded && <BagAddedConfirmation added={lastAdded} products={products} bag={bag} onKeepShopping={() => setBagOpen(false)} onDismiss={() => setLastAdded(null)} />}
        {bag.length ? <div className="bag-list">{bag.map(item => {
          const product = products.find(p => p.slug === item.slug);
          if (!product) return <div className="bag-row" key={`${item.slug}-${item.size}`}><div><strong>Unavailable product</strong><button className="text-button" onClick={() => removeFromBag(item.slug, item.size)}>Remove</button></div></div>;
          const price = product.variants?.find(variant => variant.size === item.size)?.price ?? product.price;
          return <div className="bag-row" key={`${item.slug}-${item.size}`}>
            <Link href={`/product/${product.slug}`} onClick={() => setBagOpen(false)} aria-label={`View ${product.name}`}><img src={product.image} alt="" /></Link>
            <div><Link className="bag-product-name" href={`/product/${product.slug}`} onClick={() => setBagOpen(false)}>{product.name}</Link><span>{product.color} / {item.size}</span><div className="bag-quantity" aria-label={`${product.name} quantity`}><button type="button" onClick={() => changeBagQuantity(item.slug, item.size, -1)} aria-label={`Decrease ${product.name} quantity`}>−</button><span aria-live="polite">{item.quantity}</span><button type="button" onClick={() => changeBagQuantity(item.slug, item.size, 1)} disabled={Boolean(product.variants?.some(variant => variant.size === item.size && item.quantity >= variant.stock))} aria-label={`Increase ${product.name} quantity`}>+</button></div><span>{money(price * item.quantity)}</span><button className="text-button" onClick={() => removeFromBag(item.slug, item.size)}>Remove</button></div>
          </div>;
        })}{recommendations.length > 0 && <section className="bag-recommendations" aria-label={matchingProducts.length ? "Complete your set" : "You may also like"}><h3>{matchingProducts.length ? "COMPLETE YOUR SET" : "YOU MAY ALSO LIKE"}</h3>{recommendations.map(base => {
          const colours = products.filter(item => item.name === base.name && item.category === base.category && !bagSlugs.includes(item.slug) && item.variants?.some(variant => variant.stock > 0)).sort((a,b) => compareProductColours(a.color,b.color));
          const product = colours.find(item => item.slug === recommendationColours[base.slug]) ?? base;
          const variants = product.variants ?? [];
          const chosen = recommendationSizes[product.slug] ?? (variants.length === 1 && variants[0].stock > 0 ? variants[0].size : "");
          return <div className="bag-recommendation" key={base.slug}><Link href={`/product/${product.slug}`} onClick={() => setBagOpen(false)}><img src={product.image} alt="" /></Link><div><Link href={`/product/${product.slug}`} onClick={() => setBagOpen(false)}><strong>{product.name}</strong></Link><span>{product.color} · {money(product.price)}</span>{colours.length > 1 && <div className="bag-recommendation-colours" aria-label={`${product.name} colours`}>{colours.map(option => <button key={option.slug} type="button" aria-label={option.color} aria-pressed={option.slug === product.slug} style={{ backgroundColor: productColourHex(option.color) ?? "#d6d1cb" }} onClick={() => setRecommendationColours(current => ({ ...current, [base.slug]: option.slug }))} />)}</div>}<div className="bag-recommendation-sizes" aria-label={`Choose ${product.name} size`}>{variants.map(variant => <button type="button" key={variant.id} disabled={variant.stock <= 0} aria-label={`${variant.size}${variant.stock <= 0 ? ", out of stock" : ""}`} aria-pressed={chosen === variant.size} onClick={() => setRecommendationSizes(current => ({ ...current, [product.slug]: variant.size }))}>{variant.size}</button>)}</div><button type="button" className="bag-recommendation-add" disabled={!variants.some(variant => variant.size === chosen && variant.stock > 0)} onClick={() => { if (addToBag(product.slug, chosen)) setRecommendationSizes(current => ({ ...current, [product.slug]: "" })); }}>ADD TO BAG ↗</button></div></div>;
        })}</section>}</div> : <div className="empty-bag"><svg className="empty-bag-mark" viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" aria-hidden="true"><path d="M40 5v70M5 40h70M15 15l50 50M65 15 15 65" /></svg><h3>Nothing in your bag yet.</h3><p>Find your next training favourite.</p><Link href="/shop" className="button button-dark" onClick={() => setBagOpen(false)}>SHOP THE COLLECTION <span>↗</span></Link></div>}
<div className="drawer-foot">{validBag.length > 0 && <FreeShippingProgress amountCents={shippingBasisCents} celebrationId={shippingCelebrationId} />}<div><span>SUBTOTAL</span><strong>{money(subtotal)}</strong></div><PurchaseReassurance inBag />{checkoutMessage && <p role="status">{checkoutMessage}</p>}<button className="button button-orange" disabled={!validBag.length} onClick={() => { setBagOpen(false); router.push("/checkout"); }}>CHECKOUT ↗</button></div>
      </aside>
    </StoreContext.Provider>
  );
}

function BagAddedConfirmation({ added, products, bag, onKeepShopping, onDismiss }: { added: AddedItem; products: Product[]; bag: BagItem[]; onKeepShopping: () => void; onDismiss: () => void }) {
  const addedItems = [added, ...(added.second ? [added.second] : [])].flatMap(entry => {
    const product = products.find(item => item.slug === entry.slug);
    const item = bag.find(item => item.slug === entry.slug && item.size === entry.size);
    if (!product || !item) return [];
    const price = product.variants?.find(variant => variant.size === entry.size)?.price ?? product.price;
    return [{ product, size: entry.size, quantity: item.quantity, price }];
  });
  if (!addedItems.length) return null;
  return <div key={added.id} className="bag-added-confirmation" role="status" aria-live="polite">
    <img src={addedItems[0].product.image} alt="" />
    <div className="bag-added-copy"><strong>IGNITED.</strong><p>Your gear is in the bag.</p>{addedItems.map(item => <span key={`${item.product.slug}:${item.size}`}>{item.product.name} · {item.product.color} · {item.size} · Qty {item.quantity} · {money(item.price * item.quantity)}</span>)}<button type="button" onClick={onKeepShopping}>KEEP SHOPPING ↗</button></div>
    <button type="button" className="bag-added-dismiss" aria-label="Dismiss add confirmation" onClick={onDismiss}>×</button>
  </div>;
}

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("StoreProvider is required");
  return context;
};
