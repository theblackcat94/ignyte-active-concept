"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { browserDb, commerceConfigured } from "@/lib/commerce";
import AdminToolsNav from "@/components/admin-tools-nav";
import "@/app/admin/admin.css";
import "@/app/admin/operations.css";

export function useAdminToken() {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    if (!commerceConfigured) return;
    const db = browserDb();
    void db.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null));
    const { data } = db.auth.onAuthStateChange((_event, session) => setToken(session?.access_token ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  return token;
}

export function AdminPageShell({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="admin-page section-wrap"><div className="breadcrumb"><Link href="/">HOME</Link><span>/</span><Link href="/admin">ADMIN</Link><span>/</span><span>{title.toUpperCase()}</span></div>
    <div className="admin-title"><div><span className="eyebrow">IGNYTE / INTERNAL</span><h1>{title.toUpperCase()}<span>.</span></h1></div></div><AdminToolsNav />{children}</div>;
}

export function adminHeaders(token: string): HeadersInit { return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }; }
