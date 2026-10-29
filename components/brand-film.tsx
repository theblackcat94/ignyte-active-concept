"use client";

import { useRef, useState } from "react";
import { asset } from "@/lib/asset";
import "@/app/brand-film.css";

export default function BrandFilm({ className = "", label = "IGNYTE brand film" }: { className?: string; label?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [failed, setFailed] = useState(false);
  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => setFailed(true));
    else video.pause();
  }
  return <div className={`brand-film ${className}`}>
    <video ref={videoRef} src={asset("/images/home/Ignyte-Vertical-Compressed-Sound.mp4")} poster={asset("/images/home/Ignyte-Vertical-First-Frame.jpg")} playsInline muted={muted} preload="metadata" aria-label={label} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onError={() => setFailed(true)} />
    {!playing && <button type="button" className="brand-film-play" onClick={togglePlayback} aria-label={failed ? "Retry IGNYTE film" : "Play IGNYTE film"}><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M11 6v20l16-10z" fill="currentColor" /></svg></button>}
    <div className="brand-film-controls">
      {playing && <button type="button" onClick={togglePlayback} aria-label="Pause IGNYTE film">Ⅱ</button>}
      <button type="button" onClick={() => setMuted(value => !value)} aria-label={muted ? "Enable film sound" : "Mute film"}>{muted ? "SOUND OFF" : "SOUND ON"}</button>
    </div>
  </div>;
}
