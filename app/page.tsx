import type { Metadata } from "next";
import HomePage from "@/components/home-page";

export const metadata: Metadata = {
  title: "Ignyte Active | High-Performance Activewear for Women",
  description: "High-performance activewear for women who train with purpose. Shop leggings, sports bras, tops, shorts and socks made for movement and self-expression.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Ignyte Active",
    title: "Ignyte Active | High-Performance Activewear for Women",
    description: "High-performance activewear for women who train with purpose. Shop leggings, sports bras, tops, shorts and socks made for movement and self-expression.",
    url: "/",
    images: [{ url: "/images/home/Home-Hero-Alt-2-v2.jpg", width: 1920, height: 1080, alt: "IGNYTE athletes training together" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ignyte Active | High-Performance Activewear for Women",
    description: "High-performance activewear for women who train with purpose.",
    images: ["/images/home/Home-Hero-Alt-2-v2.jpg"],
  },
};

export default function Page() {
  return <HomePage />;
}
