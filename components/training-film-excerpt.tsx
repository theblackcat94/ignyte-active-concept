"use client";

import { useRef } from "react";
import { asset } from "@/lib/asset";

// Source film 21.5–23.5s: the black Vyper lattice back is visible in boxing training.
const start = 21.5;
const end = 23.5;

export default function TrainingFilmExcerpt() {
  const ref = useRef<HTMLVideoElement>(null);
  return <video ref={ref} src={asset("/images/home/Ignyte-Vertical-Trimmed-Compressed-Ultra.mp4")} poster={asset("/images/jacob-2026-10/ign-momsbr-blk/ign-momsbr-blk-vyper-sports-bra-black-main-01.jpg")} muted playsInline controls preload="metadata" aria-label="Vyper Sports Bra in black during boxing training" onLoadedMetadata={event => { event.currentTarget.currentTime = start; }} onTimeUpdate={event => { if (event.currentTarget.currentTime >= end) { event.currentTarget.pause(); event.currentTarget.currentTime = start; } }} onPlay={() => { const video = ref.current; if (video && (video.currentTime < start || video.currentTime >= end)) video.currentTime = start; }} />;
}
