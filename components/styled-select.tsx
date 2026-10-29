"use client";

import { useEffect, useId, useRef, useState } from "react";
import "@/app/styled-select.css";

type Option = { value: string; label: string };

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
    }}><span>{selected.label}</span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 6 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
    {open && <div ref={menu} id={id} className="styled-select-menu" role="menu" aria-label={ariaLabel} onKeyDown={handleKeys}>
      {options.map(option => <button type="button" role="menuitemradio" aria-checked={value === option.value} key={option.value} onClick={() => choose(option.value)}>{option.label}</button>)}
    </div>}
  </div>;
}
