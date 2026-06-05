import argparse
import subprocess
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
APPLY_SCRIPT = PROJECT_ROOT / "scripts" / "apply_text_blocks_to_rebuild_spec.py"


def run_for_slide(slide_id, mode, scope, min_confidence):
    print("")
    print(f"=== apply {slide_id} ===")

    cmd = [
        sys.executable,
        str(APPLY_SCRIPT),
        "--slide",
        slide_id,
        "--mode",
        mode,
        "--scope",
        scope,
    ]

    if min_confidence is not None:
        cmd += ["--min-confidence", str(min_confidence)]

    result = subprocess.run(
        cmd,
        cwd=str(PROJECT_ROOT),
        text=True,
        capture_output=True
    )

    if result.stdout:
        print(result.stdout)

    if result.returncode != 0:
        if result.stderr:
            print(result.stderr)
        raise RuntimeError(f"apply failed for {slide_id}: {result.returncode}")

    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--slides", nargs="*", default=[
        "slide_001", "slide_002", "slide_003",
        "slide_004", "slide_005", "slide_006"
    ])
    parser.add_argument("--mode", default="working")
    parser.add_argument("--scope", default="standard")
    parser.add_argument("--min-confidence", type=float, default=None)
    args = parser.parse_args()

    if not APPLY_SCRIPT.exists():
        raise FileNotFoundError(f"apply script not found: {APPLY_SCRIPT}")

    print("[INFO] Deck apply text_blocks start")
    print(f"slides: {args.slides}")
    print(f"mode  : {args.mode}")
    print(f"scope : {args.scope}")

    for slide_id in args.slides:
        run_for_slide(
            slide_id=slide_id,
            mode=args.mode,
            scope=args.scope,
            min_confidence=args.min_confidence
        )

    print("")
    print("[DONE] applied text_blocks to deck")


if __name__ == "__main__":
    main()
