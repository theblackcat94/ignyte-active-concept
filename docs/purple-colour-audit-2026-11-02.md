# Purple colour and media audit · 2 November 2026

Scope: development catalogue. Compared active product records with the approved 27 October media catalogue, SKU families, current gallery image paths, and the 2 November rotation-video mapping. The five product rows had `color = Aurora` while their approved catalogue records, active `-JAC-` SKUs, gallery alt text and image paths identify Jacaranda. The database colour field was corrected in place. No image, video, variant, price or stock row was changed.

| Product | Before | After | URL |
| --- | --- | --- | --- |
| Aura Halter Top | Aurora | Jacaranda | `/product/aura-halter-lavender/` (existing legacy URL) |
| Seamless Leggings | Aurora | Jacaranda | `/product/seamless-legging-lavender/` (existing legacy URL) |
| Seamless Sports Bra | Aurora | Jacaranda | `/product/seamless-sports-bra-jacaranda/` |
| Motion Sports Bra | Aurora | Jacaranda | `/product/motion-sports-bra-jacaranda/` |
| All In Motion Shorts | Aurora | Jacaranda | `/product/all-in-motion-shorts-jacaranda/` |
| Seamless Shorts | Aurora | Aurora | `/product/seamless-short-aurora/` (preserved) |

The first two URLs retain old `lavender` slugs for link continuity. They were already canonical before this audit. A slug migration would require updated internal references, redirects and sitemap regeneration, so no URL was changed during this data correction.

For the five corrected records, the development database's main image and gallery image paths exactly matched the approved catalogue; all referenced local images, videos and video posters exist. The gallery alt text already said Jacaranda. The corresponding video mapping is documented in `product-rotation-video-mapping.md`. Existing source filenames containing `lavender` or `lilac` are internal identifiers and do not define the approved customer-facing colour. Next/Image serves optimized variants from these same source paths; no separate WebP/AVIF catalogue mapping was found.

**Cause found:** the live product `color` field had been set to Aurora for five Jacaranda SKU families while their other product data remained Jacaranda. The storefront derives titles, selectors, cards and SEO titles from that field, causing the visible mismatch. The change that wrote the incorrect values could not be identified from the current product table; there is no product-colour edit history in this audit. The admin product schema now rejects mismatches for these six approved SKU families, including Seamless Shorts Aurora. `scripts/audit-purple-colour-mapping.mjs` provides a guarded repeatable check and refuses to write if product identity, active SKU family or media paths diverge from the approved catalogue.

**Video framing trial:** Aura Halter Jacaranda alone uses `object-fit: cover` and an elevated focal point on the existing rotation clip, including its poster thumbnail. The current video file is unchanged. Review the crop on desktop and iPhone before extending it to other products; the shorter mobile gallery tile necessarily crops more of the 9:16 video.
