# Original footer template

Saved before the PDF-inspired redesign. To reuse, restore the component JSX and its CSS rules in this project. The newsletter form is a concept preview and does not collect addresses.

## Component

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";

export default function Footer() {
  const [signupAttempted, setSignupAttempted] = useState(false);
  return <footer className="site-footer" id="footer">
    <div className="footer-top"><div><span className="eyebrow">THE IGNITION POINT</span><h2>BRING THE FIRE<br /><em>EVERYWHERE.</em></h2></div><div className="newsletter"><p>Training notes, new drops and everything in between.</p><form onSubmit={e => { e.preventDefault(); setSignupAttempted(true); }}><input type="email" required placeholder="YOUR EMAIL ADDRESS" aria-label="Email address" /><button type="submit" aria-label="Join newsletter">↗</button></form><small>{signupAttempted ? "This preview cannot collect emails yet." : "Newsletter signup is a concept preview."}</small></div></div>
    <div className="footer-main"><div className="footer-brand"><Link className="brand" href="/"><span className="brand-flame">◢</span><span>IGNYTE</span></Link><p>High-performance activewear for women who bring the fire.</p><a href="https://www.instagram.com/ignyteactive" target="_blank" rel="noreferrer">INSTAGRAM ↗</a></div><div><h3>SHOP</h3><Link href="/shop">Shop all</Link><Link href="/shop/sports-bras">Sports bras</Link><Link href="/shop/tops">Tops</Link><Link href="/shop/leggings">Leggings</Link><Link href="/shop/shorts">Shorts</Link></div><div><h3>EXPLORE</h3><Link href="/#story">Our story</Link><Link href="/#collections">Collections</Link><Link href="/wishlist">Wishlist</Link></div><div><h3>HELP & SUPPORT</h3><a href="https://ignyteactive.com/contact/" target="_blank" rel="noreferrer">Contact</a><a href="https://ignyteactive.com/privacy-policy" target="_blank" rel="noreferrer">Privacy policy</a><a href="https://ignyteactive.com/terms-conditions" target="_blank" rel="noreferrer">Terms of service</a></div></div>
    <div className="footer-bottom"><span>© 2026 IGNYTE ACTIVE</span><span>CONCEPT STOREFRONT · CHECKOUT NOT CONNECTED</span><a href="#top">BACK TO TOP ↑</a></div>
  </footer>;
}
```

## Styles

```css
.site-footer{background:#151515;color:#fff}.footer-top{display:grid;grid-template-columns:1fr 1fr;gap:12%;padding:85px max(44px,calc((100vw - 1500px)/2));border-bottom:1px solid #434343}.footer-top h2{font-size:clamp(50px,5.2vw,85px);line-height:.85;margin:20px 0 0;font-weight:950}.newsletter{align-self:end}.newsletter p{color:#ccc;max-width:300px;line-height:1.5}.newsletter form{display:flex;border-bottom:1px solid #aaa;padding:12px 0}.newsletter input{flex:1;min-width:0;background:none;color:#fff;border:0;outline:none;font-size:11px;letter-spacing:.1em}.newsletter button{border:0;background:none;color:#fff;font-size:22px}.newsletter small{display:block;color:#777;margin-top:13px;font-size:10px}.footer-main{display:grid;grid-template-columns:2fr repeat(3,1fr);gap:50px;padding:70px max(44px,calc((100vw - 1500px)/2)) 95px}.footer-brand .brand{font-size:35px}.footer-brand p{max-width:270px;color:#aaa;font-size:13px;line-height:1.6;margin:25px 0}.footer-brand>a:last-child{font-size:10px;letter-spacing:.14em;font-weight:800;border-bottom:1px solid var(--orange);padding-bottom:6px}.footer-main h3{font-size:10px;letter-spacing:.2em;margin:4px 0 25px}.footer-main>div:not(:first-child)>a{display:block;color:#aaa;font-size:13px;margin-bottom:16px}.footer-main a:hover{color:var(--orange)}.footer-bottom{border-top:1px solid #434343;padding:20px max(44px,calc((100vw - 1500px)/2));display:flex;justify-content:space-between;gap:15px;color:#aaa;font-size:9px;font-weight:800;letter-spacing:.14em}.footer-bottom a:hover{color:var(--orange)}
.footer-top{display:grid;grid-template-columns:1fr 1fr;gap:12%;padding:85px max(44px,calc((100vw - 1500px)/2));border-bottom:1px solid #434343}
.footer-top h2{font-size:clamp(50px,5.2vw,85px);line-height:.85;margin:20px 0 0;font-weight:950}
.footer-top{grid-template-columns:1fr;padding:70px 24px;gap:45px}
.footer-main{display:grid;grid-template-columns:2fr repeat(3,1fr);gap:50px;padding:70px max(44px,calc((100vw - 1500px)/2)) 95px}
.footer-main h3{font-size:10px;letter-spacing:.2em;margin:4px 0 25px}
.footer-main>div:not(:first-child)>a{display:block;color:#aaa;font-size:13px;margin-bottom:16px}
.footer-main a:hover{color:var(--orange)}
.footer-main{grid-template-columns:repeat(3,1fr);padding:55px 24px;gap:30px}
.footer-main{grid-template-columns:repeat(2,1fr)}
.footer-main>div:last-child{grid-column:1/-1}
.footer-brand .brand{font-size:35px}
.footer-brand p{max-width:270px;color:#aaa;font-size:13px;line-height:1.6;margin:25px 0}
.footer-brand>a:last-child{font-size:10px;letter-spacing:.14em;font-weight:800;border-bottom:1px solid var(--orange);padding-bottom:6px}
.footer-brand{grid-column:1/-1}
.footer-bottom{border-top:1px solid #434343;padding:20px max(44px,calc((100vw - 1500px)/2));display:flex;justify-content:space-between;gap:15px;color:#aaa;font-size:9px;font-weight:800;letter-spacing:.14em}
.footer-bottom a:hover{color:var(--orange)}
.footer-bottom{padding:20px 24px}
.footer-bottom{flex-wrap:wrap;justify-content:start}
.footer-bottom span:nth-child(2){display:none}
```
