"use client";

import { useSyncExternalStore } from "react";
import { CurrencySelector } from "./currency-estimate";
import StyledSelect from "./styled-select";
import { applySiteAppearance, type SiteAppearance } from "@/lib/site-appearance";

function subscribe(callback: () => void) {
  window.addEventListener("ignyte-appearance-change", callback);
  return () => window.removeEventListener("ignyte-appearance-change", callback);
}
function currentAppearance(): SiteAppearance {
  const value = document.documentElement.dataset.appearance;
  return value === "dark" || value === "ignyte" ? value : "light";
}

export default function FooterPreferences() {
  const appearance = useSyncExternalStore(subscribe, currentAppearance, () => "light");
  return <>
    <div className="footer-currency"><span>CURRENCY</span><CurrencySelector /></div>
    <div className="footer-appearance"><span>APPEARANCE</span><StyledSelect ariaLabel="Appearance" value={appearance} options={[
      { value: "light", label: "Light", icon: "sun" },
      { value: "dark", label: "Dark", icon: "moon" },
      { value: "ignyte", label: "IGNYTE", icon: "flame" },
    ]} onChange={value => applySiteAppearance(value as SiteAppearance)} /></div>
  </>;
}
