import type { Metadata } from "next";
import localFont from "next/font/local";
import { asset } from "@/lib/asset";
import "./globals.css";
import "./ember.css";
import "./product-gallery.css";
import "./footer.css";
import "./appearance.css";
import "./ignyte-fire.css";
import "./fire-egg.css";
import "./initial-preloader.css";
import { StoreProvider } from "@/components/store-provider";
import Header from "@/components/header";
import Footer from "@/components/footer";
import AnalyticsTracker from "@/components/analytics-tracker";
import IgnyteFireField from "@/components/ignyte-fire-field";
import InitialPreloaderReady from "@/components/initial-preloader-ready";

const devPreloader = process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://dev.") ?? false;
// Runs before hydration, so fast loads never mount the overlay at all.
const preloaderScript = `(function () {
  var done = false, shown = false, root = document.documentElement, overlay;
  function show() {
    if (done) return;
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', show, { once: true });
      return;
    }
    overlay = document.createElement('div');
    overlay.id = 'ignyte-initial-preloader';
    overlay.className = 'ignyte-initial-preloader';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-label', 'Loading IGNYTE');
    overlay.setAttribute('aria-live', 'polite');
    var flame = new Image(43, 72);
    flame.src = ${JSON.stringify(asset("/assets/ignyte-loader.svg"))};
    flame.alt = '';
    overlay.appendChild(flame);
    document.body.appendChild(overlay);
    root.classList.add('ignyte-preloader-visible');
    shown = true;
  }
  var reveal = setTimeout(show, 200), limit = setTimeout(finish, 4800);
  function finish() {
    if (done) return;
    done = true;
    clearTimeout(reveal);
    clearTimeout(limit);
    if (overlay) {
      overlay.setAttribute('aria-hidden', 'true');
      overlay.setAttribute('inert', '');
    }
    if (shown) {
      root.classList.add('ignyte-preloader-fading');
      root.classList.remove('ignyte-preloader-visible');
    }
    setTimeout(function () {
      if (overlay) overlay.remove();
      root.classList.remove('ignyte-preloader-fading');
    }, shown ? 200 : 0);
  }
  window.__ignyteFinishPreload = finish;
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) finish();
  });
})();`;

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
      <head><script dangerouslySetInnerHTML={{ __html: "try{var a=localStorage.getItem('ignyte-appearance');document.documentElement.dataset.appearance=(a==='dark'||a==='ignyte')?a:'light'}catch(e){document.documentElement.dataset.appearance='light'}" }} />{devPreloader && <script dangerouslySetInnerHTML={{ __html: preloaderScript }} />}</head>
      <body className={`${ignyteSans.variable} ${ignyteMono.variable}`}>
        <IgnyteFireField />
        <div className="ignyte-fire-egg" aria-hidden="true" />
        <StoreProvider>
          <AnalyticsTracker />
          <Header />
          <main>{children}</main>
          <Footer />
          {devPreloader && <InitialPreloaderReady />}
        </StoreProvider>
      </body>
    </html>
  );
}
