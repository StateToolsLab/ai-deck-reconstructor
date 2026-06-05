from pathlib import Path
import json

BASE_DIR = Path(__file__).resolve().parents[1]

SLIDE_W_PX = 1920
SLIDE_H_PX = 1080
SLIDE_W_IN = 13.333
SLIDE_H_IN = 7.5

def load_json(path):
    with open(path, "r", encoding="utf-8-sig") as f:
        return json.load(f)

def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def bbox_points_to_rect(points):
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    x1, x2 = min(xs), max(xs)
    y1, y2 = min(ys), max(ys)
    return [x1, y1, x2 - x1, y2 - y1]

def px_to_in_rect(bbox):
    x, y, w, h = bbox
    return {
        "x": round(x / SLIDE_W_PX * SLIDE_W_IN, 3),
        "y": round(y / SLIDE_H_PX * SLIDE_H_IN, 3),
        "w": round(w / SLIDE_W_PX * SLIDE_W_IN, 3),
        "h": round(h / SLIDE_H_PX * SLIDE_H_IN, 3)
    }

def classify_sector(bbox):
    x, y, w, h = bbox
    cx = x + w / 2
    cy = y + h / 2

    if cy < SLIDE_H_PX * 0.22:
        return "header"
    if cy > SLIDE_H_PX * 0.88:
        return "footer"
    if cx < SLIDE_W_PX * 0.40:
        return "left"
    if cx > SLIDE_W_PX * 0.62:
        return "right"
    return "center"

def classify_role(block, sector, index_in_reading_order):
    text = block.get("text", "")
    bbox = block["bbox_px"]
    x, y, w, h = bbox

    if sector == "footer":
        return "note"
    if sector == "header":
        if x > SLIDE_W_PX * 0.75:
            return "logo_text"
        return "section_title"

    if len(text.strip()) <= 2 and h > 20:
        return "decoration_or_symbol"

    if h >= 55:
        return "h1" if index_in_reading_order == 0 else "h2"

    if h >= 32:
        return "h2"

    return "p"

def style_ref_for(sector, role):
    if sector == "footer":
        return "footer.note"
    if sector == "header":
        return "left.p"
    if role in ["h1", "h2", "p"]:
        return f"left.{role}"
    if role == "logo_text":
        return "left.p"
    return "left.p"

def main():
    slide_id = "slide_001"
    raw_path = BASE_DIR / "json" / "ocr" / slide_id / f"{slide_id}.json"
    out_dir = BASE_DIR / "json" / "text_blocks"
    out_dir.mkdir(parents=True, exist_ok=True)

    raw = load_json(raw_path)

    raw_blocks = []
    for group in raw.get("contents", []):
        raw_blocks.extend(group)

    prepared = []
    for b in raw_blocks:
        bbox = bbox_points_to_rect(b["boundingBox"])
        prepared.append({
            "raw_id": b.get("id"),
            "text": b.get("text", ""),
            "confidence": b.get("confidence"),
            "bbox_px": bbox
        })

    prepared.sort(key=lambda b: (b["bbox_px"][1], b["bbox_px"][0]))

    text_blocks = []
    significant_index = 0

    for i, b in enumerate(prepared):
        sector = classify_sector(b["bbox_px"])
        role = classify_role(b, sector, significant_index)

        if role not in ["decoration_or_symbol", "note", "logo_text"]:
            significant_index += 1

        placement = px_to_in_rect(b["bbox_px"])

        block_id = f"{slide_id}_text_{i+1:03d}"

        text_blocks.append({
            "block_id": block_id,
            "kind": "text",
            "source": "ndlocr-lite",
            "ocr_id": b["raw_id"],
            "ocr_text": b["text"],
            "display_text": b["text"],
            "text_mode": "ocr",
            "confidence": b["confidence"],
            "sector": sector,
            "semantic_role": role,
            "style_ref": style_ref_for(sector, role),
            "bbox_px": b["bbox_px"],
            "placement_in": placement,
            "confirmed": False
        })

    result = {
        "slide_id": slide_id,
        "source_ocr": str(raw_path.relative_to(BASE_DIR)).replace("\\", "/"),
        "text_blocks": text_blocks
    }

    out_path = out_dir / f"{slide_id}_text_blocks.json"
    save_json(out_path, result)

    print(f"saved: {out_path}")
    print(f"text blocks: {len(text_blocks)}")

if __name__ == "__main__":
    main()
