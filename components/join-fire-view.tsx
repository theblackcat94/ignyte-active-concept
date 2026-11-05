"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { browserDb, commerceConfigured } from "@/lib/commerce";
import HeaderLogo from "@/components/header-logo";
import RegistrationMarks from "@/components/registration-marks";
import type { JoinFireSettings } from "@/lib/join-fire-settings";
import "@/app/join-the-fire/join-fire.css";

type Campaign = JoinFireSettings & { preview: boolean };
type Attribution = { source: string; medium: string; campaign: string };
const clean = (value: string | null, max: number) => (value || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, max);
const offerPhrase = /^get 10% off$/i;
function campaignIntroduction(copy: string) {
  return copy.split(/(get 10% off)/i).map((part, index) => offerPhrase.test(part)
    ? <span className="fx-ember" key={index}>{part}</span> : part);
}
function track(name: string, attribution: Attribution) {
  if (navigator.doNotTrack !== "1") window.gtag?.("event", name, { campaign_name: "join_the_fire", ...attribution });
}

export default function JoinFireView() {
  const [settings, setSettings] = useState<Campaign | null>(null);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<"new" | "existing" | null>(null);
  const [attribution, setAttribution] = useState<Attribution>({ source: "", medium: "", campaign: "" });
  const inFlight = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const captured = { source: clean(params.get("utm_source"), 40), medium: clean(params.get("utm_medium"), 40), campaign: clean(params.get("utm_campaign"), 60) };
    if (Object.values(captured).some(Boolean)) sessionStorage.setItem("ignyte-join-fire-utm", JSON.stringify(captured));
    try { setAttribution(JSON.parse(sessionStorage.getItem("ignyte-join-fire-utm") || "{}")); } catch { setAttribution(captured); }
    let cancelled = false;
    async function load() {
      const token = commerceConfigured ? (await browserDb().auth.getSession()).data.session?.access_token : null;
      const response = await fetch("/api/join-fire", { headers: token ? { Authorization: `Bearer ${token}` } : {}, cache: "no-store" });
      if (cancelled) return;
      if (response.ok) {
        const loaded = await response.json() as Campaign;
        setSettings(loaded);
        if (loaded.preview && params.get("preview") === "success") setSuccess("new");
      }
      else setError(response.status === 403 ? "This campaign is in private review. Sign in with a team account to see the preview." : "The campaign preview is unavailable.");
    }
    void load();
    if (!commerceConfigured) return () => { cancelled = true; };
    const { data } = browserDb().auth.onAuthStateChange(event => { if (event === "SIGNED_IN" || event === "SIGNED_OUT") setTimeout(() => { if (!cancelled) { setError(""); void load(); } }, 0); });
    return () => { cancelled = true; data.subscription.unsubscribe(); };
  }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings?.offerEnabled || inFlight.current || success) return;
    inFlight.current = true; setBusy(true); setError("");
    track("join_fire_form_submit", attribution);
    try {
      const response = await fetch("/api/join-fire", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, consent, website: "", attribution }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not complete signup.");
      setSuccess(result.alreadySubscribed ? "existing" : "new");
      track(result.alreadySubscribed ? "join_fire_existing_subscriber" : "join_fire_signup_success", attribution);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not complete signup."); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <div className="join-fire-page">
    <header className="join-fire-header"><Link href="/" aria-label="IGNYTE home"><HeaderLogo /></Link><span>BUILT FOR THE BURN™</span></header>
    {!settings ? <section className="join-fire-gate"><span className="join-fire-eyebrow">JOIN THE FIRE_</span><h1>{error ? "PRIVATE PREVIEW." : "IGNYTING…"}</h1><p>{error || "Loading the campaign preview…"}</p>{error && <Link href="/account/">TEAM SIGN IN ↗</Link>}</section> : <>
      <section className="join-fire-hero"><div className="join-fire-copy">
        {settings.preview && <p className="join-fire-preview">STAFF PREVIEW · OFFER DISABLED</p>}
        <span className="join-fire-eyebrow">{settings.eyebrow}</span><h1>{settings.headline}</h1><p className="join-fire-intro">{campaignIntroduction(settings.introduction)}</p><p className="join-fire-support">{settings.supportingCopy}</p>
        {success ? <div className={`join-fire-success${success === "new" ? " is-new" : ""}`} role="status" aria-live="polite"><div className="join-fire-sparks" aria-hidden="true"><span/><span/><span/><span/><span/></div><h2>{success === "new" ? settings.confirmationHeadline : "YOU'RE ALREADY IN."}</h2><p>{success === "new" ? settings.confirmationCopy : "You're already on the IGNYTE list. We haven't sent a duplicate welcome offer."}</p><Link href="/shop/" onClick={() => track("join_fire_shop_click", attribution)}>SHOP IGNYTE ↗</Link></div> : <form className="join-fire-form" onSubmit={submit} aria-busy={busy}>
          <label htmlFor="join-fire-email">YOUR EMAIL ADDRESS</label><input id="join-fire-email" type="email" autoComplete="email" required placeholder="Your email address" value={email} onChange={event => setEmail(event.target.value)} disabled={busy || !settings.offerEnabled} aria-invalid={Boolean(error)} aria-describedby={error ? "join-fire-error" : undefined} />
          <label className="join-fire-consent"><input type="checkbox" required checked={consent} onChange={event => setConsent(event.target.checked)} disabled={busy || !settings.offerEnabled} /><span>I agree to receive IGNYTE emails, including my welcome offer. See the <Link href="/privacy/">Privacy Policy</Link>.</span></label>
          <button type="submit" disabled={busy || !settings.offerEnabled}>{busy ? "SENDING YOUR OFFER…" : settings.cta}</button>
          <p className="join-fire-reassurance">Just the good stuff. New drops, brand updates and the occasional offer. Unsubscribe anytime.</p>
          {!settings.offerEnabled && <p className="join-fire-disabled">Offer preview only. Signups and discount codes are turned off.</p>}
          {error && <p id="join-fire-error" className="join-fire-error" role="alert">{error}</p>}
        </form>}
      </div><div className="join-fire-hero-image"><Image src={settings.heroImage} alt="IGNYTE athlete training in performance activewear" fill priority sizes="(max-width: 800px) 100vw, 50vw" /><RegistrationMarks /></div></section>
      <section className="join-fire-brand"><div><span className="join-fire-eyebrow">IGNYTE ACTIVE_</span><h2>Built for the Burn™</h2><p>From strength sessions to high-intensity training, IGNYTE creates performance activewear that combines support, comfort and confidence.</p></div><div className="join-fire-product-images"><Image src="/images/jacob-2026-10/ign-motsbr-blk/ign-motsbr-blk-motion-sports-bra-black-main-01.jpg" alt="Motion Sports Bra in Black" width={450} height={600} sizes="(max-width: 800px) 42vw, 18vw"/><Image src="/images/jacob-2026-10/ign-motshts-blk/ign-motshts-blk-all-in-motion-shorts-black-main-01.jpg" alt="All In Motion Shorts in Black" width={450} height={600} sizes="(max-width: 800px) 42vw, 18vw"/></div></section>
    </>}
    <footer className="join-fire-footer"><span>IGNYTE ACTIVE · BUILT FOR THE BURN™</span><nav aria-label="Campaign support"><Link href="/privacy/">Privacy</Link><Link href="/terms/">Terms</Link><Link href="/contact/">Contact</Link></nav></footer>
  </div>;
}
