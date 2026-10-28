"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { blackFridayPreview, liveAnnouncement, type AnnouncementSettings } from "@/data/announcement";
import "@/app/announcement.css";

export default function AnnouncementBar() {
  const [settings, setSettings] = useState<AnnouncementSettings>({ enabled: true, active: "default", default: liveAnnouncement, blackFriday: blackFridayPreview });
  const [preview, setPreview] = useState(false);
  const [loopSeconds, setLoopSeconds] = useState(90);
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
  if (!settings.enabled && !preview) return null;
  const message = <>{config.text}{config.action && <> <span aria-hidden="true">•</span> <u>{config.action}</u></>}</>;
  return <div className={`announcement ${config.theme === "orange" ? "announcement-orange" : ""} ${config.mode === "ticker" ? "announcement-ticker" : ""}`}>
    {config.mode === "ticker" ? <Link href={config.href} className="announcement-track" style={{ animationDuration: `${loopSeconds}s` }} aria-label={`${config.text}. ${config.action}`}><span className="announcement-group" ref={group}>{Array.from({ length: 12 }, (_, index) => <span key={index} aria-hidden={index !== 0}>{message}</span>)}</span><span className="announcement-group" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <span key={index}>{message}</span>)}</span></Link> : <><span>BUILT FOR THE BURN™</span><Link href={config.href} className="announcement-center">{message}</Link><span>IGNYTE ACTIVE © 2026</span></>}
  </div>;
}
