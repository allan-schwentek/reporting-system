from __future__ import annotations

import json
import shutil
import secrets
import threading
import uuid
from datetime import datetime
from pathlib import Path

from flask import Flask, jsonify, render_template, request, send_file

from execution.pdf_generator import generate_report_pdf


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
BRANDING_DIR = DATA_DIR / "branding"
BRAND_LOGO_FILE = BRANDING_DIR / "logo.png"
EXPORT_DIR = BASE_DIR / ".tmp" / "exports"
DATA_FILE = DATA_DIR / "report_data.json"
BACKUP_DIR = DATA_DIR / "backups"
MAX_JSON_BACKUPS = 30
MAX_EXPORTED_PDFS = 7
SAVE_LOCK = threading.Lock()

for directory in (DATA_DIR, UPLOAD_DIR, BRANDING_DIR, EXPORT_DIR, BACKUP_DIR):
    directory.mkdir(parents=True, exist_ok=True)

if not DATA_FILE.exists():
    DATA_FILE.write_text(json.dumps({"topics": []}, ensure_ascii=False, indent=2), encoding="utf-8")

app = Flask(__name__)

DEFAULT_REPORT_SETTINGS = {
    "cover_enabled": True,
    "cover_title": "Relatorio Tecnico",
    "cover_subtitle": "Resumo executivo",
    "cover_text": "Descreva aqui o contexto e os objetivos deste relatorio.",
    "cover_note": "DOCUMENTO CONFIDENCIAL",
    "cover_footer": "Sua Organizacao | www.seusite.com",
}

DEFAULT_APP_SETTINGS = {
    "app_title": "Sistema de Relatorios",
    "app_subtitle": "Monte topicos, anexe imagens e exporte PDF.",
    "show_logo": True,
    "pdf_filename_prefix": "relatorio",
    "ui_theme": {
        "bg_start": "#eff2f9",
        "bg_end": "#ecf4ff",
        "card": "#ffffff",
        "ink": "#10233d",
        "muted": "#4f6077",
        "line": "#d4dce8",
        "primary": "#145da0",
        "accent": "#00a58e",
        "danger": "#c73e1d",
        "hero_start": "#d9ebff",
        "hero_end": "#ffffff",
    },
    "pdf_theme": {
        "primary": "#2B6670",
        "dark": "#1F4A52",
        "soft": "#E5F2F0",
        "text": "#1F3442",
        "footer_text": "#5A7180",
    },
}


def default_report(name: str, topics: list | None = None, report_settings: dict | None = None) -> dict:
    now = datetime.utcnow().isoformat() + "Z"
    return {
        "id": str(uuid.uuid4()),
        "name": name.strip() or "Relatorio",
        "access_key": generate_access_key(),
        "topics": topics or [],
        "report_settings": {**DEFAULT_REPORT_SETTINGS, **(report_settings or {})},
        "created_at": now,
        "updated_at": now,
    }


def generate_access_key() -> str:
    return f"{secrets.randbelow(10**13):013d}"


def _valid_hex(value: str, fallback: str) -> str:
    raw = str(value or "").strip()
    if len(raw) == 7 and raw.startswith("#"):
        chars = raw[1:]
        if all(ch in "0123456789abcdefABCDEF" for ch in chars):
            return raw.upper()
    return fallback


def sanitize_app_settings(raw: dict | None) -> dict:
    incoming = raw if isinstance(raw, dict) else {}
    default_ui = DEFAULT_APP_SETTINGS["ui_theme"]
    default_pdf = DEFAULT_APP_SETTINGS["pdf_theme"]
    ui_theme_input = incoming.get("ui_theme") if isinstance(incoming.get("ui_theme"), dict) else {}
    pdf_theme_input = incoming.get("pdf_theme") if isinstance(incoming.get("pdf_theme"), dict) else {}
    prefix = str(incoming.get("pdf_filename_prefix") or DEFAULT_APP_SETTINGS["pdf_filename_prefix"]).strip().lower()
    prefix = "".join(ch for ch in prefix if ch.isalnum() or ch in ("_", "-"))
    if not prefix:
        prefix = DEFAULT_APP_SETTINGS["pdf_filename_prefix"]
    return {
        "app_title": (str(incoming.get("app_title") or DEFAULT_APP_SETTINGS["app_title"]).strip() or DEFAULT_APP_SETTINGS["app_title"])[:80],
        "app_subtitle": (str(incoming.get("app_subtitle") or DEFAULT_APP_SETTINGS["app_subtitle"]).strip() or DEFAULT_APP_SETTINGS["app_subtitle"])[:180],
        "show_logo": bool(incoming.get("show_logo", DEFAULT_APP_SETTINGS["show_logo"])),
        "pdf_filename_prefix": prefix,
        "ui_theme": {key: _valid_hex(ui_theme_input.get(key), fallback) for key, fallback in default_ui.items()},
        "pdf_theme": {key: _valid_hex(pdf_theme_input.get(key), fallback) for key, fallback in default_pdf.items()},
    }


def normalize_data(raw_data: dict) -> dict:
    app_settings = sanitize_app_settings(raw_data.get("app_settings"))
    reports = raw_data.get("reports")
    if isinstance(reports, list):
        cleaned_reports = []
        for report in reports:
            if not isinstance(report, dict):
                continue
            cleaned_reports.append(
                {
                    "id": report.get("id") or str(uuid.uuid4()),
                    "name": (report.get("name") or "Relatorio").strip() or "Relatorio",
                    "access_key": str(report.get("access_key") or generate_access_key()),
                    "topics": report.get("topics") if isinstance(report.get("topics"), list) else [],
                    "report_settings": {
                        **DEFAULT_REPORT_SETTINGS,
                        **(report.get("report_settings") if isinstance(report.get("report_settings"), dict) else {}),
                    },
                    "created_at": report.get("created_at") or datetime.utcnow().isoformat() + "Z",
                    "updated_at": report.get("updated_at") or datetime.utcnow().isoformat() + "Z",
                }
            )
        if not cleaned_reports:
            cleaned_reports = [default_report("Relatorio 1")]
        return {"reports": cleaned_reports, "app_settings": app_settings}

    # Migracao automatica do formato antigo (topicos + configuracao global)
    topics = raw_data.get("topics") if isinstance(raw_data.get("topics"), list) else []
    report_settings = raw_data.get("report_settings") if isinstance(raw_data.get("report_settings"), dict) else {}
    return {"reports": [default_report("Relatorio 1", topics=topics, report_settings=report_settings)], "app_settings": app_settings}


def load_data() -> dict:
    try:
        raw_data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
        normalized = normalize_data(raw_data)
        raw_dump = json.dumps(raw_data, ensure_ascii=False, sort_keys=True)
        normalized_dump = json.dumps(normalized, ensure_ascii=False, sort_keys=True)
        if raw_dump != normalized_dump:
            save_data(normalized)
        return normalized
    except (json.JSONDecodeError, OSError):
        normalized = normalize_data({})
        save_data(normalized)
        return normalized


def backup_report_data_file() -> None:
    if not DATA_FILE.exists():
        return
    stamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S_%f")
    backup_path = BACKUP_DIR / f"report_data_{stamp}.json"
    shutil.copy2(DATA_FILE, backup_path)
    backups = sorted(BACKUP_DIR.glob("report_data_*.json"), key=lambda item: item.stat().st_mtime, reverse=True)
    for old_backup in backups[MAX_JSON_BACKUPS:]:
        old_backup.unlink(missing_ok=True)


def remove_orphan_uploads(data: dict) -> None:
    referenced = set()
    for report in data.get("reports", []):
        for topic in report.get("topics", []):
            for image in topic.get("images", []):
                stored_name = (image.get("stored_name") or "").strip()
                if stored_name:
                    referenced.add(stored_name)

    for file in UPLOAD_DIR.iterdir():
        if not file.is_file():
            continue
        if file.name in referenced:
            continue
        if file.name.startswith("_brand_logo"):
            continue
        file.unlink(missing_ok=True)


def prune_exported_pdfs() -> None:
    pdf_files = sorted(EXPORT_DIR.glob("*.pdf"), key=lambda item: item.stat().st_mtime, reverse=True)
    for old_pdf in pdf_files[MAX_EXPORTED_PDFS:]:
        old_pdf.unlink(missing_ok=True)


def save_data(payload: dict) -> None:
    normalized_payload = normalize_data(payload)
    with SAVE_LOCK:
        backup_report_data_file()
        tmp_file = DATA_FILE.with_suffix(".json.tmp")
        tmp_file.write_text(json.dumps(normalized_payload, ensure_ascii=False, indent=2), encoding="utf-8")
        tmp_file.replace(DATA_FILE)
        remove_orphan_uploads(normalized_payload)
        prune_exported_pdfs()


def find_topic(data: dict, topic_id: str) -> dict | None:
    return next((topic for topic in data if topic["id"] == topic_id), None)


def find_report(data: dict, report_id: str) -> dict | None:
    return next((report for report in data["reports"] if report["id"] == report_id), None)


def require_report_key(report: dict):
    provided_key = (request.headers.get("X-Report-Key") or "").strip()
    if not provided_key:
        return jsonify({"error": "Chave do relatorio nao informada."}), 401
    if provided_key != report.get("access_key"):
        return jsonify({"error": "Chave do relatorio invalida."}), 403
    return None


@app.after_request
def add_no_cache_headers(response):
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


@app.route("/")
def index():
    return render_template("index.html")


@app.get("/api/reports")
def get_reports():
    data = load_data()
    lightweight = [{"id": report["id"], "name": report["name"], "topics_count": len(report["topics"])} for report in data["reports"]]
    return jsonify(lightweight)


@app.get("/api/settings")
def get_app_settings():
    data = load_data()
    return jsonify(data["app_settings"])


@app.put("/api/settings")
def update_app_settings():
    body = request.get_json(silent=True) or {}
    data = load_data()
    data["app_settings"] = sanitize_app_settings(body)
    save_data(data)
    return jsonify(data["app_settings"])


@app.post("/api/reports")
def create_report():
    body = request.get_json(silent=True) or {}
    name = (body.get("name") or "").strip()
    if not name:
        return jsonify({"error": "O nome do relatorio e obrigatorio."}), 400

    data = load_data()
    report = default_report(name)
    data["reports"].append(report)
    save_data(data)
    return jsonify({"id": report["id"], "name": report["name"], "topics_count": 0, "access_key": report["access_key"]}), 201


@app.post("/api/reports/<report_id>/unlock")
def unlock_report(report_id: str):
    body = request.get_json(silent=True) or {}
    access_key = str(body.get("access_key") or "").strip()
    if not access_key:
        return jsonify({"error": "Informe a chave do relatorio."}), 400

    data = load_data()
    report = find_report(data, report_id)
    if report is None:
        return jsonify({"error": "Relatorio nao encontrado."}), 404
    if access_key != report.get("access_key"):
        return jsonify({"error": "Chave invalida."}), 403
    return jsonify({"ok": True})


@app.put("/api/reports/<report_id>")
def rename_report(report_id: str):
    body = request.get_json(silent=True) or {}
    name = (body.get("name") or "").strip()
    if not name:
        return jsonify({"error": "O nome do relatorio e obrigatorio."}), 400

    data = load_data()
    report = find_report(data, report_id)
    if report is None:
        return jsonify({"error": "Relatorio nao encontrado."}), 404
    key_error = require_report_key(report)
    if key_error:
        return key_error
    report["name"] = name
    report["updated_at"] = datetime.utcnow().isoformat() + "Z"
    save_data(data)
    return jsonify({"id": report["id"], "name": report["name"], "topics_count": len(report["topics"])})


@app.delete("/api/reports/<report_id>")
def delete_report(report_id: str):
    data = load_data()
    report = find_report(data, report_id)
    if report is None:
        return jsonify({"error": "Relatorio nao encontrado."}), 404
    key_error = require_report_key(report)
    if key_error:
        return key_error

    for topic in report["topics"]:
        for image in topic.get("images", []):
            image_path = UPLOAD_DIR / image["stored_name"]
            if image_path.exists():
                image_path.unlink()

    data["reports"] = [item for item in data["reports"] if item["id"] != report_id]
    if not data["reports"]:
        data["reports"] = [default_report("Relatorio 1")]
    save_data(data)
    return "", 204


@app.get("/api/reports/<report_id>/topics")
def get_topics(report_id: str):
    data = load_data()
    report = find_report(data, report_id)
    if report is None:
        return jsonify({"error": "Relatorio nao encontrado."}), 404
    key_error = require_report_key(report)
    if key_error:
        return key_error
    return jsonify(report["topics"])


@app.get("/api/reports/<report_id>/settings")
def get_report_settings(report_id: str):
    data = load_data()
    report = find_report(data, report_id)
    if report is None:
        return jsonify({"error": "Relatorio nao encontrado."}), 404
    key_error = require_report_key(report)
    if key_error:
        return key_error
    return jsonify(report["report_settings"])


@app.put("/api/reports/<report_id>/settings")
def update_report_settings(report_id: str):
    body = request.get_json(silent=True) or {}
    data = load_data()
    report = find_report(data, report_id)
    if report is None:
        return jsonify({"error": "Relatorio nao encontrado."}), 404
    key_error = require_report_key(report)
    if key_error:
        return key_error
    current = report["report_settings"]
    updated = {
        "cover_enabled": bool(body.get("cover_enabled", current["cover_enabled"])),
        "cover_title": (body.get("cover_title", current["cover_title"]) or "").strip() or DEFAULT_REPORT_SETTINGS["cover_title"],
        "cover_subtitle": (body.get("cover_subtitle", current["cover_subtitle"]) or "").strip(),
        "cover_text": (body.get("cover_text", current["cover_text"]) or "").strip(),
        "cover_note": (body.get("cover_note", current["cover_note"]) or "").strip(),
        "cover_footer": (body.get("cover_footer", current["cover_footer"]) or "").strip(),
    }
    report["report_settings"] = updated
    report["updated_at"] = datetime.utcnow().isoformat() + "Z"
    save_data(data)
    return jsonify(updated)


@app.post("/api/reports/<report_id>/topics")
def create_topic(report_id: str):
    body = request.get_json(silent=True) or {}
    title = (body.get("title") or "").strip()
    content = (body.get("content") or "").strip()

    if not title:
        return jsonify({"error": "O campo titulo e obrigatorio."}), 400

    data = load_data()
    report = find_report(data, report_id)
    if report is None:
        return jsonify({"error": "Relatorio nao encontrado."}), 404
    key_error = require_report_key(report)
    if key_error:
        return key_error

    topic = {
        "id": str(uuid.uuid4()),
        "title": title,
        "content": content,
        "images": [],
        "created_at": datetime.utcnow().isoformat() + "Z",
    }
    report["topics"].append(topic)
    report["updated_at"] = datetime.utcnow().isoformat() + "Z"
    save_data(data)
    return jsonify(topic), 201


@app.put("/api/reports/<report_id>/topics/<topic_id>")
def update_topic(report_id: str, topic_id: str):
    body = request.get_json(silent=True) or {}
    title = (body.get("title") or "").strip()
    content = (body.get("content") or "").strip()

    if not title:
        return jsonify({"error": "O campo titulo e obrigatorio."}), 400

    data = load_data()
    report = find_report(data, report_id)
    if report is None:
        return jsonify({"error": "Relatorio nao encontrado."}), 404
    key_error = require_report_key(report)
    if key_error:
        return key_error
    topic = find_topic(report["topics"], topic_id)
    if topic is None:
        return jsonify({"error": "Topico nao encontrado."}), 404

    topic["title"] = title
    topic["content"] = content
    topic["updated_at"] = datetime.utcnow().isoformat() + "Z"
    report["updated_at"] = datetime.utcnow().isoformat() + "Z"
    save_data(data)
    return jsonify(topic)


@app.delete("/api/reports/<report_id>/topics/<topic_id>")
def delete_topic(report_id: str, topic_id: str):
    data = load_data()
    report = find_report(data, report_id)
    if report is None:
        return jsonify({"error": "Relatorio nao encontrado."}), 404
    key_error = require_report_key(report)
    if key_error:
        return key_error
    topic = find_topic(report["topics"], topic_id)
    if topic is None:
        return jsonify({"error": "Topico nao encontrado."}), 404

    for image in topic.get("images", []):
        image_path = UPLOAD_DIR / image["stored_name"]
        if image_path.exists():
            image_path.unlink()

    report["topics"] = [item for item in report["topics"] if item["id"] != topic_id]
    report["updated_at"] = datetime.utcnow().isoformat() + "Z"
    save_data(data)
    return "", 204


@app.post("/api/reports/<report_id>/topics/<topic_id>/images")
def upload_topic_images(report_id: str, topic_id: str):
    data = load_data()
    report = find_report(data, report_id)
    if report is None:
        return jsonify({"error": "Relatorio nao encontrado."}), 404
    key_error = require_report_key(report)
    if key_error:
        return key_error
    topic = find_topic(report["topics"], topic_id)
    if topic is None:
        return jsonify({"error": "Topico nao encontrado."}), 404

    files = request.files.getlist("images")
    if not files:
        return jsonify({"error": "Nenhuma imagem enviada."}), 400

    uploaded = []
    for file in files:
        if not file.filename:
            continue
        extension = Path(file.filename).suffix.lower() or ".png"
        stored_name = f"{uuid.uuid4()}{extension}"
        file.save(UPLOAD_DIR / stored_name)
        image_item = {
            "id": str(uuid.uuid4()),
            "original_name": file.filename,
            "stored_name": stored_name,
            "uploaded_at": datetime.utcnow().isoformat() + "Z",
        }
        topic["images"].append(image_item)
        uploaded.append(image_item)

    report["updated_at"] = datetime.utcnow().isoformat() + "Z"
    save_data(data)
    return jsonify(uploaded), 201


@app.delete("/api/reports/<report_id>/topics/<topic_id>/images/<image_id>")
def delete_topic_image(report_id: str, topic_id: str, image_id: str):
    data = load_data()
    report = find_report(data, report_id)
    if report is None:
        return jsonify({"error": "Relatorio nao encontrado."}), 404
    key_error = require_report_key(report)
    if key_error:
        return key_error
    topic = find_topic(report["topics"], topic_id)
    if topic is None:
        return jsonify({"error": "Topico nao encontrado."}), 404

    image = next((item for item in topic.get("images", []) if item["id"] == image_id), None)
    if image is None:
        return jsonify({"error": "Imagem nao encontrada."}), 404

    image_path = UPLOAD_DIR / image["stored_name"]
    if image_path.exists():
        image_path.unlink()

    topic["images"] = [item for item in topic["images"] if item["id"] != image_id]
    report["updated_at"] = datetime.utcnow().isoformat() + "Z"
    save_data(data)
    return "", 204


@app.get("/api/images/<stored_name>")
def get_uploaded_image(stored_name: str):
    image_path = UPLOAD_DIR / stored_name
    if not image_path.exists():
        return jsonify({"error": "Imagem nao encontrada."}), 404
    return send_file(image_path)


@app.get("/api/branding/logo")
def get_brand_logo():
    if not BRAND_LOGO_FILE.exists():
        return jsonify({"error": "Logo nao configurada."}), 404
    return send_file(BRAND_LOGO_FILE)


@app.post("/api/branding/logo")
def update_brand_logo():
    file = request.files.get("logo")
    if file is None or not file.filename:
        return jsonify({"error": "Nenhuma logo enviada."}), 400

    if not (file.mimetype or "").startswith("image/"):
        return jsonify({"error": "Envie um arquivo de imagem valido."}), 400

    file.save(BRAND_LOGO_FILE)
    return jsonify({"message": "Logo atualizada com sucesso."})


@app.post("/api/reports/<report_id>/export")
def export_pdf(report_id: str):
    body = request.get_json(silent=True) or {}
    data = load_data()
    report = find_report(data, report_id)
    if report is None:
        return jsonify({"error": "Relatorio nao encontrado."}), 404
    key_error = require_report_key(report)
    if key_error:
        return key_error
    settings = {**report["report_settings"], **(body.get("cover_settings") or {})}
    app_settings = data.get("app_settings") or DEFAULT_APP_SETTINGS
    report_title = (body.get("report_title") or settings["cover_title"] or report["name"] or "Titulo Padrao de Relatorio").strip()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    prefix = app_settings.get("pdf_filename_prefix") or DEFAULT_APP_SETTINGS["pdf_filename_prefix"]
    filename = f"{prefix}_{timestamp}.pdf"
    output_path = EXPORT_DIR / filename

    generate_report_pdf(
        data={"topics": report["topics"]},
        output_path=output_path,
        report_title=report_title,
        upload_dir=UPLOAD_DIR,
        brand_logo_path=BRAND_LOGO_FILE,
        cover_settings=settings,
        pdf_theme=app_settings.get("pdf_theme") or DEFAULT_APP_SETTINGS["pdf_theme"],
    )
    prune_exported_pdfs()
    return send_file(output_path, as_attachment=True, download_name=filename, mimetype="application/pdf")


def run_startup_maintenance() -> None:
    data = load_data()
    remove_orphan_uploads(data)
    prune_exported_pdfs()


if __name__ == "__main__":
    run_startup_maintenance()
    app.run(host="0.0.0.0", port=5222, debug=True)

