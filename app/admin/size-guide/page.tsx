"use client";
import { useEffect, useState } from "react";
import { AdminPageShell, adminHeaders, useAdminToken } from "@/components/admin-page-shell";
import SizeGuideContent from "@/components/size-guide-content";

export default function SizeGuidePage() {
  const token = useAdminToken();
  const [allowed, setAllowed] = useState(false);
  useEffect(() => { if (!token) return; void fetch("/api/admin/support", { headers: adminHeaders(token) }).then(response => setAllowed(response.ok)); }, [token]);
  return <AdminPageShell title="Size guide">{!allowed ? <p>Sign in with a team account to view the size guide.</p> : <div className="ops-panel"><h2>Customer size charts</h2><p>Jade approved the supplied ranges for customer use. The sports bra underbust and sock shoe-size ranges were not supplied, so those measurements are not shown.</p><SizeGuideContent showTabs /></div>}</AdminPageShell>;
}
