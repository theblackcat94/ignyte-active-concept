"""Turn Jacob's approved plain-text workout copy into editable Journal blocks.

Usage: python scripts/build-weekly-workout.py <approved-copy.txt> <output.json>
The source email's signature and quoted thread are deliberately excluded.
"""

import json
import re
import sys
from pathlib import Path


def main() -> None:
    source = Path(sys.argv[1]).read_text(encoding="utf-8-sig")
    source = source.split("Jacob Cass  |  JUST Creative", 1)[0]
    lines = [line.strip() for line in source.splitlines() if line.strip()]
    start = lines.index("TRAINING & MOVEMENT_")
    end = lines.index("IGNYTE ACTIVE · BUILT FOR THE BURN™")
    lines = lines[start:end + 1]

    blocks: list[dict] = []
    day_labels = {f"{day}_" for day in (
        "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"
    )}
    major = {"YOUR WEEK AT A GLANCE_", "MAKE THE PLAN YOUR OWN_", "BUILT FOR THE BURN_"}
    minor = {"THE WORKOUT", "CHOOSE YOUR MOVEMENT", "OPTION A: COMBAT & CONDITIONING",
             "OPTION B: STEADY CARDIO", "OPTION C: TAKE AN EXTRA REST DAY",
             "If you're just getting started", "If you're more experienced",
             "If life gets busy", "Before every workout"}
    i = 3  # Category, title and opening line are rendered in the article header.
    while i < len(lines):
        line = lines[i]
        if line.startswith("____"):
            i += 1
            continue
        if line in day_labels or line in major:
            blocks.append({"type": "heading", "text": line})
            i += 1
            if line in day_labels and i < len(lines):
                blocks.append({"type": "subheading", "text": lines[i]})
                i += 1
            continue
        if line in minor:
            blocks.append({"type": "subheading", "text": line})
            i += 1
            continue
        if line.startswith("THE FOCUS:"):
            blocks.append({"type": "callout", "label": "THE FOCUS_", "text": line.split(":", 1)[1].strip()})
            i += 1
            continue
        if line == "Day\tFocus\tDuration":
            rows = []
            for row in lines[i + 1:i + 8]:
                cells = row.split("\t")
                if len(cells) != 3:
                    raise ValueError(f"Invalid schedule row: {row}")
                rows.append(cells)
            blocks.append({"type": "table", "columns": ["Day", "Focus", "Duration"], "rows": rows})
            i += 8
            continue
        if re.match(r"^1\.\s", line):
            rows = []
            while i < len(lines) and re.match(r"^\d+\.\s", lines[i]):
                match = re.match(r"^\d+\.\s+(.+?):\s+(.+)$", lines[i])
                if not match:
                    raise ValueError(f"Invalid exercise: {lines[i]}")
                rows.append([match.group(1), match.group(2)])
                i += 1
            blocks.append({"type": "table", "columns": ["Exercise", "Sets × Reps"], "rows": rows})
            continue
        if line.startswith("•\t"):
            items = []
            while i < len(lines) and lines[i].startswith("•\t"):
                items.append(lines[i][2:])
                i += 1
            blocks.append({"type": "list", "text": "\n".join(items), "ordered": False})
            continue
        if line == "SHOP IGNYTE ↗":
            blocks.append({"type": "paragraph", "text": "[SHOP IGNYTE ↗](/shop/)  ·  [FIND YOUR FIT ↗](/size-guide/)"})
        elif line == "IGNYTE ACTIVE · BUILT FOR THE BURN™":
            blocks.append({"type": "paragraph", "text": line})
        else:
            blocks.append({"type": "paragraph", "text": line})
        i += 1

    hero = "/images/product/Ignyte-Training.jpg"
    article = {
        "slug": "built-for-the-burn-weekly-workout",
        "title": "Built for the Burn: Your 7-Day Training Plan",
        "excerpt": "Strength. Sweat. Recovery. Repeat. Four structured workouts, one optional movement day and two days to recover.",
        "category_slug": "training-movement",
        "status": "draft", "publish_at": None, "featured": False, "sort_order": 20,
        "author": "IGNYTE Active", "cover_url": hero,
        "cover_alt": "IGNYTE athlete training in the gym",
        "thumbnail_url": hero, "body": blocks,
        "seo_title": "7-Day Training Plan for Women | IGNYTE Active",
        "seo_description": "A seven-day training plan combining strength, HIIT, conditioning and recovery. Find a routine that works for you with IGNYTE Active.",
        "canonical_url": "https://dev.ignyteactive.com/journal/built-for-the-burn-weekly-workout/",
        "og_image": hero,
        "social_title": "Built for the Burn: Your 7-Day Training Plan | IGNYTE Active",
        "social_description": "Four structured workouts. One optional movement day. Two days to recover. Find your rhythm with IGNYTE.",
        "press_publication": "", "press_date": None, "press_url": "",
    }
    Path(sys.argv[2]).write_text(json.dumps(article, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(blocks)} editable blocks")


if __name__ == "__main__":
    main()
