# IGNYTE storefront concept

A responsive Next.js concept for Ignyte Active, built in the brand's charcoal, cream and flame orange palette. It draws on the shopping patterns of activewear stores while using original layout, copy and concept imagery.

## Run locally

Requires Node.js 20.9 or newer.

```powershell
npm install
npm run dev
```

Open `http://127.0.0.1:3000`. The dev server binds to `127.0.0.1` only.

To generate the static site:

```powershell
npm run build
```

The exported files are written to `out/`.

## GitHub Pages

The project statically exports to `out/`. The GitHub Actions workflow builds it for the `ignyte-active-concept` repository path and deploys on pushes to `main`. Set the repository's **Settings → Pages → Build and deployment → Source** to **GitHub Actions**. The public concept URL is `https://theblackcat94.github.io/ignyte-active-concept/`.

## Included

- Responsive homepage with campaign hero, category discovery, product edit, brand story, and footer
- Category routes, filtering and sorting, search, wishlist and product detail routes
- Demo bag with size selection and local browser storage
- Original AI-generated campaign and product concept imagery under `public/images`

## Before launch

- Replace `lib/catalog.ts` with approved catalogue data, product images, colourways, size availability and listing rules. The current data is illustrative.
- Connect the shop to the chosen commerce backend for real stock, prices, accounts, payments and checkout. Checkout is deliberately disabled in this concept.
- Connect newsletter signup to the approved email platform.
- Replace the concept campaign and product imagery with client-approved assets.
- Confirm shipping, returns, support, accessibility and privacy copy. Support currently links to the live contact page.
- Confirm the precise brand colour values; the current accent is `#ff4530`.

## Image provenance

The six files in `public/images` were generated for this local concept with the built-in image generation tool. No competitor images were copied. Prompt summaries:

- `campaign-hero.png`: two adult athletes in dark Ignyte-inspired activewear, dramatic charcoal studio and warm orange rim lighting, wide with left negative space.
- `campaign-studio.png`: adult athlete in espresso training set, pale concrete studio, natural editorial light.
- `campaign-training.png`: adult athlete in dark training wear, industrial gym doorway, late afternoon light.
- `product-leggings.png`: black technical leggings on a display mannequin, neutral catalog backdrop.
- `product-halter.png`: espresso halter training top on a display mannequin, neutral catalog backdrop.
- `product-shorts.png`: black technical training shorts on a display mannequin, neutral catalog backdrop.

All generated imagery is illustrative and must be reviewed before commercial use.
