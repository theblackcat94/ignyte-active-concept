"use client";

import { useState } from "react";
import { RETURNS_LABEL, FREE_SHIPPING_THRESHOLD_CENTS } from "@/lib/shipping-policy";
import { firstFitReassuranceVisible } from "@/lib/first-fit-promise";
import Link from "next/link";
import ShippingReturnsDrawer from "./shipping-returns-drawer";
import { ReturnsIcon, ShippingIcon } from "./purchase-icons";
import "@/app/purchase-reassurance.css";

export { ReturnsIcon, ShippingIcon } from "./purchase-icons";

export default function PurchaseReassurance({ inBag = false, returnsOnly = false }: { inBag?: boolean; returnsOnly?: boolean }) {
  const [section, setSection] = useState<"shipping" | "returns" | null>(null);
  return <><div className={`purchase-reassurance${inBag ? " in-bag" : ""}${returnsOnly ? " returns-only" : ""}${firstFitReassuranceVisible && !returnsOnly ? " has-first-fit" : ""}`} aria-label="Shipping, returns and fit information">
    {!returnsOnly && <button type="button" onClick={() => setSection("shipping")} aria-label={`Free shipping on eligible Australian orders of AU$${FREE_SHIPPING_THRESHOLD_CENTS / 100} or more after discounts. View shipping information.`}>
      {!firstFitReassuranceVisible && <ShippingIcon />}<span>FREE SHIPPING ON AU${FREE_SHIPPING_THRESHOLD_CENTS / 100}+ ORDERS</span>
    </button>}
    <button type="button" onClick={() => setSection("returns")}>
      {(!firstFitReassuranceVisible || returnsOnly) && <ReturnsIcon />}<span>{RETURNS_LABEL}</span>
    </button>
    {firstFitReassuranceVisible && !returnsOnly && <Link href="/first-fit-promise/">THE FIRST FIT PROMISE™</Link>}
  </div><ShippingReturnsDrawer section={section} onClose={() => setSection(null)} /></>;
}
