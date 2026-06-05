from pathlib import Path
from PIL import Image

BASE_DIR = Path(__file__).resolve().parents[1]

RAW_DIR = BASE_DIR / "source_raw"
OUT_DIR = BASE_DIR / "source"

TARGET_W = 1920
TARGET_H = 1080

SUPPORTED_EXTS = [".png", ".jpg", ".jpeg", ".webp", ".bmp"]


def fit_to_canvas(img: Image.Image, target_w: int, target_h: int) -> Image.Image:
    """
    画像を1920x1080の16:9キャンバスに収める。
    切り抜かず、白背景の中央に配置する。
    """
    img = img.convert("RGB")

    src_w, src_h = img.size
    scale = min(target_w / src_w, target_h / src_h)

    new_w = int(src_w * scale)
    new_h = int(src_h * scale)

    resized = img.resize((new_w, new_h), Image.LANCZOS)

    canvas = Image.new("RGB", (target_w, target_h), "white")
    x = (target_w - new_w) // 2
    y = (target_h - new_h) // 2
    canvas.paste(resized, (x, y))

    return canvas


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    files = sorted([
        p for p in RAW_DIR.iterdir()
        if p.is_file() and p.suffix.lower() in SUPPORTED_EXTS
    ])

    if not files:
        print("source_raw に画像ファイルがありません。")
        return

    for idx, src_path in enumerate(files, start=1):
        slide_id = f"slide_{idx:03d}"
        out_path = OUT_DIR / f"{slide_id}.png"

        img = Image.open(src_path)
        normalized = fit_to_canvas(img, TARGET_W, TARGET_H)
        normalized.save(out_path)

        print(f"{src_path.name} -> {out_path.name}")

    print("正規化完了")


if __name__ == "__main__":
    main()
