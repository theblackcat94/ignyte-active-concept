"use client";
import { useEffect, useState } from "react";
import { AdminPageShell, adminHeaders, useAdminToken } from "@/components/admin-page-shell";
import SizeGuideContent from "@/components/size-guide-content";

export default function SizeGuideReviewPage() {
  const token = useAdminToken();
  const [allowed, setAllowed] = useState(false);
  useEffect(() => { if (!token) return; void fetch("/api/admin/support", { headers: adminHeaders(token) }).then(response => setAllowed(response.ok)); }, [token]);
  return <AdminPageShell title="Size guide review">{!allowed ? <p>Sign in with a team account to review the draft sizing.</p> : <div className="ops-panel"><h2>Provisional size ranges</h2><p>Jacob supplied these estimates on 28 October. Jade’s approval is required before the charts appear on customer pages. The sports bra underbust and sock shoe-size ranges are still missing.</p><SizeGuideContent showTabs reviewMode /></div>}</AdminPageShell>;
}
