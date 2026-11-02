"use client";

import { useEffect, useRef, useState } from "react";
import { asset } from "@/lib/asset";
import { brandFilmFull, brandFilmPoster, brandFilmPreview } from "@/lib/brand-film-media";
import "@/app/brand-film.css";

type PlayerState = "idle" | "preview" | "loading" | "full" | "error" | "ended";

export default function BrandFilm({ className = "", label = "IGNYTE brand film" }: { className?: string; label?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewDone = useRef(false);
  const fullRequested = useRef(false);
  const pendingFullPlay = useRef(false);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, setState] = useState<PlayerState>("idle");
  const [posterVisible, setPosterVisible] = useState(true);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.src = asset(brandFilmPreview);
    if (!window.IntersectionObserver) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) {
        if (previewTimer.current) clearTimeout(previewTimer.current);
        if (!video.paused) video.pause();
        if (!fullRequested.current) { setState("idle"); setPosterVisible(true); }
        return;
      }
      if (previewDone.current || fullRequested.current || reduced || saveData) return;
      previewDone.current = true;
      video.muted = true;
      video.currentTime = 0;
      void video.play().then(() => {
        if (fullRequested.current) return;
        setState("preview");
        setPosterVisible(false);
        previewTimer.current = setTimeout(() => {
          if (fullRequested.current) return;
          video.pause();
          video.currentTime = 0;
          setState("idle");
          setPosterVisible(true);
        }, 2800);
      }).catch(() => { if (!fullRequested.current) setPosterVisible(true); });
    }, { threshold: 0.4 });
    observer.observe(video);
    return () => { observer.disconnect(); if (previewTimer.current) clearTimeout(previewTimer.current); video.pause(); };
  }, []);

  function requestFullPlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewDone.current = true;
    fullRequested.current = true;
    pendingFullPlay.current = true;
    setState("loading");
    setPosterVisible(true);
    setShowControls(true);
    video.controls = true;
    video.muted = false;
    if (video.src !== new URL(asset(brandFilmFull), window.location.href).href) {
      video.pause();
      video.src = asset(brandFilmFull);
      video.load();
    }
    // Request playback during the tap gesture. A pending load resumes via onCanPlay.
    void video.play().catch(error => {
      if (error?.name === "NotAllowedError" || video.error) {
        pendingFullPlay.current = false;
        setState("error");
      }
    });
  }

  const previewing = state === "preview";
  const showPlay = state === "idle" || previewing || state === "error" || state === "ended";

  return <div className={`brand-film ${className}`}>
    <video ref={videoRef} poster={asset(brandFilmPoster)} playsInline preload="none" controls={showControls} aria-label={label}
      onCanPlay={() => { const video = videoRef.current; if (pendingFullPlay.current && video?.paused) void video.play().catch(() => { pendingFullPlay.current = false; setState("error"); }); }}
      onPlay={() => { if (fullRequested.current) { pendingFullPlay.current = false; setState("full"); setPosterVisible(false); } }}
      onEnded={() => { if (fullRequested.current) { pendingFullPlay.current = false; setState("ended"); setPosterVisible(true); } }}
      onError={() => { pendingFullPlay.current = false; setState("error"); setPosterVisible(true); }} />
    {posterVisible && <img className="brand-film-poster" src={asset(brandFilmPoster)} alt="" aria-hidden="true" loading="eager" />}
    {showPlay && <button type="button" className="brand-film-play" onClick={requestFullPlayback} aria-label={state === "error" ? "Retry IGNYTE film" : "Play full IGNYTE film"}><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M11 6v20l16-10z" fill="currentColor" /></svg></button>}
    {state === "loading" && <div className="brand-film-loading" role="status" aria-live="polite"><span className="brand-film-spinner" aria-hidden="true" />Loading film…</div>}
  </div>;
}
