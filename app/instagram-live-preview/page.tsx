import type { Metadata } from "next";
import Link from "next/link";
import "@/app/pdp-social.css";
import "./instagram-live-preview.css";

export const metadata: Metadata = {
  title: "Instagram Feed Preview | Ignyte Active",
  description: "Preview a live Instagram profile embed for IGNYTE Active.",
  robots: { index: false, follow: false },
};

export default function InstagramLivePreviewPage() {
  return (
    <div className="ig-live-preview">
      <div className="ig-live-preview-inner">
        <nav className="ig-live-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">HOME</Link><span aria-hidden="true">/</span><span>INSTAGRAM PREVIEW</span>
        </nav>

        <section className="pdp-social ig-live-profile" aria-label="Live IGNYTE Instagram profile">
          <div className="pdp-social-heading"><div><span className="eyebrow">FOLLOW THE FIRE</span><h1>IGNYTE <em>IN MOTION.</em></h1></div><div className="pdp-social-controls"><a href="https://www.instagram.com/ignyteactive/" target="_blank" rel="noopener noreferrer">FOLLOW @IGNYTEACTIVE ↗</a></div></div>
          <iframe className="ig-live-profile-frame" src="https://www.instagram.com/ignyteactive/embed/" title="Latest posts from IGNYTE Active on Instagram" loading="lazy" referrerPolicy="strict-origin-when-cross-origin" />
        </section>

        <aside className="ig-live-note">
          <span className="ig-live-note-mark" aria-hidden="true">↘</span>
          <div>
            <h2>Live Instagram profile preview</h2>
            <p>This frame displays Instagram’s own profile embed, so new public posts should appear here as the account updates. Instagram controls the content and its appearance inside the frame. The homepage and product pages still use the manually curated feed while we review this option.</p>
            <a href="https://www.instagram.com/ignyteactive/" target="_blank" rel="noopener noreferrer">OPEN @IGNYTEACTIVE ↗</a>
          </div>
        </aside>
      </div>
    </div>
  );
}
