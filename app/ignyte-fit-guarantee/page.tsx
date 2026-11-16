import type { Metadata } from "next";
import FirstFitPromiseView from "@/components/first-fit-promise-view";
import { firstFitPublic } from "@/lib/first-fit-promise";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://dev.ignyteactive.com";

export const metadata: Metadata = {
  title: "The IGNYTE Fit Guarantee™ | IGNYTE Active",
  description: "First size exchange on us. One complimentary size exchange on your first eligible full-price IGNYTE order. Terms apply.",
  alternates: { canonical: new URL("/ignyte-fit-guarantee/", siteUrl).toString() },
  robots: firstFitPublic ? undefined : { index: false, follow: false },
};

export default function IgnyteFitGuaranteePage() {
  return <FirstFitPromiseView />;
}
