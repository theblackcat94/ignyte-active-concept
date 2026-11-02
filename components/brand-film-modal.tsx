"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import { asset } from "@/lib/asset";
import { brandFilmFull, brandFilmPoster } from "@/lib/brand-film-media";

type FilmModal = { filmOpen: boolean; openFilm: (trigger: HTMLElement) => void };
const FilmModalContext = createContext<FilmModal | null>(null);

export function useBrandFilmModal() {
  return useContext(FilmModalContext);
}

export default function BrandFilmModalProvider({ children }: { children: React.ReactNode }) {
  const [filmOpen, setFilmOpen] = useState(false);
  const [filmNeedsPlay, setFilmNeedsPlay] = useState(false);
  const [filmLoading, setFilmLoading] = useState(false);
  const pendingPlay = useRef(false);
  const filmRef = useRef<HTMLVideoElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement>(null);

  const closeFilm = useCallback(() => {
    filmRef.current?.pause();
    pendingPlay.current = false;
    setFilmOpen(false);
    setFilmNeedsPlay(false);
    setFilmLoading(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  const openFilm = useCallback((trigger: HTMLElement) => {
    triggerRef.current = trigger;
    document.querySelectorAll("video").forEach(video => video.pause());
    setFilmNeedsPlay(false);
    setFilmLoading(true);
    pendingPlay.current = true;
    flushSync(() => setFilmOpen(true));
    const film = filmRef.current;
    if (film) {
      // Playback is requested during the click gesture for iPhone Safari.
      film.muted = false;
      void film.play().catch(error => {
        if (error?.name === "NotAllowedError" || film.error) { pendingPlay.current = false; setFilmLoading(false); setFilmNeedsPlay(true); }
      });
    }
  }, []);

  useEffect(() => {
    if (!filmOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeFilm();
      if (event.key !== "Tab") return;
      const controls = Array.from(document.querySelectorAll<HTMLElement>(".home-film-lightbox button, .home-film-lightbox video[controls]"));
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKeyDown); };
  }, [filmOpen, closeFilm]);

  return <FilmModalContext.Provider value={{ filmOpen, openFilm }}>
    {children}
    {filmOpen && createPortal(<div className="home-film-lightbox" role="dialog" aria-modal="true" aria-label="Watch IGNYTE in Motion" onMouseDown={event => { if (event.target === event.currentTarget) closeFilm(); }}>
      <div className="home-film-frame">
        <button ref={closeRef} type="button" className="home-film-close" aria-label="Close film" onClick={closeFilm}>×</button>
        <video ref={filmRef} src={asset(brandFilmFull)} poster={asset(brandFilmPoster)} controls playsInline preload="none" tabIndex={0} onCanPlay={() => { const film = filmRef.current; if (pendingPlay.current && film?.paused) void film.play().catch(() => { pendingPlay.current = false; setFilmLoading(false); setFilmNeedsPlay(true); }); }} onPlay={() => { pendingPlay.current = false; setFilmLoading(false); setFilmNeedsPlay(false); }} onError={() => { pendingPlay.current = false; setFilmLoading(false); setFilmNeedsPlay(true); }} aria-label="IGNYTE full brand film" />
        {filmLoading && <div className="home-film-loading" role="status" aria-live="polite">Loading film…</div>}
        {filmNeedsPlay && <button type="button" className="home-film-retry" onClick={() => { const film = filmRef.current; if (!film) return; film.muted = false; void film.play().then(() => setFilmNeedsPlay(false)).catch(() => setFilmNeedsPlay(true)); }}>PLAY FILM</button>}
      </div>
    </div>, document.body)}
  </FilmModalContext.Provider>;
}
