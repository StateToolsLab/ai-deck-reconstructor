from pathlib import Path
import json

BASE_DIR = Path(__file__).resolve().parents[1]

MANIFEST_PATH = BASE_DIR / "json" / "deck_manifest.json"
ASSETS_DIR = BASE_DIR / "assets"
SLIDES_JSON_DIR = BASE_DIR / "json" / "slides"

def main():
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    SLIDES_JSON_DIR.mkdir(parents=True, exist_ok=True)

    for slide in manifest["slides"]:
        slide_id = slide["slide_id"]

        slide_assets_dir = ASSETS_DIR / slide_id
        slide_assets_dir.mkdir(parents=True, exist_ok=True)

        extraction_plan = {
            "slide_id": slide_id,
            "source_image": slide["source_image"],
            "output_dir": slide["assets_dir"],
            "assets": []
        }

        extraction_path = BASE_DIR / slide["extraction_plan"]
        extraction_path.parent.mkdir(parents=True, exist_ok=True)

        with open(extraction_path, "w", encoding="utf-8") as f:
            json.dump(extraction_plan, f, ensure_ascii=False, indent=2)

        rebuild_spec = {
            "slide_id": slide_id,
            "canvas": {
                "width_px": slide["width_px"],
                "height_px": slide["height_px"],
                "aspect_ratio": "16:9"
            },
            "elements": []
        }

        rebuild_path = BASE_DIR / slide["rebuild_spec"]

        with open(rebuild_path, "w", encoding="utf-8") as f:
            json.dump(rebuild_spec, f, ensure_ascii=False, indent=2)

        print(f"{slide_id}: assets folder / extraction_plan / rebuild_spec を作成")

    print("初期化完了")

if __name__ == "__main__":
    main()
