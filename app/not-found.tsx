import Link from "next/link";

export default function NotFound() { return <div className="not-found"><span className="eyebrow">404 / OFF THE TRACK</span><h1>LOST YOUR<br /><em>FIRE?</em></h1><p>That page isn’t part of the current collection.</p><Link href="/" className="button button-orange">BACK TO HOME <span>↗</span></Link></div>; }
