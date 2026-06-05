#!/usr/bin/env python3
"""
Asset Candidate Detection Refinement

Purpose:
  Detect two candidate types from source slide images:

  1. text_block_candidate
     - Text cluster / card / panel guide candidates.
     - Detected from clusters of OCR text_blocks.
     - Intended to become PPTX layout / cluster guides, and optionally crop guides.

  2. visual_asset_candidate
     - Photo / chart / diagram / illustration candidates.
     - Detected from foreground connected components.
     - Text-overlapping components are rejected.

Important:
  Text itself should NOT become an image asset candidate.
  Text belongs to OCR -> text_blocks -> PPT text reconstruction.

Input:
  source/slide_XXX.png
  json/text_blocks/*slide_XXX*.json
  json/text_blocks_working/*slide_XXX*.json

Output:
  json/slides/slide_XXX_asset_candidates.json
"""

from __future__ import annotations

import argparse
import json
import math
from collections import deque
from datetime import datetime
from pathlib import Path
from statistics import median
from typing import Any

from PIL import Image, ImageFilter, ImageDraw, ImageChops


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "source"
JSON_SLIDES_DIR = ROOT / "json" / "slides"
TEXT_BLOCK_DIRS = [
    ROOT / "json" / "text_blocks_working",
    ROOT / "json" / "text_blocks",
]


def rel(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(ROOT.resolve()))
    except Exception:
        return str(path)


def slide_id_from_source(path: Path) -> str:
    return path.stem


def source_files() -> list[Path]:
    if not SOURCE_DIR.exists():
        return []
    return sorted(
        p for p in SOURCE_DIR.iterdir()
        if p.is_file() and p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}
    )


def parse_slides(slides: list[str] | None) -> list[tuple[str, Path]]:
    files = source_files()
    by_id = {slide_id_from_source(p): p for p in files}

    if not slides:
        return [(sid, path) for sid, path in by_id.items()]

    result: list[tuple[str, Path]] = []
    for sid in slides:
        path = by_id.get(sid)
        if path:
            result.append((sid, path))
        else:
            print(f"[WARN] source not found for slide: {sid}")
    return result


def sample_background_color(img: Image.Image) -> tuple[int, int, int]:
    rgb = img.convert("RGB")
    w, h = rgb.size
    px = rgb.load()

    samples: list[tuple[int, int, int]] = []

    corner_size = max(4, min(w, h) // 40)
    regions = [
        (0, 0, corner_size, corner_size),
        (w - corner_size, 0, w, corner_size),
        (0, h - corner_size, corner_size, h),
        (w - corner_size, h - corner_size, w, h),
    ]

    for x0, y0, x1, y1 in regions:
        for y in range(max(0, y0), min(h, y1)):
            for x in range(max(0, x0), min(w, x1)):
                samples.append(px[x, y])

    step = max(1, min(w, h) // 160)
    for x in range(0, w, step):
        samples.append(px[x, 0])
        samples.append(px[x, h - 1])
    for y in range(0, h, step):
        samples.append(px[0, y])
        samples.append(px[w - 1, y])

    if not samples:
        return (255, 255, 255)

    return (
        int(median([c[0] for c in samples])),
        int(median([c[1] for c in samples])),
        int(median([c[2] for c in samples])),
    )


def color_distance(a: tuple[int, int, int], b: tuple[int, int, int]) -> float:
    return math.sqrt(
        (a[0] - b[0]) ** 2 +
        (a[1] - b[1]) ** 2 +
        (a[2] - b[2]) ** 2
    )


def make_foreground_mask(
    img: Image.Image,
    bg: tuple[int, int, int],
    threshold: float,
) -> Image.Image:
    rgb = img.convert("RGB")
    w, h = rgb.size
    px = rgb.load()

    mask = Image.new("L", (w, h), 0)
    out = mask.load()

    for y in range(h):
        for x in range(w):
            if color_distance(px[x, y], bg) >= threshold:
                out[x, y] = 255

    mask = mask.filter(ImageFilter.MaxFilter(5))
    mask = mask.filter(ImageFilter.MinFilter(3))
    return mask


def connected_components(mask: Image.Image) -> list[tuple[int, int, int, int, int]]:
    w, h = mask.size
    px = mask.load()
    seen = bytearray(w * h)
    comps: list[tuple[int, int, int, int, int]] = []

    def idx(x: int, y: int) -> int:
        return y * w + x

    for y0 in range(h):
        for x0 in range(w):
            i = idx(x0, y0)
            if seen[i] or px[x0, y0] < 128:
                seen[i] = 1
                continue

            q = deque([(x0, y0)])
            seen[i] = 1
            min_x = max_x = x0
            min_y = max_y = y0
            area = 0

            while q:
                x, y = q.popleft()
                area += 1
                min_x = min(min_x, x)
                max_x = max(max_x, x)
                min_y = min(min_y, y)
                max_y = max(max_y, y)

                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if nx < 0 or ny < 0 or nx >= w or ny >= h:
                        continue
                    ni = idx(nx, ny)
                    if seen[ni]:
                        continue
                    seen[ni] = 1
                    if px[nx, ny] >= 128:
                        q.append((nx, ny))

            comps.append((min_x, min_y, max_x - min_x + 1, max_y - min_y + 1, area))

    return comps


def box_area(box: list[int]) -> int:
    return max(0, int(box[2])) * max(0, int(box[3]))


def box_intersection(a: list[int], b: list[int]) -> int:
    ax, ay, aw, ah = a
    bx, by, bw, bh = b

    x0 = max(ax, bx)
    y0 = max(ay, by)
    x1 = min(ax + aw, bx + bw)
    y1 = min(ay + ah, by + bh)

    if x1 <= x0 or y1 <= y0:
        return 0
    return (x1 - x0) * (y1 - y0)


def overlap_ratio(a: list[int], b: list[int]) -> float:
    ia = box_intersection(a, b)
    aa = box_area(a)
    if aa <= 0:
        return 0.0
    return ia / aa


def iou(a: list[int], b: list[int]) -> float:
    ia = box_intersection(a, b)
    union = box_area(a) + box_area(b) - ia
    if union <= 0:
        return 0.0
    return ia / union


def boxes_overlap_or_near(a: list[int], b: list[int], gap: int) -> bool:
    ax, ay, aw, ah = a
    bx, by, bw, bh = b

    ar = ax + aw
    ab = ay + ah
    br = bx + bw
    bb = by + bh

    return not (
        ar + gap < bx or
        br + gap < ax or
        ab + gap < by or
        bb + gap < ay
    )


def merge_boxes(boxes: list[list[int]], gap: int) -> list[list[int]]:
    merged: list[list[int]] = []

    for box in boxes:
        current = box[:]
        changed = True

        while changed:
            changed = False
            next_merged: list[list[int]] = []

            for existing in merged:
                if boxes_overlap_or_near(current, existing, gap):
                    x1 = min(current[0], existing[0])
                    y1 = min(current[1], existing[1])
                    x2 = max(current[0] + current[2], existing[0] + existing[2])
                    y2 = max(current[1] + current[3], existing[1] + existing[3])
                    current = [x1, y1, x2 - x1, y2 - y1]
                    changed = True
                else:
                    next_merged.append(existing)

            merged = next_merged

        merged.append(current)

    return merged


def expand_box(box: list[int], pad: int, w: int, h: int) -> list[int]:
    x, y, bw, bh = box
    x0 = max(0, x - pad)
    y0 = max(0, y - pad)
    x1 = min(w, x + bw + pad)
    y1 = min(h, y + bh + pad)
    return [x0, y0, max(0, x1 - x0), max(0, y1 - y0)]


def normalize_bbox(value: Any) -> list[int] | None:
    if isinstance(value, list) and len(value) == 4:
        try:
            return [int(round(float(v))) for v in value]
        except Exception:
            return None

    if isinstance(value, dict):
        keys = ["x", "y", "w", "h"]
        if all(k in value for k in keys):
            try:
                return [int(round(float(value[k]))) for k in keys]
            except Exception:
                return None

        keys2 = ["left", "top", "width", "height"]
        if all(k in value for k in keys2):
            try:
                return [int(round(float(value[k]))) for k in keys2]
            except Exception:
                return None

    return None


def extract_blocks_from_payload(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return [b for b in payload if isinstance(b, dict)]

    if not isinstance(payload, dict):
        return []

    for key in ["text_blocks", "blocks", "items", "elements"]:
        value = payload.get(key)
        if isinstance(value, list):
            return [b for b in value if isinstance(b, dict)]

    # Some JSON files may be dict[id] = block.
    values = list(payload.values())
    if values and all(isinstance(v, dict) for v in values):
        return [v for v in values if isinstance(v, dict)]

    return []


def text_block_paths(slide_id: str) -> list[Path]:
    paths: list[Path] = []

    patterns = [
        f"*{slide_id}*.json",
        f"{slide_id}.json",
        f"{slide_id}_text_blocks.json",
    ]

    for d in TEXT_BLOCK_DIRS:
        if not d.exists():
            continue
        for pattern in patterns:
            paths.extend(sorted(d.glob(pattern)))

    # De-duplicate while preserving order.
    seen: set[Path] = set()
    unique: list[Path] = []
    for p in paths:
        rp = p.resolve()
        if rp in seen:
            continue
        seen.add(rp)
        unique.append(p)

    return unique


def load_text_blocks(slide_id: str) -> list[dict[str, Any]]:
    blocks: list[dict[str, Any]] = []

    for path in text_block_paths(slide_id):
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue

        for block in extract_blocks_from_payload(payload):
            bbox = (
                normalize_bbox(block.get("bbox_px")) or
                normalize_bbox(block.get("bbox")) or
                normalize_bbox(block.get("position"))
            )

            if not bbox:
                continue

            text = str(block.get("text") or block.get("content") or "").strip()

            blocks.append({
                "id": block.get("id") or block.get("block_id") or block.get("source_block_id"),
                "role": block.get("role"),
                "style_ref": block.get("style_ref"),
                "text": text,
                "bbox_px": bbox,
                "source_file": rel(path),
            })

    return blocks


def is_page_edge_text(block: dict[str, Any], w: int, h: int) -> bool:
    x, y, bw, bh = block["bbox_px"]
    text = block.get("text") or ""

    # Footer / page number / tiny corner labels.
    if y > h * 0.88:
        return True
    if x > w * 0.82 and y < h * 0.18 and bw < w * 0.16:
        return True
    if len(text) <= 2 and bw < 80 and bh < 40:
        return True

    return False


def text_blocks_for_card_detection(blocks: list[dict[str, Any]], w: int, h: int) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []

    for block in blocks:
        bbox = block.get("bbox_px")
        if not bbox:
            continue

        x, y, bw, bh = bbox

        if bw < 20 or bh < 8:
            continue
        if is_page_edge_text(block, w, h):
            continue

        result.append(block)

    return result


def detect_text_block_candidates(
    slide_id: str,
    img_w: int,
    img_h: int,
    text_blocks: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Detect text cluster / card / panel candidates by clustering text block boxes.

    This intentionally uses text as a structural signal.
    It does NOT convert text itself into an image candidate.
    """
    usable = text_blocks_for_card_detection(text_blocks, img_w, img_h)

    if not usable:
        return []

    # Expand text boxes so nearby text lines inside one card become one group.
    # Keep the gap moderate to avoid merging separate neighboring cards.
    seed_boxes: list[list[int]] = []
    seed_meta: list[dict[str, Any]] = []

    for block in usable:
        box = block["bbox_px"]
        expanded = expand_box(box, pad=max(14, img_w // 90), w=img_w, h=img_h)
        seed_boxes.append(expanded)
        seed_meta.append(block)

    merged = merge_boxes(seed_boxes, gap=max(18, img_w // 120))

    candidates: list[dict[str, Any]] = []
    idx = 1

    for group_box in merged:
        # Collect text blocks that overlap the merged group.
        members = [
            b for b in usable
            if box_intersection(group_box, b["bbox_px"]) > 0
        ]

        if len(members) < 2:
            continue

        # Build tighter union of original text blocks, then add generous padding.
        xs = [b["bbox_px"][0] for b in members]
        ys = [b["bbox_px"][1] for b in members]
        x2s = [b["bbox_px"][0] + b["bbox_px"][2] for b in members]
        y2s = [b["bbox_px"][1] + b["bbox_px"][3] for b in members]

        tight = [
            min(xs),
            min(ys),
            max(x2s) - min(xs),
            max(y2s) - min(ys),
        ]

        pad_x = max(24, img_w // 55)
        pad_y = max(18, img_h // 45)
        card_box = expand_box(tight, pad=max(pad_x, pad_y), w=img_w, h=img_h)

        x, y, bw, bh = card_box
        area_ratio = box_area(card_box) / max(1, img_w * img_h)

        # Reject tiny clusters and almost-page clusters.
        if bw < img_w * 0.12 or bh < img_h * 0.08:
            continue
        if area_ratio > 0.48:
            continue

        # Reject header-only groups: they are text layout, not card blocks.
        if y < img_h * 0.18 and bh < img_h * 0.18:
            continue

        # Candidate.
        candidates.append({
            "candidate_id": f"{slide_id}_text_block_candidate_{idx:03d}",
            "type": "text_block_candidate",
            "status": "pending",
            "bbox_px": card_box,
            "source": "text_block_cluster",
            "text_block_count": len(members),
            "text_block_ids": [m.get("id") for m in members if m.get("id")],
            "reason": "clustered_text_blocks",
        })
        idx += 1

    return candidates


def is_text_like_geometry(box: list[int], img_w: int, img_h: int) -> bool:
    x, y, bw, bh = box
    if bw <= 0 or bh <= 0:
        return True

    aspect = bw / max(1, bh)

    # Long shallow strips are usually text lines, not visual assets.
    if aspect >= 4.0 and bh <= img_h * 0.08:
        return True

    # Very small strip/label.
    if bw < img_w * 0.08 and bh < img_h * 0.06:
        return True

    return False


def has_strong_text_overlap(
    box: list[int],
    text_blocks: list[dict[str, Any]],
    threshold: float = 0.34,
) -> tuple[bool, dict[str, Any] | None, float]:
    best_block: dict[str, Any] | None = None
    best_ratio = 0.0

    for block in text_blocks:
        tb = block.get("bbox_px")
        if not tb:
            continue

        ratio = overlap_ratio(box, tb)
        reverse_ratio = overlap_ratio(tb, box)
        score = max(ratio, reverse_ratio)

        if score > best_ratio:
            best_ratio = score
            best_block = block

    return best_ratio >= threshold, best_block, best_ratio


def color_variance_score(img: Image.Image, box: list[int]) -> float:
    x, y, w, h = box
    if w <= 0 or h <= 0:
        return 0.0

    rgb = img.convert("RGB")
    crop = rgb.crop((x, y, x + w, y + h))

    # Sample sparse grid to avoid heavy computation.
    cw, ch = crop.size
    if cw <= 0 or ch <= 0:
        return 0.0

    pixels: list[tuple[int, int, int]] = []
    step_x = max(1, cw // 12)
    step_y = max(1, ch // 12)

    px = crop.load()
    for yy in range(0, ch, step_y):
        for xx in range(0, cw, step_x):
            pixels.append(px[xx, yy])

    if len(pixels) < 2:
        return 0.0

    med = (
        int(median([p[0] for p in pixels])),
        int(median([p[1] for p in pixels])),
        int(median([p[2] for p in pixels])),
    )

    distances = [color_distance(p, med) for p in pixels]
    return float(median(distances))




def expand_visual_box_for_export(box: list[int], img_w: int, img_h: int) -> list[int]:
    """
    Refine visual_asset_candidate bbox for PPTX export.

    Goal:
      - Keep slide_005-like chart captures stable.
      - Slightly expand central chart captures such as slide_006 / slide_007.
      - Avoid blindly expanding into right-side text cards.

    This is intentionally conservative. It only expands accepted visual candidates,
    not rejected text-like components.
    """
    x, y, bw, bh = box
    right = x + bw
    bottom = y + bh
    area_ratio = box_area(box) / max(1, img_w * img_h)

    # Small visual candidates should not be inflated too much.
    if area_ratio < 0.07:
        return expand_box(box, pad=8, w=img_w, h=img_h)

    # Large chart/figure candidates: add breathing room for axes, labels, callouts.
    pad_left = max(16, int(img_w * 0.025))
    pad_right = max(12, int(img_w * 0.018))
    pad_top = max(12, int(img_h * 0.022))
    pad_bottom = max(18, int(img_h * 0.035))

    # If the candidate starts well inside the slide, it likely missed left labels.
    # This helps slide_007-like horizontal charts.
    if x > img_w * 0.10:
        pad_left = max(pad_left, int(img_w * 0.075))

    # Avoid expanding into a likely right-side explanation column.
    # slide_005 already reaches the right edge of the chart area; do not push further.
    if right > img_w * 0.62:
        pad_right = 0

    x0 = max(0, x - pad_left)
    y0 = max(0, y - pad_top)
    x1 = min(img_w, right + pad_right)
    y1 = min(img_h, bottom + pad_bottom)

    return [x0, y0, max(0, x1 - x0), max(0, y1 - y0)]





def build_text_mask(
    image_size: tuple[int, int],
    text_blocks: list[dict[str, Any]],
    pad: int = 5,
) -> Image.Image:
    """
    Build mask for OCR text areas.
    White = text area.
    Black = non-text area.
    """
    w, h = image_size
    mask = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(mask)

    for block in text_blocks:
        box = block.get("bbox_px")
        if not box:
            continue

        x, y, bw, bh = box
        x0 = max(0, int(x) - pad)
        y0 = max(0, int(y) - pad)
        x1 = min(w, int(x + bw) + pad)
        y1 = min(h, int(y + bh) + pad)

        draw.rectangle([x0, y0, x1, y1], fill=255)

    return mask


def build_ink_mask(
    img: Image.Image,
    bg: tuple[int, int, int],
    diff_thresh: float = 16.0,
    edge_thresh: int = 18,
) -> Image.Image:
    """
    Build visual ink mask.

    White = non-background or edge-like pixel.
    Black = likely background.

    This catches:
      - colored chart bars
      - chart axes / grid / connector lines
      - low-contrast chart structure
    """
    rgb = img.convert("RGB")
    w, h = rgb.size
    px = rgb.load()

    diff_mask = Image.new("L", (w, h), 0)
    out = diff_mask.load()

    for y in range(h):
        for x in range(w):
            if color_distance(px[x, y], bg) >= diff_thresh:
                out[x, y] = 255

    edge = rgb.convert("L").filter(ImageFilter.FIND_EDGES)
    edge_mask = Image.new("L", (w, h), 0)
    epx = edge.load()
    em = edge_mask.load()

    for y in range(h):
        for x in range(w):
            if epx[x, y] >= edge_thresh:
                em[x, y] = 255

    ink = ImageChops.lighter(diff_mask, edge_mask)

    # Light closing to connect fragmented bars / axes.
    ink = ink.filter(ImageFilter.MaxFilter(3))
    ink = ink.filter(ImageFilter.MinFilter(3))
    return ink


def apply_bbox_mask(mask: Image.Image, bbox: list[int]) -> Image.Image:
    """
    Keep only bbox area.
    """
    w, h = mask.size
    x, y, bw, bh = bbox

    x0 = max(0, int(x))
    y0 = max(0, int(y))
    x1 = min(w, int(x + bw))
    y1 = min(h, int(y + bh))

    keep = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(keep)
    draw.rectangle([x0, y0, x1, y1], fill=255)

    return ImageChops.multiply(mask, keep)


def chart_content_band(img_w: int, img_h: int) -> list[int]:
    """
    Conservative chart search band.

    Avoid:
      - title/header area
      - footer area
      - far-right explanation cards

    This is NOT a fallback crop.
    It only restricts where chart-density cells are allowed to appear.
    """
    x0 = int(img_w * 0.045)
    y0 = int(img_h * 0.215)
    x1 = int(img_w * 0.765)
    y1 = int(img_h * 0.855)

    return [x0, y0, x1 - x0, y1 - y0]


def density_grid_components(
    signal_mask: Image.Image,
    cell: int = 24,
    density_thresh: float = 0.045,
    dilate_iter: int = 2,
) -> list[list[int]]:
    """
    Convert signal mask into grid components.

    A cell becomes active if enough non-text visual ink exists.
    Grid dilation then reconnects separated bars / axes into chart regions.
    """
    w, h = signal_mask.size
    px = signal_mask.load()

    cols = max(1, (w + cell - 1) // cell)
    rows = max(1, (h + cell - 1) // cell)

    active = [[False for _ in range(cols)] for _ in range(rows)]

    for gy in range(rows):
        y0 = gy * cell
        y1 = min(h, y0 + cell)

        for gx in range(cols):
            x0 = gx * cell
            x1 = min(w, x0 + cell)

            area = max(1, (x1 - x0) * (y1 - y0))
            count = 0

            for yy in range(y0, y1):
                for xx in range(x0, x1):
                    if px[xx, yy] >= 128:
                        count += 1

            density = count / area
            if density >= density_thresh:
                active[gy][gx] = True

    # Dilate on grid to connect sparse chart elements.
    for _ in range(max(0, dilate_iter)):
        nxt = [row[:] for row in active]
        for gy in range(rows):
            for gx in range(cols):
                if not active[gy][gx]:
                    continue

                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        ny = gy + dy
                        nx = gx + dx
                        if 0 <= ny < rows and 0 <= nx < cols:
                            nxt[ny][nx] = True
        active = nxt

    # Connected components on active grid.
    seen = [[False for _ in range(cols)] for _ in range(rows)]
    boxes: list[list[int]] = []

    for gy0 in range(rows):
        for gx0 in range(cols):
            if seen[gy0][gx0] or not active[gy0][gx0]:
                seen[gy0][gx0] = True
                continue

            q = deque([(gx0, gy0)])
            seen[gy0][gx0] = True

            min_gx = max_gx = gx0
            min_gy = max_gy = gy0

            while q:
                gx, gy = q.popleft()

                min_gx = min(min_gx, gx)
                max_gx = max(max_gx, gx)
                min_gy = min(min_gy, gy)
                max_gy = max(max_gy, gy)

                for nx, ny in ((gx + 1, gy), (gx - 1, gy), (gx, gy + 1), (gx, gy - 1)):
                    if nx < 0 or ny < 0 or nx >= cols or ny >= rows:
                        continue
                    if seen[ny][nx]:
                        continue
                    seen[ny][nx] = True
                    if active[ny][nx]:
                        q.append((nx, ny))

            x0 = min_gx * cell
            y0 = min_gy * cell
            x1 = min(w, (max_gx + 1) * cell)
            y1 = min(h, (max_gy + 1) * cell)

            boxes.append([x0, y0, x1 - x0, y1 - y0])

    return boxes


def is_reasonable_chart_box(box: list[int], img_w: int, img_h: int) -> bool:
    x, y, bw, bh = box

    if bw < img_w * 0.12 or bh < img_h * 0.10:
        return False

    area_ratio = box_area(box) / max(1, img_w * img_h)

    if area_ratio < 0.025:
        return False

    # Avoid full-slide / broad fallback behavior.
    if area_ratio > 0.38:
        return False

    # Avoid header-only detections.
    if y < img_h * 0.17:
        return False

    # Avoid footer.
    if y + bh > img_h * 0.90:
        return False

    return True


def merge_visual_candidate_boxes(boxes: list[list[int]], gap: int) -> list[list[int]]:
    """
    Merge near chart boxes without collapsing the whole slide.
    """
    if not boxes:
        return []

    return merge_boxes(boxes, gap=gap)





def intersect_boxes(a: list[int], b: list[int]) -> list[int] | None:
    ax, ay, aw, ah = a
    bx, by, bw, bh = b

    x0 = max(ax, bx)
    y0 = max(ay, by)
    x1 = min(ax + aw, bx + bw)
    y1 = min(ay + ah, by + bh)

    if x1 <= x0 or y1 <= y0:
        return None

    return [x0, y0, x1 - x0, y1 - y0]


def is_reasonable_chart_density_box(box: list[int], img_w: int, img_h: int) -> bool:
    """
    Validation for chart_density_grid boxes.

    This is looser than is_reasonable_chart_box because histogram / horizontal-bar
    charts can become large connected regions after grid dilation.

    Still rejects:
      - tiny fragments
      - header-only regions
      - footer-overlapping regions
      - almost full-slide broad fallback
    """
    x, y, bw, bh = box

    if bw < img_w * 0.18 or bh < img_h * 0.16:
        return False

    area_ratio = box_area(box) / max(1, img_w * img_h)

    if area_ratio < 0.045:
        return False

    # Allow large chart regions, but not whole slide / arbitrary content band.
    if area_ratio > 0.58:
        return False

    if y < img_h * 0.17:
        return False

    if y + bh > img_h * 0.90:
        return False

    return True

def detect_chart_density_visual_candidates(
    slide_id: str,
    img: Image.Image,
    text_blocks: list[dict[str, Any]],
    existing_visuals: list[dict[str, Any]],
    rejected_visuals: list[dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    """
    Detect chart panel regions.

    v4 policy:
      - Do NOT use broad content fallback.
      - Do NOT predefine no-read zones.
      - Use text-negative ink density.
      - Use small grid cells and no dilation, so chart panels remain separable.
      - Only run on fragment-heavy chart/analysis slides.
      - If foreground_component already found a visual, preserve it and skip this path.
    """
    img_w, img_h = img.size

    # Preserve successful foreground-component detections such as slide_005.
    if existing_visuals:
        return []

    rejected_visuals = rejected_visuals or []

    # Gate this path so slide_001〜003 card/layout slides do not become visuals.
    if len(rejected_visuals) < 24:
        return []

    bg = sample_background_color(img)
    text_mask = build_text_mask((img_w, img_h), text_blocks, pad=5)
    ink_mask = build_ink_mask(img, bg, diff_thresh=16.0, edge_thresh=18)

    non_text_mask = ImageChops.invert(text_mask)
    signal = ImageChops.multiply(ink_mask, non_text_mask)

    # Parameters confirmed by diagnostic:
    # slide_006 -> 4 chart panels
    # slide_007 -> 2 stacked boxes, later merged into 1 chart panel
    raw_boxes = density_grid_components(
        signal,
        cell=20,
        density_thresh=0.045,
        dilate_iter=0,
    )

    def is_chart_panel_box(box: list[int]) -> bool:
        x, y, bw, bh = box
        area_ratio = box_area(box) / max(1, img_w * img_h)

        if bw < img_w * 0.14:
            return False
        if bh < img_h * 0.12:
            return False
        if area_ratio < 0.025:
            return False
        if area_ratio > 0.24:
            return False

        # Avoid tiny top-left artifacts, but do not define no-read zones.
        if y < img_h * 0.14 and bh < img_h * 0.20:
            return False

        return True

    panel_boxes: list[list[int]] = []

    for raw_box in raw_boxes:
        expanded = expand_box(raw_box, pad=8, w=img_w, h=img_h)
        if is_chart_panel_box(expanded):
            panel_boxes.append(expanded)

    # Stable ordering: top-to-bottom, left-to-right.
    panel_boxes = sorted(panel_boxes, key=lambda b: (b[1], b[0]))

    def horizontal_overlap_ratio(a: list[int], b: list[int]) -> float:
        ax, ay, aw, ah = a
        bx, by, bw, bh = b
        x0 = max(ax, bx)
        x1 = min(ax + aw, bx + bw)
        overlap = max(0, x1 - x0)
        return overlap / max(1, min(aw, bw))

    def vertical_gap(a: list[int], b: list[int]) -> int:
        ax, ay, aw, ah = a
        bx, by, bw, bh = b
        if ay <= by:
            return by - (ay + ah)
        return ay - (by + bh)

    def union_box(a: list[int], b: list[int]) -> list[int]:
        ax, ay, aw, ah = a
        bx, by, bw, bh = b
        x0 = min(ax, bx)
        y0 = min(ay, by)
        x1 = max(ax + aw, bx + bw)
        y1 = max(ay + ah, by + bh)
        return [x0, y0, x1 - x0, y1 - y0]

    # slide_007 pattern:
    # The horizontal bar chart may appear as 2 vertically stacked density boxes:
    #   upper: bars + callouts
    #   lower: axis / footnote / tail
    # Merge only when there are exactly two boxes with strong horizontal overlap.
    if len(panel_boxes) == 2:
        a, b = panel_boxes
        if horizontal_overlap_ratio(a, b) >= 0.55 and vertical_gap(a, b) <= img_h * 0.06:
            merged = union_box(a, b)
            area_ratio = box_area(merged) / max(1, img_w * img_h)
            if 0.06 <= area_ratio <= 0.36:
                panel_boxes = [merged]

    # De-duplicate near-identical boxes.
    final_boxes: list[list[int]] = []
    for box in panel_boxes:
        duplicate = False
        for existing in final_boxes:
            if iou(box, existing) > 0.65:
                duplicate = True
                break
        if not duplicate:
            final_boxes.append(box)

    candidates: list[dict[str, Any]] = []

    for idx, box in enumerate(final_boxes, start=1):
        candidates.append({
            "candidate_id": f"{slide_id}_visual_candidate_chart_panel_{idx:03d}",
            "type": "visual_asset_candidate",
            "subtype": "chart_panel",
            "status": "pending",
            "bbox_px": box,
            "raw_bbox_px": box,
            "source": "chart_panel_density_grid",
            "score": 0.68,
            "reason": "chart_panel_density_grid_non_text_ink",
            "bbox_refinement": "chart_panel_grid_density_v1",
            "text_overlap_allowed": True,
            "chart_density": True,
            "chart_panel": True,
            "rejected_visual_count": len(rejected_visuals),
        })

    return candidates


def detect_visual_asset_candidates(
    slide_id: str,
    img: Image.Image,
    text_blocks: list[dict[str, Any]],
    threshold: float,
    include_rejected: bool,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    img_w, img_h = img.size
    bg = sample_background_color(img)
    mask = make_foreground_mask(img, bg, threshold=threshold)
    comps = connected_components(mask)

    boxes: list[list[int]] = []
    for x, y, bw, bh, area in comps:
        box = [x, y, bw, bh]
        if area < 24:
            continue
        boxes.append(box)

    # Merge only close foreground fragments.
    merged = merge_boxes(boxes, gap=max(8, img_w // 180))

    candidates: list[dict[str, Any]] = []
    rejected: list[dict[str, Any]] = []

    idx = 1
    rej_idx = 1

    for raw_box in merged:
        box = expand_box(raw_box, pad=4, w=img_w, h=img_h)
        x, y, bw, bh = box
        area_ratio = box_area(box) / max(1, img_w * img_h)

        reject_reason = None
        reject_meta: dict[str, Any] = {}

        if bw < img_w * 0.06 or bh < img_h * 0.045:
            reject_reason = "too_small"
        elif area_ratio > 0.55:
            reject_reason = "too_large_or_background"
        elif is_text_like_geometry(box, img_w, img_h):
            reject_reason = "text_like_geometry"
        else:
            overlaps, block, ratio = has_strong_text_overlap(box, text_blocks)
            if overlaps:
                reject_reason = "overlaps_text_block"
                reject_meta = {
                    "overlap_ratio": round(ratio, 3),
                    "text_block_id": block.get("id") if block else None,
                    "text": (block.get("text") if block else "")[:60],
                }

        if reject_reason:
            item = {
                "candidate_id": f"{slide_id}_rejected_visual_{rej_idx:03d}",
                "type": "visual_asset_candidate",
                "status": "rejected",
                "bbox_px": box,
                "source": "foreground_component",
                "reject_reason": reject_reason,
                **reject_meta,
            }
            rejected.append(item)
            rej_idx += 1
            continue

        variance = color_variance_score(img, box)

        # Very flat strips are often separators or text fragments.
        if variance < 5.0 and bh < img_h * 0.14:
            item = {
                "candidate_id": f"{slide_id}_rejected_visual_{rej_idx:03d}",
                "type": "visual_asset_candidate",
                "status": "rejected",
                "bbox_px": box,
                "source": "foreground_component",
                "reject_reason": "low_variance_flat_shape",
                "variance": round(variance, 2),
            }
            rejected.append(item)
            rej_idx += 1
            continue

        export_box = expand_visual_box_for_export(box, img_w, img_h)

        candidates.append({
            "candidate_id": f"{slide_id}_visual_candidate_{idx:03d}",
            "type": "visual_asset_candidate",
            "status": "pending",
            "bbox_px": export_box,
            "raw_bbox_px": box,
            "source": "foreground_component",
            "score": round(min(1.0, 0.35 + variance / 80.0), 3),
            "variance": round(variance, 2),
            "reason": "foreground_component_non_text",
            "bbox_refinement": "expanded_for_export",
        })
        idx += 1

    chart_candidates = detect_chart_density_visual_candidates(
        slide_id=slide_id,
        img=img,
        text_blocks=text_blocks,
        existing_visuals=candidates,
        rejected_visuals=rejected,
    )

    candidates = candidates + chart_candidates

    if include_rejected:
        return candidates, rejected

    return candidates, []




def detect_layout_fallback_visual_candidates(
    slide_id: str,
    img: Image.Image,
    text_blocks: list[dict[str, Any]],
    existing_visuals: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Fallback visual detection for chart-heavy / analysis slides.

    Important policy:
      - If normal visual detection already found something, do nothing.
      - Do NOT carve the fallback area by text_block_candidate-like regions.
      - Do NOT avoid the right-side explanation area.
      - Overlap with text clusters, chart labels, callouts, and explanation text is allowed.
      - Purpose is to recover one broad PPTX-exportable visual region when
        foreground-component detection fails.

    This is intentionally broad and conservative.
    """
    if existing_visuals:
        return []

    img_w, img_h = img.size

    usable_blocks = [
        b for b in text_blocks
        if b.get("bbox_px") and not is_page_edge_text(b, img_w, img_h)
    ]

    # Need enough structure to justify a content-band fallback.
    if len(usable_blocks) < 8:
        return []

    # Signal 1: there is a mid/lower content zone.
    mid_lower_blocks = []
    for b in usable_blocks:
        x, y, bw, bh = b["bbox_px"]
        cy = y + bh / 2
        if cy >= img_h * 0.22 and cy <= img_h * 0.84:
            mid_lower_blocks.append(b)

    if len(mid_lower_blocks) < 5:
        return []

    # Signal 2: chart/analysis pages often have a right-side explanation cluster,
    # but we only use it as a signal, NOT as an exclusion boundary.
    right_note_blocks = []
    for b in usable_blocks:
        x, y, bw, bh = b["bbox_px"]
        if x >= img_w * 0.60 and y >= img_h * 0.18 and y <= img_h * 0.82:
            right_note_blocks.append(b)

    # Keep this permissive; if not present, we can still continue as long as
    # the content band variance suggests a non-trivial visual area.
    right_note_count = len(right_note_blocks)

    # Broad content band:
    # - starts below header/title area
    # - ends above footer area
    # - spans almost the full content width
    x0 = int(img_w * 0.045)
    y0 = int(img_h * 0.185)
    x1 = int(img_w * 0.965)
    y1 = int(img_h * 0.845)

    # Slightly adapt the top edge if we can infer first body content.
    body_candidate_ys = []
    for b in usable_blocks:
        x, y, bw, bh = b["bbox_px"]
        if y >= img_h * 0.16 and y <= img_h * 0.40:
            body_candidate_ys.append(y)

    if body_candidate_ys:
        inferred_top = min(body_candidate_ys) - int(img_h * 0.03)
        y0 = max(int(img_h * 0.16), min(int(img_h * 0.24), inferred_top))

    # Clamp
    x0 = max(0, min(img_w - 1, x0))
    y0 = max(0, min(img_h - 1, y0))
    x1 = max(x0 + 1, min(img_w, x1))
    y1 = max(y0 + 1, min(img_h, y1))

    box = [x0, y0, x1 - x0, y1 - y0]

    area_ratio = box_area(box) / max(1, img_w * img_h)

    # Broad fallback should be neither too tiny nor absurdly huge.
    if area_ratio < 0.18 or area_ratio > 0.72:
        return []

    variance = color_variance_score(img, box)

    # Low-contrast analysis slides exist, so keep threshold permissive.
    if variance < 0.8:
        return []

    # If there is no right note cluster at all, require a bit more variance
    # so we don't create broad fallbacks on purely text/card slides.
    if right_note_count == 0 and variance < 2.2:
        return []

    return [{
        "candidate_id": f"{slide_id}_visual_candidate_fallback_001",
        "type": "visual_asset_candidate",
        "status": "pending",
        "bbox_px": box,
        "raw_bbox_px": box,
        "source": "layout_fallback_content_band",
        "score": 0.60 if right_note_count == 0 else 0.66,
        "variance": round(variance, 2),
        "reason": "layout_fallback_content_band",
        "bbox_refinement": "broad_content_band_allows_overlap",
        "fallback": True,
        "right_note_block_count": right_note_count,
        "overlap_policy": "text_block_overlap_allowed",
    }]




def detect_force_content_band_visual_candidate(
    slide_id: str,
    img: Image.Image,
    text_blocks: list[dict[str, Any]],
    rejected_visuals: list[dict[str, Any]],
    existing_visuals: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Strong fallback for chart-heavy slides.

    Trigger:
      - normal visual detection found nothing
      - many foreground components were rejected
      - enough text structure exists

    Rationale:
      Low-contrast charts can fail foreground-component detection.
      rejected_visual_count is a better signal than color variance for these pages.
    """
    if existing_visuals:
        return []

    img_w, img_h = img.size

    usable_blocks = [
        b for b in text_blocks
        if b.get("bbox_px") and not is_page_edge_text(b, img_w, img_h)
    ]

    if len(usable_blocks) < 8:
        return []

    rejected_count = len(rejected_visuals)

    # This intentionally targets complex analysis/chart pages.
    # Existing observed values:
    # - slide_006: rejected 29
    # - slide_007: rejected 34
    # Earlier text-heavy pages are lower.
    if rejected_count < 24:
        return []

    # Broad content band, allowing overlap with text clusters.
    x0 = int(img_w * 0.045)
    y0 = int(img_h * 0.205)
    x1 = int(img_w * 0.965)
    y1 = int(img_h * 0.845)

    # If there are many mid-body blocks, start slightly above them.
    mid_ys = []
    for b in usable_blocks:
        x, y, bw, bh = b["bbox_px"]
        if img_h * 0.18 <= y <= img_h * 0.45:
            mid_ys.append(y)

    if mid_ys:
        y0 = max(int(img_h * 0.18), min(y0, min(mid_ys) - int(img_h * 0.025)))

    # Clamp.
    x0 = max(0, min(img_w - 1, x0))
    y0 = max(0, min(img_h - 1, y0))
    x1 = max(x0 + 1, min(img_w, x1))
    y1 = max(y0 + 1, min(img_h, y1))

    box = [x0, y0, x1 - x0, y1 - y0]
    area_ratio = box_area(box) / max(1, img_w * img_h)

    if area_ratio < 0.18 or area_ratio > 0.76:
        return []

    return [{
        "candidate_id": f"{slide_id}_visual_candidate_force_fallback_001",
        "type": "visual_asset_candidate",
        "status": "pending",
        "bbox_px": box,
        "raw_bbox_px": box,
        "source": "force_fallback_content_band",
        "score": 0.58,
        "variance": None,
        "reason": "force_fallback_from_rejected_visual_signal",
        "bbox_refinement": "broad_content_band_allows_overlap",
        "fallback": True,
        "force_fallback": True,
        "rejected_visual_count": rejected_count,
        "overlap_policy": "text_block_overlap_allowed",
    }]


def dedupe_candidates(candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Remove near-duplicate candidates within the same candidate type only.

    Important:
      text_block_candidate and visual_asset_candidate are different layers.
      They are allowed to overlap.

    Rationale:
      - text_block_candidate is a text/layout cluster guide.
      - visual_asset_candidate is a chart/photo/figure crop guide.
      - In analytical slides, chart labels and explanatory text often overlap
        the visual region, so cross-type dedupe incorrectly removes visuals.
    """
    result: list[dict[str, Any]] = []

    for item in candidates:
        box = item.get("bbox_px")
        item_type = item.get("type")
        if not box:
            continue

        duplicate = False

        for existing in result:
            existing_type = existing.get("type")

            # Never dedupe across candidate types.
            if existing_type != item_type:
                continue

            eb = existing.get("bbox_px")
            if not eb:
                continue

            if iou(box, eb) > 0.72:
                duplicate = True
                break

        if not duplicate:
            result.append(item)

    # Re-number by type for stable IDs.
    counts: dict[str, int] = {}
    for item in result:
        t = item.get("type") or "candidate"
        counts[t] = counts.get(t, 0) + 1

        if t == "text_block_candidate":
            prefix = "text_block"
        elif t == "visual_asset_candidate":
            prefix = "visual"
        else:
            prefix = "candidate"

        slide_id = str(item.get("slide_id") or "").strip()
        if slide_id:
            item["candidate_id"] = f"{slide_id}_{prefix}_candidate_{counts[t]:03d}"

    return result




def ensure_post_dedupe_visual_fallback(
    slide_id: str,
    img: Image.Image,
    text_blocks: list[dict[str, Any]],
    rejected_visuals: list[dict[str, Any]],
    candidates: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Final safety net:
    If no visual_asset_candidate survived detection/dedupe, append one broad
    content-band visual candidate for complex chart/analysis slides.

    This runs AFTER dedupe, so text_block_candidate cannot remove it.
    """
    if any(c.get("type") == "visual_asset_candidate" for c in candidates):
        return candidates

    img_w, img_h = img.size

    usable_blocks = [
        b for b in text_blocks
        if b.get("bbox_px") and not is_page_edge_text(b, img_w, img_h)
    ]

    # Avoid firing on simple pages.
    if len(usable_blocks) < 8:
        return candidates

    # The current observed chart-heavy failures have many rejected components.
    # This keeps early text-only slides from getting broad visual candidates.
    if len(rejected_visuals) < 24:
        return candidates

    x0 = int(img_w * 0.045)
    y0 = int(img_h * 0.205)
    x1 = int(img_w * 0.965)
    y1 = int(img_h * 0.845)

    # Clamp
    x0 = max(0, min(img_w - 1, x0))
    y0 = max(0, min(img_h - 1, y0))
    x1 = max(x0 + 1, min(img_w, x1))
    y1 = max(y0 + 1, min(img_h, y1))

    box = [x0, y0, x1 - x0, y1 - y0]

    fallback = {
        "slide_id": slide_id,
        "candidate_id": f"{slide_id}_visual_candidate_001",
        "type": "visual_asset_candidate",
        "status": "pending",
        "bbox_px": box,
        "raw_bbox_px": box,
        "source": "post_dedupe_force_fallback_content_band",
        "score": 0.58,
        "variance": None,
        "reason": "post_dedupe_force_fallback_content_band",
        "bbox_refinement": "broad_content_band_allows_overlap",
        "fallback": True,
        "force_fallback": True,
        "post_dedupe_fallback": True,
        "rejected_visual_count": len(rejected_visuals),
        "overlap_policy": "text_block_overlap_allowed",
    }

    candidates.append(fallback)
    return candidates




def ensure_post_dedupe_visual_fallback_v2(
    slide_id: str,
    img: Image.Image,
    text_blocks: list[dict[str, Any]],
    rejected_visuals: list[dict[str, Any]],
    candidates: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Final visual fallback v2.

    Runs after dedupe and after rejected list is finalized.

    Policy:
      - text_block_candidate and visual_asset_candidate may overlap.
      - If no visual candidate exists on a complex chart/analysis slide,
        add one broad content-band visual candidate.
      - This is intentionally broad for PPTX export.
    """
    if any(c.get("type") == "visual_asset_candidate" for c in candidates):
        return candidates

    img_w, img_h = img.size

    usable_blocks = [
        b for b in text_blocks
        if b.get("bbox_px") and not is_page_edge_text(b, img_w, img_h)
    ]

    rejected_count = len(rejected_visuals)

    # Guard against simple text-only slides.
    if len(usable_blocks) < 8:
        return candidates

    # Chart-heavy failures observed around 29 / 34 rejected visual components.
    if rejected_count < 24:
        return candidates

    # Broad content band:
    # exclude only outer slide margin, not text clusters.
    x0 = int(img_w * 0.045)
    y0 = int(img_h * 0.205)
    x1 = int(img_w * 0.965)
    y1 = int(img_h * 0.845)

    x0 = max(0, min(img_w - 1, x0))
    y0 = max(0, min(img_h - 1, y0))
    x1 = max(x0 + 1, min(img_w, x1))
    y1 = max(y0 + 1, min(img_h, y1))

    box = [x0, y0, x1 - x0, y1 - y0]

    item = {
        "slide_id": slide_id,
        "candidate_id": f"{slide_id}_visual_candidate_001",
        "type": "visual_asset_candidate",
        "status": "pending",
        "bbox_px": box,
        "raw_bbox_px": box,
        "source": "post_dedupe_force_fallback_content_band_v2",
        "score": 0.58,
        "variance": None,
        "reason": "post_dedupe_force_fallback_content_band_v2",
        "bbox_refinement": "broad_content_band_allows_overlap",
        "fallback": True,
        "force_fallback": True,
        "post_dedupe_fallback": True,
        "rejected_visual_count": rejected_count,
        "usable_text_block_count": len(usable_blocks),
        "overlap_policy": "text_block_overlap_allowed",
    }

    candidates.append(item)
    return candidates


def detect_for_slide(
    slide_id: str,
    source_path: Path,
    threshold: float,
    include_rejected: bool,
) -> dict[str, Any]:
    img = Image.open(source_path).convert("RGB")
    img_w, img_h = img.size

    text_blocks = load_text_blocks(slide_id)

    text_candidates = detect_text_block_candidates(
        slide_id=slide_id,
        img_w=img_w,
        img_h=img_h,
        text_blocks=text_blocks,
    )

    visual_candidates, rejected_visual = detect_visual_asset_candidates(
        slide_id=slide_id,
        img=img,
        text_blocks=text_blocks,
        threshold=threshold,
        include_rejected=True,
    )

    all_candidates = []
    for item in text_candidates + visual_candidates:
        item["slide_id"] = slide_id
        all_candidates.append(item)

    all_candidates = dedupe_candidates(all_candidates)

    rejected = rejected_visual if include_rejected else []

    payload = {
        "slide_id": slide_id,
        "source_image": rel(source_path),
        "detected_at": datetime.now().isoformat(timespec="seconds"),
        "detector": {
            "name": "auto_detect_asset_candidates",
            "version": "dev6_2_chart_density_v1",
            "target_types": ["text_block_candidate", "visual_asset_candidate"],
            "threshold": threshold,
            "text_block_count": len(text_blocks),
            "policy": {
                "text_block_candidate": "text cluster guide",
                "visual_asset_candidate": "foreground component or chart density grid without hard no-read zones",
                "broad_content_fallback": False,
            },
        },
        "candidates": all_candidates,
        "rejected_candidates": rejected,
        "summary": {
            "candidate_count": len(all_candidates),
            "text_block_candidate_count": sum(1 for c in all_candidates if c.get("type") == "text_block_candidate"),
            "visual_asset_candidate_count": sum(1 for c in all_candidates if c.get("type") == "visual_asset_candidate"),
            "chart_density_visual_candidate_count": sum(1 for c in all_candidates if c.get("chart_density")),
            "rejected_count": len(rejected),
            "fallback_visual_candidate_count": 0,
            "force_fallback_visual_candidate_count": 0,
            "post_dedupe_fallback_visual_candidate_count": 0,
        },
    }

    return payload


def write_payload(slide_id: str, payload: dict[str, Any]) -> Path:
    JSON_SLIDES_DIR.mkdir(parents=True, exist_ok=True)
    path = JSON_SLIDES_DIR / f"{slide_id}_asset_candidates.json"
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--slides", nargs="*", help="slide ids, e.g. slide_001 slide_002")
    parser.add_argument("--threshold", type=float, default=32.0)
    parser.add_argument("--include-rejected", action="store_true")
    args = parser.parse_args()

    targets = parse_slides(args.slides)

    if not targets:
        print("[WARN] no source slides found")
        return 0

    for slide_id, source_path in targets:
        payload = detect_for_slide(
            slide_id=slide_id,
            source_path=source_path,
            threshold=args.threshold,
            include_rejected=args.include_rejected,
        )
        out_path = write_payload(slide_id, payload)
        summary = payload.get("summary", {})
        print(
            f"[OK] {slide_id}: "
            f"candidates={summary.get('candidate_count')} "
            f"cards={summary.get('text_block_candidate_count')} "
            f"visuals={summary.get('visual_asset_candidate_count')} "
            f"rejected={summary.get('rejected_count')} "
            f"-> {rel(out_path)}"
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
