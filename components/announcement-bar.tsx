"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { blackFridayPreview, liveAnnouncement, type AnnouncementSettings } from "@/data/announcement";
import HeaderHelp from "@/components/header-help";
import ShippingReturnsDrawer from "@/components/shipping-returns-drawer";
import { FREE_RETURNS_LABEL } from "@/lib/shipping-policy";
import "@/app/announcement.css";

export default function AnnouncementBar() {
  const [settings, setSettings] = useState<AnnouncementSettings>({ enabled: true, active: "default", default: liveAnnouncement, blackFriday: blackFridayPreview });
  const [preview, setPreview] = useState(false);
  const [loopSeconds, setLoopSeconds] = useState(90);
  const [drawerSection, setDrawerSection] = useState<"shipping" | "returns" | null>(null);
  const group = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setPreview(new URLSearchParams(window.location.search).get("announcement") === "black-friday"));
    void fetch("/api/announcement", { cache: "no-store" }).then(response => response.ok ? response.json() as Promise<AnnouncementSettings> : null).then(data => { if (data) setSettings(data); }).catch(() => {});
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    if (!group.current) return;
    const measure = () => setLoopSeconds(group.current!.getBoundingClientRect().width / 38);
    const frame = requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(group.current);
    window.addEventListener("resize", measure);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener("resize", measure); };
  }, [settings, preview]);
  const config = preview ? settings.blackFriday : settings[settings.active];
  if (!settings.enabled && !preview) return <div className="announcement announcement-utility-only"><HeaderHelp /></div>;
  const shippingCopy = (text: string) => text.replace(/\bover\s+(?:AU)?\$\s*100\b/gi, "AU$100 or more");
  const returnsAction = /\bfree\b.*\breturns\b/i.test(config.action);
  const action = returnsAction ? FREE_RETURNS_LABEL : shippingCopy(config.action);
  const message = <>{shippingCopy(config.text)}{config.action && <> <span aria-hidden="true">•</span> <u>{action}</u></>}</>;
  const benefits = (index = 0) => <span className="announcement-benefit-pair" key={index}><button type="button" tabIndex={index > 0 ? -1 : undefined} onClick={() => setDrawerSection("shipping")}>FREE SHIPPING ON AU$100+ ORDERS</button><span aria-hidden="true">|</span><button type="button" tabIndex={index > 0 ? -1 : undefined} onClick={() => setDrawerSection("returns")}>{FREE_RETURNS_LABEL}</button></span>;
  return <div className={`announcement ${config.theme === "orange" ? "announcement-orange" : ""} ${config.mode === "ticker" ? "announcement-ticker" : ""}`}>
    {config.mode === "ticker" ? <div className="announcement-ticker-area">{returnsAction ? <div className="announcement-track" style={{ animationDuration: `${loopSeconds}s` }}><span className="announcement-group" ref={group}>{Array.from({ length: 12 }, (_, index) => benefits(index))}</span><span className="announcement-group" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <span key={index}>FREE SHIPPING ON AU$100+ ORDERS | {FREE_RETURNS_LABEL}</span>)}</span></div> : <Link href={config.href} className="announcement-track" style={{ animationDuration: `${loopSeconds}s` }} aria-label={`${shippingCopy(config.text)}. ${action}`}><span className="announcement-group" ref={group}>{Array.from({ length: 12 }, (_, index) => <span key={index} aria-hidden={index !== 0}>{message}</span>)}</span><span className="announcement-group" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <span key={index}>{message}</span>)}</span></Link>}</div> : <><span>BUILT FOR THE BURN™</span>{returnsAction ? <div className="announcement-benefits" aria-label="Shipping and returns benefits">{benefits()}</div> : <Link href={config.href} className="announcement-center">{message}</Link>}</>}
    <HeaderHelp />
    <ShippingReturnsDrawer section={drawerSection} onClose={() => setDrawerSection(null)} />
  </div>;
}
