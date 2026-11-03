"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useStore } from "./store-provider";

export default function WishlistDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { products, wishlist, toggleWishlist } = useStore();
  const selected = products.filter(product => wishlist.includes(product.slug));
  const drawer = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { onClose(); return; }
      if (event.key !== "Tab" || !drawer.current) return;
      const focusable = [...drawer.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled])')];
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); previous?.focus(); };
  }, [open, onClose]);
  if (!open) return null;
  return <><button className="saved-drawer-backdrop" type="button" onClick={onClose} aria-label="Close saved items" /><aside ref={drawer} className="saved-drawer" role="dialog" aria-modal="true" aria-label="Saved Items">
    <div className="drawer-head"><div><span className="eyebrow">IGNYTE / YOUR SPACE</span><h2>SAVED ITEMS_</h2></div><button ref={closeButton} type="button" className="icon-button" onClick={onClose} aria-label="Close saved items">×</button></div>
    {selected.length ? <div className="saved-drawer-list">{selected.map(product => <div className="saved-drawer-item" key={product.slug}><Link href={`/product/${product.slug}`} onClick={onClose}><Image src={product.image} alt="" width={76} height={101} /><span><strong>{product.name}</strong><small>{product.color}</small></span></Link><button type="button" onClick={() => toggleWishlist(product.slug)} aria-label={`Remove ${product.name} in ${product.color} from saved items`}>Remove</button></div>)}</div> : <div className="saved-drawer-empty"><p>Nothing saved yet. Tap a heart on any piece that catches your eye.</p><Link href="/shop" onClick={onClose}>SHOP THE COLLECTION ↗</Link></div>}
    <Link className="saved-drawer-all" href="/wishlist" onClick={onClose}>VIEW ALL SAVED ITEMS ↗</Link>
  </aside></>;
}
