import { firstFitReassuranceVisible } from "@/lib/first-fit-promise";

export const helpLinks = [
  { label: "Support & FAQ", href: "/support" },
  { label: "Contact", href: "/contact" },
  { label: "Size Guide", href: "/size-guide" },
  ...(firstFitReassuranceVisible ? [{ label: "The First Fit Promise™", href: "/first-fit-promise/" }] : []),
  { label: "Returns Policy", href: "/returns" },
] as const;
