import type { Metadata } from "next";
import localFont from "next/font/local";
import { asset } from "@/lib/asset";
import "./globals.css";
import "./ember.css";
import "./product-gallery.css";
import "./footer.css";
import "./appearance.css";
import { StoreProvider } from "@/components/store-provider";
import Header from "@/components/header";
import Footer from "@/components/footer";
import AnalyticsTracker from "@/components/analytics-tracker";

const ignyteSans = localFont({
  src: [
    { path: "../public/fonts/soehne-buch.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/soehne-halbfett.woff2", weight: "600", style: "normal" },
    { path: "../public/fonts/soehne-kraftig.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-ignyte-sans",
  display: "swap",
});
const ignyteMono = localFont({
  src: "../public/fonts/soehne-mono-buch.woff2",
  variable: "--font-ignyte-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://ignyte.theblackcat94.com"),
  robots: process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://dev.")
    ? { index: false, follow: false }
    : undefined,
  title: "Ignyte Active | High-Performance Activewear for Women",
  applicationName: "Ignyte Active",
  icons: { icon: { url: asset("/favicon.png"), type: "image/png" } },
  description: "High-performance activewear for women who train with purpose. Shop leggings, sports bras, tops, shorts and socks made for movement and self-expression.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: "try{var a=localStorage.getItem('ignyte-appearance');document.documentElement.dataset.appearance=(a==='dark'||a==='ignyte')?a:'light'}catch(e){document.documentElement.dataset.appearance='light'}" }} /></head>
      <body className={`${ignyteSans.variable} ${ignyteMono.variable}`}>
        <StoreProvider>
          <AnalyticsTracker />
          <Header />
          <main>{children}</main>
          <Footer />
        </StoreProvider>
      </body>
    </html>
  );
}
