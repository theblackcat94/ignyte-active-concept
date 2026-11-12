import test from "node:test";
import assert from "node:assert/strict";
import { browseRecoveryEmail } from "../lib/email-templates.ts";

test("browse email renders the selected colour, current price and direct links", () => {
  const design = browseRecoveryEmail({ name: "Aura Halter", color: "Aurora", image: "/images/aura.jpg", slug: "aura-halter-aurora", priceCents: 6000 },
    "https://dev.ignyteactive.com", "https://dev.ignyteactive.com/unsubscribe/?token=preview");
  assert.equal(design.subject, "Still thinking it over? 👀");
  for (const expected of ["CAUGHT YOUR EYE?", "Aura Halter", "Aurora", "$60.00", "/product/aura-halter-aurora/", "/size-guide/", "/unsubscribe/?token=preview"])
    assert.ok(design.html.includes(expected), `missing ${expected}`);
  assert.ok(!design.html.includes("Made to stand out."));
  assert.ok(design.text.includes("$60.00"));
});

test("browse email escapes product fields and identifies variable prices", () => {
  const design = browseRecoveryEmail({ name: "Top <test>", color: "Black", image: "/images/top.jpg", slug: "top-black", priceCents: 5000, priceFrom: true },
    "https://dev.ignyteactive.com", "https://dev.ignyteactive.com/unsubscribe/?token=preview");
  assert.ok(design.html.includes("Top &lt;test&gt;"));
  assert.ok(design.html.includes("From $50.00"));
});
