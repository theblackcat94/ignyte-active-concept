"use client";

import { useEffect } from "react";

export default function InitialPreloaderReady() {
  useEffect(() => {
    (window as Window & { __ignyteFinishPreload?: () => void }).__ignyteFinishPreload?.();
  }, []);

  return null;
}
