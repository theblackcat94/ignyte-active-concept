"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { blackFridayPreview, liveAnnouncement, type Announcement } from "@/data/announcement";
import "@/app/announcement.css";

export default function AnnouncementBar() {
  const [config, setConfig] = useState<Announcement>(liveAnnouncement);
  useEffect(() => { const frame = requestAnimationFrame(() => { if (new URLSearchParams(window.location.search).get("announcement") === "black-friday") setConfig(blackFridayPreview); }); return () => cancelAnimationFrame(frame); }, []);
  const message = <>{config.text}{config.action && <> <span aria-hidden="true">•</span> <u>{config.action}</u></>}</>;
  return <div className={`announcement ${config.theme === "orange" ? "announcement-orange" : ""} ${config.mode === "ticker" ? "announcement-ticker" : ""}`}>
    {config.mode === "ticker" ? <Link href={config.href} className="announcement-track" aria-label={`${config.text}. ${config.action}`}><span>{message}</span><span aria-hidden="true">{message}</span><span aria-hidden="true">{message}</span><span aria-hidden="true">{message}</span></Link> : <><span>BUILT FOR THE BURN™</span><Link href={config.href} className="announcement-center">{message}</Link><span>IGNYTE ACTIVE © 2026</span></>}
  </div>;
}
