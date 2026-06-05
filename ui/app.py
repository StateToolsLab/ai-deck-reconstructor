from __future__ import annotations

import json
import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path
from datetime import datetime
from typing import Any

import re
from flask import Flask, jsonify, render_template, request, send_file
from PIL import Image, ImageOps
from werkzeug.utils import secure_filename

try:
    from pdf2image import convert_from_path
except Exception:
    convert_from_path = None


BASE_DIR = Path(__file__).resolve().parents[1]
SOURCE_DIR = BASE_DIR / "source"
ASSETS_DIR = BASE_DIR / "assets"
JSON_DIR = BASE_DIR / "json"
OUTPUT_DIR = BASE_DIR / "output"
TEMP_DIR = BASE_DIR / "temp"
CURRENT_WORKSPACE_FILE = BASE_DIR / ".current_workspace"
WORKSPACE_REGISTRY_FILE = BASE_DIR / ".workspace_folders.json"

ALLOWED_IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"}
OSS_MAX_SLIDES = 20

app = Flask(
    __name__,
    template_folder=str(Path(__file__).parent / "templates"),
    static_folder=str(Path(__file__).parent / "static"),
)
app.config["MAX_CONTENT_LENGTH"] = 200 * 1024 * 1024


def ensure_dirs() -> None:
    SOURCE_DIR.mkdir(exist_ok=True)
    ASSETS_DIR.mkdir(exist_ok=True)
    JSON_DIR.mkdir(exist_ok=True)
    OUTPUT_DIR.mkdir(exist_ok=True)
    TEMP_DIR.mkdir(exist_ok=True)


def workspace_label() -> str:
    if CURRENT_WORKSPACE_FILE.exists():
        raw = CURRENT_WORKSPACE_FILE.read_text(encoding="utf-8").strip()
        if raw:
            return raw
    return str(BASE_DIR)


def write_workspace_label(path: Path) -> None:
    CURRENT_WORKSPACE_FILE.write_text(str(path.resolve()), encoding="utf-8")


def read_workspace_registry() -> list[dict[str, Any]]:
    if not WORKSPACE_REGISTRY_FILE.exists():
        return []
    try:
        data = json.loads(WORKSPACE_REGISTRY_FILE.read_text(encoding="utf-8"))
        if isinstance(data, list):
            return data
    except Exception:
        pass
    return []


def write_workspace_registry(items: list[dict[str, Any]]) -> None:
    WORKSPACE_REGISTRY_FILE.write_text(
        json.dumps(items, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def register_workspace_folder(path: Path, name: str | None = None) -> dict[str, Any]:
    resolved = str(path.resolve())
    items = read_workspace_registry()

    item = None
    for x in items:
        if x.get("path") == resolved:
            item = x
            break

    if item is None:
        item = {
            "name": name or path.name or resolved,
            "path": resolved,
        }
    else:
        item["name"] = name or item.get("name") or path.name or resolved

    items = [item] + [x for x in items if x.get("path") != resolved]
    write_workspace_registry(items)
    return item


def clear_dir(path: Path) -> None:
    path.mkdir(exist_ok=True)
    for item in path.iterdir():
        if item.is_dir():
            shutil.rmtree(item)
        else:
            item.unlink()


def copy_dir_contents(src: Path, dst: Path) -> None:
    if not src.exists() or not src.is_dir():
        return
    dst.mkdir(exist_ok=True)
    for item in src.iterdir():
        target = dst / item.name
        if item.is_dir():
            if target.exists():
                shutil.rmtree(target)
            shutil.copytree(item, target)
        else:
            shutil.copy2(item, target)


def source_has_images(source_dir: Path) -> bool:
    if not source_dir.exists() or not source_dir.is_dir():
        return False
    for p in source_dir.iterdir():
        if p.is_file() and p.suffix.lower() in ALLOWED_IMAGE_EXTS:
            return True
    return False


def remove_path(path: Path) -> None:
    if not path.exists():
        return
    if path.is_dir():
        shutil.rmtree(path)
    else:
        path.unlink()


def delete_slide_artifacts(slide_id: str) -> dict[str, list[str]]:
    removed: list[str] = []

    for p in SOURCE_DIR.glob(f"{slide_id}.*"):
        if p.is_file():
            removed.append(rel(p))
            p.unlink()

    targets = [
        JSON_DIR / "ocr" / slide_id,
        ASSETS_DIR / slide_id,
        JSON_DIR / "text_blocks" / f"{slide_id}_text_blocks.json",
        JSON_DIR / "text_blocks_working" / f"{slide_id}_text_blocks_working.json",
        JSON_DIR / "ocr_engine_configs" / f"ocr_engine_config_{slide_id}.json",
    ]

    for target in targets:
        if target.exists():
            removed.append(rel(target))
            remove_path(target)

    slides_dir = JSON_DIR / "slides"
    if slides_dir.exists():
        for p in slides_dir.glob(f"{slide_id}_*"):
            removed.append(rel(p))
            remove_path(p)

    manifest = JSON_DIR / "deck_manifest.json"
    if manifest.exists():
        removed.append(rel(manifest))
        manifest.unlink()

    return {"removed": removed}


def clear_source_and_generated_artifacts() -> dict[str, list[str]]:
    removed: list[str] = []

    for target in [
        SOURCE_DIR,
        ASSETS_DIR,
        JSON_DIR / "ocr",
        JSON_DIR / "ocr_engine_configs",
        JSON_DIR / "slides",
        JSON_DIR / "text_blocks",
        JSON_DIR / "text_blocks_working",
    ]:
        if target.exists():
            removed.append(rel(target))
            clear_dir(target)

    manifest = JSON_DIR / "deck_manifest.json"
    if manifest.exists():
        removed.append(rel(manifest))
        manifest.unlink()

    order_path = slide_order_path()
    if order_path.exists():
        removed.append(rel(order_path))
        order_path.unlink()

    ensure_dirs()
    return {"removed": removed}


def read_json(path: Path, fallback: Any = None) -> Any:
    if fallback is None:
        fallback = {}
    try:
        if not path.exists():
            return fallback
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return fallback


def rel(path: Path) -> str:
    try:
        return str(path.relative_to(BASE_DIR)).replace("\\", "/")
    except Exception:
        return str(path)


def get_source_files() -> list[Path]:
    if not SOURCE_DIR.exists():
        return []
    files: list[Path] = []
    for ext in ALLOWED_IMAGE_EXTS:
        files.extend(SOURCE_DIR.glob(f"*{ext}"))
        files.extend(SOURCE_DIR.glob(f"*{ext.upper()}"))
    return sorted(set(files), key=lambda p: p.name)


def slide_id_from_source(path: Path) -> str:
    return path.stem


def slide_order_path() -> Path:
    return JSON_DIR / "slide_order.json"


def read_slide_order() -> list[str]:
    path = slide_order_path()
    if not path.exists():
        return []

    try:
        with path.open("r", encoding="utf-8-sig") as f:
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


def write_slide_order(slide_ids: list[str]) -> None:
    path = slide_order_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump({"slide_ids": slide_ids}, f, ensure_ascii=False, indent=2)


def order_slide_ids(source_ids: list[str]) -> list[str]:
    saved_order = read_slide_order()
    source_set = set(source_ids)

    ordered = [
        slide_id
        for slide_id in saved_order
        if slide_id in source_set
    ]

    ordered_set = set(ordered)
    ordered.extend(
        slide_id
        for slide_id in source_ids
        if slide_id not in ordered_set
    )

    return ordered


def get_slide_ids() -> list[str]:
    source_ids = [
        slide_id_from_source(p)
        for p in get_source_files()
        if p.stem.startswith("slide_")
    ]
    return order_slide_ids(source_ids)


def latest_pptx() -> dict[str, Any] | None:
    if not OUTPUT_DIR.exists():
        return None
    pptxs = sorted(OUTPUT_DIR.glob("*.pptx"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not pptxs:
        return None
    p = pptxs[0]
    return {
        "name": p.name,
        "path": str(p),
        "relative_path": rel(p),
        "size": p.stat().st_size,
        "mtime": p.stat().st_mtime,
    }


def status_for_slide(slide_id: str) -> dict[str, Any]:
    source_file = None
    for p in get_source_files():
        if p.stem == slide_id:
            source_file = p
            break

    ocr_dir = JSON_DIR / "ocr" / slide_id
    text_blocks = JSON_DIR / "text_blocks" / f"{slide_id}_text_blocks.json"
    text_blocks_working = JSON_DIR / "text_blocks_working" / f"{slide_id}_text_blocks_working.json"
    rebuild_spec = JSON_DIR / "slides" / f"{slide_id}_rebuild_spec.json"
    extraction_plan = JSON_DIR / "slides" / f"{slide_id}_extraction_plan.json"
    asset_dir = ASSETS_DIR / slide_id

    return {
        "slide_id": slide_id,
        "source": rel(source_file) if source_file else None,
        "source_name": source_file.name if source_file else None,
        "source_url": f"/api/source/{source_file.name}" if source_file else None,
        "has_source": source_file is not None,
        "has_ocr": ocr_dir.exists() and any(ocr_dir.glob("*.json")),
        "has_text_blocks": text_blocks.exists(),
        "has_working_text_blocks": text_blocks_working.exists(),
        "has_rebuild_spec": rebuild_spec.exists(),
        "has_extraction_plan": extraction_plan.exists(),
        "has_assets": asset_dir.exists() and any(asset_dir.iterdir()),
    }


def collect_status() -> dict[str, Any]:
    ensure_dirs()
    slides = [status_for_slide(slide_id) for slide_id in get_slide_ids()]
    manifest_path = JSON_DIR / "deck_manifest.json"
    return {
        "workspace": workspace_label(),
        "slides": slides,
        "slide_count": len(slides),
        "has_manifest": manifest_path.exists(),
        "latest_pptx": latest_pptx(),
        "dirs": {
            "source": str(SOURCE_DIR),
            "assets": str(ASSETS_DIR),
            "json": str(JSON_DIR),
            "output": str(OUTPUT_DIR),
        },
    }


def run_command(args: list[str], label: str, timeout: int = 900) -> dict[str, Any]:
    started = {
        "label": label,
        "command": " ".join(args),
    }
    try:
        result = subprocess.run(
            args,
            cwd=str(BASE_DIR),
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        return {
            **started,
            "returncode": result.returncode,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "ok": result.returncode == 0,
        }
    except subprocess.TimeoutExpired as e:
        return {
            **started,
            "returncode": -1,
            "stdout": e.stdout or "",
            "stderr": f"TIMEOUT: {label}",
            "ok": False,
        }
    except Exception as e:
        return {
            **started,
            "returncode": -1,
            "stdout": "",
            "stderr": str(e),
            "ok": False,
        }


def open_path(path: Path) -> tuple[bool, str]:
    try:
        if platform.system() == "Darwin":
            subprocess.Popen(["open", str(path)])
        elif platform.system() == "Windows":
            os.startfile(str(path))  # type: ignore[attr-defined]
        else:
            subprocess.Popen(["xdg-open", str(path)])
        return True, str(path)
    except Exception as e:
        return False, str(e)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/status")
def api_status():
    return jsonify(collect_status())


@app.route("/api/slides/reorder", methods=["POST"])
def api_reorder_slides():
    data = request.get_json(silent=True) or {}
    requested_order = data.get("slide_ids")

    if not isinstance(requested_order, list):
        return jsonify({"error": "slide_ids must be a list"}), 400

    requested_order = [
        slide_id
        for slide_id in requested_order
        if isinstance(slide_id, str)
    ]

    if not all(is_safe_slide_id(slide_id) for slide_id in requested_order):
        return jsonify({"error": "invalid slide_id in slide_ids"}), 400

    source_ids = [
        slide_id_from_source(path)
        for path in get_source_files()
        if path.stem.startswith("slide_")
    ]

    if set(requested_order) != set(source_ids) or len(requested_order) != len(source_ids):
        return jsonify({
            "error": "slide_ids must match current source slides",
            "requested": requested_order,
            "current": source_ids,
        }), 400

    write_slide_order(requested_order)

    return jsonify({
        "ok": True,
        "slide_ids": requested_order,
        "status": collect_status(),
    })


@app.route("/api/source/<path:filename>")
def api_source(filename: str):
    path = SOURCE_DIR / filename
    if not path.exists():
        return jsonify({"error": "source image not found"}), 404
    return send_file(path)


@app.route("/api/text-blocks/<slide_id>")
def api_text_blocks(slide_id: str):
    working_path = JSON_DIR / "text_blocks_working" / f"{slide_id}_text_blocks_working.json"
    standard_path = JSON_DIR / "text_blocks" / f"{slide_id}_text_blocks.json"
    path = working_path if working_path.exists() else standard_path
    data = read_json(path, {})
    blocks = data.get("text_blocks") or data.get("blocks") or []
    return jsonify({
        "slide_id": slide_id,
        "path": rel(path) if path.exists() else None,
        "block_count": len(blocks) if isinstance(blocks, list) else 0,
        "blocks": blocks if isinstance(blocks, list) else [],
        "raw": data,
    })


@app.route("/api/rebuild-spec/<slide_id>")
def api_rebuild_spec(slide_id: str):
    path = JSON_DIR / "slides" / f"{slide_id}_rebuild_spec.json"
    data = read_json(path, {})
    return jsonify({
        "slide_id": slide_id,
        "path": rel(path) if path.exists() else None,
        "exists": path.exists(),
        "data": data,
    })


def rebuild_element_key(el: dict[str, Any], index: int) -> str:
    return str(
        el.get("id")
        or el.get("block_id")
        or el.get("source_block_id")
        or el.get("name")
        or f"el_{index}"
    )


def get_rebuild_elements_container(data: dict[str, Any]) -> tuple[list[Any] | None, str | None]:
    candidates = [
        ("elements", data.get("elements")),
        ("slide_elements", data.get("slide_elements")),
        ("objects", data.get("objects")),
        ("layers", data.get("layers")),
        ("shapes", data.get("shapes")),
    ]

    for key, value in candidates:
        if isinstance(value, list):
            return value, key

    slide = data.get("slide")
    if isinstance(slide, dict) and isinstance(slide.get("elements"), list):
        return slide["elements"], "slide.elements"

    rebuild_spec = data.get("rebuild_spec")
    if isinstance(rebuild_spec, dict) and isinstance(rebuild_spec.get("elements"), list):
        return rebuild_spec["elements"], "rebuild_spec.elements"

    return None, None


def write_rebuild_spec(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def text_block_key(block: dict[str, Any], index: int) -> str:
    return str(
        block.get("id")
        or block.get("block_id")
        or block.get("source_block_id")
        or block.get("name")
        or f"block_{index}"
    )


def get_text_blocks_container(data: Any) -> tuple[list[Any] | None, str | None]:
    if isinstance(data, list):
        return data, None

    if not isinstance(data, dict):
        return None, None

    for key in ("text_blocks", "blocks"):
        value = data.get(key)
        if isinstance(value, list):
            return value, key

    return None, None


def text_blocks_paths_for_slide(slide_id: str) -> tuple[Path, Path]:
    working_path = JSON_DIR / "text_blocks_working" / f"{slide_id}_text_blocks_working.json"
    standard_path = JSON_DIR / "text_blocks" / f"{slide_id}_text_blocks.json"
    return working_path, standard_path


def read_text_blocks_for_edit(slide_id: str) -> tuple[Any, Path]:
    working_path, standard_path = text_blocks_paths_for_slide(slide_id)
    source_path = working_path if working_path.exists() else standard_path
    data = read_json(source_path, {})
    return data, working_path


def write_text_blocks_working(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def update_text_block_style_fallback(slide_id: str, element_key: str, style_ref: str, role: str) -> dict[str, Any] | None:
    data, working_path = read_text_blocks_for_edit(slide_id)
    blocks, container = get_text_blocks_container(data)

    if not isinstance(blocks, list):
        return None

    for index, block in enumerate(blocks):
        if not isinstance(block, dict):
            continue

        keys = {
            text_block_key(block, index),
            str(block.get("id") or ""),
            str(block.get("block_id") or ""),
            str(block.get("source_block_id") or ""),
            str(block.get("source_id") or ""),
            str(block.get("name") or ""),
        }

        if str(element_key) not in keys:
            continue

        block["style_ref"] = style_ref
        if role:
            block["role"] = role

        write_text_blocks_working(working_path, data)

        return {
            "container": container or "list",
            "path": rel(working_path),
            "blocks": blocks,
            "data": data,
        }

    return None


def delete_text_block_fallback(slide_id: str, element_key: str) -> dict[str, Any] | None:
    data, working_path = read_text_blocks_for_edit(slide_id)
    blocks, container = get_text_blocks_container(data)

    if not isinstance(blocks, list):
        return None

    for index, block in enumerate(list(blocks)):
        if not isinstance(block, dict):
            continue

        keys = {
            text_block_key(block, index),
            str(block.get("id") or ""),
            str(block.get("block_id") or ""),
            str(block.get("source_block_id") or ""),
            str(block.get("source_id") or ""),
            str(block.get("name") or ""),
        }

        if str(element_key) not in keys:
            continue

        removed = blocks.pop(index)
        write_text_blocks_working(working_path, data)

        return {
            "container": container or "list",
            "path": rel(working_path),
            "blocks": blocks,
            "data": data,
            "removed": removed,
        }

    return None



@app.route("/api/rebuild-spec/<slide_id>/element-style", methods=["POST"])
def api_update_rebuild_element_style(slide_id: str):
    if not re.fullmatch(r"slide_\d{3,}", str(slide_id or "")):
        return jsonify({"error": "invalid slide_id"}), 400

    payload = request.get_json(silent=True) or {}
    element_key = str(payload.get("element_key") or "").strip()
    text_block_key = str(payload.get("text_block_key") or "").strip()
    style_ref = str(payload.get("style_ref") or "").strip()
    role = str(payload.get("role") or "").strip()

    if not element_key:
        return jsonify({"error": "element_key is required"}), 400
    if not style_ref:
        return jsonify({"error": "style_ref is required"}), 400

    path = JSON_DIR / "slides" / f"{slide_id}_rebuild_spec.json"
    data = read_json(path, {})

    if not isinstance(data, dict):
        return jsonify({"error": "invalid rebuild_spec"}), 400

    elements, container = get_rebuild_elements_container(data)
    if not isinstance(elements, list):
        return jsonify({"error": "rebuild elements not found"}), 404

    for index, el in enumerate(elements):
        if not isinstance(el, dict):
            continue
        if rebuild_element_key(el, index) != element_key:
            continue

        el["style_ref"] = style_ref
        if role:
            el["role"] = role

        text_fallback = update_text_block_style_fallback(
            slide_id,
            text_block_key or element_key,
            style_ref,
            role,
        )

        write_rebuild_spec(path, data)
        response = {
            "slide_id": slide_id,
            "element_key": element_key,
            "text_block_key": text_block_key,
            "style_ref": style_ref,
            "role": role,
            "container": container,
            "data": data,
        }

        if text_fallback:
            response["updated_text_blocks"] = True
            response["blocks"] = text_fallback["blocks"]
            response["text_blocks_path"] = text_fallback["path"]

        return jsonify(response)

    fallback_key = text_block_key or element_key
    fallback = update_text_block_style_fallback(slide_id, fallback_key, style_ref, role)
    if fallback:
        return jsonify({
            "slide_id": slide_id,
            "element_key": element_key,
            "style_ref": style_ref,
            "role": role,
            "updated_target": "text_blocks",
            "container": fallback["container"],
            "path": fallback["path"],
            "blocks": fallback["blocks"],
            "data": data,
        })

    return jsonify({"error": f"element not found: {element_key}"}), 404


@app.route("/api/rebuild-spec/<slide_id>/element-delete", methods=["POST"])
def api_delete_rebuild_element(slide_id: str):
    if not re.fullmatch(r"slide_\d{3,}", str(slide_id or "")):
        return jsonify({"error": "invalid slide_id"}), 400

    payload = request.get_json(silent=True) or {}
    element_key = str(payload.get("element_key") or "").strip()

    if not element_key:
        return jsonify({"error": "element_key is required"}), 400

    path = JSON_DIR / "slides" / f"{slide_id}_rebuild_spec.json"
    data = read_json(path, {})

    if not isinstance(data, dict):
        return jsonify({"error": "invalid rebuild_spec"}), 400

    elements, container = get_rebuild_elements_container(data)
    if not isinstance(elements, list):
        return jsonify({"error": "rebuild elements not found"}), 404

    for index, el in enumerate(list(elements)):
        if not isinstance(el, dict):
            continue
        if rebuild_element_key(el, index) != element_key:
            continue

        removed = elements.pop(index)
        write_rebuild_spec(path, data)
        return jsonify({
            "slide_id": slide_id,
            "element_key": element_key,
            "removed": removed,
            "container": container,
            "data": data,
        })

    fallback = delete_text_block_fallback(slide_id, element_key)
    if fallback:
        return jsonify({
            "slide_id": slide_id,
            "element_key": element_key,
            "updated_target": "text_blocks",
            "container": fallback["container"],
            "path": fallback["path"],
            "blocks": fallback["blocks"],
            "removed": fallback["removed"],
            "data": data,
        })

    return jsonify({"error": f"element not found: {element_key}"}), 404




# ─────────────────────────────────────────────────────────────
# Manual Image Asset Clipping
# ─────────────────────────────────────────────────────────────

def is_safe_slide_id(slide_id: str) -> bool:
    return bool(re.fullmatch(r"slide_\d{3,}", str(slide_id or "")))


def asset_dir_for_slide(slide_id: str) -> Path:
    return ASSETS_DIR / slide_id


def asset_manifest_path(slide_id: str) -> Path:
    return asset_dir_for_slide(slide_id) / "assets_manifest.json"


def read_assets_manifest(slide_id: str) -> dict[str, Any]:
    path = asset_manifest_path(slide_id)
    if not path.exists():
        return {"slide_id": slide_id, "assets": []}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        data = {"slide_id": slide_id, "assets": []}
    if not isinstance(data, dict):
        data = {"slide_id": slide_id, "assets": []}
    data.setdefault("slide_id", slide_id)
    if not isinstance(data.get("assets"), list):
        data["assets"] = []
    return data


def write_assets_manifest(slide_id: str, data: dict[str, Any]) -> None:
    asset_dir = asset_dir_for_slide(slide_id)
    asset_dir.mkdir(parents=True, exist_ok=True)
    data["slide_id"] = slide_id
    data.setdefault("assets", [])
    asset_manifest_path(slide_id).write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def find_source_image_for_slide(slide_id: str) -> Path | None:
    for p in get_source_files():
        if slide_id_from_source(p) == slide_id:
            return p
    return None


def next_asset_filename(slide_id: str) -> str:
    """
    New assets use slide-scoped filenames:
      slide_004_asset_001.png

    Legacy files such as asset_001.png remain readable because manifests keep
    their exact filenames. This function only affects newly-created assets.
    """
    asset_dir = asset_dir_for_slide(slide_id)
    asset_dir.mkdir(parents=True, exist_ok=True)

    used_numbers = set()

    patterns = [
        re.compile(r"^asset_(\d+)\.png$"),
        re.compile(rf"^{re.escape(slide_id)}_asset_(\d+)\.png$"),
    ]

    for path in asset_dir.glob("*.png"):
        for pat in patterns:
            m = pat.match(path.name)
            if m:
                try:
                    used_numbers.add(int(m.group(1)))
                except Exception:
                    pass

    manifest = read_assets_manifest(slide_id)
    for item in manifest.get("assets", []):
        filename = item.get("filename", "")
        for pat in patterns:
            m = pat.match(filename)
            if m:
                try:
                    used_numbers.add(int(m.group(1)))
                except Exception:
                    pass

    n = 1
    while n in used_numbers:
        n += 1

    while True:
        name = f"{slide_id}_asset_{n:03d}.png"
        if not (asset_dir / name).exists():
            return name
        n += 1


def add_asset_urls(slide_id: str, manifest: dict[str, Any]) -> dict[str, Any]:
    for item in manifest.get("assets", []):
        filename = item.get("filename")
        if filename:
            item["url"] = f"/api/assets/{slide_id}/{filename}"
    return manifest


def get_asset_from_manifest(slide_id: str, asset_id: str) -> dict[str, Any] | None:
    manifest = read_assets_manifest(slide_id)
    for item in manifest.get("assets", []):
        if item.get("asset_id") == asset_id:
            return item
    return None




# ─────────────────────────────────────────────────────────────
# Python Auto Asset Candidates API
# ─────────────────────────────────────────────────────────────

def asset_candidates_path(slide_id: str) -> Path:
    return JSON_DIR / "slides" / f"{slide_id}_asset_candidates.json"


def read_asset_candidates(slide_id: str) -> dict[str, Any]:
    path = asset_candidates_path(slide_id)
    if not path.exists():
        return {
            "slide_id": slide_id,
            "candidates": [],
            "source": "not_generated",
        }

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        data = {
            "slide_id": slide_id,
            "candidates": [],
            "source": "invalid_json",
        }

    if not isinstance(data, dict):
        data = {"slide_id": slide_id, "candidates": []}

    data.setdefault("slide_id", slide_id)
    if not isinstance(data.get("candidates"), list):
        data["candidates"] = []

    return data


def write_asset_candidates(slide_id: str, data: dict[str, Any]) -> None:
    path = asset_candidates_path(slide_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    data["slide_id"] = slide_id
    data.setdefault("candidates", [])
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def find_asset_candidate(slide_id: str, candidate_id: str) -> dict[str, Any] | None:
    data = read_asset_candidates(slide_id)
    for item in data.get("candidates", []):
        if item.get("candidate_id") == candidate_id:
            return item
    return None



def update_asset_candidate_bbox(
    slide_id: str,
    candidate_id: str,
    bbox_px: list[int],
) -> dict[str, Any] | None:
    data = read_asset_candidates(slide_id)

    try:
        x, y, w, h = [int(round(float(v))) for v in bbox_px]
    except Exception as exc:
        raise ValueError("bbox_px values must be numeric") from exc

    if w <= 1 or h <= 1:
        raise ValueError("bbox size is too small")

    source_image = find_source_image_for_slide(slide_id)
    if not source_image or not source_image.exists():
        raise FileNotFoundError(f"source image not found for {slide_id}")

    with Image.open(source_image) as img:
        img_w, img_h = img.size

    x = max(0, min(x, img_w - 1))
    y = max(0, min(y, img_h - 1))
    w = max(1, min(w, img_w - x))
    h = max(1, min(h, img_h - y))

    if w <= 1 or h <= 1:
        raise ValueError("bbox area is outside source image")

    target = None
    for item in data.get("candidates", []):
        if item.get("candidate_id") == candidate_id:
            item["bbox_px"] = [x, y, w, h]
            target = item
            break

    if target is None:
        return None

    write_asset_candidates(slide_id, data)
    return target

def create_asset_from_bbox(
    slide_id: str,
    bbox: list[Any],
    created_by: str,
    source_candidate_id: str | None = None,
) -> dict[str, Any]:
    source_image = find_source_image_for_slide(slide_id)
    if not source_image or not source_image.exists():
        raise FileNotFoundError(f"source image not found for {slide_id}")

    if not isinstance(bbox, list) or len(bbox) != 4:
        raise ValueError("bbox_px must be [x, y, w, h]")

    try:
        x, y, w, h = [int(round(float(v))) for v in bbox]
    except Exception as exc:
        raise ValueError("bbox_px values must be numeric") from exc

    if w <= 1 or h <= 1:
        raise ValueError("clip size is too small")

    with Image.open(source_image) as img:
        img_w, img_h = img.size

        x = max(0, min(x, img_w - 1))
        y = max(0, min(y, img_h - 1))
        w = max(1, min(w, img_w - x))
        h = max(1, min(h, img_h - y))

        if w <= 1 or h <= 1:
            raise ValueError("clip area is outside source image")

        crop = img.crop((x, y, x + w, y + h))
        filename = next_asset_filename(slide_id)
        asset_dir = asset_dir_for_slide(slide_id)
        asset_dir.mkdir(parents=True, exist_ok=True)
        out_path = asset_dir / filename
        crop.save(out_path)

    manifest = read_assets_manifest(slide_id)
    asset_id = Path(filename).stem

    asset = {
        "asset_id": asset_id,
        "type": "image_clip",
        "filename": filename,
        "bbox_px": [x, y, w, h],
        "source_image": rel(source_image),
        "created_by": created_by,
        "use_in_pptx": False,
        "created_at": datetime.now().isoformat(timespec="seconds"),
        "url": f"/api/assets/{slide_id}/{filename}",
    }

    if source_candidate_id:
        asset["source_candidate_id"] = source_candidate_id

    manifest.setdefault("assets", []).append(asset)
    write_assets_manifest(slide_id, manifest)

    return asset





def normalize_font_label(name: str) -> str:
    name = str(name or "").strip()
    if not name:
        return ""

    # Remove common style suffixes from file-derived names.
    for suffix in [
        "-Regular", " Regular", "-Bold", " Bold", "-Medium", " Medium",
        "-Light", " Light", "-Italic", " Italic", "-Semibold", " Semibold",
        "-DemiBold", " DemiBold", "-Black", " Black"
    ]:
        if name.endswith(suffix):
            name = name[: -len(suffix)]

    return name.strip()


def detected_font_dirs() -> list[Path]:
    import platform

    system = platform.system().lower()
    home = Path.home()

    dirs = []

    if system == "darwin":
        dirs.extend([
            Path("/System/Library/Fonts"),
            Path("/Library/Fonts"),
            home / "Library" / "Fonts",
        ])
    elif system == "windows":
        win_dir = Path(os.environ.get("WINDIR", r"C:\Windows"))
        dirs.append(win_dir / "Fonts")
    else:
        dirs.extend([
            Path("/usr/share/fonts"),
            Path("/usr/local/share/fonts"),
            home / ".fonts",
            home / ".local" / "share" / "fonts",
        ])

    return [d for d in dirs if d.exists()]


def extract_font_family_from_file(path: Path) -> str:
    # Best effort:
    # 1. Try fontTools if installed.
    # 2. Fallback to filename stem.
    try:
        from fontTools.ttLib import TTFont, TTCollection

        def name_from_table(font):
            names = font["name"].names
            # Prefer family name entries.
            for name_id in [1, 16, 4]:
                for n in names:
                    if n.nameID == name_id:
                        try:
                            value = n.toUnicode().strip()
                            if value:
                                return value
                        except Exception:
                            continue
            return ""

        if path.suffix.lower() == ".ttc":
            collection = TTCollection(str(path))
            if collection.fonts:
                value = name_from_table(collection.fonts[0])
                if value:
                    return normalize_font_label(value)
        else:
            font = TTFont(str(path), lazy=True)
            value = name_from_table(font)
            if value:
                return normalize_font_label(value)

    except Exception:
        pass

    return normalize_font_label(path.stem)


@app.route("/api/system/fonts")
def api_system_fonts():
    favorite_fonts = [
        "Yu Gothic",
        "Yu Mincho",
        "Hiragino Sans",
        "Hiragino Kaku Gothic ProN",
        "Meiryo",
        "Noto Sans JP",
        "Noto Serif JP",
        "Arial",
        "Calibri",
    ]

    detected = []
    exts = {".ttf", ".otf", ".ttc"}

    for font_dir in detected_font_dirs():
        try:
            for path in font_dir.rglob("*"):
                if path.suffix.lower() not in exts:
                    continue

                label = extract_font_family_from_file(path)
                if label:
                    detected.append(label)
        except Exception:
            continue

    seen = set()
    ordered = []

    for name in favorite_fonts + sorted(detected):
        key = name.lower()
        if key in seen:
            continue
        seen.add(key)
        ordered.append(name)

    return jsonify({
        "favorite_fonts": favorite_fonts,
        "detected_fonts": sorted(set(detected)),
        "fonts": ordered,
        "count": len(ordered),
    })



def _hex_from_rgb(rgb):
    r, g, b = [max(0, min(255, int(v))) for v in rgb[:3]]
    return f"{r:02X}{g:02X}{b:02X}"


def _rgb_distance(a, b):
    return sum((int(a[i]) - int(b[i])) ** 2 for i in range(3)) ** 0.5


def _is_low_signal_color(rgb):
    r, g, b = [int(v) for v in rgb[:3]]
    mx = max(r, g, b)
    mn = min(r, g, b)

    # Fully near-white and near-black often dominate screenshots,
    # but we still keep some neutral colors later from theme styles.
    if mx >= 246 and mn >= 238:
        return True

    if mx <= 12:
        return True

    return False


def _quantized_rgb(rgb, step=24):
    r, g, b = [int(v) for v in rgb[:3]]
    return (
        round(r / step) * step,
        round(g / step) * step,
        round(b / step) * step,
    )


def extract_representative_palette_from_image(image_path: Path, max_colors: int = 12):
    """
    Extract a lightweight representative palette from an existing slide image.
    No AI. No sklearn. Pillow only.
    """
    try:
        from PIL import Image
    except Exception:
        return []

    if not image_path.exists():
        return []

    try:
        img = Image.open(image_path).convert("RGB")
    except Exception:
        return []

    # Keep this cheap. We only need a color suggestion palette.
    img.thumbnail((220, 220))

    counts = {}
    pixels = list(img.getdata())

    # Sample every few pixels for speed and stability.
    for i, rgb in enumerate(pixels):
        if i % 3 != 0:
            continue

        if _is_low_signal_color(rgb):
            continue

        q = _quantized_rgb(rgb)
        counts[q] = counts.get(q, 0) + 1

    if not counts:
        return []

    ranked = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)

    selected = []
    for rgb, count in ranked:
        if len(selected) >= max_colors:
            break

        # Avoid near-duplicates.
        if any(_rgb_distance(rgb, prev) < 34 for prev in selected):
            continue

        selected.append(rgb)

    return [_hex_from_rgb(rgb) for rgb in selected]


def _theme_style_colors():
    path = JSON_DIR / "sector_defaults.json"
    if not path.exists():
        return []

    try:
        data = json.loads(path.read_text(encoding="utf-8-sig"))
    except Exception:
        return []

    styles = data.get("theme", {}).get("styles", {})
    colors = []

    if isinstance(styles, dict):
        for style in styles.values():
            if not isinstance(style, dict):
                continue
            color = str(style.get("color") or "").strip().replace("#", "").upper()
            if len(color) == 6:
                colors.append(color)

    return colors


def _find_slide_palette_source(slide_id: str):
    """
    Best-effort source search for palette extraction.

    Priority:
    1. Exact slide_id image files, especially source/slide_XXX.png
    2. Files whose filename/stem contains slide_id
    3. JSON-referenced image paths only when they contain slide_id
    4. No cross-slide fallback, to avoid slide_002 using slide_001 image
    """
    slide_id = str(slide_id or "").strip()
    if not slide_id:
        return None

    exts = ["png", "jpg", "jpeg", "webp"]

    # 1. Exact candidate paths.
    direct_candidates = []

    for base in [
        Path("source"),
        Path("sources"),
        Path("slides"),
        Path("input"),
        Path("inputs"),
        Path("images"),
        Path("assets"),
        Path("output"),
        Path("outputs"),
    ]:
        for ext in exts:
            direct_candidates.extend([
                base / f"{slide_id}.{ext}",
                base / f"{slide_id}_original.{ext}",
                base / f"{slide_id}_preview.{ext}",
                base / f"{slide_id}_source.{ext}",
            ])

    for c in direct_candidates:
        if c.exists() and c.is_file():
            return c

    # 2. Search likely folders, but only accept files containing slide_id.
    search_roots = [
        Path("source"),
        Path("sources"),
        Path("slides"),
        Path("input"),
        Path("inputs"),
        Path("images"),
        Path("assets"),
        Path("output"),
        Path("outputs"),
    ]

    matched = []

    for root in search_roots:
        if not root.exists():
            continue

        try:
            for ext in exts:
                for path in root.rglob(f"*.{ext}"):
                    path_str = str(path)
                    name = path.name
                    stem = path.stem

                    if slide_id in path_str or slide_id in name or slide_id in stem:
                        matched.append(path)
        except Exception:
            continue

    if matched:
        # Prefer files closer to the root and with exact stem match.
        matched = sorted(
            matched,
            key=lambda path: (
                0 if path.stem == slide_id else 1,
                len(path.parts),
                str(path)
            )
        )
        return matched[0]

    # 3. JSON references. Only accept referenced images that contain slide_id.
    json_candidates = []

    for spec_path in [
        JSON_DIR / "deck_manifest.json",
        JSON_DIR / "slides" / f"{slide_id}_rebuild_spec.json",
        JSON_DIR / "slides" / f"{slide_id}_extraction_plan.json",
    ]:
        if not spec_path.exists():
            continue

        try:
            data = json.loads(spec_path.read_text(encoding="utf-8-sig"))
        except Exception:
            continue

        raw = json.dumps(data, ensure_ascii=False)

        import re
        for m in re.finditer(r'[^"\\]+?\.(?:png|jpg|jpeg|webp)', raw, flags=re.I):
            raw_path = m.group(0)
            if slide_id not in raw_path:
                continue

            json_candidates.append(Path(raw_path))

    for c in json_candidates:
        if c.exists() and c.is_file():
            return c

        cc = Path(str(c).lstrip("/"))
        if cc.exists() and cc.is_file():
            return cc

    return None


@app.route("/api/slides/<slide_id>/palette")
def api_slide_palette(slide_id: str):
    source = _find_slide_palette_source(slide_id)

    image_colors = []
    if source:
        image_colors = extract_representative_palette_from_image(source, max_colors=14)

    theme_colors = _theme_style_colors()

    # Merge: image-derived colors first, then existing theme colors as fallback/context.
    merged = []
    seen = set()

    for color in image_colors + theme_colors + ["333333", "666666", "999999", "FFFFFF", "000000"]:
        c = str(color or "").strip().replace("#", "").upper()
        if len(c) != 6:
            continue
        if c in seen:
            continue
        seen.add(c)
        merged.append(c)

    return jsonify({
        "slide_id": slide_id,
        "source": str(source) if source else None,
        "image_palette": image_colors,
        "theme_palette": theme_colors,
        "palette": merged[:18],
        "count": len(merged[:18]),
        "method": "pillow_quantized_frequency",
    })



def _default_theme_tokens():
    return {
        "Main": "0B3B8C",
        "Sub": "64748B",
        "Accent": "F59E0B",
        "Background.Light": "F8FAFC",
        "Background.Dark": "111827",
        "Surface.Light": "FFFFFF",
        "Surface.Dark": "1F2937",
        "Text.OnLight": "111827",
        "Text.OnDark": "F9FAFB",
        "MutedText.OnLight": "6B7280",
        "MutedText.OnDark": "CBD5E1",
        "Border.OnLight": "D1D5DB",
        "Border.OnDark": "334155",
        "Highlight": "FACC15",
        "Warning": "F97316",
        "Success": "22C55E",
        "Danger": "EF4444",
    }


def _normalize_theme_tokens(raw):
    if not isinstance(raw, dict):
        return {}

    normalized = {}
    allowed = set(_default_theme_tokens().keys())

    for key, value in raw.items():
        token = str(key or "").strip()
        if token not in allowed:
            continue

        color = str(value or "").strip().replace("#", "").upper()
        if len(color) == 6 and all(ch in "0123456789ABCDEF" for ch in color):
            normalized[token] = color

    return normalized


@app.route("/api/theme/tokens", methods=["GET"])
def api_theme_tokens():
    path = JSON_DIR / "sector_defaults.json"

    data = {}
    if path.exists():
        try:
            data = json.loads(path.read_text(encoding="utf-8-sig"))
        except Exception as exc:
            return jsonify({"error": f"failed to read sector_defaults.json: {exc}"}), 500

    theme = data.get("theme", {}) if isinstance(data, dict) else {}

    tokens = _default_theme_tokens()
    tokens.update(_normalize_theme_tokens(theme.get("tokens", {})))

    return jsonify({
        "tokens": tokens,
        "tokens_meta": theme.get("tokens_meta", {}),
        "sampled_colors": theme.get("sampled_colors", {}),
        "source": "json/sector_defaults.json",
        "count": len(tokens),
    })


@app.route("/api/theme/tokens", methods=["POST"])
def api_save_theme_tokens():
    payload = request.get_json(silent=True) or {}
    incoming = _normalize_theme_tokens(payload.get("tokens", {}))

    if not incoming:
        return jsonify({"error": "valid tokens are required"}), 400

    path = JSON_DIR / "sector_defaults.json"

    data = {}
    if path.exists():
        try:
            data = json.loads(path.read_text(encoding="utf-8-sig"))
        except Exception as exc:
            return jsonify({"error": f"failed to read sector_defaults.json: {exc}"}), 500

    if not isinstance(data, dict):
        data = {}

    theme = data.setdefault("theme", {})

    tokens = _default_theme_tokens()
    tokens.update(_normalize_theme_tokens(theme.get("tokens", {})))
    tokens.update(incoming)

    theme["tokens"] = tokens
    theme["tokens_meta"] = {
        "updated_at": datetime.now().isoformat(timespec="seconds"),
        "source": "design_system_panel",
        "sampled_slide_id": str(payload.get("sampled_slide_id") or ""),
        "sampled_source": str(payload.get("sampled_source") or ""),
    }

    sampled_colors = payload.get("sampled_colors")
    if isinstance(sampled_colors, list):
        cleaned = []
        for color in sampled_colors:
            c = str(color or "").strip().replace("#", "").upper()
            if len(c) == 6 and all(ch in "0123456789ABCDEF" for ch in c):
                cleaned.append(c)
        theme["sampled_colors"] = {
            "colors": cleaned[:64],
            "updated_at": datetime.now().isoformat(timespec="seconds"),
            "slide_id": str(payload.get("sampled_slide_id") or ""),
            "source": str(payload.get("sampled_source") or ""),
        }

    theme_file_updated = False
    current_theme_id = ""

    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception as exc:
        return jsonify({"error": f"failed to write sector_defaults.json: {exc}"}), 500

    # Keep the currently applied saved theme file in sync with sector_defaults.json.
    # Theme Gallery previews read json/themes/*.json, so saving tokens only to
    # sector_defaults.json would leave saved theme cards stale.
    try:
        current_state = _read_theme_state()
        current_theme_id = _safe_theme_id(current_state.get("theme_id") or "")
        if current_theme_id:
            theme_path = _themes_dir() / f"{current_theme_id}.json"
            if theme_path.exists():
                theme_file = json.loads(theme_path.read_text(encoding="utf-8-sig"))
                theme_file_theme = theme_file.setdefault("theme", {})
                theme_file_theme["tokens"] = tokens
                theme_file_theme["tokens_meta"] = theme.get("tokens_meta", {})
                theme_file_theme["sampled_colors"] = theme.get("sampled_colors", {})
                theme_file["updated_at"] = datetime.now().isoformat(timespec="seconds")
                theme_path.write_text(json.dumps(theme_file, ensure_ascii=False, indent=2), encoding="utf-8")
                theme_file_updated = True
    except Exception:
        # Do not fail the main save. sector_defaults.json is the source of truth.
        theme_file_updated = False

    return jsonify({
        "ok": True,
        "tokens": tokens,
        "tokens_meta": theme.get("tokens_meta", {}),
        "source": "json/sector_defaults.json",
        "current_theme_id": current_theme_id,
        "theme_file_updated": theme_file_updated,
    })


@app.route("/api/theme/styles")
def api_theme_styles():
    path = JSON_DIR / "sector_defaults.json"

    if not path.exists():
        return jsonify({
            "theme": {"styles": {}},
            "styles": {},
            "source": str(path),
            "exists": False,
        })

    try:
        data = json.loads(path.read_text(encoding="utf-8-sig"))
    except Exception as exc:
        return jsonify({"error": f"failed to read sector_defaults.json: {exc}"}), 500

    styles = data.get("theme", {}).get("styles", {})

    return jsonify({
        "theme": data.get("theme", {}),
        "styles": styles,
        "style_count": len(styles) if isinstance(styles, dict) else 0,
        "source": str(path),
        "exists": True,
    })





def _build_theme_style_catalog(styles):
    """
    Role Style Catalog grouping.
    Internal style_ref keys are not renamed.
    UI categories are derived from existing sector_defaults.json keys.
    """
    groups = {
        "Main": [],
        "Meta / Footer": [],
        "Card": [],
        "Card / Light": [],
        "Card / Dark": [],
        "Other": [],
    }

    for ref in styles.keys():
        if ref.startswith(("left.", "center.", "right.")):
            groups["Main"].append(ref)
        elif ref in ("footer.note", "meta.small"):
            groups["Meta / Footer"].append(ref)
        elif ref.startswith("card.") and ref.endswith(".on_light"):
            groups["Card / Light"].append(ref)
        elif ref.startswith("card.") and ref.endswith(".on_dark"):
            groups["Card / Dark"].append(ref)
        elif ref.startswith("card."):
            groups["Card"].append(ref)
        else:
            groups["Other"].append(ref)

    preferred_order = [
        "left.h1", "left.h2", "left.p",
        "center.h1", "center.h2", "center.p",
        "right.h1", "right.h2", "right.p",
        "footer.note", "meta.small",
        "card.meta", "card.title", "card.body", "card.note",
        "card.meta.on_light", "card.title.on_light", "card.body.on_light", "card.note.on_light",
        "card.meta.on_dark", "card.title.on_dark", "card.body.on_dark", "card.note.on_dark",
    ]

    order_map = {name: i for i, name in enumerate(preferred_order)}

    catalog = []
    for category, refs in groups.items():
        if not refs:
            continue
        refs = sorted(refs, key=lambda x: (order_map.get(x, 999), x))
        catalog.append({
            "category": category,
            "style_refs": refs,
        })

    return catalog








def _theme_state_path():
    return JSON_DIR / "theme_state.json"


def _read_theme_state():
    path = _theme_state_path()
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _write_theme_state(state):
    path = _theme_state_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
    return state


def _themes_dir():
    path = JSON_DIR / "themes"
    path.mkdir(parents=True, exist_ok=True)
    return path


THEME_GALLERY_MAX_THEMES = 6


def _theme_file_count():
    try:
        return len(list(_themes_dir().glob("*.json")))
    except Exception:
        return 0


def _safe_theme_id(value: str) -> str:
    import re
    value = str(value or "").strip().lower()
    value = re.sub(r"[^a-z0-9_-]+", "_", value)
    value = re.sub(r"_+", "_", value).strip("_")
    return value or "theme"


def _read_sector_defaults_theme():
    path = JSON_DIR / "sector_defaults.json"
    if not path.exists():
        raise FileNotFoundError("sector_defaults.json not found")
    data = json.loads(path.read_text(encoding="utf-8"))
    return data.get("theme", {})


def _write_sector_defaults_theme(theme):
    path = JSON_DIR / "sector_defaults.json"
    if path.exists():
        data = json.loads(path.read_text(encoding="utf-8"))
    else:
        data = {}
    data["theme"] = theme
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return data




def _theme_preview_text_styles(theme_data):
    """
    Small card preview typography. Font size is intentionally not reflected.
    """
    styles = theme_data.get("styles", {}) if isinstance(theme_data, dict) else {}

    def pick_style(*keys):
        for key in keys:
            style = styles.get(key)
            if isinstance(style, dict):
                return style
        return {}

    def compact_style(style):
        color = str(style.get("color") or "").strip().replace("#", "").upper()
        if len(color) != 6 or not all(ch in "0123456789ABCDEF" for ch in color):
            color = ""

        align = str(style.get("align") or "").strip().lower()
        if align not in {"left", "center", "right"}:
            align = ""

        return {
            "font_family": str(style.get("font_family") or "").strip(),
            "color": color,
            "bold": bool(style.get("bold")),
            "italic": bool(style.get("italic")),
            "align": align,
        }

    h1_style = compact_style(pick_style("left.h1", "h1", "title", "left.h2"))
    h2_style = compact_style(pick_style("left.h2", "h2", "subtitle", "left.h1"))
    p_style = compact_style(pick_style("left.p", "body", "p", "footer.note"))

    return {
        "h1": h1_style,
        "h2": h2_style,
        "p": p_style,

        # Backward-compatible aliases used by older card preview code.
        "title": h1_style,
        "body": p_style,
    }


@app.route("/api/themes", methods=["GET"])
def api_list_themes():
    themes = []
    for path in sorted(_themes_dir().glob("*.json")):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue

        stat = path.stat()
        theme_data = data.get("theme", {}) if isinstance(data.get("theme", {}), dict) else {}

        preview_tokens = _default_theme_tokens()
        preview_tokens.update(_normalize_theme_tokens(theme_data.get("tokens", {})))
        preview_tokens = {
            "Main": preview_tokens.get("Main"),
            "Sub": preview_tokens.get("Sub"),
            "Accent": preview_tokens.get("Accent"),
        }

        themes.append({
            "theme_id": data.get("theme_id") or path.stem,
            "theme_name": data.get("theme_name") or path.stem,
            "version": data.get("version", 1),
            "saved_at": data.get("saved_at"),
            "filename": path.name,
            "updated_at": datetime.fromtimestamp(stat.st_mtime).isoformat(timespec="seconds"),
            "style_count": len(theme_data.get("styles", {})),
            "preview_tokens": preview_tokens,
            "preview_styles": _theme_preview_text_styles(theme_data),
        })

    return jsonify({
        "themes": themes,
        "current_theme": _read_theme_state(),
        "theme_count": len(themes),
        "max_themes": THEME_GALLERY_MAX_THEMES,
    })


@app.route("/api/themes/save", methods=["POST"])
def api_save_theme():
    payload = request.get_json(silent=True) or {}

    theme_name = str(payload.get("theme_name") or "").strip()
    theme_id = str(payload.get("theme_id") or "").strip()

    if not theme_name:
        theme_name = "User Theme"

    if not theme_id:
        base_id = _safe_theme_id(theme_name)
        theme_id = base_id
        candidate = _themes_dir() / f"{theme_id}.json"
        if candidate.exists():
            theme_id = f"{base_id}_{datetime.now().strftime('%y%m%d_%H%M%S')}"

    theme_id = _safe_theme_id(theme_id)

    try:
        theme = _read_sector_defaults_theme()
    except Exception as exc:
        return jsonify({"error": f"failed to read sector_defaults theme: {exc}"}), 500

    out = {
        "theme_id": theme_id,
        "theme_name": theme_name,
        "version": 1,
        "saved_at": datetime.now().isoformat(timespec="seconds"),
        "source": {
            "type": "sector_defaults",
            "path": "json/sector_defaults.json",
        },
        "theme": theme,
    }

    path = _themes_dir() / f"{theme_id}.json"

    if not path.exists() and _theme_file_count() >= THEME_GALLERY_MAX_THEMES:
        return jsonify({
            "error": f"theme limit reached: {THEME_GALLERY_MAX_THEMES}",
            "max_themes": THEME_GALLERY_MAX_THEMES,
        }), 400

    try:
        path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception as exc:
        return jsonify({"error": f"failed to write theme: {exc}"}), 500

    return jsonify({
        "ok": True,
        "theme": {
            "theme_id": theme_id,
            "theme_name": theme_name,
            "filename": path.name,
            "style_count": len(theme.get("styles", {})),
        },
    })


@app.route("/api/themes/load", methods=["POST"])
def api_load_theme():
    payload = request.get_json(silent=True) or {}
    theme_id = _safe_theme_id(payload.get("theme_id") or "")

    if not theme_id:
        return jsonify({"error": "theme_id is required"}), 400

    path = _themes_dir() / f"{theme_id}.json"

    if not path.exists():
        return jsonify({"error": f"theme not found: {theme_id}"}), 404

    try:
        theme_file = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        return jsonify({"error": f"failed to read theme: {exc}"}), 500

    theme = theme_file.get("theme")
    if not isinstance(theme, dict):
        return jsonify({"error": "invalid theme file: theme object missing"}), 400

    try:
        data = _write_sector_defaults_theme(theme)
    except Exception as exc:
        return jsonify({"error": f"failed to write sector_defaults.json: {exc}"}), 500

    styles = data.get("theme", {}).get("styles", {})

    applied_theme = {
        "theme_id": theme_file.get("theme_id") or theme_id,
        "theme_name": theme_file.get("theme_name") or theme_id,
        "filename": path.name,
        "loaded_at": datetime.now().isoformat(timespec="seconds"),
        "style_count": len(styles),
    }
    _write_theme_state(applied_theme)

    result = {
        "ok": True,
        "theme_id": applied_theme["theme_id"],
        "theme_name": applied_theme["theme_name"],
        "style_count": len(styles),
        "styles": styles,
        "current_theme": applied_theme,
    }

    # Reuse role style catalog builder if present.
    if "_build_theme_style_catalog" in globals():
        result["catalog"] = _build_theme_style_catalog(styles)

    return jsonify(result)







@app.route("/api/themes/duplicate", methods=["POST"])
def api_duplicate_theme():
    payload = request.get_json(silent=True) or {}

    source_theme_id = _safe_theme_id(payload.get("theme_id") or "")
    new_theme_name = str(payload.get("theme_name") or "").strip()

    if not source_theme_id:
        return jsonify({"error": "theme_id is required"}), 400

    if _theme_file_count() >= THEME_GALLERY_MAX_THEMES:
        return jsonify({
            "error": f"theme limit reached: {THEME_GALLERY_MAX_THEMES}",
            "max_themes": THEME_GALLERY_MAX_THEMES,
        }), 400

    source_path = _themes_dir() / f"{source_theme_id}.json"

    if not source_path.exists():
        return jsonify({"error": f"theme not found: {source_theme_id}"}), 404

    try:
        data = json.loads(source_path.read_text(encoding="utf-8"))
    except Exception as exc:
        return jsonify({"error": f"failed to read theme: {exc}"}), 500

    if not new_theme_name:
        new_theme_name = f'{data.get("theme_name") or source_theme_id} Copy'

    base_id = _safe_theme_id(new_theme_name)
    new_theme_id = base_id

    candidate = _themes_dir() / f"{new_theme_id}.json"
    if candidate.exists():
        new_theme_id = f"{base_id}_{datetime.now().strftime('%y%m%d_%H%M%S')}"
        candidate = _themes_dir() / f"{new_theme_id}.json"

    data["theme_id"] = new_theme_id
    data["theme_name"] = new_theme_name
    data["saved_at"] = datetime.now().isoformat(timespec="seconds")
    data["source"] = {
        **(data.get("source") or {}),
        "copied_from": source_theme_id,
        "type": "theme_duplicate",
    }

    try:
        candidate.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception as exc:
        return jsonify({"error": f"failed to write duplicated theme: {exc}"}), 500

    return jsonify({
        "ok": True,
        "theme": {
            "theme_id": new_theme_id,
            "theme_name": new_theme_name,
            "filename": candidate.name,
            "style_count": len(data.get("theme", {}).get("styles", {})),
        }
    })


@app.route("/api/themes/rename", methods=["POST"])
def api_rename_theme():
    payload = request.get_json(silent=True) or {}

    old_theme_id = _safe_theme_id(payload.get("theme_id") or "")
    new_theme_name = str(payload.get("theme_name") or "").strip()

    if not old_theme_id:
        return jsonify({"error": "theme_id is required"}), 400

    if not new_theme_name:
        return jsonify({"error": "theme_name is required"}), 400

    old_path = _themes_dir() / f"{old_theme_id}.json"

    if not old_path.exists():
        return jsonify({"error": f"theme not found: {old_theme_id}"}), 404

    try:
        data = json.loads(old_path.read_text(encoding="utf-8"))
    except Exception as exc:
        return jsonify({"error": f"failed to read theme: {exc}"}), 500

    new_theme_id = _safe_theme_id(new_theme_name)
    new_path = _themes_dir() / f"{new_theme_id}.json"

    if new_theme_id != old_theme_id and new_path.exists():
        return jsonify({"error": f"theme already exists: {new_theme_id}"}), 409

    data["theme_id"] = new_theme_id
    data["theme_name"] = new_theme_name
    data["renamed_at"] = datetime.now().isoformat(timespec="seconds")

    try:
        new_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        if new_path != old_path:
            old_path.unlink()
    except Exception as exc:
        return jsonify({"error": f"failed to rename theme: {exc}"}), 500

    # If the renamed theme is currently loaded, update theme_state.json.
    current = _read_theme_state()
    if current.get("theme_id") == old_theme_id:
        current.update({
            "theme_id": new_theme_id,
            "theme_name": new_theme_name,
            "filename": new_path.name,
            "renamed_at": data["renamed_at"],
        })
        try:
            _write_theme_state(current)
        except Exception:
            pass

    return jsonify({
        "ok": True,
        "theme": {
            "theme_id": new_theme_id,
            "theme_name": new_theme_name,
            "filename": new_path.name,
            "style_count": len(data.get("theme", {}).get("styles", {})),
        }
    })

@app.route("/api/themes/delete", methods=["POST"])
def api_delete_theme():
    payload = request.get_json(silent=True) or {}
    theme_id = _safe_theme_id(payload.get("theme_id") or "")

    if not theme_id:
        return jsonify({"error": "theme_id is required"}), 400

    path = _themes_dir() / f"{theme_id}.json"

    if not path.exists():
        return jsonify({"error": f"theme not found: {theme_id}"}), 404

    try:
        theme_file = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        theme_file = {}

    try:
        path.unlink()
    except Exception as exc:
        return jsonify({"error": f"failed to delete theme: {exc}"}), 500

    # If the deleted theme is currently marked as loaded, clear theme_state.json.
    current = _read_theme_state()
    if current.get("theme_id") == theme_id:
        try:
            _write_theme_state({})
        except Exception:
            pass

    return jsonify({
        "ok": True,
        "theme_id": theme_id,
        "theme_name": theme_file.get("theme_name") or theme_id,
        "deleted": True,
    })

@app.route("/api/theme/style-catalog", methods=["GET"])
def api_theme_style_catalog():
    path = JSON_DIR / "sector_defaults.json"

    if not path.exists():
        return jsonify({"error": "sector_defaults.json not found"}), 404

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        return jsonify({"error": f"failed to read sector_defaults.json: {exc}"}), 500

    styles = data.get("theme", {}).get("styles", {})
    return jsonify({
        "catalog": _build_theme_style_catalog(styles),
        "styles": styles,
    })

@app.route("/api/theme/styles/<path:style_ref>", methods=["POST"])
def api_update_theme_style(style_ref: str):
    path = JSON_DIR / "sector_defaults.json"

    if not path.exists():
        return jsonify({"error": "sector_defaults.json not found"}), 404

    try:
        data = json.loads(path.read_text(encoding="utf-8-sig"))
    except Exception as exc:
        return jsonify({"error": f"failed to read sector_defaults.json: {exc}"}), 500

    styles = data.setdefault("theme", {}).setdefault("styles", {})

    if style_ref not in styles:
        return jsonify({"error": f"style_ref not found: {style_ref}"}), 404

    payload = request.get_json(silent=True) or {}

    current = styles.get(style_ref, {})
    if not isinstance(current, dict):
        current = {}

    updated = dict(current)

    if "font_family" in payload:
        value = str(payload.get("font_family") or "").strip()
        if value:
            updated["font_family"] = value

    if "font_size" in payload:
        try:
            font_size = float(payload.get("font_size"))
            if font_size <= 0:
                return jsonify({"error": "font_size must be positive"}), 400
            updated["font_size"] = int(font_size) if font_size.is_integer() else round(font_size, 2)
        except Exception:
            return jsonify({"error": "invalid font_size"}), 400

    if "bold" in payload:
        updated["bold"] = bool(payload.get("bold"))

    if "italic" in payload:
        updated["italic"] = bool(payload.get("italic"))

    if "color" in payload:
        color = str(payload.get("color") or "").strip().replace("#", "")
        if color:
            import re
            if not re.fullmatch(r"[0-9a-fA-F]{6}", color):
                return jsonify({"error": "color must be 6-digit hex"}), 400
            updated["color"] = color.upper()

    if "align" in payload:
        align = str(payload.get("align") or "").strip().lower()
        if align not in {"left", "center", "right"}:
            return jsonify({"error": "align must be left, center, or right"}), 400
        updated["align"] = align

    styles[style_ref] = updated

    theme_file_updated = False
    current_theme_id = ""

    try:
        path.write_text(
            json.dumps(data, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8"
        )
    except Exception as exc:
        return jsonify({"error": f"failed to write sector_defaults.json: {exc}"}), 500

    # Keep the currently applied saved theme file in sync with sector_defaults.json.
    # Save Style edits theme.styles[style_ref], while Theme Gallery previews read
    # json/themes/*.json. Without this sync, card typography preview can become stale.
    try:
        current_state = _read_theme_state()
        current_theme_id = _safe_theme_id(current_state.get("theme_id") or "")

        if current_theme_id:
            theme_path = _themes_dir() / f"{current_theme_id}.json"
            if theme_path.exists():
                theme_file = json.loads(theme_path.read_text(encoding="utf-8-sig"))
                theme_file_theme = theme_file.setdefault("theme", {})
                theme_file_styles = theme_file_theme.setdefault("styles", {})
                theme_file_styles[style_ref] = updated
                theme_file["updated_at"] = datetime.now().isoformat(timespec="seconds")
                theme_path.write_text(
                    json.dumps(theme_file, ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8"
                )
                theme_file_updated = True
    except Exception:
        # Do not fail the main save. sector_defaults.json remains the source of truth.
        theme_file_updated = False

    return jsonify({
        "ok": True,
        "style_ref": style_ref,
        "style": updated,
        "styles": styles,
        "current_theme_id": current_theme_id,
        "theme_file_updated": theme_file_updated,
    })

@app.route("/api/asset-candidates/<slide_id>", methods=["GET"])
def api_asset_candidates_for_slide(slide_id: str):
    if not is_safe_slide_id(slide_id):
        return jsonify({"error": "invalid slide_id"}), 400
    return jsonify(read_asset_candidates(slide_id))


def detect_asset_candidates_for_slide(slide_id: str) -> tuple[dict[str, Any], int]:
    source_image = find_source_image_for_slide(slide_id)
    if not source_image or not source_image.exists():
        return {"error": f"source image not found for {slide_id}"}, 404

    script = BASE_DIR / "scripts" / "auto_detect_asset_candidates.py"
    if not script.exists():
        return {"error": "auto_detect_asset_candidates.py not found"}, 404

    py = Path(sys.executable)
    cmd = [str(py), str(script), "--slides", slide_id]

    result = subprocess.run(
        cmd,
        cwd=BASE_DIR,
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        return {
            "error": "asset candidate detection failed",
            "returncode": result.returncode,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "cmd": cmd,
        }, 500

    data = read_asset_candidates(slide_id)
    return {
        "message": "asset candidates detected",
        "stdout": result.stdout,
        "stderr": result.stderr,
        "candidates": data,
    }, 200


@app.route("/api/asset-candidates/<slide_id>/detect", methods=["POST"])
def api_detect_asset_candidates(slide_id: str):
    if not is_safe_slide_id(slide_id):
        return jsonify({"error": "invalid slide_id"}), 400

    payload, status_code = detect_asset_candidates_for_slide(slide_id)
    return jsonify(payload), status_code



def update_asset_bbox(
    slide_id: str,
    asset_id: str,
    bbox_px: list[int],
) -> dict[str, Any] | None:
    manifest = read_assets_manifest(slide_id)

    try:
        x, y, w, h = [int(round(float(v))) for v in bbox_px]
    except Exception as exc:
        raise ValueError("bbox_px values must be numeric") from exc

    if w <= 1 or h <= 1:
        raise ValueError("bbox size is too small")

    source_image = find_source_image_for_slide(slide_id)
    if not source_image or not source_image.exists():
        raise FileNotFoundError(f"source image not found for {slide_id}")

    with Image.open(source_image) as img:
        img_w, img_h = img.size

    x = max(0, min(x, img_w - 1))
    y = max(0, min(y, img_h - 1))
    w = max(1, min(w, img_w - x))
    h = max(1, min(h, img_h - y))

    if w <= 1 or h <= 1:
        raise ValueError("bbox area is outside source image")

    target = None
    target_filename = ""

    for item in manifest.get("assets", []):
        if item.get("asset_id") == asset_id:
            target_filename = str(item.get("filename") or "")
            if not target_filename:
                raise ValueError("asset filename is missing")

            item["bbox_px"] = [x, y, w, h]
            item["updated_at"] = datetime.now().isoformat(timespec="seconds")
            item["recropped_at"] = item["updated_at"]
            target = item
            break

    if target is None:
        return None

    asset_dir = asset_dir_for_slide(slide_id)
    asset_dir.mkdir(parents=True, exist_ok=True)
    out_path = asset_dir / target_filename

    with Image.open(source_image) as img:
        crop = img.crop((x, y, x + w, y + h))
        crop.save(out_path)

    write_assets_manifest(slide_id, manifest)
    return target

def set_asset_use_in_pptx(slide_id: str, asset_id: str, use_in_pptx: bool) -> dict[str, Any] | None:
    manifest = read_assets_manifest(slide_id)

    target = None
    for item in manifest.get("assets", []):
        if item.get("asset_id") == asset_id:
            item["use_in_pptx"] = bool(use_in_pptx)
            target = item
            break

    if target is None:
        return None

    write_assets_manifest(slide_id, manifest)
    return target


def accept_candidate_as_asset(
    slide_id: str,
    candidate: dict[str, Any],
    use_in_pptx: bool = True,
) -> tuple[dict[str, Any], dict[str, Any]]:
    candidate_id = candidate.get("candidate_id")

    if candidate.get("status") == "accepted" and candidate.get("accepted_asset_id"):
        asset_id = candidate.get("accepted_asset_id")
        asset = set_asset_use_in_pptx(slide_id, asset_id, use_in_pptx)
        if asset is not None:
            return candidate, asset

    asset = create_asset_from_bbox(
        slide_id,
        candidate.get("bbox_px"),
        created_by="accepted_auto_candidate",
        source_candidate_id=candidate_id,
    )

    if use_in_pptx:
        set_asset_use_in_pptx(slide_id, asset["asset_id"], True)
        asset["use_in_pptx"] = True

    candidate["status"] = "accepted"
    candidate["accepted_asset_id"] = asset["asset_id"]
    candidate["accepted_at"] = datetime.now().isoformat(timespec="seconds")

    return candidate, asset




@app.route("/api/asset-candidates/<slide_id>/<candidate_id>/delete", methods=["POST", "DELETE"])
def api_delete_asset_candidate(slide_id: str, candidate_id: str):
    if not is_safe_slide_id(slide_id):
        return jsonify({"error": "invalid slide_id"}), 400

    data = read_asset_candidates(slide_id)
    candidates = data.get("candidates", [])

    target = None
    remaining = []
    for item in candidates:
        if item.get("candidate_id") == candidate_id:
            target = item
        else:
            remaining.append(item)

    if target is None:
        return jsonify({"error": "candidate not found"}), 404

    data["candidates"] = remaining
    write_asset_candidates(slide_id, data)

    return jsonify({
        "message": "candidate deleted",
        "deleted_candidate_id": candidate_id,
        "deleted_candidate": target,
        "candidates": data,
    })

@app.route("/api/asset-candidates/<slide_id>/<candidate_id>/bbox", methods=["POST"])
def api_update_asset_candidate_bbox(slide_id: str, candidate_id: str):
    if not is_safe_slide_id(slide_id):
        return jsonify({"error": "invalid slide_id"}), 400

    payload = request.get_json(silent=True) or {}
    bbox = payload.get("bbox_px")

    if not isinstance(bbox, list) or len(bbox) != 4:
        return jsonify({"error": "bbox_px must be [x, y, w, h]"}), 400

    try:
        candidate = update_asset_candidate_bbox(slide_id, candidate_id, bbox)
    except FileNotFoundError as exc:
        return jsonify({"error": str(exc)}), 404
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": f"failed to update candidate bbox: {exc}"}), 500

    if candidate is None:
        return jsonify({"error": "candidate not found"}), 404

    return jsonify({
        "message": "candidate bbox updated",
        "candidate": candidate,
        "candidates": read_asset_candidates(slide_id),
    })

@app.route("/api/asset-candidates/<slide_id>/<candidate_id>/accept", methods=["POST"])
def api_accept_asset_candidate(slide_id: str, candidate_id: str):
    if not is_safe_slide_id(slide_id):
        return jsonify({"error": "invalid slide_id"}), 400

    payload = request.get_json(silent=True) or {}
    use_in_pptx = bool(payload.get("use_in_pptx", True))

    data = read_asset_candidates(slide_id)
    candidate = None

    for item in data.get("candidates", []):
        if item.get("candidate_id") == candidate_id:
            candidate = item
            break

    if candidate is None:
        return jsonify({"error": "candidate not found"}), 404

    try:
        candidate, asset = accept_candidate_as_asset(
            slide_id,
            candidate,
            use_in_pptx=use_in_pptx,
        )
    except FileNotFoundError as exc:
        return jsonify({"error": str(exc)}), 404
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": f"failed to accept candidate: {exc}"}), 500

    write_asset_candidates(slide_id, data)
    manifest = read_assets_manifest(slide_id)

    return jsonify({
        "message": "candidate accepted",
        "candidate": candidate,
        "asset": asset,
        "manifest": add_asset_urls(slide_id, manifest),
        "candidates": data,
    })


@app.route("/api/asset-candidates/<slide_id>/accept-all", methods=["POST"])
def api_accept_all_asset_candidates(slide_id: str):
    if not is_safe_slide_id(slide_id):
        return jsonify({"error": "invalid slide_id"}), 400

    payload = request.get_json(silent=True) or {}
    use_in_pptx = bool(payload.get("use_in_pptx", True))

    data = read_asset_candidates(slide_id)
    accepted = []
    skipped = []

    for candidate in data.get("candidates", []):
        if not isinstance(candidate, dict):
            continue

        if candidate.get("status") == "accepted" and candidate.get("accepted_asset_id"):
            skipped.append(candidate.get("candidate_id"))
            continue

        try:
            candidate, asset = accept_candidate_as_asset(
                slide_id,
                candidate,
                use_in_pptx=use_in_pptx,
            )
            accepted.append({
                "candidate_id": candidate.get("candidate_id"),
                "asset_id": asset.get("asset_id"),
                "filename": asset.get("filename"),
                "use_in_pptx": asset.get("use_in_pptx"),
            })
        except Exception as exc:
            skipped.append({
                "candidate_id": candidate.get("candidate_id"),
                "error": str(exc),
            })

    write_asset_candidates(slide_id, data)
    manifest = read_assets_manifest(slide_id)

    return jsonify({
        "message": "all candidates accepted",
        "slide_id": slide_id,
        "accepted": accepted,
        "skipped": skipped,
        "manifest": add_asset_urls(slide_id, manifest),
        "candidates": data,
    })


@app.route("/api/assets/<slide_id>", methods=["GET"])
def api_assets_for_slide(slide_id: str):
    if not is_safe_slide_id(slide_id):
        return jsonify({"error": "invalid slide_id"}), 400
    manifest = read_assets_manifest(slide_id)
    return jsonify(add_asset_urls(slide_id, manifest))


@app.route("/api/assets/<slide_id>/clip", methods=["POST"])
def api_clip_asset(slide_id: str):
    if not is_safe_slide_id(slide_id):
        return jsonify({"error": "invalid slide_id"}), 400

    source_image = find_source_image_for_slide(slide_id)
    if not source_image or not source_image.exists():
        return jsonify({"error": f"source image not found for {slide_id}"}), 404

    payload = request.get_json(silent=True) or {}
    bbox = payload.get("bbox_px")
    if not isinstance(bbox, list) or len(bbox) != 4:
        return jsonify({"error": "bbox_px must be [x, y, w, h]"}), 400

    try:
        x, y, w, h = [int(round(float(v))) for v in bbox]
    except Exception:
        return jsonify({"error": "bbox_px values must be numeric"}), 400

    if w <= 1 or h <= 1:
        return jsonify({"error": "clip size is too small"}), 400

    with Image.open(source_image) as img:
        img_w, img_h = img.size

        x = max(0, min(x, img_w - 1))
        y = max(0, min(y, img_h - 1))
        w = max(1, min(w, img_w - x))
        h = max(1, min(h, img_h - y))

        if w <= 1 or h <= 1:
            return jsonify({"error": "clip area is outside source image"}), 400

        crop = img.crop((x, y, x + w, y + h))
        filename = next_asset_filename(slide_id)
        asset_dir = asset_dir_for_slide(slide_id)
        out_path = asset_dir / filename
        crop.save(out_path)

    manifest = read_assets_manifest(slide_id)
    asset_id = Path(filename).stem

    asset = {
        "asset_id": asset_id,
        "type": "image_clip",
        "filename": filename,
        "bbox_px": [x, y, w, h],
        "source_image": rel(source_image),
        "created_by": "manual_clip",
        "use_in_pptx": True,
        "created_at": datetime.now().isoformat(timespec="seconds"),
        "url": f"/api/assets/{slide_id}/{filename}",
    }

    manifest.setdefault("assets", []).append(asset)
    write_assets_manifest(slide_id, manifest)

    return jsonify({
        "message": "asset clipped",
        "asset": asset,
        "manifest": add_asset_urls(slide_id, manifest),
    })





@app.route("/api/assets/<slide_id>/<asset_id>/bbox", methods=["POST"])
def api_update_asset_bbox(slide_id: str, asset_id: str):
    if not is_safe_slide_id(slide_id):
        return jsonify({"error": "invalid slide_id"}), 400

    payload = request.get_json(silent=True) or {}
    bbox = payload.get("bbox_px")

    if not isinstance(bbox, list) or len(bbox) != 4:
        return jsonify({"error": "bbox_px must be [x, y, w, h]"}), 400

    try:
        asset = update_asset_bbox(slide_id, asset_id, bbox)
    except FileNotFoundError as exc:
        return jsonify({"error": str(exc)}), 404
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": f"failed to update asset bbox: {exc}"}), 500

    if asset is None:
        return jsonify({"error": "asset not found"}), 404

    manifest = read_assets_manifest(slide_id)

    return jsonify({
        "message": "asset bbox updated",
        "asset": asset,
        "manifest": add_asset_urls(slide_id, manifest),
    })

@app.route("/api/assets/<slide_id>/<asset_id>/toggle-use", methods=["POST"])
def api_toggle_asset_use_in_pptx(slide_id: str, asset_id: str):
    if not is_safe_slide_id(slide_id):
        return jsonify({"error": "invalid slide_id"}), 400

    payload = request.get_json(silent=True) or {}
    requested = payload.get("use_in_pptx", None)

    manifest = read_assets_manifest(slide_id)
    target = None

    for item in manifest.get("assets", []):
        if item.get("asset_id") == asset_id:
            target = item
            break

    if target is None:
        return jsonify({"error": "asset not found"}), 404

    if requested is None:
        target["use_in_pptx"] = not bool(target.get("use_in_pptx", False))
    else:
        target["use_in_pptx"] = bool(requested)

    write_assets_manifest(slide_id, manifest)

    return jsonify({
        "message": "asset use_in_pptx updated",
        "asset": target,
        "manifest": add_asset_urls(slide_id, manifest),
    })


@app.route("/api/assets/<slide_id>/<asset_id>", methods=["DELETE"])
def api_delete_asset(slide_id: str, asset_id: str):
    if not is_safe_slide_id(slide_id):
        return jsonify({"error": "invalid slide_id"}), 400

    manifest = read_assets_manifest(slide_id)
    assets = manifest.get("assets", [])
    target = None
    next_assets = []

    for item in assets:
        if item.get("asset_id") == asset_id:
            target = item
        else:
            next_assets.append(item)

    if target is None:
        return jsonify({"error": "asset not found"}), 404

    filename = target.get("filename")
    removed = []
    if filename:
        path = (asset_dir_for_slide(slide_id) / filename).resolve()
        base = asset_dir_for_slide(slide_id).resolve()
        if str(path).startswith(str(base)) and path.exists():
            removed.append(rel(path))
            path.unlink()

    manifest["assets"] = next_assets
    write_assets_manifest(slide_id, manifest)

    return jsonify({
        "message": "asset deleted",
        "asset_id": asset_id,
        "removed": removed,
        "manifest": add_asset_urls(slide_id, manifest),
    })


@app.route("/api/assets/<slide_id>/<path:filename>", methods=["GET"])
def api_asset_file(slide_id: str, filename: str):
    if not is_safe_slide_id(slide_id):
        return jsonify({"error": "invalid slide_id"}), 400

    base = asset_dir_for_slide(slide_id).resolve()
    path = (asset_dir_for_slide(slide_id) / filename).resolve()

    if not str(path).startswith(str(base)) or not path.exists():
        return jsonify({"error": "asset file not found"}), 404

    return send_file(path)


@app.route("/api/assets")
def api_assets():
    items = []
    if ASSETS_DIR.exists():
        for p in sorted(ASSETS_DIR.rglob("*")):
            if p.is_file():
                items.append({
                    "name": p.name,
                    "relative_path": rel(p),
                    "size": p.stat().st_size,
                })
    return jsonify({"items": items})


@app.route("/api/upload", methods=["POST"])
def api_upload():
    ensure_dirs()

    reset = request.form.get("reset", "false").lower() == "true"
    if reset:
        clear_source_and_generated_artifacts()

    files = request.files.getlist("files")
    saved = []
    unsupported = []

    existing_numbers = []
    for p in get_source_files():
        if not p.stem.startswith("slide_"):
            continue
        try:
            existing_numbers.append(int(p.stem.split("_")[-1]))
        except Exception:
            pass

    existing_count = len(existing_numbers)
    next_index = max(existing_numbers, default=0) + 1
    accepted_count = 0

    for f in files:
        original = secure_filename(f.filename or "")
        suffix = Path(original).suffix.lower()

        if suffix == ".pdf":
            if convert_from_path is None:
                unsupported.append({"name": original, "reason": "pdf2image or poppler is not available"})
                continue

            try:
                tmp_pdf = TEMP_DIR / f"upload_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}_{original}"
                f.save(tmp_pdf)
                pages = convert_from_path(str(tmp_pdf), dpi=200)
                tmp_pdf.unlink(missing_ok=True)

                if existing_count + accepted_count + len(pages) > OSS_MAX_SLIDES:
                    unsupported.append({
                        "name": original,
                        "reason": f"OSS版では最大{OSS_MAX_SLIDES}枚までです。PDFは{len(pages)}ページあります",
                    })
                    continue

                for page_index, page in enumerate(pages, start=1):
                    slide_id = f"slide_{next_index:03d}"
                    target = SOURCE_DIR / f"{slide_id}.png"
                    while target.exists():
                        next_index += 1
                        slide_id = f"slide_{next_index:03d}"
                        target = SOURCE_DIR / f"{slide_id}.png"

                    if page.mode not in ("RGB", "RGBA"):
                        page = page.convert("RGB")
                    page.save(target, "PNG")
                    saved.append({
                        "original": f"{original}#page_{page_index}",
                        "slide_id": slide_id,
                        "path": rel(target),
                    })
                    accepted_count += 1
                    next_index += 1
            except Exception as e:
                unsupported.append({"name": original, "reason": str(e)})
            continue

        if suffix not in ALLOWED_IMAGE_EXTS:
            unsupported.append({"name": original, "reason": f"unsupported extension: {suffix}"})
            continue

        if existing_count + accepted_count >= OSS_MAX_SLIDES:
            unsupported.append({
                "name": original,
                "reason": f"OSS版では最大{OSS_MAX_SLIDES}枚までです",
            })
            continue

        slide_id = f"slide_{next_index:03d}"
        target = SOURCE_DIR / f"{slide_id}.png"
        while target.exists():
            next_index += 1
            slide_id = f"slide_{next_index:03d}"
            target = SOURCE_DIR / f"{slide_id}.png"

        try:
            img = Image.open(f.stream)
            img = ImageOps.exif_transpose(img)
            if img.mode not in ("RGB", "RGBA"):
                img = img.convert("RGB")
            img.save(target, "PNG")
            saved.append({
                "original": original,
                "slide_id": slide_id,
                "path": rel(target),
            })
            accepted_count += 1
            next_index += 1
        except Exception as e:
            unsupported.append({"name": original, "reason": str(e)})

    return jsonify({
        "mode": "replace" if reset else "append",
        "max_slides": OSS_MAX_SLIDES,
        "saved": saved,
        "unsupported": unsupported,
        "status": collect_status(),
    })


@app.route("/api/source/<slide_id>/delete", methods=["POST"])
def api_delete_source_slide(slide_id: str):
    ensure_dirs()

    if not slide_id.startswith("slide_"):
        return jsonify({"error": "invalid slide id"}), 400

    result = delete_slide_artifacts(slide_id)

    return jsonify({
        "ok": True,
        "slide_id": slide_id,
        **result,
        "status": collect_status(),
    })


@app.route("/api/source/clear", methods=["POST"])
def api_clear_source():
    ensure_dirs()
    result = clear_source_and_generated_artifacts()

    return jsonify({
        "ok": True,
        **result,
        "status": collect_status(),
    })




# ─────────────────────────────────────────────────────────────
# Incremental Slide Processing
# ─────────────────────────────────────────────────────────────

def run_pipeline_command(label: str, args: list[str]) -> dict[str, Any]:
    cmd = [str(Path(sys.executable)), *args]
    result = subprocess.run(
        cmd,
        cwd=BASE_DIR,
        capture_output=True,
        text=True,
    )
    return {
        "label": label,
        "cmd": cmd,
        "returncode": result.returncode,
        "stdout": result.stdout,
        "stderr": result.stderr,
    }


def run_pipeline_steps(steps: list[tuple[str, list[str]]]) -> tuple[list[dict[str, Any]], int]:
    results = []
    for label, args in steps:
        item = run_pipeline_command(label, args)
        results.append(item)
        if item["returncode"] != 0:
            return results, item["returncode"]
    return results, 0


def slide_processing_status(slide_id: str) -> dict[str, Any]:
    ocr_dir = JSON_DIR / "ocr" / slide_id
    text_blocks_path = JSON_DIR / "text_blocks" / f"{slide_id}_text_blocks.json"
    working_text_blocks_path = JSON_DIR / "text_blocks_working" / f"{slide_id}_text_blocks_working.json"
    rebuild_spec_path = JSON_DIR / "slides" / f"{slide_id}_rebuild_spec.json"

    has_source = find_source_image_for_slide(slide_id) is not None
    has_ocr = ocr_dir.exists() and any(ocr_dir.iterdir()) if ocr_dir.exists() else False
    has_text_blocks = text_blocks_path.exists()
    has_working_text_blocks = working_text_blocks_path.exists()
    has_rebuild_spec = rebuild_spec_path.exists()

    ready = has_source and has_text_blocks and has_working_text_blocks and has_rebuild_spec

    return {
        "slide_id": slide_id,
        "has_source": has_source,
        "has_ocr": has_ocr,
        "has_text_blocks": has_text_blocks,
        "has_working_text_blocks": has_working_text_blocks,
        "has_rebuild_spec": has_rebuild_spec,
        "ready": ready,
        "status": "ready" if ready else "needs_processing",
    }


def pending_slide_ids() -> list[str]:
    return [
        slide_id
        for slide_id in get_slide_ids()
        if slide_processing_status(slide_id)["status"] == "needs_processing"
    ]


def process_slides_without_export(slide_ids: list[str]) -> tuple[list[dict[str, Any]], int]:
    if not slide_ids:
        return [], 0

    py_scripts = BASE_DIR / "scripts"

    steps = [
        ("Create deck manifest", [str(py_scripts / "create_deck_manifest.py")]),
        ("Ensure rebuild specs", [str(py_scripts / "ensure_rebuild_specs.py")]),
        ("Run OCR", [str(py_scripts / "run_ocr_deck_bridge.py"), "--slides", *slide_ids]),
        ("Normalize OCR to text_blocks", [str(py_scripts / "normalize_deck_bridge.py"), "--slides", *slide_ids]),
        ("Ensure rebuild specs after OCR", [str(py_scripts / "ensure_rebuild_specs.py")]),
        (
            "Apply text_blocks",
            [
                str(py_scripts / "apply_text_blocks_deck.py"),
                "--slides",
                *slide_ids,
                "--mode",
                "working",
                "--scope",
                "standard",
            ],
        ),
    ]

    return run_pipeline_steps(steps)


def export_pptx_only() -> tuple[list[dict[str, Any]], int]:
    py_scripts = BASE_DIR / "scripts"
    steps = [
        ("Create deck manifest", [str(py_scripts / "create_deck_manifest.py")]),
        ("Build PPTX", [str(py_scripts / "build_ppt_deck.py")]),
    ]
    return run_pipeline_steps(steps)


@app.route("/api/process-slide/<slide_id>", methods=["POST"])
def api_process_slide(slide_id: str):
    if not is_safe_slide_id(slide_id):
        return jsonify({"error": "invalid slide_id"}), 400

    if not find_source_image_for_slide(slide_id):
        return jsonify({"error": f"source image not found for {slide_id}"}), 404

    steps, returncode = process_slides_without_export([slide_id])
    status = slide_processing_status(slide_id)

    payload = {
        "message": "slide processed" if returncode == 0 else "slide processing failed",
        "slide_id": slide_id,
        "returncode": returncode,
        "steps": steps,
        "status": status,
    }

    if returncode != 0:
        return jsonify(payload), 500

    candidate_payload, candidate_status = detect_asset_candidates_for_slide(slide_id)
    payload["candidate_detection_status"] = candidate_status
    payload["candidate_detection"] = candidate_payload

    if candidate_status >= 400:
        payload["candidate_detection_warning"] = candidate_payload.get(
            "error",
            "candidate detection failed",
        )

    return jsonify(payload)


@app.route("/api/process-pending-slides", methods=["POST"])
def api_process_pending_slides():
    slide_ids = pending_slide_ids()

    if not slide_ids:
        return jsonify({
            "message": "no pending slides",
            "slide_ids": [],
            "returncode": 0,
            "steps": [],
        })

    steps, returncode = process_slides_without_export(slide_ids)

    payload = {
        "message": "pending slides processed" if returncode == 0 else "pending slide processing failed",
        "slide_ids": slide_ids,
        "returncode": returncode,
        "steps": steps,
        "statuses": [slide_processing_status(slide_id) for slide_id in slide_ids],
    }

    if returncode != 0:
        return jsonify(payload), 500

    candidate_detections = []
    for candidate_slide_id in slide_ids:
        candidate_payload, candidate_status = detect_asset_candidates_for_slide(candidate_slide_id)
        candidate_detections.append({
            "slide_id": candidate_slide_id,
            "status_code": candidate_status,
            "result": candidate_payload,
        })

    payload["candidate_detections"] = candidate_detections

    failed_detections = [
        item for item in candidate_detections
        if item.get("status_code", 500) >= 400
    ]
    if failed_detections:
        payload["candidate_detection_warning"] = (
            f"{len(failed_detections)} slide(s) candidate detection failed"
        )

    return jsonify(payload)


@app.route("/api/export-pptx", methods=["POST"])
def api_export_pptx():
    steps, returncode = export_pptx_only()

    payload = {
        "message": "pptx exported" if returncode == 0 else "pptx export failed",
        "returncode": returncode,
        "steps": steps,
        "status": api_status().get_json(),
    }

    if returncode != 0:
        return jsonify(payload), 500

    return jsonify(payload)


@app.route("/api/reconstruct", methods=["POST"])
def api_reconstruct():
    ensure_dirs()
    slide_ids = get_slide_ids()

    if not slide_ids:
        return jsonify({"error": "source/ に slide_*.png がありません。先に画像を投入してください。"}), 400

    if len(slide_ids) > OSS_MAX_SLIDES:
        return jsonify({
            "error": f"OSS版では最大{OSS_MAX_SLIDES}枚まで対応しています。",
            "slide_count": len(slide_ids),
            "max_slides": OSS_MAX_SLIDES,
        }), 400

    py = sys.executable
    logs = []

    steps = [
        ("Create deck manifest", [py, "scripts/create_deck_manifest.py"]),
        ("Init slide specs", [py, "scripts/init_slide_specs.py"]),
        ("Run OCR", [py, "scripts/run_ocr_deck_bridge.py", "--slides", *slide_ids]),
        ("Normalize OCR to text_blocks", [py, "scripts/normalize_deck_bridge.py", "--slides", *slide_ids]),
        ("Ensure rebuild specs", [py, "scripts/ensure_rebuild_specs.py"]),
        ("Apply text_blocks", [py, "scripts/apply_text_blocks_deck.py", "--slides", *slide_ids, "--mode", "working", "--scope", "standard"]),
        ("Build PPTX", [py, "scripts/build_ppt_deck.py"]),
    ]

    for label, cmd in steps:
        result = run_command(cmd, label)
        logs.append(result)
        if not result["ok"]:
            return jsonify({
                "ok": False,
                "failed_at": label,
                "logs": logs,
                "status": collect_status(),
            }), 500

    candidate_detections = []
    for candidate_slide_id in slide_ids:
        candidate_payload, candidate_status = detect_asset_candidates_for_slide(candidate_slide_id)
        candidate_detections.append({
            "slide_id": candidate_slide_id,
            "status_code": candidate_status,
            "result": candidate_payload,
        })

    payload = {
        "ok": True,
        "logs": logs,
        "status": collect_status(),
        "candidate_detections": candidate_detections,
    }

    failed_detections = [
        item for item in candidate_detections
        if item.get("status_code", 500) >= 400
    ]
    if failed_detections:
        payload["candidate_detection_warning"] = (
            f"{len(failed_detections)} slide(s) candidate detection failed"
        )

    return jsonify(payload)


@app.route("/api/workspace-folders", methods=["GET"])
def api_workspace_folders():
    return jsonify({
        "items": read_workspace_registry(),
        "current": workspace_label(),
    })


@app.route("/api/workspace-folders/register-current", methods=["POST"])
def api_register_current_workspace_folder():
    current = Path(workspace_label()).expanduser()

    if not current.exists() or not current.is_dir():
        return jsonify({"error": f"current workspace folder not found: {current}"}), 404

    source = current / "source"
    if not source.exists() or not source.is_dir():
        return jsonify({"error": f"source folder not found in current workspace: {source}"}), 400

    if not source_has_images(source):
        return jsonify({"error": "source/ に画像がないため、Workspace登録できません。先にOpen Filesで画像を投入してください。"}), 400

    item = register_workspace_folder(current)

    return jsonify({
        "ok": True,
        "item": item,
        "items": read_workspace_registry(),
    })


@app.route("/api/workspace-folders/register", methods=["POST"])
def api_register_workspace_folder():
    data = request.get_json(silent=True) or {}
    raw_path = data.get("path", "").strip()
    name = data.get("name", "").strip() or None

    if not raw_path:
        return jsonify({"error": "workspace folder path is required"}), 400

    ws = Path(raw_path).expanduser()
    if not ws.exists() or not ws.is_dir():
        return jsonify({"error": f"workspace folder not found: {ws}"}), 404

    source = ws / "source"
    if not source.exists() or not source.is_dir():
        return jsonify({"error": f"source folder not found in workspace: {source}"}), 400

    if not source_has_images(source):
        return jsonify({"error": "source/ に画像がないため、Workspace登録できません。"}), 400

    item = register_workspace_folder(ws, name=name)

    return jsonify({
        "ok": True,
        "item": item,
        "items": read_workspace_registry(),
    })


@app.route("/api/workspace-folders/unregister", methods=["POST"])
def api_unregister_workspace_folder():
    data = request.get_json(silent=True) or {}
    raw_path = data.get("path", "").strip()

    if not raw_path:
        return jsonify({"error": "workspace folder path is required"}), 400

    try:
        resolved = str(Path(raw_path).expanduser().resolve())
    except Exception:
        resolved = raw_path

    items = read_workspace_registry()
    next_items = [item for item in items if item.get("path") != resolved]

    if len(next_items) == len(items):
        return jsonify({
            "ok": True,
            "message": "workspace registration was already absent",
            "items": next_items,
        })

    write_workspace_registry(next_items)

    return jsonify({
        "ok": True,
        "message": "workspace registration removed. Folder itself was not deleted.",
        "items": next_items,
    })


@app.route("/api/open/workspace-folder", methods=["POST"])
def api_open_workspace_folder():
    ensure_dirs()
    data = request.get_json(silent=True) or {}
    raw_path = data.get("path", "").strip()

    if not raw_path:
        return jsonify({"error": "workspace folder path is required"}), 400

    ws = Path(raw_path).expanduser()
    if not ws.exists() or not ws.is_dir():
        return jsonify({"error": f"workspace folder not found: {ws}"}), 404

    source = ws / "source"
    if not source.exists() or not source.is_dir():
        return jsonify({"error": f"source folder not found in workspace: {source}"}), 400

    # If the selected workspace is the current repo root, do not copy folders onto themselves.
    if ws.resolve() == BASE_DIR.resolve():
        write_workspace_label(ws)
        register_workspace_folder(ws)

        return jsonify({
            "ok": True,
            "message": f"opened current workspace folder: {ws}",
            "workspace": str(ws.resolve()),
            "registered_workspaces": read_workspace_registry(),
            "status": collect_status(),
        })

    clear_dir(SOURCE_DIR)
    copy_dir_contents(source, SOURCE_DIR)

    if (ws / "assets").exists():
        clear_dir(ASSETS_DIR)
        copy_dir_contents(ws / "assets", ASSETS_DIR)

    if (ws / "output").exists():
        clear_dir(OUTPUT_DIR)
        copy_dir_contents(ws / "output", OUTPUT_DIR)

    if (ws / "json").exists():
        # Keep static config JSON files, replace generated deck artifacts only.
        for name in [
            "deck_manifest.json",
            "ocr",
            "ocr_engine_configs",
            "slides",
            "text_blocks",
            "text_blocks_working",
        ]:
            target = JSON_DIR / name
            if target.exists():
                if target.is_dir():
                    shutil.rmtree(target)
                else:
                    target.unlink()

        copy_dir_contents(ws / "json", JSON_DIR)

    write_workspace_label(ws)
    register_workspace_folder(ws)

    return jsonify({
        "ok": True,
        "message": f"opened workspace folder: {ws}",
        "workspace": str(ws.resolve()),
        "registered_workspaces": read_workspace_registry(),
        "status": collect_status(),
    })


@app.route("/api/open/latest-pptx", methods=["POST"])
def api_open_latest_pptx():
    info = latest_pptx()
    if not info:
        return jsonify({"error": "PPTX output not found"}), 404
    ok, message = open_path(Path(info["path"]))
    return jsonify({"ok": ok, "message": message, "pptx": info})


@app.route("/api/open/output-folder", methods=["POST"])
def api_open_output_folder():
    OUTPUT_DIR.mkdir(exist_ok=True)
    ok, message = open_path(OUTPUT_DIR)
    return jsonify({"ok": ok, "message": message})

# Local Material Refinement - Text Eraser
# ---------------------------------------------------------------------

def _material_extract_bbox_px(item: dict[str, Any]) -> list[int] | None:
    raw = (
        item.get("bbox_px")
        or item.get("bbox")
        or item.get("bounding_box")
        or item.get("box")
    )

    if isinstance(raw, dict):
        try:
            return [
                int(round(float(raw.get("x", 0)))),
                int(round(float(raw.get("y", 0)))),
                int(round(float(raw.get("w", raw.get("width", 0))))),
                int(round(float(raw.get("h", raw.get("height", 0))))),
            ]
        except Exception:
            return None

    if isinstance(raw, list) and len(raw) == 4:
        try:
            return [int(round(float(v))) for v in raw]
        except Exception:
            return None

    return None


def _material_read_text_blocks(slide_id: str) -> list[dict[str, Any]]:
    candidates = [
        # Current normalized filenames used by this project
        BASE_DIR / "json" / "text_blocks" / f"{slide_id}_text_blocks.json",
        BASE_DIR / "json" / "text_blocks_working" / f"{slide_id}_text_blocks_working.json",

        # Older / alternate layouts
        BASE_DIR / "json" / "text_blocks" / f"{slide_id}.json",
        BASE_DIR / "json" / "text_blocks" / slide_id / "text_blocks.json",
        BASE_DIR / "json" / "text_blocks" / slide_id / "blocks.json",
        BASE_DIR / "json" / "text_blocks_working" / f"{slide_id}.json",
        BASE_DIR / "json" / "text_blocks_working" / slide_id / "text_blocks.json",
    ]

    for path in candidates:
        if not path.exists():
            continue

        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue

        if isinstance(data, list):
            return [item for item in data if isinstance(item, dict)]

        if isinstance(data, dict):
            for key in ("text_blocks", "blocks", "items", "elements"):
                value = data.get(key)
                if isinstance(value, list):
                    return [item for item in value if isinstance(item, dict)]

    return []


def _material_intersection(a: list[int], b: list[int]) -> list[int] | None:
    ax, ay, aw, ah = a
    bx, by, bw, bh = b

    x1 = max(ax, bx)
    y1 = max(ay, by)
    x2 = min(ax + aw, bx + bw)
    y2 = min(ay + ah, by + bh)

    if x2 <= x1 or y2 <= y1:
        return None

    return [x1, y1, x2 - x1, y2 - y1]



def _material_read_asset_candidates(slide_id: str) -> list[dict[str, Any]]:
    path = BASE_DIR / "json" / "slides" / f"{slide_id}_asset_candidates.json"

    if not path.exists():
        return []

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return []

    candidates = data.get("candidates") if isinstance(data, dict) else None
    if isinstance(candidates, list):
        return [item for item in candidates if isinstance(item, dict)]

    if isinstance(data, list):
        return [item for item in data if isinstance(item, dict)]

    return []


def _material_candidate_box_for_asset(
    slide_id: str,
    source_asset: dict[str, Any],
    asset_bbox: list[int],
) -> list[list[int]]:
    source_candidate_id = str(source_asset.get("source_candidate_id") or "")
    if not source_candidate_id:
        return []

    candidates = _material_read_asset_candidates(slide_id)

    ax, ay, aw, ah = asset_bbox

    for candidate in candidates:
        if str(candidate.get("candidate_id") or "") != source_candidate_id:
            continue

        candidate_type = str(candidate.get("type") or candidate.get("candidate_type") or "")
        candidate_subtype = str(candidate.get("subtype") or "")

        # Only use this fallback for text-like candidates.
        is_text_candidate = (
            "text" in source_candidate_id
            or "text" in candidate_type
            or "text" in candidate_subtype
        )

        if not is_text_candidate:
            return []

        bbox = _material_extract_bbox_px(candidate)
        if not bbox:
            return []

        hit = _material_intersection(asset_bbox, bbox)
        if not hit:
            return []

        hx, hy, hw, hh = hit
        local = [hx - ax, hy - ay, hw, hh]

        if local[2] > 1 and local[3] > 1:
            return [local]

    return []


def _material_text_boxes_for_asset(slide_id: str, asset_bbox: list[int]) -> list[list[int]]:
    blocks = _material_read_text_blocks(slide_id)
    local_boxes: list[list[int]] = []

    ax, ay, aw, ah = asset_bbox

    for block in blocks:
        text = str(
            block.get("text")
            or block.get("display_text")
            or block.get("ocr_text")
            or block.get("content")
            or ""
        ).strip()

        if not text:
            continue

        bbox = _material_extract_bbox_px(block)
        if not bbox:
            continue

        hit = _material_intersection(asset_bbox, bbox)
        if not hit:
            continue

        hx, hy, hw, hh = hit
        local = [hx - ax, hy - ay, hw, hh]

        if local[2] > 1 and local[3] > 1:
            local_boxes.append(local)

    return local_boxes


def _material_median_rgb(samples: list[tuple[int, int, int]]) -> tuple[int, int, int]:
    if not samples:
        return (255, 255, 255)

    rs = sorted(v[0] for v in samples)
    gs = sorted(v[1] for v in samples)
    bs = sorted(v[2] for v in samples)
    mid = len(samples) // 2

    return (rs[mid], gs[mid], bs[mid])


def _material_estimate_bg_rgb(img: Image.Image, box: list[int], margin: int = 4) -> tuple[int, int, int]:
    rgba = img.convert("RGBA")
    px = rgba.load()
    w_img, h_img = rgba.size
    x, y, w, h = box

    x0 = max(0, x - margin)
    y0 = max(0, y - margin)
    x1 = min(w_img, x + w + margin)
    y1 = min(h_img, y + h + margin)

    samples: list[tuple[int, int, int]] = []

    for yy in range(y0, y1):
        for xx in range(x0, x1):
            inside = x <= xx < x + w and y <= yy < y + h
            if inside:
                continue

            r, g, b, a = px[xx, yy]
            if a > 0:
                samples.append((r, g, b))

    # Fallback: image corners / edges.
    if not samples:
        for yy in (0, max(0, h_img - 1)):
            for xx in range(0, w_img, max(1, w_img // 32)):
                r, g, b, a = px[xx, yy]
                if a > 0:
                    samples.append((r, g, b))

        for xx in (0, max(0, w_img - 1)):
            for yy in range(0, h_img, max(1, h_img // 32)):
                r, g, b, a = px[xx, yy]
                if a > 0:
                    samples.append((r, g, b))

    return _material_median_rgb(samples)


def _material_apply_text_eraser(
    img: Image.Image,
    boxes: list[list[int]],
    threshold: int = 32,
    dilation: int = 1,
) -> tuple[Image.Image, int]:
    from PIL import ImageFilter

    out = img.convert("RGBA")
    erased_pixels = 0

    img_w, img_h = out.size

    for raw_box in boxes:
        x, y, w, h = [int(v) for v in raw_box]

        x = max(0, min(x, img_w - 1))
        y = max(0, min(y, img_h - 1))
        w = max(1, min(w, img_w - x))
        h = max(1, min(h, img_h - y))

        if w <= 1 or h <= 1:
            continue

        bg = _material_estimate_bg_rgb(out, [x, y, w, h], margin=4)
        region = out.crop((x, y, x + w, y + h)).convert("RGBA")
        mask = Image.new("L", (w, h), 0)

        rp = region.load()
        mp = mask.load()
        br, bg_g, bb = bg

        for yy in range(h):
            for xx in range(w):
                r, g, b, a = rp[xx, yy]
                if a <= 0:
                    continue

                diff = ((r - br) ** 2 + (g - bg_g) ** 2 + (b - bb) ** 2) ** 0.5

                if diff >= threshold:
                    mp[xx, yy] = 255
                    erased_pixels += 1

        if dilation > 0:
            for _ in range(int(dilation)):
                mask = mask.filter(ImageFilter.MaxFilter(3))

        fill = Image.new("RGBA", (w, h), (br, bg_g, bb, 255))
        out.paste(fill, (x, y), mask)

    return out, erased_pixels


def _material_unique_variant_ids(
    manifest: dict[str, Any],
    source_asset_id: str,
    op: str,
    suffix: str = ".png",
) -> tuple[str, str]:
    existing_ids = {str(item.get("asset_id") or "") for item in manifest.get("assets", [])}
    existing_files = {str(item.get("filename") or "") for item in manifest.get("assets", [])}

    base = f"{source_asset_id}_{op}"
    idx = 1

    while True:
        asset_id = f"{base}_{idx:03d}"
        filename = f"{asset_id}{suffix}"

        if asset_id not in existing_ids and filename not in existing_files:
            return asset_id, filename

        idx += 1


def create_text_erased_asset_variant(
    slide_id: str,
    asset_id: str,
    threshold: int = 32,
    dilation: int = 1,
    use_in_pptx: bool = False,
) -> tuple[dict[str, Any], dict[str, Any]]:
    manifest = read_assets_manifest(slide_id)
    assets = manifest.setdefault("assets", [])

    source = None
    for item in assets:
        if item.get("asset_id") == asset_id:
            source = item
            break

    if source is None:
        raise ValueError(f"asset not found: {asset_id}")

    filename = str(source.get("filename") or "")
    if not filename:
        raise ValueError("asset filename is missing")

    asset_dir = asset_dir_for_slide(slide_id)
    src_path = asset_dir / Path(filename).name

    if not src_path.exists():
        raise FileNotFoundError(f"asset file not found: {filename}")

    asset_bbox = _material_extract_bbox_px(source)
    if not asset_bbox:
        raise ValueError("asset bbox_px is required for text eraser")

    text_boxes = _material_text_boxes_for_asset(slide_id, asset_bbox)

    # Fallback:
    # Some accepted text_block_candidate assets may not map cleanly back to OCR text_blocks
    # due to filename/layout differences or clustering. In that case, use the source
    # text_block_candidate bbox itself as the eraser target.
    if not text_boxes:
        text_boxes = _material_candidate_box_for_asset(slide_id, source, asset_bbox)

    if not text_boxes:
        raise ValueError("no OCR text boxes or text candidate bbox found inside this asset")

    with Image.open(src_path) as img:
        processed, erased_pixels = _material_apply_text_eraser(
            img,
            text_boxes,
            threshold=threshold,
            dilation=dilation,
        )

    new_asset_id, new_filename = _material_unique_variant_ids(
        manifest,
        source_asset_id=asset_id,
        op="text_eraser",
        suffix=".png",
    )

    out_path = asset_dir / new_filename
    processed.save(out_path)

    now = datetime.now().isoformat(timespec="seconds")
    variant = {
        "asset_id": new_asset_id,
        "type": source.get("type") or "image_clip",
        "filename": new_filename,
        "bbox_px": source.get("bbox_px"),
        "created_by": "material_text_eraser_v1",
        "created_at": now,
        "source_asset_id": asset_id,
        "source_filename": filename,
        "use_in_pptx": bool(use_in_pptx),
        "material_ops": [
            {
                "type": "text_eraser_v1",
                "created_at": now,
                "params": {
                    "threshold": threshold,
                    "dilation": dilation,
                    "text_box_count": len(text_boxes),
                    "erased_pixels": erased_pixels,
                },
            }
        ],
    }

    assets.append(variant)
    write_assets_manifest(slide_id, manifest)

    return variant, manifest


@app.route("/api/material/<slide_id>/<asset_id>/text-eraser", methods=["POST"])
def api_material_text_eraser(slide_id: str, asset_id: str):
    if not is_safe_slide_id(slide_id):
        return jsonify({"error": "invalid slide_id"}), 400

    payload = request.get_json(silent=True) or {}

    try:
        threshold = int(payload.get("threshold", 32))
        dilation = int(payload.get("dilation", 1))
        use_in_pptx = bool(payload.get("use_in_pptx", False))
    except Exception:
        return jsonify({"error": "invalid material params"}), 400

    threshold = max(1, min(threshold, 128))
    dilation = max(0, min(dilation, 3))

    try:
        asset, manifest = create_text_erased_asset_variant(
            slide_id=slide_id,
            asset_id=asset_id,
            threshold=threshold,
            dilation=dilation,
            use_in_pptx=use_in_pptx,
        )
    except FileNotFoundError as exc:
        return jsonify({"error": str(exc)}), 404
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": f"text eraser failed: {exc}"}), 500

    return jsonify({
        "message": "text eraser applied",
        "asset": asset,
        "manifest": add_asset_urls(slide_id, manifest),
    })



# ---------------------------------------------------------------------
# Local Material Refinement - Fill Opacity
# ---------------------------------------------------------------------

def _material_luma_rgb(rgb: tuple[int, int, int]) -> float:
    r, g, b = rgb
    return 0.299 * r + 0.587 * g + 0.114 * b


def _material_estimate_fill_rgb(
    img: Image.Image,
    min_luma: int = 170,
) -> tuple[int, int, int]:
    rgba = img.convert("RGBA")
    px = rgba.load()
    w, h = rgba.size

    step = max(1, min(w, h) // 96)
    light_samples: list[tuple[int, int, int]] = []
    all_samples: list[tuple[int, int, int]] = []

    for y in range(0, h, step):
        for x in range(0, w, step):
            r, g, b, a = px[x, y]
            if a <= 0:
                continue

            rgb = (r, g, b)
            all_samples.append(rgb)

            if _material_luma_rgb(rgb) >= min_luma:
                light_samples.append(rgb)

    if light_samples:
        return _material_median_rgb(light_samples)

    if all_samples:
        return _material_median_rgb(all_samples)

    return (255, 255, 255)


def _material_apply_fill_opacity(
    img: Image.Image,
    opacity: float = 0.35,
    tolerance: int = 36,
    min_luma: int = 170,
    apply_background: bool = False,
    apply_fill: bool = True,
) -> tuple[Image.Image, int, tuple[int, int, int]]:
    out = img.convert("RGBA")
    px = out.load()
    w, h = out.size

    opacity = max(0.0, min(float(opacity), 1.0))
    target_alpha = int(round(255 * opacity))

    fill_rgb = _material_estimate_fill_rgb(out, min_luma=min_luma)
    fr, fg, fb = fill_rgb

    # Background は四隅・辺から簡易推定する。
    sample_points = [
        (0, 0),
        (max(0, w - 1), 0),
        (0, max(0, h - 1)),
        (max(0, w - 1), max(0, h - 1)),
        (w // 2, 0),
        (w // 2, max(0, h - 1)),
        (0, h // 2),
        (max(0, w - 1), h // 2),
    ]

    bg_samples = []
    for sx, sy in sample_points:
        try:
            r, g, b, a = px[sx, sy]
            if a > 0:
                bg_samples.append((r, g, b))
        except Exception:
            pass

    if bg_samples:
        br = int(round(sum(c[0] for c in bg_samples) / len(bg_samples)))
        bg = int(round(sum(c[1] for c in bg_samples) / len(bg_samples)))
        bb = int(round(sum(c[2] for c in bg_samples) / len(bg_samples)))
        background_rgb = (br, bg, bb)
    else:
        background_rgb = fill_rgb

    changed = 0

    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a <= 0:
                continue

            luma = _material_luma_rgb((r, g, b))
            should_change = False

            if apply_fill:
                if luma >= min_luma:
                    diff_fill = ((r - fr) ** 2 + (g - fg) ** 2 + (b - fb) ** 2) ** 0.5
                    if diff_fill <= tolerance:
                        should_change = True

            if apply_background:
                br, bg, bb = background_rgb
                diff_bg = ((r - br) ** 2 + (g - bg) ** 2 + (b - bb) ** 2) ** 0.5
                if diff_bg <= tolerance:
                    should_change = True

            if should_change:
                next_alpha = min(a, target_alpha)
                if next_alpha != a:
                    px[x, y] = (r, g, b, next_alpha)
                    changed += 1

    return out, changed, fill_rgb

def create_fill_opacity_asset_variant(
    slide_id: str,
    asset_id: str,
    opacity: float = 0.35,
    tolerance: int = 36,
    min_luma: int = 170,
    use_in_pptx: bool = False,
    apply_background: bool = False,
    apply_fill: bool = True,
) -> tuple[dict[str, Any], dict[str, Any]]:
    manifest = read_assets_manifest(slide_id)
    assets = manifest.setdefault("assets", [])

    source = None
    for item in assets:
        if item.get("asset_id") == asset_id:
            source = item
            break

    if source is None:
        raise ValueError(f"asset not found: {asset_id}")

    filename = str(source.get("filename") or "")
    if not filename:
        raise ValueError("asset filename is missing")

    asset_dir = asset_dir_for_slide(slide_id)
    src_path = asset_dir / Path(filename).name

    if not src_path.exists():
        raise FileNotFoundError(f"asset file not found: {filename}")

    with Image.open(src_path) as img:
        processed, changed_pixels, fill_rgb = _material_apply_fill_opacity(
            img,
            opacity=opacity,
            tolerance=tolerance,
            min_luma=min_luma,
            apply_background=apply_background,
            apply_fill=apply_fill,
        )

    if changed_pixels <= 0:
        raise ValueError("no fill pixels matched this asset")

    new_asset_id, new_filename = _material_unique_variant_ids(
        manifest,
        source_asset_id=asset_id,
        op="fill_opacity",
        suffix=".png",
    )

    out_path = asset_dir / new_filename
    processed.save(out_path)

    now = datetime.now().isoformat(timespec="seconds")
    variant = {
        "asset_id": new_asset_id,
        "type": source.get("type") or "image_clip",
        "filename": new_filename,
        "bbox_px": source.get("bbox_px"),
        "created_by": "material_fill_opacity_v1",
        "created_at": now,
        "source_asset_id": asset_id,
        "source_filename": filename,
        "use_in_pptx": bool(use_in_pptx),
        "material_ops": [
            {
                "type": "fill_opacity_v1",
                "created_at": now,
                "params": {
                    "opacity": opacity,
                    "tolerance": tolerance,
                    "min_luma": min_luma,
                    "apply_background": bool(apply_background),
                    "apply_fill": bool(apply_fill),
                    "changed_pixels": changed_pixels,
                    "fill_rgb": list(fill_rgb),
                },
            }
        ],
    }

    assets.append(variant)
    write_assets_manifest(slide_id, manifest)

    return variant, manifest


@app.route("/api/material/<slide_id>/<asset_id>/fill-opacity", methods=["POST"])
def api_material_fill_opacity(slide_id: str, asset_id: str):
    if not is_safe_slide_id(slide_id):
        return jsonify({"error": "invalid slide_id"}), 400

    payload = request.get_json(silent=True) or {}
    if not payload and request.data:
        try:
            payload = json.loads(request.data.decode("utf-8"))
        except Exception:
            payload = {}

    try:
        if "opacity_percent" in payload:
            opacity = float(payload.get("opacity_percent", 35)) / 100.0
        else:
            opacity = float(payload.get("opacity", 0.35))

        tolerance = int(payload.get("tolerance", 36))
        min_luma = int(payload.get("min_luma", 170))
        use_in_pptx = bool(payload.get("use_in_pptx", False))
        apply_background = bool(payload.get("apply_background", False))
        apply_fill = bool(payload.get("apply_fill", True))
    except Exception:
        return jsonify({"error": "invalid material params"}), 400

    opacity = max(0.0, min(opacity, 1.0))
    tolerance = max(1, min(tolerance, 128))
    min_luma = max(0, min(min_luma, 255))

    if not apply_background and not apply_fill:
        return jsonify({"error": "apply_background or apply_fill must be true"}), 400

    try:
        asset, manifest = create_fill_opacity_asset_variant(
            slide_id=slide_id,
            asset_id=asset_id,
            opacity=opacity,
            tolerance=tolerance,
            min_luma=min_luma,
            use_in_pptx=use_in_pptx,
            apply_background=apply_background,
            apply_fill=apply_fill,
        )
    except FileNotFoundError as exc:
        return jsonify({"error": str(exc)}), 404
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": f"fill opacity failed: {exc}"}), 500

    return jsonify({
        "message": "fill opacity applied",
        "asset": asset,
        "manifest": add_asset_urls(slide_id, manifest),
    })




# ---------------------------------------------------------------------
# Local Material Refinement - Quick Repair
# ---------------------------------------------------------------------

def _clamp_int(v: Any, lo: int, hi: int) -> int:
    try:
        n = int(round(float(v)))
    except Exception:
        n = lo
    return max(lo, min(hi, n))


def _normalize_repair_ops(
    repairs: list[dict[str, Any]],
    img_w: int,
    img_h: int,
) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []

    for item in repairs:
        if not isinstance(item, dict):
            continue

        shape = str(item.get("shape") or "rectangle")
        if shape != "rectangle":
            continue

        x = _clamp_int(item.get("x", 0), 0, max(0, img_w - 1))
        y = _clamp_int(item.get("y", 0), 0, max(0, img_h - 1))
        w = _clamp_int(item.get("w", 1), 1, img_w)
        h = _clamp_int(item.get("h", 1), 1, img_h)

        if x + w > img_w:
            w = max(1, img_w - x)
        if y + h > img_h:
            h = max(1, img_h - y)

        color = item.get("color") or [255, 255, 255, 255]
        if not isinstance(color, list) or len(color) < 3:
            color = [255, 255, 255, 255]

        r = _clamp_int(color[0], 0, 255)
        g = _clamp_int(color[1], 0, 255)
        b = _clamp_int(color[2], 0, 255)
        a = _clamp_int(color[3] if len(color) >= 4 else 255, 0, 255)

        normalized.append({
            "shape": "rectangle",
            "x": x,
            "y": y,
            "w": w,
            "h": h,
            "color": [r, g, b, a],
            "fill_enabled": bool(item.get("fill_enabled", True)),
            "stroke_enabled": bool(item.get("stroke_enabled", False)),
        })

    return normalized


def _apply_quick_repairs_to_image(
    img: Image.Image,
    repairs: list[dict[str, Any]],
) -> tuple[Image.Image, int]:
    out = img.convert("RGBA")
    changed = 0

    for repair in repairs:
        shape = repair.get("shape")
        if shape != "rectangle":
            continue

        x = int(repair["x"])
        y = int(repair["y"])
        w = int(repair["w"])
        h = int(repair["h"])
        color = repair["color"]
        r = int(color[0])
        g = int(color[1])
        b = int(color[2])
        a = int(color[3] if len(color) >= 4 else 255)

        fill_enabled = bool(repair.get("fill_enabled", True))
        stroke_enabled = bool(repair.get("stroke_enabled", False))

        if fill_enabled:
            patch = Image.new("RGBA", (w, h), (r, g, b, a))
            out.paste(patch, (x, y))
            changed += w * h

        if stroke_enabled:
            from PIL import ImageDraw
            draw = ImageDraw.Draw(out)
            draw.rectangle(
                [x, y, x + max(1, w - 1), y + max(1, h - 1)],
                outline=(r, g, b, a),
                width=1,
            )
            changed += max(1, (w * 2) + (h * 2))

    return out, changed


def _find_asset_in_manifest(manifest: dict[str, Any], asset_id: str) -> dict[str, Any] | None:
    for item in manifest.get("assets", []):
        if item.get("asset_id") == asset_id:
            return item
    return None


def create_quick_repair_asset(
    slide_id: str,
    asset_id: str,
    repairs: list[dict[str, Any]],
    save_mode: str = "variant",
    use_in_pptx: bool | None = None,
) -> tuple[dict[str, Any], dict[str, Any]]:
    # Quick Repair policy:
    # Quick Repair is non-destructive. Direct overwrite save is disabled.
    save_mode = "variant"

    manifest = read_assets_manifest(slide_id)
    assets = manifest.setdefault("assets", [])

    source = _find_asset_in_manifest(manifest, asset_id)
    if source is None:
        raise ValueError(f"asset not found: {asset_id}")

    filename = str(source.get("filename") or "")
    if not filename:
        raise ValueError("asset filename is missing")

    asset_dir = asset_dir_for_slide(slide_id)
    src_path = asset_dir / Path(filename).name
    if not src_path.exists():
        raise FileNotFoundError(f"asset file not found: {filename}")

    with Image.open(src_path) as img:
        normalized_repairs = _normalize_repair_ops(repairs, img.width, img.height)
        if not normalized_repairs:
            raise ValueError("no valid quick repair operations")
        processed, changed_pixels = _apply_quick_repairs_to_image(img, normalized_repairs)

    now = datetime.now().isoformat(timespec="seconds")

    if save_mode == "save":
        processed.save(src_path)

        ops = list(source.get("material_ops") or [])
        ops.append({
            "type": "quick_repair_v1",
            "created_at": now,
            "params": {
                "save_mode": "save",
                "repairs": normalized_repairs,
                "changed_pixels": changed_pixels,
            },
        })

        source["material_ops"] = ops
        source["created_by"] = source.get("created_by") or "material_quick_repair_v1"
        source["updated_at"] = now

        write_assets_manifest(slide_id, manifest)
        return source, manifest

    # save_mode == variant
    new_asset_id, new_filename = _material_unique_variant_ids(
        manifest,
        source_asset_id=asset_id,
        op="quick_repair",
        suffix=".png",
    )

    out_path = asset_dir / new_filename
    processed.save(out_path)

    if use_in_pptx is None:
        use_in_pptx = False

    variant = {
        "asset_id": new_asset_id,
        "type": source.get("type") or "image_clip",
        "filename": new_filename,
        "bbox_px": source.get("bbox_px"),
        "created_by": "material_quick_repair_v1",
        "created_at": now,
        "source_asset_id": asset_id,
        "source_filename": filename,
        "use_in_pptx": bool(use_in_pptx),
        "material_ops": [
            {
                "type": "quick_repair_v1",
                "created_at": now,
                "params": {
                    "save_mode": "variant",
                    "repairs": normalized_repairs,
                    "changed_pixels": changed_pixels,
                },
            }
        ],
    }

    assets.append(variant)
    write_assets_manifest(slide_id, manifest)
    return variant, manifest


@app.route("/api/material/<slide_id>/<asset_id>/quick-repair", methods=["POST"])
def api_material_quick_repair(slide_id: str, asset_id: str):
    if not is_safe_slide_id(slide_id):
        return jsonify({"error": "invalid slide_id"}), 400

    payload = request.get_json(silent=True) or {}
    repairs = payload.get("repairs") or []
    save_mode = str(payload.get("save_mode") or "variant").strip().lower()
    use_in_pptx = payload.get("use_in_pptx")

    # Quick Repair policy:
    # Quick Repair is always saved as a new variant.
    # Older clients may still send "save", but backend will not overwrite.
    if save_mode == "save":
        save_mode = "variant"

    if save_mode not in ("variant",):
        return jsonify({"error": "invalid save_mode"}), 400

    try:
        asset, manifest = create_quick_repair_asset(
            slide_id=slide_id,
            asset_id=asset_id,
            repairs=repairs,
            save_mode=save_mode,
            use_in_pptx=use_in_pptx,
        )
    except FileNotFoundError as exc:
        return jsonify({"error": str(exc)}), 404
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": f"quick repair failed: {exc}"}), 500

    return jsonify({
        "message": "quick repair applied",
        "asset": asset,
        "manifest": add_asset_urls(slide_id, manifest),
    })




# ---------------------------------------------------------------------
# Local Material Refinement - Recolor
# ---------------------------------------------------------------------

def _material_color_distance(c1: list[int] | tuple[int, ...], c2: list[int] | tuple[int, ...]) -> float:
    r1, g1, b1 = int(c1[0]), int(c1[1]), int(c1[2])
    r2, g2, b2 = int(c2[0]), int(c2[1]), int(c2[2])
    return ((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2) ** 0.5


def _material_apply_recolor(
    img: Image.Image,
    source_rgb: list[int],
    target_rgb: list[int],
    tolerance: int = 28,
) -> tuple[Image.Image, int]:
    out = img.convert("RGBA")
    px = out.load()
    w, h = out.size

    sr, sg, sb = [max(0, min(255, int(v))) for v in source_rgb[:3]]
    tr, tg, tb = [max(0, min(255, int(v))) for v in target_rgb[:3]]
    tolerance = max(1, min(int(tolerance), 160))

    changed = 0

    for y in range(h):
      for x in range(w):
          r, g, b, a = px[x, y]
          if a <= 0:
              continue

          d = ((r - sr) ** 2 + (g - sg) ** 2 + (b - sb) ** 2) ** 0.5
          if d <= tolerance:
              px[x, y] = (tr, tg, tb, a)
              changed += 1

    return out, changed


def create_recolor_asset_variant(
    slide_id: str,
    asset_id: str,
    source_rgb: list[int],
    target_rgb: list[int],
    tolerance: int = 28,
    use_in_pptx: bool = False,
) -> tuple[dict[str, Any], dict[str, Any]]:
    manifest = read_assets_manifest(slide_id)
    assets = manifest.setdefault("assets", [])

    source = None
    for item in assets:
        if item.get("asset_id") == asset_id:
            source = item
            break

    if source is None:
        raise ValueError(f"asset not found: {asset_id}")

    filename = str(source.get("filename") or "")
    if not filename:
        raise ValueError("asset filename is missing")

    if not isinstance(source_rgb, list) or len(source_rgb) < 3:
        raise ValueError("source_rgb must be [r,g,b]")

    if not isinstance(target_rgb, list) or len(target_rgb) < 3:
        raise ValueError("target_rgb must be [r,g,b]")

    asset_dir = asset_dir_for_slide(slide_id)
    src_path = asset_dir / Path(filename).name

    if not src_path.exists():
        raise FileNotFoundError(f"asset file not found: {filename}")

    with Image.open(src_path) as img:
        processed, changed_pixels = _material_apply_recolor(
            img,
            source_rgb=source_rgb,
            target_rgb=target_rgb,
            tolerance=tolerance,
        )

    if changed_pixels <= 0:
        raise ValueError("no pixels matched source color")

    new_asset_id, new_filename = _material_unique_variant_ids(
        manifest,
        source_asset_id=asset_id,
        op="recolor",
        suffix=".png",
    )

    out_path = asset_dir / new_filename
    processed.save(out_path)

    now = datetime.now().isoformat(timespec="seconds")
    variant = {
        "asset_id": new_asset_id,
        "type": source.get("type") or "image_clip",
        "filename": new_filename,
        "bbox_px": source.get("bbox_px"),
        "created_by": "material_recolor_v1",
        "created_at": now,
        "source_asset_id": asset_id,
        "source_filename": filename,
        "use_in_pptx": bool(use_in_pptx),
        "material_ops": [
            {
                "type": "recolor_v1",
                "created_at": now,
                "params": {
                    "source_rgb": [int(source_rgb[0]), int(source_rgb[1]), int(source_rgb[2])],
                    "target_rgb": [int(target_rgb[0]), int(target_rgb[1]), int(target_rgb[2])],
                    "tolerance": tolerance,
                    "changed_pixels": changed_pixels,
                },
            }
        ],
    }

    assets.append(variant)
    write_assets_manifest(slide_id, manifest)

    return variant, manifest


@app.route("/api/material/<slide_id>/<asset_id>/recolor", methods=["POST"])
def api_material_recolor(slide_id: str, asset_id: str):
    if not is_safe_slide_id(slide_id):
        return jsonify({"error": "invalid slide_id"}), 400

    payload = request.get_json(silent=True) or {}

    source_rgb = payload.get("source_rgb")
    target_rgb = payload.get("target_rgb")

    try:
        tolerance = int(payload.get("tolerance", 28))
        use_in_pptx = bool(payload.get("use_in_pptx", False))
    except Exception:
        return jsonify({"error": "invalid recolor params"}), 400

    tolerance = max(1, min(tolerance, 160))

    try:
        asset, manifest = create_recolor_asset_variant(
            slide_id=slide_id,
            asset_id=asset_id,
            source_rgb=source_rgb,
            target_rgb=target_rgb,
            tolerance=tolerance,
            use_in_pptx=use_in_pptx,
        )
    except FileNotFoundError as exc:
        return jsonify({"error": str(exc)}), 404
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": f"recolor failed: {exc}"}), 500

    return jsonify({
        "message": "recolor applied",
        "asset": asset,
        "manifest": add_asset_urls(slide_id, manifest),
    })


if __name__ == "__main__":
    ensure_dirs()
    app.run(host="127.0.0.1", port=5050, debug=True)

# ---------------------------------------------------------------------
