"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { CurrencySelector } from "@/components/currency-estimate";
import { helpLinks } from "@/data/help-links";
import { applySiteAppearance, type SiteAppearance } from "@/lib/site-appearance";
import "@/app/header-help.css";

function appearanceSubscribe(callback: () => void) {
  window.addEventListener("ignyte-appearance-change", callback);
  return () => window.removeEventListener("ignyte-appearance-change", callback);
}
function currentAppearance(): SiteAppearance {
  const value = document.documentElement.dataset.appearance;
  return value === "dark" || value === "ignyte" ? value : "light";
}

export function HelpContents({ onNavigate }: { onNavigate?: () => void }) {
  const appearance = useSyncExternalStore(appearanceSubscribe, currentAppearance, () => "light");
  return <div className="header-help-content">
    <div className="header-help-group"><strong>HELP &amp; SUPPORT</strong><nav aria-label="Help and support">{helpLinks.map(item => <Link key={item.href} href={item.href} onClick={onNavigate}>{item.label}<span aria-hidden="true">↗</span></Link>)}</nav></div>
    <div className="header-help-group header-help-preferences"><strong>PREFERENCES</strong><div className="header-help-setting header-help-setting-currency"><span>CURRENCY</span><CurrencySelector inline /></div><p>Display estimates only. Checkout is charged in AUD.</p><div className="header-help-setting header-help-appearance"><span>APPEARANCE</span><div role="group" aria-label="Appearance mode">{(["light", "dark", "ignyte"] as const).map(mode => <button type="button" key={mode} aria-pressed={appearance === mode} onClick={() => applySiteAppearance(mode)}>{mode === "ignyte" ? "IGNYTE" : mode === "dark" ? "Dark" : "Light"}</button>)}</div></div></div>
  </div>;
}

export default function HeaderHelp() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  return <div className="announcement-utility" ref={root}><Link href="/about/">OUR STORY</Link><span aria-hidden="true">|</span><button ref={trigger} type="button" aria-expanded={open} aria-controls="header-help-panel" onClick={() => setOpen(value => !value)}>HELP <span aria-hidden="true" className={open ? "is-open" : ""}>⌄</span></button>{open && <div id="header-help-panel" className="header-help-panel"><HelpContents onNavigate={() => setOpen(false)} /></div>}</div>;
}
