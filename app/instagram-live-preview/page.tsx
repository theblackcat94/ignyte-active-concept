import type { Metadata } from "next";
import Link from "next/link";
import PdpSocialStrip from "@/components/pdp-social-strip";
import "./instagram-live-preview.css";

export const metadata: Metadata = {
  title: "Instagram Feed Preview | Ignyte Active",
  description: "Preview the same live-connected Instagram carousel used on the Ignyte Active homepage.",
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
            <h2>Connected feed preview</h2>
            <p>This is the same carousel used on the homepage and product pages. It reads from the site’s Instagram feed endpoint; once Meta access is authorized and automatic updates are enabled, the connected account’s posts appear here.</p>
            <Link href="/admin/pdp-social">MANAGE INSTAGRAM FEED ↗</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
