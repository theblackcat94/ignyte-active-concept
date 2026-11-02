"""Prepare the approved Jacob image package for the custom Ignyte catalogue.

Run locally with the extracted `products_by_sku` folder as the sole argument.
The generated manifest and product JPEGs are committed with the storefront.
"""

import csv
import json
import re
import shutil
import sys
from collections import defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "public/images/jacob-2026-10"
MANIFEST = ROOT / "data/jacob-catalog-2026-10-27.json"
EXISTING_SLUGS = {
    "IGN-HALT-JAC": "aura-halter-aurora",
    "IGN-LGS-JAC": "seamless-legging-aurora",
    "IGN-LVR-SHTS-BRN": "seamless-short-espresso",
    "IGN-LVR-BRA-DRKBRWN": "seamless-sports-bra-espresso",
    "IGN-HALT-DRKBRN": "aura-halter-espresso",
    "IGN-LGS-DRKBRN": "seamless-legging-espresso",
}
AURORA_FAMILIES = {"IGN-HALT-JAC", "IGN-LGS-JAC", "IGN-LVR-BRA-JAC", "IGN-MOTSBR-JAC", "IGN-MOTSHTS-JAC"}
CATEGORIES = {
    "Tops": "tops", "Shorts": "shorts", "Sports bras": "sports-bras",
    "Sports bra": "sports-bras", "Leggings": "leggings", "Accessories": "accessories",
}


def rows(path):
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def main(source):
    guide = source / "03 VA GUIDE AND MAPS"
    ready = [row for row in rows(guide / "VA Upload - Exact SKUs.csv")
             if row["VA action"] == "MEDIA READY"]
    variants = {row["Variant SKU"]: row for row in rows(guide / "Variants - SKU and Colour Map.csv")}
    copy = {row["Product ID"]: row for row in rows(guide / "Products - Copy and Specifications.csv")}
    groups = defaultdict(list)
    for row in ready:
        groups[row["Upload folder"]].append(row)
    assert len(ready) == 45 and len(groups) == 16, "Unexpected approved SKU inventory"
    products = []
    copied = 0
    for folder, group in sorted(groups.items()):
        first = group[0]
        family = Path(folder).name.split(" - ")[0]
        colour = "Aurora" if family in AURORA_FAMILIES else first["Website colour"]
        source_images = source / folder / "Images"
        images = sorted(source_images.glob("*.jpg"), key=lambda item: ("main-01" not in item.name, item.name))
        assert images and "main-01" in images[0].name, f"Missing main image: {family}"
        assert len(images) == len(list(source_images.iterdir())), f"Unexpected image type: {family}"
        target_dir = DEST / family.lower()
        target_dir.mkdir(parents=True, exist_ok=True)
        gallery = []
        for image in images:
            target_name = image.name.replace("-jacaranda-", "-aurora-") if family in AURORA_FAMILIES else image.name
            shutil.copy2(image, target_dir / target_name)
            copied += 1
            gallery.append({"image": f"/images/jacob-2026-10/{family.lower()}/{target_name}",
                            "alt": f"{first['Product name']} in {colour} — {image.stem.rsplit('-', 2)[-2]} view"})
        details = copy[first["Product ID"]]
        name = first["Product name"]
        slug = EXISTING_SLUGS.get(family) or "-".join((name + " " + colour).lower().split()).replace("/", "-")
        mapped = []
        for row in group:
            sku = row["Exact Magento SKU"]
            variant = variants[sku]
            assert variant["Price"].isdigit() and variant["Size"] == row["Size"], sku
            mapped.append({"sku": sku, "size": row["Size"], "price_cents": int(variant["Price"]) * 100})
        description = details["Short description"].strip()
        if family in AURORA_FAMILIES:
            description = re.sub(r"\b(?:Jacaranda|Lavender|Lilac)\b", "Aurora", description, flags=re.IGNORECASE)
        products.append({
            "slug": slug, "name": name, "category": CATEGORIES[details["Category"]],
            "color": colour, "description": description,
            "image_path": gallery[0]["image"], "gallery": gallery[1:],
            "source_family": family, "variants": mapped,
        })
    assert len({item["slug"] for item in products}) == 16
    assert copied == 92, f"Expected 92 prepared JPEGs, found {copied}"
    MANIFEST.parent.mkdir(exist_ok=True)
    MANIFEST.write_text(json.dumps({"source": "Jacob Cass MEDIA READY image package, 2026-10-27; Aurora colour naming approved 2026-11-02",
                                    "products": products}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Prepared {len(products)} listings, {len(ready)} ready SKUs and {copied} JPEGs")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python scripts/prepare-jacob-catalog.py <products_by_sku directory>")
    main(Path(sys.argv[1]).resolve())
