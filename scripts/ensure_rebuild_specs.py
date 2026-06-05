from pathlib import Path
import json

BASE_DIR = Path(__file__).resolve().parents[1]
MANIFEST_PATH = BASE_DIR / "json" / "deck_manifest.json"

SLIDE_W_IN = 13.333
SLIDE_H_IN = 7.5

def load_json(path):
    with open(path, "r", encoding="utf-8-sig") as f:
        return json.load(f)

def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def main():
    manifest = load_json(MANIFEST_PATH)

    for slide in manifest["slides"]:
        slide_id = slide["slide_id"]
        spec_path = BASE_DIR / slide["rebuild_spec"]

        if spec_path.exists():
            spec = load_json(spec_path)
        else:
            spec = {"slide_id": slide_id, "elements": []}

        spec["slide_id"] = slide_id

        spec["canvas"] = {
            "width_in": SLIDE_W_IN,
            "height_in": SLIDE_H_IN
        }

        if "background_treatment" not in spec:
            spec["background_treatment"] = {
                "mode": "fade_image",
                "background_opacity": 0.50
            }

        elements = spec.get("elements", [])

        has_reference_bg = any(
            el.get("kind") == "image" and el.get("name") == "reference_bg"
            for el in elements
        )

        if not has_reference_bg:
            elements.insert(0, {
                "kind": "image",
                "name": "reference_bg",
                "path": slide["source_image"],
                "x": 0,
                "y": 0,
                "w": SLIDE_W_IN,
                "h": SLIDE_H_IN
            })

        spec["elements"] = elements
        save_json(spec_path, spec)

        print(f"updated: {spec_path}")

    print("rebuild_spec 初期整備完了")

if __name__ == "__main__":
    main()
