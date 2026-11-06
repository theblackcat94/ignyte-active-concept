"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
export default function JournalPublicLink({ mobile = false, withDivider = false, onNavigate }: { mobile?: boolean; withDivider?: boolean; onNavigate?: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { let active = true; fetch("/api/journal/visibility", { cache: "no-store" }).then(response => response.json()).then(data => { if (active) setVisible(data.public === true); }).catch(() => {}); return () => { active = false; }; }, []);
  return visible ? <>{withDivider && <span aria-hidden="true">|</span>}<Link href="/journal/" onClick={mobile ? onNavigate : undefined}>{mobile ? "Journal" : "JOURNAL"}</Link></> : null;
}
