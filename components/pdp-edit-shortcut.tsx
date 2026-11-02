"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { publicDb } from "@/lib/commerce";

export default function PdpEditShortcut({ slug }: { slug: string }) {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    const db = publicDb();
    if (!db) return;
    let active = true;
    const check = async () => {
      const { data } = await db.auth.getSession();
      const token = data.session?.access_token;
      if (!token) { if (active) setId(null); return; }
      const response = await fetch(`/api/admin/product-edit?slug=${encodeURIComponent(slug)}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!active) return;
      const result = response.ok ? await response.json() : null;
      setId(result?.id ?? null);
    };
    void check();
    const { data } = db.auth.onAuthStateChange(() => { setTimeout(() => { void check(); }, 0); });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [slug]);
  return id ? <Link className="pdp-edit-shortcut" href={`/admin/?edit=${encodeURIComponent(id)}`}>EDIT ↗</Link> : null;
}
