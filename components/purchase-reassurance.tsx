"use client";

import { useState } from "react";
import { RETURNS_LABEL, FREE_SHIPPING_THRESHOLD_CENTS } from "@/lib/shipping-policy";
import { firstFitReassuranceVisible } from "@/lib/first-fit-promise";
import Link from "next/link";
import ShippingReturnsDrawer from "./shipping-returns-drawer";
import { FitGuaranteeIcon, ReturnsIcon, ShippingIcon } from "./purchase-icons";
import "@/app/purchase-reassurance.css";

export { ReturnsIcon, ShippingIcon } from "./purchase-icons";

export default function PurchaseReassurance({ inBag = false, returnsOnly = false, onNavigate }: { inBag?: boolean; returnsOnly?: boolean; onNavigate?: () => void }) {
  const [section, setSection] = useState<"shipping" | "returns" | null>(null);
  return <><div className={`purchase-reassurance${inBag ? " in-bag" : ""}${returnsOnly ? " returns-only" : ""}${firstFitReassuranceVisible && !returnsOnly ? " has-first-fit" : ""}`} aria-label="Shipping, returns and fit information">
    {!returnsOnly && <button type="button" onClick={() => { onNavigate?.(); setSection("shipping"); }} aria-label={`Free shipping on eligible Australian orders of AU$${FREE_SHIPPING_THRESHOLD_CENTS / 100} or more after discounts. View shipping information.`}>
      <ShippingIcon /><span>FREE SHIPPING ON AU${FREE_SHIPPING_THRESHOLD_CENTS / 100}+ ORDERS</span>
    </button>}
    <button type="button" onClick={() => { onNavigate?.(); setSection("returns"); }}>
      <ReturnsIcon /><span>{RETURNS_LABEL}</span>
    </button>
    {firstFitReassuranceVisible && !returnsOnly && <Link href="/ignyte-fit-guarantee/" onClick={onNavigate}><FitGuaranteeIcon /><span>IGNYTE FIT GUARANTEE™</span></Link>}
  </div><ShippingReturnsDrawer section={section} onClose={() => setSection(null)} /></>;
}
