"use client";

import { useEffect, useId, useRef, useState } from "react";
import "@/app/styled-select.css";

type Option = { value: string; label: string; icon?: "sun" | "moon" | "flame" };

function OptionIcon({ icon }: { icon?: Option["icon"] }) {
  if (!icon) return null;
  return <svg className="styled-select-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {icon === "sun" && <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>}
    {icon === "moon" && <path d="M20.2 15.7A8.5 8.5 0 0 1 8.3 3.8 8.5 8.5 0 1 0 20.2 15.7Z" />}
    {icon === "flame" && <path d="M12.2 2.5c.5 3.3-1.7 5.1-3.4 7.5-1.4 1.9-1.8 3.5-1.8 5.1a5 5 0 0 0 10 0c0-3.6-2.3-6.9-4.8-12.6ZM12 21a3.1 3.1 0 0 1-3.1-3.1c0-2.1 1.8-3.7 3.1-5.3.2 1.7 2.6 3.4 2.6 5.3A2.7 2.7 0 0 1 12 21Z" />}
  </svg>;
}

export default function StyledSelect({ value, options, onChange, ariaLabel }: {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const selected = options.find(option => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    menu.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  function choose(next: string) {
    onChange(next);
    setOpen(false);
    trigger.current?.focus();
  }

  function handleKeys(event: React.KeyboardEvent<HTMLDivElement>) {
    const entries = Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]') ?? []);
    const index = entries.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "Escape") { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
    else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      entries[(index + (event.key === "ArrowDown" ? 1 : -1) + entries.length) % entries.length]?.focus();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      entries[event.key === "Home" ? 0 : entries.length - 1]?.focus();
    }
  }

  return <div className="styled-select" ref={root}>
    <button ref={trigger} type="button" className="styled-select-trigger" aria-label={`${ariaLabel}: ${selected.label}`} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(!open)} onKeyDown={event => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setOpen(true); }
    }}><span className="styled-select-choice"><OptionIcon icon={selected.icon} />{selected.label}</span><svg className="styled-select-chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="m3 6 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
    {open && <div ref={menu} id={id} className="styled-select-menu" role="menu" aria-label={ariaLabel} onKeyDown={handleKeys}>
      {options.map(option => <button type="button" role="menuitemradio" aria-checked={value === option.value} key={option.value} onClick={() => choose(option.value)}><span className="styled-select-choice"><OptionIcon icon={option.icon} />{option.label}</span></button>)}
    </div>}
  </div>;
}
