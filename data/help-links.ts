import { firstFitReassuranceVisible } from "@/lib/first-fit-promise";

export const helpLinks = [
  { label: "Support & FAQ", href: "/support" },
  { label: "Contact", href: "/contact" },
  { label: "Size Guide", href: "/size-guide" },
  ...(firstFitReassuranceVisible ? [{ label: "The IGNYTE Fit Guarantee™", href: "/ignyte-fit-guarantee/" }] : []),
  { label: "Returns Policy", href: "/returns" },
] as const;
