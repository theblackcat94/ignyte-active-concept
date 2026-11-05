"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminPageShell, adminHeaders, useAdminToken } from "@/components/admin-page-shell";
import "../../operations.css";

type Preview = { subject: string; html: string; text: string };

export default function JoinFireEmailPreviewPage() {
  const token = useAdminToken();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!token) return;
    void fetch("/api/admin/join-fire/email-preview", { headers: adminHeaders(token), cache: "no-store" })
      .then(async response => { if (!response.ok) throw new Error("Staff access required or preview unavailable."); return response.json() as Promise<Preview>; })
      .then(setPreview).catch(cause => setError(cause instanceof Error ? cause.message : "Preview unavailable."));
  }, [token]);
  return <AdminPageShell title="JOIN THE FIRE welcome email">
    <p><Link href="/admin/join-fire/">← CAMPAIGN SETTINGS</Link></p>
    <p>Private, read-only preview. The sample code and unsubscribe token below are placeholders. Opening this page sends no email and creates no discount.</p>
    {!token && <p>Sign in with a team account to view this email.</p>}
    {error && <p role="alert">{error}</p>}
    {preview && <div className="ops-panel">
      <p><strong>Subject:</strong> {preview.subject}</p>
      <iframe title="JOIN THE FIRE email preview" sandbox="" srcDoc={preview.html} style={{ display: "block", width: "100%", maxWidth: 800, minHeight: 760, border: "1px solid #c8c3bc", background: "#fff" }} />
      <details><summary>Plain text version</summary><pre style={{ whiteSpace: "pre-wrap" }}>{preview.text}</pre></details>
    </div>}
  </AdminPageShell>;
}
