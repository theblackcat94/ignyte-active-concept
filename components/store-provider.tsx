"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { products, type Product } from "@/lib/catalog";

type BagItem = { slug: string; size: string; quantity: number };
type Store = {
  bag: BagItem[];
  bagOpen: boolean;
  setBagOpen: (open: boolean) => void;
  addToBag: (slug: string, size: string) => void;
  removeFromBag: (slug: string, size: string) => void;
  wishlist: string[];
  toggleWishlist: (slug: string) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [bag, setBag] = useState<BagItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [bagOpen, setBagOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    try {
      setBag(JSON.parse(localStorage.getItem("ignyte-concept-bag") || "[]"));
      setWishlist(JSON.parse(localStorage.getItem("ignyte-concept-wishlist") || "[]"));
    } catch { /* A fresh bag is safe if browser storage is unavailable. */ }
  }, []);
  useEffect(() => { localStorage.setItem("ignyte-concept-bag", JSON.stringify(bag)); }, [bag]);
  useEffect(() => { localStorage.setItem("ignyte-concept-wishlist", JSON.stringify(wishlist)); }, [wishlist]);

  const addToBag = (slug: string, size: string) => {
    setBag(current => {
      const found = current.find(item => item.slug === slug && item.size === size);
      return found
        ? current.map(item => item === found ? { ...item, quantity: item.quantity + 1 } : item)
        : [...current, { slug, size, quantity: 1 }];
    });
    setBagOpen(true);
  };
  const removeFromBag = (slug: string, size: string) => setBag(current => current.filter(item => !(item.slug === slug && item.size === size)));
  const toggleWishlist = (slug: string) => setWishlist(current => current.includes(slug) ? current.filter(item => item !== slug) : [...current, slug]);

  const subtotal = bag.reduce((sum, item) => sum + (products.find(product => product.slug === item.slug)?.price || 0) * item.quantity, 0);

  return (
    <StoreContext.Provider value={{ bag, bagOpen, setBagOpen, addToBag, removeFromBag, wishlist, toggleWishlist, searchOpen, setSearchOpen }}>
      {children}
      {bagOpen && <div className="drawer-backdrop" onClick={() => setBagOpen(false)} />}
      <aside className={`bag-drawer ${bagOpen ? "is-open" : ""}`} aria-label="Shopping bag" aria-hidden={!bagOpen}>
        <div className="drawer-head"><div><span className="eyebrow">YOUR EDIT</span><h2>YOUR BAG ({bag.reduce((sum, item) => sum + item.quantity, 0)})</h2></div><button className="icon-button" onClick={() => setBagOpen(false)} aria-label="Close bag">×</button></div>
        {bag.length ? <div className="bag-list">{bag.map(item => {
          const product = products.find(p => p.slug === item.slug) as Product;
          return <div className="bag-row" key={`${item.slug}-${item.size}`}>
            <img src={product.image} alt={product.name} />
            <div><strong>{product.name}</strong><span>{product.color} / {item.size}</span><span>Qty {item.quantity} · {money(product.price * item.quantity)}</span><button className="text-button" onClick={() => removeFromBag(item.slug, item.size)}>Remove</button></div>
          </div>;
        })}</div> : <div className="empty-bag"><span>✳</span><h3>Nothing in your bag yet.</h3><p>Find your next training favourite.</p><a href="/shop" className="button button-dark" onClick={() => setBagOpen(false)}>SHOP THE COLLECTION <span>↗</span></a></div>}
        <div className="drawer-foot"><div><span>SUBTOTAL</span><strong>{money(subtotal)}</strong></div><p>Concept preview only. Checkout is not connected.</p><button className="button button-orange" disabled>CHECKOUT COMING SOON</button></div>
      </aside>
    </StoreContext.Provider>
  );
}

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("StoreProvider is required");
  return context;
};

function money(value: number) { return `$${value.toFixed(0)}`; }
