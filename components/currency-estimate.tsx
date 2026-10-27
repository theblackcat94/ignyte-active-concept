"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { asset } from "@/lib/asset";

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

export function CurrencySelector() {
  const currency = useCurrency();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const selected = choices.find(choice => choice.code === currency) ?? choices[0];
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  return <div className="currency-selector" ref={root}>
    <button type="button" className="currency-trigger" aria-label={`Currency display: ${selected.label}. Prices and checkout are in Australian dollars.`} aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen(value => !value)}><img src={asset(`/icons/flags/${selected.icon}.svg`)} alt="" /><span>{selected.code}</span><span aria-hidden="true">⌄</span></button>
    {open && <div className="currency-menu" role="menu" aria-label="Choose display currency"><p>Currency display</p><small>Checkout is in AUD. Other prices are estimates.</small>{choices.map(choice => <button type="button" role="menuitemradio" aria-checked={choice.code === currency} key={choice.code} onClick={() => { localStorage.setItem("ignyte_display_currency", choice.code); window.dispatchEvent(new Event("ignyte-currency-change")); setOpen(false); }}><img className="currency-flag" src={asset(`/icons/flags/${choice.icon}.svg`)} alt="" /><span>{choice.label}</span><strong>{choice.code}</strong></button>)}</div>}
  </div>;
}

export function CurrencyEstimate({ aud }: { aud: number }) {
  const currency = useCurrency(); const [rates, setRates] = useState<Rates | null>(cached);
  useEffect(() => { if (currency === "AUD" || rates) return; let cancelled = false; void fetch("/api/currency").then(async response => { if (!response.ok) throw Error(); const data = await response.json() as Rates; cached = data; if (!cancelled) setRates(data); }).catch(() => {}); return () => { cancelled = true; }; }, [currency, rates]);
  if (currency === "AUD" || !rates?.rates[currency]) return null;
  return <small className="currency-estimate" title={`Estimated using ${rates.date} reference rates; checkout is in AUD`}>≈ {new Intl.NumberFormat("en-AU", { style: "currency", currency }).format(aud * rates.rates[currency])}</small>;
}
