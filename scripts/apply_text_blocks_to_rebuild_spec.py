import argparse
import json
import shutil
from pathlib import Path
from datetime import datetime

try:
    from PIL import Image
except Exception:
    Image = None


PROJECT_ROOT = Path(__file__).resolve().parents[1]

TEXT_BLOCKS_DIR = PROJECT_ROOT / "json" / "text_blocks"
SLIDES_DIR = PROJECT_ROOT / "json" / "slides"
SOURCE_DIR = PROJECT_ROOT / "source"
WORKING_TEXT_BLOCKS_DIR = PROJECT_ROOT / "json" / "text_blocks_working"
COMPOSER_RULES_PATH = PROJECT_ROOT / "json" / "composer_rebuild_rules.json"

DEFAULT_SLIDE_W_IN = 13.333
DEFAULT_SLIDE_H_IN = 7.5

DEFAULT_IMAGE_W_PX = 1920
DEFAULT_IMAGE_H_PX = 1080

SOURCE_IMAGE_CACHE = {}


ROLE_RULES = {
    "h1": {
        "style_ref": "h1",
        "font_size": 26,
        "x_pad": 0.08,
        "y_pad": 0.04,
        "w_pad": 0.35,
        "min_h": 0.62,
        "h_scale": 1.05,
    },
    "h2": {
        "style_ref": "h2",
        "font_size": 17,
        "x_pad": 0.06,
        "y_pad": 0.03,
        "w_pad": 0.30,
        "min_h": 0.55,
        "h_scale": 1.10,
    },
    "p": {
        "style_ref": "p",
        "font_size": 10.5,
        "x_pad": 0.04,
        "y_pad": 0.02,
        "w_pad": 0.22,
        "min_h": 0.38,
        "h_scale": 1.35,
    },
    "footer.note": {
        "style_ref": "footer.note",
        "font_size": 7.5,
        "x_pad": 0.02,
        "y_pad": 0.01,
        "w_pad": 0.10,
        "min_h": 0.22,
        "h_scale": 1.10,
    },
    "logo_text": {
        "style_ref": "p",
        "font_size": 7.5,
        "x_pad": 0.01,
        "y_pad": 0.01,
        "w_pad": 0.08,
        "min_h": 0.20,
        "h_scale": 1.00,
    },
}


MODE_SETTINGS = {
    "debug": {
        "min_confidence": 0.00,
        "exclude_logo": False,
        "exclude_footer": False,
        "exclude_decoration": False,
        "mark_source": True,
    },
    "working": {
        "min_confidence": 0.35,
        "exclude_logo": True,
        "exclude_footer": True,
        "exclude_decoration": True,
        "mark_source": False,
    },
    "final": {
        "min_confidence": 0.55,
        "exclude_logo": True,
        "exclude_footer": True,
        "exclude_decoration": True,
        "mark_source": False,
    },
}




SCOPE_SETTINGS = {
    "standard": {
        "include_logo": False,
        "include_footer": False,
        "include_decoration": False,
        "include_page_number": False,
        "include_copyright": False,
        "include_diagram_label": False,
        "include_asset_internal_text": False,
    },
    "full": {
        "include_logo": True,
        "include_footer": True,
        "include_decoration": True,
        "include_page_number": True,
        "include_copyright": True,
        "include_diagram_label": True,
        "include_asset_internal_text": True,
    },
}


def deep_merge_dict(base, override):
    result = dict(base)

    for key, value in override.items():
        if isinstance(value, dict) and isinstance(result.get(key), dict):
            result[key] = deep_merge_dict(result[key], value)
        else:
            result[key] = value

    return result


def load_composer_rules(path):
    global ROLE_RULES, MODE_SETTINGS, SCOPE_SETTINGS

    if not path.exists():
        print(f"[INFO] composer rules not found. use built-in defaults: {path}")
        return

    with path.open("r", encoding="utf-8-sig") as f:
        config = json.load(f)

    role_rules = config.get("role_rules", {})
    mode_presets = config.get("mode_presets", {})
    scope_presets = config.get("scope_presets", {})

    for role, rule in role_rules.items():
        if role in ROLE_RULES:
            ROLE_RULES[role] = deep_merge_dict(ROLE_RULES[role], rule)
        else:
            ROLE_RULES[role] = rule

    for mode, setting in mode_presets.items():
        clean_setting = dict(setting)
        clean_setting.pop("label", None)

        if mode in MODE_SETTINGS:
            MODE_SETTINGS[mode] = deep_merge_dict(MODE_SETTINGS[mode], clean_setting)
        else:
            MODE_SETTINGS[mode] = clean_setting

    for scope, setting in scope_presets.items():
        clean_setting = dict(setting)
        clean_setting.pop("label", None)

        if scope in SCOPE_SETTINGS:
            SCOPE_SETTINGS[scope] = deep_merge_dict(SCOPE_SETTINGS[scope], clean_setting)
        else:
            SCOPE_SETTINGS[scope] = clean_setting

    print(f"[OK] loaded composer rules: {path}")


def load_json(path):
    with path.open("r", encoding="utf-8-sig") as f:
        return json.load(f)


def save_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def backup_file(path, label):
    if not path.exists():
        return None

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = path.with_suffix(path.suffix + f".bak_{label}_{timestamp}")
    shutil.copy2(path, backup_path)
    return backup_path


def get_slide_size_from_spec(spec):
    slide_size = spec.get("slide_size_in") or spec.get("slide_in") or {}

    if isinstance(slide_size, dict):
        w = slide_size.get("w") or slide_size.get("width") or DEFAULT_SLIDE_W_IN
        h = slide_size.get("h") or slide_size.get("height") or DEFAULT_SLIDE_H_IN
        return float(w), float(h)

    return DEFAULT_SLIDE_W_IN, DEFAULT_SLIDE_H_IN


def get_image_size(slide_id, spec):
    # spec 側に画像サイズがあれば優先
    candidates = [
        spec.get("image_size_px"),
        spec.get("source_image_size_px"),
        spec.get("canvas_px"),
        spec.get("page_size_px"),
    ]

    for item in candidates:
        if isinstance(item, dict):
            w = item.get("w") or item.get("width")
            h = item.get("h") or item.get("height")
            if w and h:
                return float(w), float(h)

    # source画像から取得
    if Image is not None:
        image_path = SOURCE_DIR / f"{slide_id}.png"
        if image_path.exists():
            with Image.open(image_path) as img:
                return float(img.width), float(img.height)

    return DEFAULT_IMAGE_W_PX, DEFAULT_IMAGE_H_PX


def get_source_image(slide_id):
    """
    Load source slide image for background tone detection.
    """
    if Image is None:
        return None

    if slide_id in SOURCE_IMAGE_CACHE:
        return SOURCE_IMAGE_CACHE[slide_id]

    image_path = SOURCE_DIR / f"{slide_id}.png"
    if not image_path.exists():
        SOURCE_IMAGE_CACHE[slide_id] = None
        return None

    try:
        img = Image.open(image_path).convert("RGB")
        SOURCE_IMAGE_CACHE[slide_id] = img
        return img
    except Exception:
        SOURCE_IMAGE_CACHE[slide_id] = None
        return None


def bbox_values(block):
    bbox = block.get("bbox_px") or block.get("bbox") or block.get("bounding_box")

    try:
        if isinstance(bbox, dict):
            x = float(bbox.get("x", 0))
            y = float(bbox.get("y", 0))
            w = float(bbox.get("w", bbox.get("width", 0)))
            h = float(bbox.get("h", bbox.get("height", 0)))
            return x, y, w, h

        if isinstance(bbox, list) and len(bbox) >= 4:
            x, y, w, h = [float(v) for v in bbox[:4]]
            return x, y, w, h
    except Exception:
        return None

    return None


def infer_background_tone(slide_id, block):
    """
    Infer whether text sits on light or dark background.

    We sample around OCR bbox instead of inside the bbox as much as possible,
    because the bbox itself may contain the text color.
    """
    img = get_source_image(slide_id)
    if img is None:
        return None

    values = bbox_values(block)
    if values is None:
        return None

    x, y, w, h = values
    if w <= 0 or h <= 0:
        return None

    img_w, img_h = img.size

    x0 = max(0, int(x))
    y0 = max(0, int(y))
    x1 = min(img_w - 1, int(x + w))
    y1 = min(img_h - 1, int(y + h))

    pad = max(6, int(min(w, h) * 0.7))

    regions = [
        (x0, max(0, y0 - pad), x1, max(0, y0 - 1)),              # above
        (x0, min(img_h - 1, y1 + 1), x1, min(img_h - 1, y1 + pad)), # below
        (max(0, x0 - pad), y0, max(0, x0 - 1), y1),              # left
        (min(img_w - 1, x1 + 1), y0, min(img_w - 1, x1 + pad), y1), # right
    ]

    lums = []

    for rx0, ry0, rx1, ry1 in regions:
        if rx1 < rx0 or ry1 < ry0:
            continue

        rw = max(1, rx1 - rx0 + 1)
        rh = max(1, ry1 - ry0 + 1)

        step_x = max(1, rw // 8)
        step_y = max(1, rh // 8)

        for yy in range(ry0, ry1 + 1, step_y):
            for xx in range(rx0, rx1 + 1, step_x):
                r, g, b = img.getpixel((xx, yy))
                lum = 0.299 * r + 0.587 * g + 0.114 * b
                lums.append(lum)

    if not lums:
        return None

    lums.sort()
    median_lum = lums[len(lums) // 2]

    tone = "light" if median_lum >= 150 else "dark"

    return {
        "tone": tone,
        "luminance": round(float(median_lum), 1)
    }


def extract_text_blocks(data):
    if isinstance(data, list):
        return data

    if isinstance(data, dict):
        for key in ["text_blocks", "blocks", "ocr_blocks", "items"]:
            if isinstance(data.get(key), list):
                return data[key]

    raise ValueError("text_blocks list not found in input JSON")


def normalize_confidence(value):
    if value is None:
        return 1.0

    try:
        value = float(value)
    except Exception:
        return 1.0

    # 0〜100系なら0〜1へ
    if value > 1.0:
        value = value / 100.0

    return max(0.0, min(1.0, value))


def looks_page_number(block, raw_text, image_w_px=None, image_h_px=None):
    """
    Detect page number / slide navigation labels.
    Example: 01/道行き, 02/道行き, 03/道行き
    """
    if not isinstance(block, dict):
        return False

    text = str(raw_text or "").strip()
    if not text:
        return False

    import re
    if not re.match(r"^\d{1,2}\s*/", text):
        return False

    bbox = block.get("bbox_px") or block.get("bbox") or block.get("bounding_box")

    try:
        if isinstance(bbox, dict):
            x = float(bbox.get("x", 0))
            y = float(bbox.get("y", 0))
        elif isinstance(bbox, list) and len(bbox) >= 4:
            x = float(bbox[0])
            y = float(bbox[1])
        else:
            return False
    except Exception:
        return False

    iw = float(image_w_px or 1467)
    ih = float(image_h_px or 825)

    x_ratio = x / iw if iw else 0
    y_ratio = y / ih if ih else 0

    # Top-right or bottom-right page labels.
    return x_ratio >= 0.85 and (y_ratio <= 0.12 or y_ratio >= 0.88)


def looks_header_section_title(block, raw_text):
    """
    Detect larger slide/section titles in the header area.
    These are not header.meta; they should be treated as h2.
    """
    if not isinstance(block, dict):
        return False

    text = str(raw_text or "").strip()
    if not text:
        return False

    if len(text) > 50:
        return False

    sector = str(block.get("sector") or "").lower()
    if sector and sector not in {"header", "top"}:
        return False

    bbox = block.get("bbox_px") or block.get("bbox") or block.get("bounding_box")

    try:
        if isinstance(bbox, dict):
            y = float(bbox.get("y", 0))
            h = float(bbox.get("h", bbox.get("height", 0)))
        elif isinstance(bbox, list) and len(bbox) >= 4:
            y = float(bbox[1])
            h = float(bbox[3])
        else:
            return False
    except Exception:
        return False

    # Header section titles observed around y=99 and h=40px.
    # Small header meta is <=22px.
    return y <= 190 and h > 22


def looks_header_meta(block, raw_text):
    """
    Detect small header/meta text before generic h1/h2 classification.

    OCR itself does not provide style. This is Composer-side role inference
    based on sector, bbox position, and bbox size.
    """
    if not isinstance(block, dict):
        return False

    text = str(raw_text or "").strip()
    if not text:
        return False

    if len(text) > 40:
        return False

    sector = str(block.get("sector") or "").lower()
    if sector and sector not in {"header", "top", "top_right", "right_header"}:
        return False

    bbox = block.get("bbox_px") or block.get("bbox") or block.get("bounding_box")

    try:
        if isinstance(bbox, dict):
            y = float(bbox.get("y", 0))
            h = float(bbox.get("h", bbox.get("height", 0)))
        elif isinstance(bbox, list) and len(bbox) >= 4:
            y = float(bbox[1])
            h = float(bbox[3])
        else:
            y = None
            h = None

        # Header meta should catch small deck metadata / page labels only.
        # Large header titles are handled by heading inference, not meta.small.
        if y is not None and h is not None:
            if y <= 190 and h <= 22:
                return True
    except Exception:
        pass

    placement = block.get("placement_in")
    try:
        if isinstance(placement, dict):
            y_in = float(placement.get("y", 0))
            h_in = float(placement.get("h", 0))
            if y_in <= 1.2 and h_in <= 0.3:
                return True
    except Exception:
        pass

    return False


def looks_large_heading(block, raw_text, image_w_px=None, image_h_px=None):
    """
    Infer large heading text from OCR bbox height.

    OCR itself has no style data. Heading detection is Composer-side inference.
    Height is the primary signal because bbox height approximates visual font size.
    Width, y-position, and text length are used only as guardrails.
    """
    if not isinstance(block, dict):
        return False

    text = str(raw_text or "").strip()
    if not text:
        return False

    # Avoid classifying page numbers / large decorative digits as headings.
    if text.isdigit():
        return False

    # Very long text is more likely to be body copy than a title.
    if len(text) > 40:
        return False

    bbox = block.get("bbox_px") or block.get("bbox") or block.get("bounding_box")

    try:
        if isinstance(bbox, dict):
            x = float(bbox.get("x", 0))
            y = float(bbox.get("y", 0))
            w = float(bbox.get("w", bbox.get("width", 0)))
            h = float(bbox.get("h", bbox.get("height", 0)))
        elif isinstance(bbox, list) and len(bbox) >= 4:
            x, y, w, h = [float(v) for v in bbox[:4]]
        else:
            return False
    except Exception:
        return False

    if h <= 0 or w <= 0:
        return False

    # Prefer ratio-based thresholds when actual source image size is available.
    if image_w_px and image_h_px and image_w_px > 0 and image_h_px > 0:
        h_ratio = h / float(image_h_px)
        w_ratio = w / float(image_w_px)
        y_ratio = y / float(image_h_px)

        # Main title / hero title:
        # large visual height, not too narrow, positioned in upper-to-mid region.
        if h_ratio >= 0.055 and w_ratio >= 0.18 and y_ratio <= 0.70:
            return True

    # Conservative fallback for current source scale.
    if h >= 45 and w >= 250 and y <= 650:
        return True

    return False


def infer_card_role(block, raw_text, image_w_px=None, image_h_px=None):
    """
    Infer card-local text roles from OCR bbox.

    OCR provides text + bbox only. Card roles are Composer-side inference.
    The thresholds are conservative and target slide_001〜003 card layouts.
    """
    if not isinstance(block, dict):
        return None

    text = str(raw_text or "").strip()
    if not text:
        return None

    sector = str(block.get("sector") or "").lower()
    if sector in {"header", "top", "top_right", "right_header", "footer"}:
        return None

    bbox = block.get("bbox_px") or block.get("bbox") or block.get("bounding_box")

    try:
        if isinstance(bbox, dict):
            y = float(bbox.get("y", 0))
            w = float(bbox.get("w", bbox.get("width", 0)))
            h = float(bbox.get("h", bbox.get("height", 0)))
        elif isinstance(bbox, list) and len(bbox) >= 4:
            _, y, w, h = [float(v) for v in bbox[:4]]
        else:
            return None
    except Exception:
        return None

    if h <= 0 or w <= 0:
        return None

    if image_w_px and image_h_px and image_w_px > 0 and image_h_px > 0:
        y_ratio = y / float(image_h_px)
        h_ratio = h / float(image_h_px)
    else:
        y_ratio = y / 825.0
        h_ratio = h / 825.0

    # Exclude top header and bottom footer.
    if y_ratio < 0.24 or y_ratio > 0.93:
        return None

    upper_text = text.upper()

    # Small structural markers inside cards.
    if upper_text in {"SECTION", "FLOW", "INTEGRATION"}:
        return "card.meta"

    if ("B-" in upper_text or "OB-" in upper_text) and len(text) <= 14 and h_ratio <= 0.025:
        return "card.meta"

    # Card titles: visually larger short labels.
    if h_ratio >= 0.027 and len(text) <= 18:
        return "card.title"

    # Card body: normal explanatory line.
    if h_ratio >= 0.018 and len(text) <= 30:
        return "card.body"

    # Card note: small explanatory / listing line.
    if h_ratio < 0.018:
        return "card.note"

    return None


def get_role(block, image_w_px=None, image_h_px=None):
    values = [
        block.get("semantic_role") if isinstance(block, dict) else None,
        block.get("role") if isinstance(block, dict) else None,
        block.get("style_ref") if isinstance(block, dict) else None,
        block.get("type") if isinstance(block, dict) else None,
    ]

    joined = " ".join([str(v).lower() for v in values if v])

    try:
        raw_text = get_block_text(block).lower()
    except Exception:
        raw_text = ""

    sample = (joined + " " + raw_text).strip()

    if looks_page_number(block, raw_text, image_w_px=image_w_px, image_h_px=image_h_px):
        return "page_number"

    if looks_header_section_title(block, raw_text):
        return "h2"

    if "header.meta" in sample or "header_meta" in sample or "meta.small" in sample:
        return "header.meta"

    if looks_header_meta(block, raw_text):
        return "header.meta"

    if "copyright" in sample or "all rights" in sample or "reserved" in sample:
        return "copyright"

    if raw_text.isdigit() and len(raw_text) <= 3:
        return "page_number"

    if "page_number" in sample or "page number" in sample:
        return "page_number"

    if "logo" in sample:
        return "logo_text"

    if "footer" in sample or "note" in sample:
        return "footer.note"

    if "diagram_label" in sample or "diagram label" in sample:
        return "diagram_label"

    if "asset_internal" in sample or "asset internal" in sample:
        return "asset_internal_text"

    if "diagram" in sample and "label" in sample:
        return "diagram_label"

    if "decoration" in sample or "symbol" in sample:
        return "decoration_or_symbol"

    if looks_large_heading(block, raw_text, image_w_px=image_w_px, image_h_px=image_h_px):
        return "h1"

    card_role = infer_card_role(
        block,
        raw_text,
        image_w_px=image_w_px,
        image_h_px=image_h_px,
    )
    if card_role:
        return card_role

    if "h1" in sample or "title" in sample:
        return "h1"

    if "h2" in sample or "subtitle" in sample or "subhead" in sample:
        return "h2"

    return "p"


def looks_decoration(text):
    t = str(text or "").strip()

    if not t:
        return True

    # 記号だけ・短すぎるものは初期作業では除外しやすくする
    symbol_chars = set("・●○■□▲△▼▽◆◇★☆—–-_=|/\\()[]{}<>※＊*")
    if len(t) <= 2 and all(ch in symbol_chars for ch in t):
        return True

    return False


def bbox_to_placement_in(block, image_w_px, image_h_px, slide_w_in, slide_h_in):
    # Recalculate placement_in from bbox_px using the actual source image size.
    # Existing placement_in in text_blocks may have been generated with an old
    # default image size such as 1920x1080, so it must not be trusted here.
    bbox = block.get("bbox_px") or block.get("bbox") or block.get("bounding_box")

    if isinstance(bbox, dict):
        x = float(bbox.get("x", 0))
        y = float(bbox.get("y", 0))
        w = float(bbox.get("w", bbox.get("width", 0)))
        h = float(bbox.get("h", bbox.get("height", 0)))
    elif isinstance(bbox, list) and len(bbox) >= 4:
        x, y, w, h = [float(v) for v in bbox[:4]]
    else:
        # bboxがない場合の仮配置
        return {"x": 0.5, "y": 0.5, "w": 4.0, "h": 0.4}

    return {
        "x": x / image_w_px * slide_w_in,
        "y": y / image_h_px * slide_h_in,
        "w": w / image_w_px * slide_w_in,
        "h": h / image_h_px * slide_h_in,
    }


def clamp_placement(p, slide_w_in, slide_h_in):
    x = max(0.0, min(float(p["x"]), slide_w_in))
    y = max(0.0, min(float(p["y"]), slide_h_in))
    w = max(0.05, float(p["w"]))
    h = max(0.05, float(p["h"]))

    if x + w > slide_w_in:
        w = max(0.05, slide_w_in - x)

    if y + h > slide_h_in:
        h = max(0.05, slide_h_in - y)

    return {
        "x": round(x, 3),
        "y": round(y, 3),
        "w": round(w, 3),
        "h": round(h, 3),
    }


def adjust_placement(raw, role, slide_w_in, slide_h_in):
    rule = ROLE_RULES.get(role, ROLE_RULES["p"])

    x = raw["x"] - rule["x_pad"]
    y = raw["y"] - rule["y_pad"]
    w = raw["w"] + rule["w_pad"]
    h = max(raw["h"] * rule["h_scale"], rule["min_h"])

    return clamp_placement(
        {
            "x": x,
            "y": y,
            "w": w,
            "h": h,
        },
        slide_w_in,
        slide_h_in,
    )



def coerce_text_value(value):
    if value is None:
        return ""

    if isinstance(value, str):
        return value.strip()

    if isinstance(value, (int, float)):
        return str(value).strip()

    if isinstance(value, list):
        parts = []
        for item in value:
            s = coerce_text_value(item)
            if s:
                parts.append(s)
        return "\n".join(parts).strip()

    if isinstance(value, dict):
        candidate_keys = [
            "text",
            "content",
            "value",
            "label",
            "ocr_text",
            "recognized_text",
            "recognizedText",
            "detected_text",
            "detectedText",
            "raw_text",
            "plain_text",
            "string",
            "body",
        ]

        for key in candidate_keys:
            if key in value:
                s = coerce_text_value(value.get(key))
                if s:
                    return s

        nested_keys = [
            "lines",
            "spans",
            "words",
            "tokens",
            "children",
            "items",
            "blocks",
        ]

        for key in nested_keys:
            if key in value:
                s = coerce_text_value(value.get(key))
                if s:
                    return s

    return ""


def get_block_text(block):
    if not isinstance(block, dict):
        return coerce_text_value(block)

    candidate_keys = [
        "text",
        "content",
        "value",
        "label",
        "ocr_text",
        "recognized_text",
        "recognizedText",
        "detected_text",
        "detectedText",
        "raw_text",
        "plain_text",
        "string",
        "body",
    ]

    for key in candidate_keys:
        if key in block:
            s = coerce_text_value(block.get(key))
            if s:
                return s

    nested_keys = [
        "lines",
        "spans",
        "words",
        "tokens",
        "children",
        "items",
        "blocks",
    ]

    for key in nested_keys:
        if key in block:
            s = coerce_text_value(block.get(key))
            if s:
                return s

    return ""


def clean_text(text):
    text = str(text or "")
    text = text.replace("[OCR]", "").strip()
    return text


def should_exclude(block, role, confidence, mode_setting):
    text = clean_text(get_block_text(block))

    if not text:
        return True, "empty_text"

    if confidence < mode_setting.get("min_confidence", 0.0):
        return True, "low_confidence"

    if mode_setting.get("exclude_logo", False) and role == "logo_text":
        return True, "logo_text"

    if mode_setting.get("exclude_footer", False) and role == "footer.note":
        return True, "footer_note"

    if mode_setting.get("exclude_decoration", False) and role == "decoration_or_symbol":
        return True, "decoration_or_symbol"

    if mode_setting.get("exclude_page_number", False) and role == "page_number":
        return True, "page_number"

    if mode_setting.get("exclude_copyright", False) and role == "copyright":
        return True, "copyright"

    if mode_setting.get("exclude_diagram_label", False) and role == "diagram_label":
        return True, "diagram_label"

    if mode_setting.get("exclude_asset_internal_text", False) and role == "asset_internal_text":
        return True, "asset_internal_text"

    if mode_setting.get("exclude_decoration", False) and looks_decoration(text):
        return True, "looks_decoration"

    return False, ""


def text_width_units(text):
    """
    Estimate visual text width in em-like units.

    Japanese full-width chars are close to 1.0em.
    ASCII chars are narrower.
    This is only a diagnostic metric, not a rendering override.
    """
    import unicodedata

    lines = str(text or "").splitlines() or [""]
    max_units = 0.0

    for line in lines:
        units = 0.0
        for ch in line:
            if ch.isspace():
                units += 0.35
            elif unicodedata.east_asian_width(ch) in {"F", "W", "A"}:
                units += 1.0
            elif ch.isdigit():
                units += 0.55
            elif ch.isascii():
                units += 0.58
            else:
                units += 0.9

        max_units = max(max_units, units)

    return max_units


def role_font_size_scale(role):
    """
    Role-specific coefficient for estimating font size from OCR bbox height.
    The result is a measurement hint, separate from theme style.
    """
    scales = {
        "h1": 1.07,
        "h2": 1.00,
        "p": 0.95,
        "header.meta": 0.95,
        "footer.note": 0.95,
        "card.meta": 0.95,
        "card.title": 1.00,
        "card.body": 0.95,
        "card.note": 1.00,
    }
    return scales.get(str(role), 0.95)


def build_text_fit_metrics(text, raw_placement, placement, role, rule):
    """
    Build diagnostic metrics for text rendering fit.

    This does NOT change style_ref.
    This does NOT override font_size.
    It only records estimated values for later calibration.
    """
    try:
        raw_h_pt = float(raw_placement.get("h", 0)) * 72.0
        raw_w_pt = float(raw_placement.get("w", 0)) * 72.0
        box_w_pt = float(placement.get("w", 0)) * 72.0
        box_h_pt = float(placement.get("h", 0)) * 72.0
    except Exception:
        return {}

    scale = role_font_size_scale(role)
    estimated_font_size = max(4.0, raw_h_pt * scale)

    units = text_width_units(text)
    estimated_text_width_pt = units * estimated_font_size

    fit_ratio = None
    wrap_risk = False

    if box_w_pt > 0:
        fit_ratio = estimated_text_width_pt / box_w_pt
        wrap_risk = fit_ratio > 1.0

    try:
        rule_font_size_value = (
            float(rule.get("font_size"))
            if rule.get("font_size") is not None
            else None
        )
    except Exception:
        rule_font_size_value = None

    font_size_delta = None
    font_size_ratio = None
    role_mismatch_risk = False

    if rule_font_size_value and rule_font_size_value > 0:
        font_size_delta = estimated_font_size - rule_font_size_value
        font_size_ratio = estimated_font_size / rule_font_size_value

        # Diagnostic only:
        # Large mismatch suggests that semantic_role/style_ref may be wrong,
        # or the theme style needs calibration.
        role_mismatch_risk = (
            abs(font_size_delta) >= 8.0
            or font_size_ratio >= 1.8
            or font_size_ratio <= 0.55
        )

    fit_status = "ok"
    if wrap_risk:
        fit_status = "wrap_risk"
    if role_mismatch_risk:
        fit_status = "role_mismatch_risk"

    return {
        "raw_h_pt": round(raw_h_pt, 2),
        "raw_w_pt": round(raw_w_pt, 2),
        "box_w_pt": round(box_w_pt, 2),
        "box_h_pt": round(box_h_pt, 2),
        "text_width_units": round(units, 2),
        "rule_font_size": round(rule_font_size_value, 1) if rule_font_size_value is not None else None,
        "estimated_font_size": round(estimated_font_size, 1),
        "font_size_delta": round(font_size_delta, 1) if font_size_delta is not None else None,
        "font_size_ratio": round(font_size_ratio, 3) if font_size_ratio is not None else None,
        "estimated_text_width_pt": round(estimated_text_width_pt, 2),
        "fit_ratio": round(fit_ratio, 3) if fit_ratio is not None else None,
        "wrap_risk": bool(wrap_risk),
        "role_mismatch_risk": bool(role_mismatch_risk),
        "fit_status": fit_status,
    }


def normalize_block(block, slide_id, mode, image_w_px, image_h_px, slide_w_in, slide_h_in):
    mode_setting = MODE_SETTINGS[mode]

    role = get_role(
        block,
        image_w_px=image_w_px,
        image_h_px=image_h_px,
    )
    confidence = normalize_confidence(block.get("confidence"))
    excluded, reason = should_exclude(block, role, confidence, mode_setting)

    if excluded:
        return None, reason

    raw_placement = bbox_to_placement_in(
        block,
        image_w_px=image_w_px,
        image_h_px=image_h_px,
        slide_w_in=slide_w_in,
        slide_h_in=slide_h_in,
    )

    placement = adjust_placement(
        raw=raw_placement,
        role=role,
        slide_w_in=slide_w_in,
        slide_h_in=slide_h_in,
    )

    rule = ROLE_RULES.get(role, ROLE_RULES["p"])

    normalized = dict(block)

    normalized["id"] = normalized.get("id") or f"{slide_id}_{role}_{abs(hash(clean_text(block.get('text', '')))) % 100000}"
    normalized["text"] = clean_text(get_block_text(block))
    normalized["semantic_role"] = role if role != "decoration_or_symbol" else "p"

    # style_ref is assigned by Composer during rebuild.
    # Any incoming style_ref is a previous/legacy hint, not OCR-native style data.
    previous_style_ref = normalized.get("style_ref")
    if previous_style_ref:
        normalized["previous_style_ref"] = previous_style_ref
    normalized["style_ref"] = rule["style_ref"]

    # Switch card text styles according to local background brightness.
    if str(role).startswith("card."):
        bg = infer_background_tone(slide_id, normalized)
        if bg:
            normalized["background_tone"] = bg["tone"]
            normalized["background_luminance"] = bg["luminance"]
            normalized["style_ref"] = f"{role}.on_{bg['tone']}"

    normalized["text_mode"] = "ocr"
    normalized["confidence"] = round(confidence, 3)
    normalized["placement_in"] = placement
    normalized["confirmed"] = False

    # font_size が未設定の場合のみ付与
    if "font_size" not in normalized:
        normalized["font_size"] = rule["font_size"]

    # 後で検証できるように生位置を残す
    normalized["raw_placement_in"] = {
        "x": round(float(raw_placement["x"]), 3),
        "y": round(float(raw_placement["y"]), 3),
        "w": round(float(raw_placement["w"]), 3),
        "h": round(float(raw_placement["h"]), 3),
    }

    # Diagnostic metrics only. Do not override theme style or PPTX font size here.
    normalized["text_fit"] = build_text_fit_metrics(
        text=normalized["text"],
        raw_placement=raw_placement,
        placement=placement,
        role=normalized["semantic_role"],
        rule=rule,
    )

    normalized["source"] = "ocr"

    if mode_setting["mark_source"]:
        normalized["text"] = "[OCR] " + normalized["text"]

    return normalized, ""


def set_text_blocks_to_spec(spec, text_blocks):
    # 既存の一般的な格納先を更新
    spec["text_blocks"] = text_blocks

    if isinstance(spec.get("elements"), dict):
        if "text_blocks" in spec["elements"]:
            spec["elements"]["text_blocks"] = text_blocks
        if "texts" in spec["elements"]:
            spec["elements"]["texts"] = text_blocks

    if "texts" in spec:
        spec["texts"] = text_blocks

    return spec



def apply_scope_to_mode_setting(mode_setting, scope_setting):
    result = dict(mode_setting)

    include_to_exclude = {
        "include_logo": "exclude_logo",
        "include_footer": "exclude_footer",
        "include_decoration": "exclude_decoration",
        "include_page_number": "exclude_page_number",
        "include_copyright": "exclude_copyright",
        "include_diagram_label": "exclude_diagram_label",
        "include_asset_internal_text": "exclude_asset_internal_text",
    }

    for include_key, exclude_key in include_to_exclude.items():
        if include_key in scope_setting:
            result[exclude_key] = not bool(scope_setting[include_key])

    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--slide", default="slide_001", help="slide id, e.g. slide_001")
    parser.add_argument("--mode", default="working", choices=["debug", "draft", "working", "clean", "final"])
    parser.add_argument("--scope", default="standard", choices=["standard", "full"])
    parser.add_argument("--keep-logo", action="store_true")
    parser.add_argument("--keep-footer", action="store_true")
    parser.add_argument("--min-confidence", type=float, default=None)
    parser.add_argument("--keep-asset-internal-text", dest="keep_asset_internal_text", action="store_true")
    parser.add_argument("--keep-diagram-label", dest="keep_diagram_label", action="store_true")
    parser.add_argument("--keep-copyright", dest="keep_copyright", action="store_true")
    parser.add_argument("--keep-page-number", dest="keep_page_number", action="store_true")
    parser.add_argument("--keep-decoration", dest="keep_decoration", action="store_true")
    args = parser.parse_args()

    slide_id = args.slide
    mode = args.mode

    load_composer_rules(COMPOSER_RULES_PATH)

    scope = args.scope
    scope_setting = dict(SCOPE_SETTINGS.get(scope, SCOPE_SETTINGS["standard"]))

    mode_setting = dict(MODE_SETTINGS[mode])
    mode_setting = apply_scope_to_mode_setting(mode_setting, scope_setting)

    if args.keep_logo:
        mode_setting["exclude_logo"] = False

    if args.keep_footer:
        mode_setting["exclude_footer"] = False

    if args.keep_decoration:
        mode_setting["exclude_decoration"] = False

    if args.keep_page_number:
        mode_setting["exclude_page_number"] = False

    if args.keep_copyright:
        mode_setting["exclude_copyright"] = False

    if args.keep_diagram_label:
        mode_setting["exclude_diagram_label"] = False

    if args.keep_asset_internal_text:
        mode_setting["exclude_asset_internal_text"] = False

    if args.min_confidence is not None:
        mode_setting["min_confidence"] = args.min_confidence

    # 一時的にMODE_SETTINGSを書き換えず、この実行内だけ使う
    MODE_SETTINGS[mode] = mode_setting

    text_blocks_path = TEXT_BLOCKS_DIR / f"{slide_id}_text_blocks.json"
    spec_path = SLIDES_DIR / f"{slide_id}_rebuild_spec.json"

    if not text_blocks_path.exists():
        raise FileNotFoundError(f"text_blocks not found: {text_blocks_path}")

    if not spec_path.exists():
        raise FileNotFoundError(f"rebuild_spec not found: {spec_path}")

    source_data = load_json(text_blocks_path)
    spec = load_json(spec_path)

    source_blocks = extract_text_blocks(source_data)

    slide_w_in, slide_h_in = get_slide_size_from_spec(spec)
    image_w_px, image_h_px = get_image_size(slide_id, spec)

    normalized_blocks = []
    excluded_counts = {}

    for block in source_blocks:
        normalized, reason = normalize_block(
            block=block,
            slide_id=slide_id,
            mode=mode,
            image_w_px=image_w_px,
            image_h_px=image_h_px,
            slide_w_in=slide_w_in,
            slide_h_in=slide_h_in,
        )

        if normalized is None:
            excluded_counts[reason] = excluded_counts.get(reason, 0) + 1
            continue

        # Ensure stable unique IDs for downstream editing / confirmed management.
        # Preserve the original OCR/text block identifier for traceability.
        original_id = normalized.get("block_id") or normalized.get("id")
        if original_id and "source_block_id" not in normalized:
            normalized["source_block_id"] = original_id

        role_for_id = str(normalized.get("semantic_role") or "text").replace(".", "_")
        normalized["id"] = f"{slide_id}_{role_for_id}_{len(normalized_blocks) + 1:03d}"

        normalized_blocks.append(normalized)

    backup_path = backup_file(spec_path, f"apply_text_blocks_{mode}")

    spec = set_text_blocks_to_spec(spec, normalized_blocks)
    spec["text_block_apply_mode"] = mode
    spec["text_block_apply_scope"] = args.scope
    spec["text_block_apply_summary"] = {
        "source": str(text_blocks_path.relative_to(PROJECT_ROOT)),
        "total_source_blocks": len(source_blocks),
        "applied_blocks": len(normalized_blocks),
        "excluded_counts": excluded_counts,
        "slide_size_in": {"w": slide_w_in, "h": slide_h_in},
        "image_size_px": {"w": image_w_px, "h": image_h_px},
    }

    save_json(spec_path, spec)

    WORKING_TEXT_BLOCKS_DIR.mkdir(parents=True, exist_ok=True)
    working_path = WORKING_TEXT_BLOCKS_DIR / f"{slide_id}_text_blocks_{mode}.json"
    save_json(
        working_path,
        {
            "slide_id": slide_id,
            "mode": mode,
            "text_blocks": normalized_blocks,
            "summary": spec["text_block_apply_summary"],
        },
    )

    print("[OK] applied text blocks")
    print(f"slide: {slide_id}")
    print(f"mode: {mode}")
    print(f"scope: {args.scope}")
    print(f"source blocks: {len(source_blocks)}")
    print(f"applied blocks: {len(normalized_blocks)}")
    print(f"excluded: {excluded_counts}")

    if backup_path:
        print(f"backup: {backup_path.name}")

    print(f"working text blocks: {working_path}")


if __name__ == "__main__":
    main()
