"use client";

import { useEffect, useRef, useState } from "react";
import { asset } from "@/lib/asset";
import "@/app/brand-film.css";

export default function BrandFilm({ className = "", label = "IGNYTE brand film" }: { className?: string; label?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewDone = useRef(false);
  const fullPlayback = useRef(false);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [playing, setPlaying] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [posterVisible, setPosterVisible] = useState(true);
  const [muted, setMuted] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !window.IntersectionObserver) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) {
        if (previewTimer.current) clearTimeout(previewTimer.current);
        if (!video.paused) video.pause();
        if (!fullPlayback.current) { setPreviewing(false); setPosterVisible(true); }
        return;
      }
      if (previewDone.current || fullPlayback.current || reduced || saveData) return;
      previewDone.current = true;
      video.muted = true;
      video.currentTime = 0;
      void video.play().then(() => {
        setPreviewing(true);
        setPosterVisible(false);
        previewTimer.current = setTimeout(() => {
          video.pause(); video.currentTime = 0;
          setPreviewing(false); setPosterVisible(true);
        }, 2800);
      }).catch(() => { setFailed(true); setPosterVisible(true); });
    }, { threshold: 0.4 });
    observer.observe(video);
    return () => { observer.disconnect(); if (previewTimer.current) clearTimeout(previewTimer.current); };
  }, []);
  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (!video.paused && fullPlayback.current) { video.pause(); return; }
    if (previewTimer.current) clearTimeout(previewTimer.current);
    fullPlayback.current = true;
    setPreviewing(false); setPosterVisible(false);
    video.currentTime = 0;
    video.muted = muted;
    void video.play().catch(() => { setFailed(true); setPosterVisible(true); });
  }
  return <div className={`brand-film ${className}`}>
    <video ref={videoRef} src={asset("/images/home/Ignyte-Vertical-Compressed-Sound.mp4")} poster={asset("/images/home/Ignyte-Vertical-First-Frame.jpg")} playsInline muted={muted} preload="none" aria-label={label} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { fullPlayback.current = false; setPlaying(false); setPosterVisible(true); }} onError={() => { setFailed(true); setPosterVisible(true); }} />
    {posterVisible && <img className="brand-film-poster" src={asset("/images/home/Ignyte-Vertical-First-Frame.jpg")} alt="" aria-hidden="true" />}
    {(!playing || previewing) && <button type="button" className="brand-film-play" onClick={togglePlayback} aria-label={failed ? "Retry IGNYTE film" : "Play full IGNYTE film"}><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M11 6v20l16-10z" fill="currentColor" /></svg></button>}
    {!previewing && <div className="brand-film-controls">
      {playing && <button type="button" onClick={togglePlayback} aria-label="Pause IGNYTE film">Ⅱ</button>}
      <button type="button" onClick={() => setMuted(value => { const next = !value; if (videoRef.current) videoRef.current.muted = next; return next; })} aria-label={muted ? "Enable film sound" : "Mute film"}>{muted ? "SOUND OFF" : "SOUND ON"}</button>
    </div>}
  </div>;
}
