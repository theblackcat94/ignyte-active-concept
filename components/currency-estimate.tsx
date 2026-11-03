"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { asset } from "@/lib/asset";
import "@/app/currency-floating.css";

type Rates = { date: string; rates: Record<string, number> };
const choices = [
  { code: "AUD", icon: "au", label: "Australian dollar" },
  { code: "USD", icon: "us", label: "US dollar" },
  { code: "EUR", icon: "eu", label: "Euro" },
  { code: "GBP", icon: "gb", label: "British pound" },
  { code: "NZD", icon: "nz", label: "New Zealand dollar" },
  { code: "CAD", icon: "ca", label: "Canadian dollar" },
  { code: "SGD", icon: "sg", label: "Singapore dollar" },
  { code: "JPY", icon: "jp", label: "Japanese yen" },
] as const;
let cached: Rates | null = null;
function subscribe(callback: () => void) { window.addEventListener("ignyte-currency-change", callback); return () => window.removeEventListener("ignyte-currency-change", callback); }
function selectedCurrency() { const saved = localStorage.getItem("ignyte_display_currency"); return choices.some(choice => choice.code === saved) ? saved! : "AUD"; }
function useCurrency() { return useSyncExternalStore(subscribe, selectedCurrency, () => "AUD"); }

export function CurrencySelector({ inline = false }: { inline?: boolean }) {
  const currency = useCurrency();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number; width: number; maxHeight: number } | null>(null);
  const selected = choices.find(choice => choice.code === currency) ?? choices[0];
  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const viewport = window.visualViewport;
      const leftEdge = viewport?.offsetLeft ?? 0;
      const topEdge = viewport?.offsetTop ?? 0;
      const rightEdge = leftEdge + (viewport?.width ?? window.innerWidth);
      const bottomEdge = topEdge + (viewport?.height ?? window.innerHeight);
      const width = Math.min(272, rightEdge - leftEdge - 24);
      const left = Math.max(leftEdge + 12, Math.min(rect.right - width, rightEdge - width - 12));
      const above = rect.top - topEdge - 12;
      const below = bottomEdge - rect.bottom - 12;
      const desiredHeight = menu.current?.scrollHeight ?? 380;
      const openAbove = below < desiredHeight && above > below;
      const maxHeight = Math.max(100, Math.min(420, (openAbove ? above : below) - 8));
      setPosition({ left, top: openAbove ? rect.top - Math.min(desiredHeight, maxHeight) - 8 : rect.bottom + 8, width, maxHeight });
    };
    updatePosition();
    const frame = requestAnimationFrame(updatePosition);
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node) && !menu.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.visualViewport?.addEventListener("resize", updatePosition);
    window.visualViewport?.addEventListener("scroll", updatePosition);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); window.removeEventListener("resize", updatePosition); window.removeEventListener("scroll", updatePosition, true); window.visualViewport?.removeEventListener("resize", updatePosition); window.visualViewport?.removeEventListener("scroll", updatePosition); };
  }, [open]);
  const menuContent = <div ref={menu} className={`currency-menu${inline ? "" : " currency-menu-floating"}`} role="menu" aria-label="Choose display currency" style={inline ? undefined : position ?? undefined}><p>Currency display</p><small>Checkout is in AUD. Other prices are estimates.</small>{choices.map(choice => <button type="button" role="menuitemradio" aria-checked={choice.code === currency} key={choice.code} onClick={() => { localStorage.setItem("ignyte_display_currency", choice.code); window.dispatchEvent(new Event("ignyte-currency-change")); setOpen(false); trigger.current?.focus(); }}><img className="currency-flag" src={asset(`/icons/flags/${choice.icon}.svg`)} alt="" /><span>{choice.label}</span><strong>{choice.code}</strong></button>)}</div>;
  return <><div className={`currency-selector${inline ? " currency-selector-inline" : ""}`} ref={root}>
    <button ref={trigger} type="button" className="currency-trigger" aria-label={`Currency display: ${selected.label}. Prices and checkout are in Australian dollars.`} aria-expanded={open} aria-haspopup="menu" onClick={() => { setPosition(null); setOpen(value => !value); }}><img src={asset(`/icons/flags/${selected.icon}.svg`)} alt="" /><span>{selected.code}</span><span aria-hidden="true">⌄</span></button>
    {open && inline && menuContent}
  </div>{open && !inline && position && createPortal(menuContent, document.body)}</>;
}

export function CurrencyEstimate({ aud }: { aud: number }) {
  const currency = useCurrency(); const [rates, setRates] = useState<Rates | null>(cached);
  useEffect(() => { if (currency === "AUD" || rates) return; let cancelled = false; void fetch("/api/currency").then(async response => { if (!response.ok) throw Error(); const data = await response.json() as Rates; cached = data; if (!cancelled) setRates(data); }).catch(() => {}); return () => { cancelled = true; }; }, [currency, rates]);
  if (currency === "AUD" || !rates?.rates[currency]) return null;
  return <small className="currency-estimate" title={`Estimated using ${rates.date} reference rates; checkout is in AUD`}>≈ {new Intl.NumberFormat("en-AU", { style: "currency", currency }).format(aud * rates.rates[currency])}</small>;
}
