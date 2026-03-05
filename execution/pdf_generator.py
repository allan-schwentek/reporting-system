from __future__ import annotations

import io
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Image, KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


DEFAULT_PDF_THEME = {
    "primary": "#2B6670",
    "dark": "#1F4A52",
    "soft": "#E5F2F0",
    "text": "#1F3442",
    "footer_text": "#5A7180",
}


def _register_runtime_fonts() -> dict:
    # Tenta usar fonte Unicode com suporte a emoji em ambiente Windows.
    emoji_font_path = Path(r"C:\Windows\Fonts\seguiemj.ttf")
    if emoji_font_path.exists():
        try:
            pdfmetrics.registerFont(TTFont("SegoeUIEmoji", str(emoji_font_path)))
            return {"regular": "SegoeUIEmoji", "bold": "SegoeUIEmoji", "unicode": True}
        except Exception:
            pass

    # Fallback padrao do ReportLab.
    return {"regular": "Helvetica", "bold": "Helvetica-Bold", "unicode": False}


RUNTIME_FONTS = _register_runtime_fonts()


def _is_emoji_char(char: str) -> bool:
    codepoint = ord(char)
    return (
        0x1F300 <= codepoint <= 0x1F5FF
        or 0x1F600 <= codepoint <= 0x1F64F
        or 0x1F680 <= codepoint <= 0x1F6FF
        or 0x1F700 <= codepoint <= 0x1F77F
        or 0x1F780 <= codepoint <= 0x1F7FF
        or 0x1F800 <= codepoint <= 0x1F8FF
        or 0x1F900 <= codepoint <= 0x1F9FF
        or 0x1FA00 <= codepoint <= 0x1FAFF
        or 0x2600 <= codepoint <= 0x26FF
        or 0x2700 <= codepoint <= 0x27BF
    )


def _split_leading_emoji(title: str) -> tuple[str, str]:
    chars = list(title or "")
    size = len(chars)
    i = 0
    while i < size and chars[i].isspace():
        i += 1

    start = i
    found_emoji = False
    while i < size:
        char = chars[i]
        if _is_emoji_char(char) or char in ("\uFE0F", "\u200D"):
            found_emoji = True
            i += 1
            continue
        break

    if not found_emoji:
        return "", title.strip()

    emoji = "".join(chars[start:i]).strip()
    while i < size and chars[i].isspace():
        i += 1
    rest = "".join(chars[i:]).strip()
    return emoji, rest


def _sanitize_pdf_text(value: str | None, unicode_capable: bool = False) -> str:
    if not value:
        return ""

    parts = []
    for char in value:
        # Remove apenas controles invalidos para evitar quebra no parser.
        if char in ("\x00", "\x01", "\x02", "\x03", "\x04", "\x05", "\x06", "\x07", "\x08"):
            continue
        parts.append(char)

    clean_text = "".join(parts)
    if unicode_capable:
        return clean_text
    # Fallback quando nao houver fonte Unicode para emoji.
    return clean_text.encode("cp1252", "replace").decode("cp1252")


def _safe_hex(value: str | None, fallback: str) -> str:
    raw = str(value or "").strip()
    if len(raw) == 7 and raw.startswith("#"):
        chars = raw[1:]
        if all(ch in "0123456789abcdefABCDEF" for ch in chars):
            return raw.upper()
    return fallback


def _normalize_pdf_theme(pdf_theme: dict | None) -> dict:
    incoming = pdf_theme if isinstance(pdf_theme, dict) else {}
    return {key: colors.HexColor(_safe_hex(incoming.get(key), fallback)) for key, fallback in DEFAULT_PDF_THEME.items()}


def _build_styles(theme: dict):
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "TitlePremium",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=30,
            textColor=colors.white,
            leading=34,
            alignment=0,
            spaceAfter=10,
        ),
        "cover_subtitle": ParagraphStyle(
            "CoverSubtitle",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=12,
            leading=17,
            textColor=colors.white,
            alignment=0,
            spaceAfter=6,
        ),
        "cover_meta": ParagraphStyle(
            "CoverMeta",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=10,
            textColor=colors.white,
            alignment=0,
            spaceAfter=6,
        ),
        "section_badge": ParagraphStyle(
            "SectionBadge",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=8,
            textColor=theme["dark"],
            alignment=0,
            spaceAfter=4,
        ),
        "body": ParagraphStyle(
            "BodyPremium",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=11,
            leading=17,
            textColor=theme["text"],
            spaceAfter=10,
        ),
        "topic_title": ParagraphStyle(
            "TopicTitle",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=15,
            textColor=theme["dark"],
            spaceAfter=8,
        ),
        "topic_emoji": ParagraphStyle(
            "TopicEmoji",
            parent=base["BodyText"],
            fontName=RUNTIME_FONTS["regular"],
            fontSize=15,
            leading=18,
            textColor=theme["dark"],
            spaceAfter=0,
        ),
        "footer": ParagraphStyle(
            "Footer",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8,
            textColor=colors.HexColor("#6B7280"),
            alignment=1,
        ),
    }


def _safe_image(image_path: Path, max_width: float, max_height: float):
    img = Image(str(image_path))
    width, height = img.wrap(0, 0)
    ratio = min(max_width / width, max_height / height, 1.0)
    img.drawWidth = width * ratio
    img.drawHeight = height * ratio
    return img


def _resolve_brand_logo(brand_logo_path: Path) -> bytes | None:
    if not brand_logo_path.exists():
        return None
    try:
        return brand_logo_path.read_bytes()
    except OSError:
        return None


def _draw_cover(canvas, doc, logo_bytes: bytes | None, theme: dict):
    page_w, page_h = A4
    canvas.saveState()

    canvas.setFillColor(theme["dark"])
    canvas.rect(0, 0, page_w, page_h, stroke=0, fill=1)

    canvas.setFillColor(theme["primary"])
    canvas.rect(0, page_h - (4.2 * cm), page_w, 4.2 * cm, stroke=0, fill=1)
    canvas.rect(0, 0, page_w, 1.6 * cm, stroke=0, fill=1)

    if logo_bytes:
        logo_stream = io.BytesIO(logo_bytes)
        canvas.drawImage(ImageReader(logo_stream), doc.leftMargin, page_h - (3.3 * cm), width=4.0 * cm, height=1.4 * cm, mask="auto")

    canvas.restoreState()


def _draw_standard_frame(canvas, doc, logo_bytes: bytes | None, footer_text: str, theme: dict):
    page_w, page_h = A4
    canvas.saveState()

    canvas.setFillColor(theme["primary"])
    canvas.rect(0, page_h - 1.15 * cm, page_w, 1.15 * cm, stroke=0, fill=1)
    canvas.setFillColor(theme["soft"])
    canvas.rect(0, 0, page_w, 1.3 * cm, stroke=0, fill=1)

    if logo_bytes:
        logo_stream = io.BytesIO(logo_bytes)
        canvas.drawImage(ImageReader(logo_stream), doc.leftMargin, page_h - 0.95 * cm, width=2.8 * cm, height=0.95 * cm, mask="auto")

    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(theme["footer_text"])
    safe_footer_text = _sanitize_pdf_text(footer_text, unicode_capable=False)
    footer_width = stringWidth(safe_footer_text, "Helvetica", 8)
    canvas.drawString((page_w - footer_width) / 2, 0.55 * cm, safe_footer_text)
    canvas.drawRightString(page_w - doc.rightMargin, 0.55 * cm, f"Pagina {canvas.getPageNumber()}")
    canvas.restoreState()


def _build_topic_title_flowable(topic_title: str, styles: dict, max_width: float):
    emoji, rest = _split_leading_emoji(topic_title)
    if not emoji:
        return Paragraph(topic_title, styles["topic_title"])

    emoji_width = 0.95 * cm
    text_width = max(1 * cm, max_width - emoji_width)
    title_table = Table(
        [[Paragraph(emoji, styles["topic_emoji"]), Paragraph(rest or " ", styles["topic_title"])]],
        colWidths=[emoji_width, text_width],
    )
    title_table.setStyle(
        TableStyle(
            [
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    return title_table


def generate_report_pdf(
    data: dict,
    output_path: Path,
    report_title: str,
    upload_dir: Path,
    brand_logo_path: Path,
    cover_settings: dict,
    pdf_theme: dict | None = None,
) -> None:
    normalized_theme = _normalize_pdf_theme(pdf_theme)
    styles = _build_styles(normalized_theme)
    logo_bytes = _resolve_brand_logo(brand_logo_path)
    cover_enabled = bool(cover_settings.get("cover_enabled", True))
    safe_report_title = _sanitize_pdf_text(report_title, unicode_capable=False)
    cover_title = _sanitize_pdf_text((cover_settings.get("cover_title") or report_title or "Relatorio Executivo Premium").strip(), unicode_capable=False)
    cover_subtitle = _sanitize_pdf_text((cover_settings.get("cover_subtitle") or "").strip(), unicode_capable=False)
    cover_text = _sanitize_pdf_text((cover_settings.get("cover_text") or "").strip(), unicode_capable=False).replace("\n", "<br/>")
    cover_note = _sanitize_pdf_text((cover_settings.get("cover_note") or "").strip(), unicode_capable=False)
    cover_footer = _sanitize_pdf_text((cover_settings.get("cover_footer") or "").strip(), unicode_capable=False) or "Sua Empresa | www.seusite.com.br"
    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        leftMargin=1.8 * cm,
        rightMargin=1.8 * cm,
        topMargin=2.2 * cm,
        bottomMargin=1.8 * cm,
        title=safe_report_title,
    )

    story = []
    if cover_enabled:
        story.append(Spacer(1, 4.8 * cm))
        story.append(Paragraph(cover_title, styles["title"]))
        if cover_subtitle:
            story.append(Paragraph(cover_subtitle, styles["cover_subtitle"]))
        if cover_text:
            story.append(Paragraph(cover_text, styles["cover_subtitle"]))
        story.append(Spacer(1, 0.6 * cm))
        if cover_note:
            story.append(Paragraph(cover_note, styles["cover_meta"]))
        story.append(Spacer(1, 8.8 * cm))
        story.append(Paragraph(cover_footer, styles["cover_meta"]))
        story.append(Spacer(1, 0.3 * cm))
        story.append(Paragraph(" ", styles["cover_meta"]))
        story.append(Spacer(1, 1.2 * cm))
    else:
        story.append(Spacer(1, 0.5 * cm))
        story.append(Paragraph(safe_report_title, styles["topic_title"]))
        story.append(Spacer(1, 0.4 * cm))

    topics = data.get("topics", [])
    if not topics:
        story.append(Paragraph("Nenhum topico cadastrado.", styles["body"]))
        if cover_enabled:
            doc.build(
                story,
                onFirstPage=lambda canvas, current_doc: _draw_cover(canvas, current_doc, logo_bytes, normalized_theme),
                onLaterPages=lambda canvas, current_doc: _draw_standard_frame(canvas, current_doc, logo_bytes, cover_footer, normalized_theme),
            )
        else:
            doc.build(
                story,
                onFirstPage=lambda canvas, current_doc: _draw_standard_frame(canvas, current_doc, logo_bytes, cover_footer, normalized_theme),
                onLaterPages=lambda canvas, current_doc: _draw_standard_frame(canvas, current_doc, logo_bytes, cover_footer, normalized_theme),
            )
        return

    for index, topic in enumerate(topics, start=1):
        topic_title = _sanitize_pdf_text(topic.get("title", f"Topico {index}"), unicode_capable=True)
        topic_content = _sanitize_pdf_text(topic.get("content") or "", unicode_capable=False).replace("\n", "<br/>")
        block = [
            Paragraph(f"TOPICO {index:02d}", styles["section_badge"]),
            _build_topic_title_flowable(topic_title, styles, doc.width),
            Paragraph(topic_content or "Sem descricao.", styles["body"]),
        ]
        for image_item in topic.get("images", []):
            image_path = upload_dir / image_item.get("stored_name", "")
            if not image_path.exists():
                continue
            block.append(_safe_image(image_path, max_width=16 * cm, max_height=9.6 * cm))
            block.append(Spacer(1, 0.35 * cm))

        story.append(KeepTogether(block))
        story.append(Spacer(1, 0.6 * cm))

    if cover_enabled:
        doc.build(
            story,
            onFirstPage=lambda canvas, current_doc: _draw_cover(canvas, current_doc, logo_bytes, normalized_theme),
            onLaterPages=lambda canvas, current_doc: _draw_standard_frame(canvas, current_doc, logo_bytes, cover_footer, normalized_theme),
        )
    else:
        doc.build(
            story,
            onFirstPage=lambda canvas, current_doc: _draw_standard_frame(canvas, current_doc, logo_bytes, cover_footer, normalized_theme),
            onLaterPages=lambda canvas, current_doc: _draw_standard_frame(canvas, current_doc, logo_bytes, cover_footer, normalized_theme),
        )

