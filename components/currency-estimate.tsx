"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
type Rates = { date: string; rates: Record<string, number> };
const choices = ["AUD", "USD", "EUR", "GBP", "NZD", "CAD", "SGD", "JPY"];
let cached: Rates | null = null;
function subscribe(callback: () => void) { window.addEventListener("ignyte-currency-change", callback); return () => window.removeEventListener("ignyte-currency-change", callback); }
function selectedCurrency() { const saved = localStorage.getItem("ignyte_display_currency"); return saved && choices.includes(saved) ? saved : "AUD"; }
function useCurrency() { return useSyncExternalStore(subscribe, selectedCurrency, () => "AUD"); }
export function CurrencySelector() {
  const currency = useCurrency();
  return <label className="currency-selector">DISPLAY <select aria-label="Display currency estimate" value={currency} onChange={event => { localStorage.setItem("ignyte_display_currency", event.target.value); window.dispatchEvent(new Event("ignyte-currency-change")); }}>{choices.map(code => <option key={code}>{code}</option>)}</select></label>;
}
export function CurrencyEstimate({ aud }: { aud: number }) {
  const currency = useCurrency(); const [rates, setRates] = useState<Rates | null>(cached);
  useEffect(() => { if (currency === "AUD" || rates) return; let cancelled = false; void fetch("/api/currency").then(async response => { if (!response.ok) throw Error(); const data = await response.json() as Rates; cached = data; if (!cancelled) setRates(data); }).catch(() => {}); return () => { cancelled = true; }; }, [currency, rates]);
  if (currency === "AUD" || !rates?.rates[currency]) return null;
  return <small className="currency-estimate" title={`Estimated using ${rates.date} reference rates; checkout is in AUD`}>≈ {new Intl.NumberFormat("en-AU", { style: "currency", currency }).format(aud * rates.rates[currency])} estimate</small>;
}
