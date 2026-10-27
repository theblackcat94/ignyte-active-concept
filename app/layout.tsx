import type { Metadata } from "next";
import localFont from "next/font/local";
import { asset } from "@/lib/asset";
import "./globals.css";
import "./product-gallery.css";
import "./footer.css";
import { StoreProvider } from "@/components/store-provider";
import Header from "@/components/header";
import Footer from "@/components/footer";

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
  title: "Ignyte Active",
  applicationName: "Ignyte Active",
  icons: { icon: { url: asset("/favicon.png"), type: "image/png" } },
  description: "A new activewear storefront concept for Ignyte Active. Built for women who bring the fire.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${ignyteSans.variable} ${ignyteMono.variable}`}>
        <StoreProvider>
          <Header />
          <main>{children}</main>
          <Footer />
        </StoreProvider>
      </body>
    </html>
  );
}
