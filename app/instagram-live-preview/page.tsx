import type { Metadata } from "next";
import Link from "next/link";
import "./instagram-live-preview.css";

export const metadata: Metadata = {
  title: "Instagram Live Preview | Ignyte Active",
  description: "Preview the live Ignyte Active Instagram profile inside the Ignyte website layout.",
  robots: { index: false, follow: false },
};

export default function InstagramLivePreviewPage() {
  return (
    <div className="ig-live-preview">
      <div className="ig-live-preview-inner">
        <nav className="ig-live-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">HOME</Link><span aria-hidden="true">/</span><span>INSTAGRAM PREVIEW</span>
        </nav>

        <header className="ig-live-intro">
          <span className="eyebrow">FOLLOW THE FIRE</span>
          <div className="ig-live-title-row">
            <h1>IGNYTE <em>ON INSTAGRAM.</em></h1>
            <a className="button button-dark" href="https://www.instagram.com/ignyteactive/" target="_blank" rel="noopener noreferrer">
              FOLLOW @IGNYTEACTIVE <span aria-hidden="true">↗</span>
            </a>
          </div>
          <p>A live profile embed, framed in the Ignyte site style. Instagram controls the content and controls inside the frame.</p>
        </header>

        <section className="ig-live-stage" aria-label="Live Ignyte Active Instagram profile">
          <div className="ig-live-stage-top">
            <span><i aria-hidden="true" /> LIVE PROFILE</span>
            <span>INSTAGRAM.COM / IGNYTEACTIVE</span>
          </div>
          <div className="ig-live-frame-wrap">
            <iframe
              className="ig-live-frame"
              src="https://www.instagram.com/ignyteactive/embed"
              title="Live Instagram profile for Ignyte Active"
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              allow="encrypted-media; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
          <div className="ig-live-stage-bottom">
            <span>PUBLIC IGNYTE ACTIVE PROFILE</span>
            <a href="https://www.instagram.com/ignyteactive/" target="_blank" rel="noopener noreferrer">OPEN IN INSTAGRAM ↗</a>
          </div>
        </section>

        <aside className="ig-live-note">
          <span className="ig-live-note-mark" aria-hidden="true">↘</span>
          <div>
            <h2>What to check</h2>
            <p>Review how the live profile loads, scrolls and fits on desktop and mobile. Instagram can require its own cookies or block embedding in some browser settings; use the profile link above if the frame is unavailable.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
