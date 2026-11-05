"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
export default function JournalPublicLink({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { let active = true; fetch("/api/journal/visibility", { cache: "no-store" }).then(response => response.json()).then(data => { if (active) setVisible(data.public === true); }).catch(() => {}); return () => { active = false; }; }, []);
  return visible ? <Link href="/journal/" onClick={mobile ? onNavigate : undefined}>{mobile ? "The IGNYTE Journal" : "JOURNAL"}</Link> : null;
}
