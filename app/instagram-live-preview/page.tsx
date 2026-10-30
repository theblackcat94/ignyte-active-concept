import type { Metadata } from "next";
import Link from "next/link";
import PdpSocialStrip from "@/components/pdp-social-strip";
import "./instagram-live-preview.css";

export const metadata: Metadata = {
  title: "Instagram Feed Preview | Ignyte Active",
  description: "Preview the curated Instagram carousel used on the Ignyte Active homepage and product pages.",
  robots: { index: false, follow: false },
};

export default function InstagramLivePreviewPage() {
  return (
    <div className="ig-live-preview">
      <div className="ig-live-preview-inner">
        <nav className="ig-live-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">HOME</Link><span aria-hidden="true">/</span><span>INSTAGRAM PREVIEW</span>
        </nav>

        <div className="ig-live-preview-feed">
          <PdpSocialStrip />
        </div>

        <aside className="ig-live-note">
          <span className="ig-live-note-mark" aria-hidden="true">↘</span>
          <div>
            <h2>Curated Instagram feed</h2>
            <p>This carousel is also shown on the homepage and product pages. The team can manage post links and cover images in the admin; no Instagram login or account connection is needed. Each card opens its post or reel on Instagram.</p>
            <Link href="/admin/pdp-social">MANAGE INSTAGRAM FEED ↗</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
