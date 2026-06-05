from pathlib import Path
import json
from PIL import Image

BASE_DIR = Path(__file__).resolve().parents[1]
SOURCE_DIR = BASE_DIR / "source"
JSON_DIR = BASE_DIR / "json"

DECK_ID = "sapporo_slide_poc_260428"
SLIDE_ORDER_PATH = JSON_DIR / "slide_order.json"


def load_slide_order() -> list[str]:
    if not SLIDE_ORDER_PATH.exists():
        return []

    try:
        with SLIDE_ORDER_PATH.open("r", encoding="utf-8-sig") as f:
            data = json.load(f)
    except Exception:
        return []

    if isinstance(data, dict):
        order = data.get("slide_ids", [])
    elif isinstance(data, list):
        order = data
    else:
        order = []

    return [slide_id for slide_id in order if isinstance(slide_id, str)]


def order_source_files(files: list[Path]) -> list[Path]:
    file_by_slide_id = {
        path.stem: path
        for path in files
        if path.stem.startswith("slide_")
    }

    ordered: list[Path] = []
    for slide_id in load_slide_order():
        path = file_by_slide_id.pop(slide_id, None)
        if path is not None:
            ordered.append(path)

    ordered.extend(
        path
        for _, path in sorted(file_by_slide_id.items())
    )

    return ordered


def main():
    JSON_DIR.mkdir(parents=True, exist_ok=True)

    slides = []

    files = order_source_files(sorted(SOURCE_DIR.glob("slide_*.png")))

    for idx, path in enumerate(files, start=1):
        # Preserve the slide_id from the source filename.
        # This keeps processing stable even when slide numbers have gaps
        # such as slide_002.png, slide_003.png, slide_004.png.
        slide_id = path.stem

        with Image.open(path) as img:
            width, height = img.size

        slides.append({
            "slide_id": slide_id,
            "slide_number": idx,
            "source_image": f"source/{path.name}",
            "width_px": width,
            "height_px": height,
            "assets_dir": f"assets/{slide_id}",
            "extraction_plan": f"json/slides/{slide_id}_extraction_plan.json",
            "rebuild_spec": f"json/slides/{slide_id}_rebuild_spec.json"
        })

    manifest = {
        "deck_id": DECK_ID,
        "source_type": "image_sequence",
        "slide_count": len(slides),
        "canvas_px": {
            "width": 1920,
            "height": 1080,
            "aspect_ratio": "16:9"
        },
        "slides": slides
    }

    out_path = JSON_DIR / "deck_manifest.json"

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"deck_manifest.json を生成しました: {out_path}")
    print(f"スライド数: {len(slides)}")

if __name__ == "__main__":
    main()
