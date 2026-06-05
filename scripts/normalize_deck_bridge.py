import argparse
import subprocess
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]

NORMALIZE_SCRIPT = PROJECT_ROOT / "scripts" / "normalize_ndlocr_to_text_blocks.py"
GENERATED_DIR = PROJECT_ROOT / "scripts"


def patch_normalizer_for_slide(base_text, slide_id):
    text = base_text

    # normalize_ndlocr_to_text_blocks.py が slide_001 固定前提なので、
    # スライドIDだけを差し替えた一時runnerを scripts 直下に作る。
    text = text.replace("slide_001", slide_id)

    return text


def run_for_slide(slide_id, base_text):
    ocr_json = PROJECT_ROOT / "json" / "ocr" / slide_id / f"{slide_id}.json"

    if not ocr_json.exists():
        print(f"[SKIP] OCR JSON not found: {ocr_json}")
        return False

    runner_path = GENERATED_DIR / f"_normalize_ndlocr_to_text_blocks_{slide_id}.py"
    runner_text = patch_normalizer_for_slide(base_text, slide_id)
    runner_path.write_text(runner_text, encoding="utf-8")

    print("")
    print(f"=== normalize {slide_id} ===")
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
        raise RuntimeError(f"normalize failed for {slide_id}: {result.returncode}")

    out_path = PROJECT_ROOT / "json" / "text_blocks" / f"{slide_id}_text_blocks.json"

    if not out_path.exists():
        raise FileNotFoundError(f"text_blocks was not created: {out_path}")

    print(f"[OK] text_blocks created: {out_path}")
    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--slides", nargs="*", default=[
        "slide_002", "slide_003", "slide_004", "slide_005", "slide_006"
    ])
    args = parser.parse_args()

    if not NORMALIZE_SCRIPT.exists():
        raise FileNotFoundError(f"normalizer not found: {NORMALIZE_SCRIPT}")

    base_text = NORMALIZE_SCRIPT.read_text(encoding="utf-8-sig")

    print("[INFO] Deck normalize runner mode start")
    print(f"slides: {args.slides}")

    for slide_id in args.slides:
        run_for_slide(slide_id, base_text)

    print("")
    print("[DONE] deck normalize completed")


if __name__ == "__main__":
    main()
