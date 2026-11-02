# Aurora product naming update · 2 November 2026

Jacob confirmed that the five purple colourways previously shown as Jacaranda, Lavender or Lilac should all be customer-facing **Aurora**. This supersedes the earlier name mapping. Seamless Shorts was already Aurora and remains unchanged.

| Product | Previous product URL | Current product URL | Colour before → after |
| --- | --- | --- | --- |
| Aura Halter Top | `/product/aura-halter-lavender/` | `/product/aura-halter-aurora/` | Jacaranda → Aurora |
| Seamless Leggings | `/product/seamless-legging-lavender/` | `/product/seamless-legging-aurora/` | Jacaranda → Aurora |
| Seamless Sports Bra | `/product/seamless-sports-bra-jacaranda/` | `/product/seamless-sports-bra-aurora/` | Jacaranda → Aurora |
| Motion Sports Bra | `/product/motion-sports-bra-jacaranda/` | `/product/motion-sports-bra-aurora/` | Jacaranda → Aurora |
| All In Motion Shorts | `/product/all-in-motion-shorts-jacaranda/` | `/product/all-in-motion-shorts-aurora/` | Jacaranda → Aurora |

The old product URLs receive HTTP 301 redirects to the new slugs. The live product ID, active SKU family, variants, prices, stock and image/video associations are retained. Product titles, selectors, cards, alt text, metadata, structured product colour, internal product links and canonical URL derive from the updated product records. The local fallback catalogue, recommendations, model details, importer, seed data and admin save validation use the same Aurora mapping. The product route has no separate sitemap implementation; no stale sitemap entry was found.

The SKU family directories retain their stable `JAC` identifiers. The approved image and video bytes were copied to Aurora-named public files; the original paths remain valid for older links. New product pages use Aurora image and video URLs, including poster frames. The browser-facing image alt text and product metadata also say Aurora. No media was re-encoded or visually changed.

Jacob also withdrew the request to roll the Aura crop out to every PDP video. Only Aura Halter Aurora retains that visual crop trial. All gallery videos autoplay muted when brought into view and have a single play/pause control instead of native controls.
