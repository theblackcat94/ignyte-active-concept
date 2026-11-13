"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { categories as conceptCategories, legacyProductSlugs, money, products as conceptProducts, type Product } from "@/lib/catalog";
import { activeCategories, activeProducts, browserDb, commerceConfigured } from "@/lib/commerce";
import { track } from "@/lib/analytics-client";
import { bagRecommendations, matchingBagProducts } from "@/lib/product-merchandising";
import { qualifiesForFreeShipping } from "@/lib/shipping-policy";
import { compareProductColours, productColourHex } from "@/lib/product-colors";
import "@/app/bag-recommendations.css";
import "@/app/shopping-microinteractions.css";
import FreeShippingProgress from "./free-shipping-progress";
import PurchaseReassurance from "./purchase-reassurance";
import AddToBagFireball, { type FireballPosition } from "./add-to-bag-fireball";

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
  const [ignition, setIgnition] = useState<FireballPosition | null>(null);
  const ignitionTimers = useRef<number[]>([]);
  const recentPointerButton = useRef<DOMRect | null>(null);
  const recentPointerTimer = useRef<number | null>(null);
  useEffect(() => () => ignitionTimers.current.forEach(window.clearTimeout), []);
  useEffect(() => {
    const rememberButton = (event: PointerEvent) => {
      const button = event.target instanceof Element ? event.target.closest("button") : null;
      if (button) {
        recentPointerButton.current = button.getBoundingClientRect();
        if (recentPointerTimer.current !== null) window.clearTimeout(recentPointerTimer.current);
        recentPointerTimer.current = window.setTimeout(() => { recentPointerButton.current = null; }, 1200);
      }
    };
    const clearOnKeyboard = () => { recentPointerButton.current = null; };
    document.addEventListener("pointerdown", rememberButton, true);
    document.addEventListener("keydown", clearOnKeyboard, true);
    return () => { document.removeEventListener("pointerdown", rememberButton, true); document.removeEventListener("keydown", clearOnKeyboard, true); if (recentPointerTimer.current !== null) window.clearTimeout(recentPointerTimer.current); };
  }, []);
  const launchIgnition = () => {
    ignitionTimers.current.forEach(window.clearTimeout);
    ignitionTimers.current = [];
    const id = ++noticeSequence.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) { setIgnition(null); setBagImpactId(id); return; }
    const active = document.activeElement;
    const origin = recentPointerButton.current ?? (active instanceof HTMLButtonElement ? active.getBoundingClientRect() : null);
    if (!origin) { setIgnition(null); return; }
    const width = window.innerWidth;
    const height = window.innerHeight;
    const x = Math.max(28, Math.min(width - 28, origin.left + origin.width / 2));
    const y = Math.max(28, Math.min(height - 28, origin.top + origin.height / 2));
    // The bag drawer opens immediately, covering the header bag icon. Land in its
    // confirmation area rather than aiming at the header's close-button corner.
    const drawer = document.querySelector<HTMLElement>(".bag-drawer");
    const drawerWidth = drawer?.offsetWidth || Math.min(470, width);
    const drawerHeadHeight = drawer?.querySelector<HTMLElement>(".drawer-head")?.offsetHeight || (width <= 600 ? 76 : 100);
    const targetX = width - drawerWidth / 2;
    const targetY = Math.min(height - 90, drawerHeadHeight + 75);
    const dx = targetX - x;
    const dy = targetY - y;
    const bend = Math.min(155, Math.max(65, Math.abs(dx) * .24));
    const controlX = Math.max(24, Math.min(width - 24, (x + targetX) / 2 + (dx >= 0 ? -bend : bend)));
    const controlY = Math.max(25, Math.min(height - 25, (y + targetY) / 2 - Math.min(130, Math.abs(dy) * .18)));
    setIgnition({ x, y, controlX, controlY, targetX, targetY, width, height, id });
    ignitionTimers.current.push(window.setTimeout(() => setBagImpactId(id), 820));
    ignitionTimers.current.push(window.setTimeout(() => setIgnition(current => current?.id === id ? null : current), 1700));
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
  useEffect(() => {
    const restore = (event: Event) => {
      const items = (event as CustomEvent<BagItem[]>).detail;
      if (!Array.isArray(items)) return;
      setBag(current => [...current, ...items.filter(item => !current.some(existing => existing.slug === item.slug && existing.size === item.size))]);
      setBagOpenState(true);
    };
    window.addEventListener("ignyte:restore-bag", restore);
    return () => window.removeEventListener("ignyte:restore-bag", restore);
  }, []);
  const recoveryBagReady = useRef(false);
  useEffect(() => {
    if (!storageReady || !commerceConfigured) return;
    // The first empty render is not a customer action; do not suppress a cart from another device.
    if (!recoveryBagReady.current) { recoveryBagReady.current = true; if (!bag.length) return; }
    const timer = window.setTimeout(async () => {
      const { data } = await browserDb().auth.getSession();
      if (!data.session?.access_token) return;
      await fetch("/api/recovery/activity", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ kind: "cart", items: bag }), keepalive: true }).catch(() => undefined);
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [bag, storageReady]);
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
      {ignition && <AddToBagFireball position={ignition} />}
      {actionNotice && <div key={actionNotice.id} className="store-action-toast" role="status" aria-live="polite"><span aria-hidden="true">✦</span>{actionNotice.message}{actionNotice.href && <a href={actionNotice.href}>View Saved Items ↗</a>}</div>}
      {bagOpen && <div className="drawer-backdrop" onClick={() => setBagOpen(false)} />}
      <aside className={`bag-drawer ${bagOpen ? "is-open" : ""}${lastAdded ? " has-ignition" : ""}`} aria-label="Shopping bag" aria-hidden={!bagOpen}>
        <div className="drawer-head"><div><span className="eyebrow">YOUR EDIT</span><h2>YOUR BAG ({bag.reduce((sum, item) => sum + item.quantity, 0)})</h2></div><button className="icon-button" onClick={() => setBagOpen(false)} aria-label="Close bag">×</button></div>
        <div className="bag-drawer-progress"><FreeShippingProgress amountCents={Math.max(0, shippingBasisCents)} celebrationId={shippingCelebrationId} /></div>
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
<div className="drawer-foot"><div><span>SUBTOTAL</span><strong>{money(subtotal)}</strong></div><PurchaseReassurance inBag />{checkoutMessage && <p role="status">{checkoutMessage}</p>}<button className="button button-orange" disabled={!validBag.length} onClick={() => { setBagOpen(false); router.push("/checkout"); }}>CHECKOUT ↗</button></div>
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
