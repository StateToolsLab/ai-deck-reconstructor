import json
import re
import shutil
from pathlib import Path
from datetime import datetime

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SLIDES_DIR = PROJECT_ROOT / "json" / "slides"

RED_VALUES = {
    "red",
    "#f00",
    "#ff0000",
    "ff0000",
    "FF0000",
    "F00",
    "255,0,0",
    "255, 0, 0",
}

COLOR_KEYS = {
    "color",
    "font_color",
    "fontColor",
    "text_color",
    "textColor",
    "fill_color",
    "fillColor",
    "rgb",
}

DEBUG_KEYS = {
    "debug",
    "debug_mode",
    "debug_source",
    "ocr_debug",
}


def is_red(value):
    if value is None:
        return False
    if isinstance(value, str):
        return value.strip() in RED_VALUES
    if isinstance(value, (list, tuple)) and len(value) == 3:
        return tuple(value) == (255, 0, 0)
    return False


def looks_ocr_block(node):
    if not isinstance(node, dict):
        return False

    text = str(node.get("text", ""))
    text_mode = str(node.get("text_mode", "")).lower()
    source = str(node.get("source", "")).lower()
    style_ref = str(node.get("style_ref", "")).lower()

    return (
        text.strip().startswith("[OCR]")
        or "ocr" in text_mode
        or source == "ocr"
        or "ocr" in style_ref
        or "confidence" in node and "bbox_px" in node
    )


def clean_text(value):
    if not isinstance(value, str):
        return value, False

    new_value = re.sub(r"^\s*\[OCR\]\s*", "", value)
    return new_value, new_value != value


def clean_style_dict(style):
    changed = False

    if not isinstance(style, dict):
        return changed

    keys_to_delete = []

    for key, value in style.items():
        if key in COLOR_KEYS and is_red(value):
            keys_to_delete.append(key)

    for key in keys_to_delete:
        del style[key]
        changed = True

    return changed


def clean_node(node, parent_is_ocr=False):
    changed = False

    if isinstance(node, dict):
        node_is_ocr = parent_is_ocr or looks_ocr_block(node)

        # text の [OCR] prefix を除去
        if "text" in node:
            new_text, text_changed = clean_text(node["text"])
            if text_changed:
                node["text"] = new_text
                changed = True
                node_is_ocr = True

        # debug 系キーを除去
        for key in list(node.keys()):
            if key in DEBUG_KEYS:
                del node[key]
                changed = True

        # text_mode が ocr_debug の場合は ocr に戻す
        if str(node.get("text_mode", "")).lower() == "ocr_debug":
            node["text_mode"] = "ocr"
            changed = True

        # OCRブロックらしい場合のみ赤字指定を除去
        if node_is_ocr:
            changed |= clean_style_dict(node)

            if isinstance(node.get("style"), dict):
                changed |= clean_style_dict(node["style"])

            if isinstance(node.get("font"), dict):
                changed |= clean_style_dict(node["font"])

        # 再帰処理
        for value in node.values():
            if isinstance(value, (dict, list)):
                changed |= clean_node(value, node_is_ocr)

    elif isinstance(node, list):
        for item in node:
            changed |= clean_node(item, parent_is_ocr)

    return changed


def process_file(path):
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    changed = clean_node(data)

    if not changed:
        print(f"[SKIP] no debug marker: {path.name}")
        return False

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = path.with_suffix(path.suffix + f".bak_ocrdebug_{timestamp}")
    shutil.copy2(path, backup_path)

    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"[OK] cleaned: {path.name}")
    print(f"     backup: {backup_path.name}")
    return True


def main():
    if not SLIDES_DIR.exists():
        raise FileNotFoundError(f"slides dir not found: {SLIDES_DIR}")

    files = sorted(SLIDES_DIR.glob("slide_*_rebuild_spec.json"))

    if not files:
        print("[WARN] rebuild_spec files not found")
        return

    count = 0

    for path in files:
        if process_file(path):
            count += 1

    print("")
    print(f"done. cleaned files: {count}")


if __name__ == "__main__":
    main()
