import HomeAlternative from "@/components/home-alternative";
import type { Metadata } from "next";

const socialTitle = "IGNYTE Active | Built for the Burn™";
const socialDescription = "Performance activewear for women who train with purpose and express themselves with confidence. Discover sports bras, leggings, shorts and tops. Bring your own fire.";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://dev.ignyteactive.com";
const socialImage = new URL("/images/home/ignyte-social-hero.webp", siteUrl).toString();

export const metadata: Metadata = {
  title: socialTitle,
  description: socialDescription,
  openGraph: { title: socialTitle, description: socialDescription, type: "website", url: siteUrl, siteName: "IGNYTE Active", images: [{ url: socialImage, width: 1200, height: 630, alt: "Two IGNYTE athletes in the gym" }] },
  twitter: { card: "summary_large_image", title: socialTitle, description: socialDescription, images: [socialImage] },
};

export default function Home() {
  return <HomeAlternative />;
}
