"use client";

import type { CSSProperties } from "react";
import { IGNYTE_FLAME_PATH } from "./header-logo";

export type FireballPosition = { x: number; y: number; targetX: number; targetY: number; controlX: number; controlY: number; width: number; height: number; id: number };

export default function AddToBagFireball({ position }: { position: FireballPosition }) {
  const { x, y, targetX, targetY, controlX, controlY, width, height, id } = position;
  const path = `M ${x} ${y} Q ${controlX} ${controlY} ${targetX} ${targetY}`;
  const style = {
    "--fireball-path": `path("${path}")`,
    "--fireball-x": `${x}px`, "--fireball-y": `${y}px`,
    "--fireball-target-x": `${targetX}px`, "--fireball-target-y": `${targetY}px`,
  } as CSSProperties;

  return <div key={id} className="ignyte-add-ignition" aria-hidden="true" style={style}>
    <span className="ignyte-fireball-source" />
    <svg className="ignyte-fireball-trail" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs><linearGradient id={`ignyte-fire-trail-${id}`} gradientUnits="userSpaceOnUse" x1={x} y1={y} x2={targetX} y2={targetY}><stop stopColor="#b91f13" /><stop offset=".52" stopColor="#ff4533" /><stop offset="1" stopColor="#fff2b5" /></linearGradient></defs>
      <path d={path} pathLength="100" stroke={`url(#ignyte-fire-trail-${id})`} />
    </svg>
    <span className="ignyte-fireball-projectile">
      <svg viewBox="0 0 110 110" aria-hidden="true">
        <defs>
          <radialGradient id={`ignyte-fire-core-${id}`}><stop stopColor="#fff" /><stop offset=".28" stopColor="#fff9d0" /><stop offset=".57" stopColor="#ffb341" /><stop offset=".82" stopColor="#ff4533" /><stop offset="1" stopColor="#8d160e" /></radialGradient>
        </defs>
        <g className="ignyte-fireball-flames" fill="#db2618"><path d="M12 57 0 41l21 5L10 25l27 16-3-27 24 26 14-35 7 38 20-22-5 28 16-4-12 22-15 26-39 7-27-17Z" /><path fill="#ff6c24" d="M19 58 8 50l22 4-11-18 26 17-1-21 15 23 13-30 4 31 14-13-8 20 15-3-13 21-29 12-28-10Z" /></g>
        <circle cx="58" cy="61" r="28" fill={`url(#ignyte-fire-core-${id})`} />
      </svg>
    </span>
    <span className="ignyte-fireball-embers">{Array.from({ length: 12 }, (_, index) => <i key={index} style={{ "--ember-index": index, "--ember-delay": `${(index % 4) * 32}ms`, "--ember-scale": `${.6 + (index % 5) * .18}` } as CSSProperties} />)}</span>
    <span className="ignyte-fireball-impact"><i /><b /><em /></span>
    <svg className="ignyte-fireball-logo" viewBox="0 0 36 74.2864" aria-hidden="true"><path d={IGNYTE_FLAME_PATH} /></svg>
  </div>;
}
