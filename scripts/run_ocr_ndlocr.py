from pathlib import Path
import json
import subprocess
import shutil
import sys
import os

BASE_DIR = Path(__file__).resolve().parents[1]

CONFIG_PATH = BASE_DIR / "json" / "ocr_engine_config.json"
SOURCE_DIR = BASE_DIR / "source"
OCR_OUT_DIR = BASE_DIR / "json" / "ocr"

def load_json(path):
    with open(path, "r", encoding="utf-8-sig") as f:
        return json.load(f)

def main():
    slide_id = "slide_001"
    source_img = SOURCE_DIR / f"{slide_id}.png"
    output_dir = OCR_OUT_DIR / slide_id
    output_dir.mkdir(parents=True, exist_ok=True)

    config = load_json(CONFIG_PATH)
    engine_name = config["ocr_engine"]["name"]

    cli_path = shutil.which(engine_name)
    if cli_path is None:
        candidate_paths = [
            Path(sys.executable).parent / engine_name,
            Path(sys.prefix) / "bin" / engine_name,
        ]

        virtual_env = os.environ.get("VIRTUAL_ENV")
        if virtual_env:
            candidate_paths.append(Path(virtual_env) / "bin" / engine_name)

        for candidate_path in candidate_paths:
            if candidate_path.exists():
                cli_path = str(candidate_path)
                break

    if cli_path is None:
        raise RuntimeError(f"OCR CLI not found: {engine_name}")

    cmd = [
        cli_path,
        "--sourceimg", str(source_img),
        "--output", str(output_dir),
        "--device", "cpu"
    ]

    print("Running OCR:")
    print(" ".join(cmd))

    result = subprocess.run(
        cmd,
        cwd=str(BASE_DIR),
        text=True,
        capture_output=True
    )

    print("STDOUT:")
    print(result.stdout)

    print("STDERR:")
    print(result.stderr)

    if result.returncode != 0:
        raise RuntimeError(f"OCR failed with return code {result.returncode}")

    print(f"OCR output dir: {output_dir}")

if __name__ == "__main__":
    main()
