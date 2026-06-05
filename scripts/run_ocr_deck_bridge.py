import argparse
import json
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]

RUN_OCR_SCRIPT = PROJECT_ROOT / "scripts" / "run_ocr_ndlocr.py"
BASE_CONFIG_PATH = PROJECT_ROOT / "json" / "ocr_engine_config.json"
GENERATED_CONFIG_DIR = PROJECT_ROOT / "json" / "ocr_engine_configs"
GENERATED_RUNNER_DIR = PROJECT_ROOT / "scripts"


def load_json(path):
    with path.open("r", encoding="utf-8-sig") as f:
        return json.load(f)


def save_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def replace_slide_id(obj, slide_id):
    if isinstance(obj, dict):
        return {k: replace_slide_id(v, slide_id) for k, v in obj.items()}

    if isinstance(obj, list):
        return [replace_slide_id(v, slide_id) for v in obj]

    if isinstance(obj, str):
        return obj.replace("slide_001", slide_id)

    return obj


def make_config_for_slide(slide_id):
    base_config = load_json(BASE_CONFIG_PATH)
    config = replace_slide_id(base_config, slide_id)

    config_path = GENERATED_CONFIG_DIR / f"ocr_engine_config_{slide_id}.json"
    save_json(config_path, config)

    return config_path


def patch_runner_for_slide(base_text, slide_id, config_path):
    text = base_text

    # CONFIG_PATH をスライド別configへ固定
    config_literal = str(config_path)

    text = re.sub(
        r'CONFIG_PATH\s*=\s*.*?ocr_engine_config\.json.*?\n',
        lambda m: f'CONFIG_PATH = Path(r"{config_literal}")\n',
        text
    )

    # 念のため、script内にslide_001直書きがあれば置換
    replacements = {
        "slide_001": slide_id,
        "slide_001.png": f"{slide_id}.png",
        "slide_001.json": f"{slide_id}.json",
        "slide_001.txt": f"{slide_id}.txt",
        "slide_001.xml": f"{slide_id}.xml",
    }

    for old, new in replacements.items():
        text = text.replace(old, new)

    return text


def run_for_slide(slide_id, base_text):
    source_path = PROJECT_ROOT / "source" / f"{slide_id}.png"

    if not source_path.exists():
        print(f"[SKIP] source not found: {source_path}")
        return False

    config_path = make_config_for_slide(slide_id)

    GENERATED_RUNNER_DIR.mkdir(parents=True, exist_ok=True)
    runner_path = GENERATED_RUNNER_DIR / f"_run_ocr_ndlocr_{slide_id}.py"

    runner_text = patch_runner_for_slide(base_text, slide_id, config_path)
    runner_path.write_text(runner_text, encoding="utf-8")

    print("")
    print(f"=== OCR {slide_id} ===")
    print(f"config: {config_path}")
    print(f"runner: {runner_path}")

    result = subprocess.run(
        [sys.executable, str(runner_path)],
        cwd=str(PROJECT_ROOT),
        text=True,
        capture_output=True
    )

    if result.stdout:
        print(result.stdout)

    if result.returncode != 0:
        if result.stderr:
            print(result.stderr)
        raise RuntimeError(f"OCR failed for {slide_id}: {result.returncode}")

    output_dir = PROJECT_ROOT / "json" / "ocr" / slide_id

    if not output_dir.exists():
        raise FileNotFoundError(f"OCR output dir was not created: {output_dir}")

    print(f"[OK] OCR completed: json/ocr/{slide_id}")
    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--slides", nargs="*", default=[
        "slide_001", "slide_002", "slide_003",
        "slide_004", "slide_005", "slide_006"
    ])
    args = parser.parse_args()

    if not RUN_OCR_SCRIPT.exists():
        raise FileNotFoundError(f"OCR script not found: {RUN_OCR_SCRIPT}")

    if not BASE_CONFIG_PATH.exists():
        raise FileNotFoundError(f"OCR config not found: {BASE_CONFIG_PATH}")

    base_text = RUN_OCR_SCRIPT.read_text(encoding="utf-8-sig")

    print("[INFO] Deck OCR config-copy mode start")
    print(f"slides: {args.slides}")

    for slide_id in args.slides:
        run_for_slide(slide_id, base_text)

    print("")
    print("[DONE] deck OCR completed")


if __name__ == "__main__":
    main()
