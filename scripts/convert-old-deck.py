"""Convert a hand-authored chartroom HTML deck into Chartroom Studio annotated notes.

Reads legacy Chartroom teaching decks using .s-section markup and emits the
v1 annotated-notes format that Studio imports. Words are preserved verbatim;
only design chrome (dot markers, quote glyphs, accent bars, corner labels,
repeated part labels) is removed. See docs/ANNOTATIONS.md, "Migrating".

Usage:
  python scripts/convert-old-deck.py "deck.html" [--out notes.md]
      [--project project.chartroom.json] [--palette classic|buster|agnar|atlantic|field-notes|aubergine|night-seminar]

Python 3 stdlib only. This is authoring tooling, not part of the offline runtime.
"""
from __future__ import annotations

import argparse
import base64
import html
import json
import os
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

HUES = {"olive", "rust", "violet", "amber"}
IMAGE_KINDS = {"quote", "img", "photo", "somber", "duo", "scholar"}
# html.parser only emits handle_endtag for self-closed (<br/>) or explicitly
# closed void elements; a bare <br> would leak on the element stack otherwise.
VOID_TAGS = {"br", "img", "hr", "input", "meta", "link", "area", "base", "col", "embed", "source", "track", "wbr"}


def clean_ws(value: str) -> str:
    value = html.unescape(value or "")
    value = value.replace("\xa0", " ")
    value = re.sub(r"\s*·\s*", " · ", value)
    return re.sub(r"[ \t\r\n]+", " ", value).strip()


def slugify(stem: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", stem.lower()).strip("-")
    slug = re.sub(r"^[^a-z0-9]", "", slug) or "lecture"
    return slug[:64].rstrip("-")


class SlideExtractor(HTMLParser):
    """Walks one <section class="s ..."> and collects its authored content.

    A text sink opens when a recognized content element starts and finalizes
    when that same element ends, so the final item of any box is kept. Element
    identity uses a sequence number; every open tag is pushed and popped with it.
    """

    def __init__(self, section_tag: str):
        super().__init__(convert_charrefs=True)
        classes = re.search(r'class="([^"]*)"', section_tag)
        self.classes = set((classes.group(1) if classes else "").split())
        style = re.search(r'style="([^"]*)"', section_tag)
        self.bg = None
        if style:
            found = re.search(r"url\(['\"]?([^'\")\s]+)['\"]?\)", style.group(1))
            if found:
                self.bg = found.group(1)
        self.title = ""
        self.eyebrow = ""
        self.parts: list[str] = []
        self.facts: list[str] = []
        self.body: list[str] = []
        self.columns: list[dict] = []
        self.quote = ""
        self.attribution = ""
        self.footer = ""
        self.citation = ""
        self.takeaway = ""
        self.image = None
        self.alt = ""
        self.headers: list[str] = []
        self.rows: list[dict] = []
        self.current_row: dict | None = None
        self.eras: list[dict] = []
        self.cards: list[dict] = []
        self.flattened = False
        self._seen_fact = False
        self.cell_parts: list[str] = []
        self.cell_part: list[str] | None = None
        self.sink_key: str | None = None
        self.sink_owner = None
        self.sink_buffer: list[str] = []
        self.bold = 0
        self.in_script = 0
        self.in_thead = 0
        self._seq = 0
        self._stack: list[tuple[str, int]] = []

    # --- helpers -----------------------------------------------------------
    def _push(self, tag: str) -> int:
        self._seq += 1
        self._stack.append((tag, self._seq))
        return self._seq

    def _pop(self, tag: str) -> int | None:
        if self._stack and self._stack[-1][0] == tag:
            return self._stack.pop()[1]
        return None

    def _start_sink(self, key: str, owner: int):
        self.sink_key = key
        self.sink_owner = owner
        self.sink_buffer = []

    def _finalize(self, owner: int | None):
        if owner is None or self.sink_key is None or self.sink_owner != owner:
            return
        key, self.sink_key, self.sink_owner = self.sink_key, None, None
        text = clean_ws("".join(self.sink_buffer))
        self.sink_buffer = []
        if not text:
            return
        if key == "fact":
            self.facts.append(text)
            self._seen_fact = True
        elif key == "body":
            self.body.append(text)
        elif key == "goal":
            self.facts.append(text)
            self._seen_fact = True
        elif key == "stepafter":
            if self._seen_fact:
                self.facts.append(text)
            else:
                self.body.append(text)
        elif key == "era":
            self.eras.append({"date": text, "details": []})
            self._seen_fact = True
        elif key == "eradet":
            if self.eras:
                self.eras[-1]["details"].append(text)
            else:
                self.facts.append(text)
        elif key == "card":
            self.cards.append({"title": text, "lines": []})
            self._seen_fact = True
        elif key == "cardline":
            if self.cards:
                self.cards[-1]["lines"].append(text)
            else:
                self.facts.append(text)
        elif key == "title":
            if not self.title:
                self.title = text
        elif key == "eyebrow":
            self.eyebrow = text
        elif key == "part":
            self.parts.append(text)
        elif key == "quote":
            self.quote = text
        elif key == "att":
            self.attribution = text
        elif key == "footer":
            self.footer = text
        elif key == "cite":
            self.citation = text
        elif key == "takeaway":
            self.takeaway = text
        elif key == "coltitle":
            self.columns[-1]["title"] = text
        elif key == "colitem":
            self.columns[-1]["items"].append(text)
        elif key == "hdr":
            self.headers.append(text)
        elif key == "rowlabel":
            self.current_row = {"label": text, "cells": []}
            self.rows.append(self.current_row)
        elif key == "cellpart":
            self.cell_parts.append(text)

    # --- events ------------------------------------------------------------
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        classes = set((attrs.get("class") or "").split())
        owner = self._push(tag)
        if tag == "script":
            self.in_script += 1
            return
        if tag in ("strong", "b") or (tag == "span" and ("open" in classes or "closed" in classes)):
            self.bold += 1
            return
        if self.in_script:
            return
        if tag == "img" and self.image is None:
            self.image = attrs.get("src")
            self.alt = clean_ws(attrs.get("alt") or "")
            self._pop(tag)
            return
        if tag == "br":
            self.sink_buffer.append(" ")
            self._pop(tag)
            return
        if tag in ("thead", "tbody"):
            self.in_thead = 1 if tag == "thead" else 0
            return
        if tag in ("h1", "h2"):
            self._start_sink("title", owner)
            return
        if "eyebrow" in classes:
            self._start_sink("eyebrow", owner)
            return
        if "part-label" in classes:
            self._start_sink("part", owner)
            return
        if "t" in classes or "f" in classes:
            self._start_sink("fact", owner)
            return
        if "goal" in classes:
            self._start_sink("fact", owner)
            return
        if "question" in classes:
            self._start_sink("fact", owner)
            return
        if "actor-thesis" in classes:
            self._start_sink("body", owner)
            return
        if "era-date" in classes:
            self._start_sink("era", owner)
            return
        if "era-detail" in classes:
            self._start_sink("eradet", owner)
            return
        if "card-title" in classes:
            self._start_sink("card", owner)
            return
        if "card-line" in classes:
            self._start_sink("cardline", owner)
            return
        # Generic reveal lines (thesis, hypothesis, quotation, verdict, ask,
        # conclusion, why, last-point, deck-intro, ...) are visible body text.
        # After the rail they continue as facts so wording order is preserved.
        if tag in ("p", "blockquote") and "step" in classes:
            self._start_sink("stepafter", owner)
            return
        if "implication" in classes:
            self._start_sink("footer", owner)
            return
        if "more" in classes:
            self._start_sink("footer", owner)
            return
        if "cite-text" in classes:
            self._start_sink("cite", owner)
            return
        if "takeaway" in classes:
            self._start_sink("takeaway", owner)
            return
        if tag == "p" and "att" in classes:
            self._start_sink("att", owner)
            return
        if "quote" in self.classes and tag == "p" and "mark" not in classes:
            self._start_sink("quote", owner)
            return
        if "half" in classes:
            self.columns.append({"title": "", "items": []})
            return
        if tag == "h4":
            self._start_sink("coltitle", owner)
            return
        if tag in ("li", "p") and self.columns and "half" not in classes:
            self._start_sink("colitem", owner)
            return
        if tag == "td":
            self.cell_parts = []
            return
        if tag == "th":
            self._start_sink("hdr" if self.in_thead else "rowlabel", owner)
            return
        if tag == "span" and ("ab" in classes or "sc" in classes):
            self.cell_part = []
            self._pop(tag)
            return
        if tag in VOID_TAGS:
            self._pop(tag)

    def handle_endtag(self, tag):
        owner = self._pop(tag)
        if tag == "script":
            self.in_script = max(0, self.in_script - 1)
            return
        if tag in ("strong", "b"):
            self.bold = max(0, self.bold - 1)
            return
        if self.in_script:
            return
        if tag in ("thead", "tbody"):
            self.in_thead = 0
            return
        if tag == "span" and self.cell_part is not None:
            self.cell_parts.append(clean_ws("".join(self.cell_part)))
            self.cell_part = None
            return
        if tag == "td":
            if self.current_row is not None:
                self.current_row["cells"].append(self.cell_parts)
            self.cell_parts = []
            return
        self._finalize(owner)

    def handle_data(self, data):
        if self.in_script:
            return
        if self.cell_part is not None:
            self.cell_part.append(data)
            return
        if self.sink_key is not None:
            self.sink_buffer.append(("**" if self.bold else "") + data + ("**" if self.bold else ""))
            if self.bold:
                self.bold = 0


class DeckToNotes:
    """Converts a full deck document into ordered Chartroom v1 notes."""

    def __init__(self, html_text: str):
        self.html_text = html_text
        self.sections: list[tuple[str, str]] = []
        body = html_text
        cut = html_text.find("<script")
        if cut != -1:
            body = html_text[:cut]
        pattern = re.compile(r"<section\b([^>]*)>(.*?)</section>", re.S)
        for match in pattern.finditer(body):
            self.sections.append((match.group(1).strip(), match.group(2)))
        title_match = re.search(r"<title>(.*?)</title>", html_text, re.S)
        self.document_title = clean_ws(title_match.group(1)) if title_match else ""
        self.document_title = re.sub(r"\s*[—-]\s*chartroom\s*$", "", self.document_title, flags=re.I).strip()
        self.assets: list[str] = []
        self.slide_count = len(self.sections)

    def _hue(self, extractor: SlideExtractor) -> str | None:
        present = sorted(HUES & extractor.classes)
        return present[0] if present else None

    def _slide_notes(self, c: SlideExtractor, index: int) -> list[str]:
        lines: list[str] = []
        is_first = index == 0
        kind = "facts"
        image = None
        ships = c.title
        if not ships and c.eyebrow and not is_first:
            ships, c.eyebrow = c.eyebrow, ""
        if "cover" in c.classes:
            kind = "cover" if is_first else "part"
        elif "twocol" in c.classes:
            kind = "two-col"
        elif "quote" in c.classes:
            kind = "quote"
        elif "scholar" in c.classes:
            kind = "scholar"
        elif "imgfit" in c.classes:
            kind = "img"
            image = c.image
        elif "warimg" in c.classes:
            kind = "somber" if "lightimg" not in c.classes else "photo"
            image = c.bg
        elif "matrix" in c.classes:
            kind = "matrix"
        elif c.cards:
            kind = "cards"
        elif "navy" in c.classes and not c.facts:
            kind = "big"
        elif "school" in c.classes:
            kind = "divider"
        # Studio's @two-col requires exactly two NAMED columns. A deck whose
        # halves carry no authored heading is flattened to facts rather than
        # inventing column names; the private note explains how to restore it.
        if kind == "two-col" and c.columns and all(not column.get("title") for column in c.columns):
            kind = "facts"
            c.flattened = True
        if image is None and kind in ("img", "photo", "somber", "scholar"):
            image = c.image
        path = ""
        if image:
            path = image.replace("\\", "/")
            if path not in self.assets:
                self.assets.append(path)
        heading = ships or ""
        # A slide with no authored heading in an image/quote layout stays
        # headingless; otherwise a lone running part label becomes the heading
        # rather than inventing one (the eyebrow fallback below handles image kinds).
        if not heading and c.parts and kind not in IMAGE_KINDS:
            heading = c.parts[-1]
        if kind == "cover":
            head = f"# {heading}"
        elif kind in ("img", "photo", "somber", "scholar"):
            directive = f"@{kind} {path}".rstrip()
            head = f"## {heading} {directive}" if heading else f"## {directive}"
        elif kind == "quote":
            head = "## @quote"
        elif kind == "two-col":
            head = f"## {heading} @two-col" if heading else "## @two-col"
        elif kind == "cards":
            head = f"## {heading} @cards" if heading else "## @cards"
        elif kind in ("part", "big"):
            head = f"## {heading} @{kind}" if heading else f"## @{kind}"
        elif heading:
            head = f"## {heading}"
        else:
            head = "##"
        lines.append(head)
        hue = self._hue(c)
        eyebrow = c.eyebrow or (c.parts[-1] if c.parts and kind in IMAGE_KINDS else "")
        if eyebrow:
            lines.append(f"@eyebrow {eyebrow}")
        if hue:
            lines.append(f"@hue {hue}")
        if "norev" in c.classes and kind in ("facts", "two-col", "cards"):
            lines.append("@norev")
        if c.alt:
            lines.append(f"@alt {c.alt}")
        if c.citation:
            lines.append(f"@citation {c.citation}")
        if c.takeaway:
            lines.append(f"@takeaway {c.takeaway}")
        if kind == "matrix":
            lines.append('*This slide was a table (Rogowski-style matrix) in the original deck. It is preserved as nested facts: each row is a bold label; column names and cell entries are indented children. Every data word is verbatim; the corner label "economy" was table scaffolding and is omitted.*')
            for row in c.rows:
                lines.append(f"- **{row['label']}**")
                for column_index, cells in enumerate(row["cells"]):
                    if column_index < len(c.headers) - 1:
                        lines.append(f"  - {c.headers[column_index + 1]}")
                    for part in cells:
                        lines.append(f"    - {part}")
        if c.flattened:
            lines.append('*This slide was two side-by-side columns without authored headings. Studio two-column slides require named columns, so it was flattened to facts. Add ### headings to restore the two-column layout.*')
        for paragraph in c.body:
            lines.append(paragraph)
        for fact in c.facts:
            lines.append(f"- {fact}")
        for card in c.cards:
            lines.append(f"- **{card['title']}**")
            for line in card["lines"]:
                lines.append(f"  - {line}")
        for era in c.eras:
            lines.append(f"- **{era['date']}**")
            for detail in era["details"]:
                lines.append(f"  - {detail}")
        if c.columns:
            for column in c.columns:
                if column.get("title"):
                    lines.append(f"### {column['title']}")
                for item in column.get("items", []):
                    lines.append(f"- {item}")
        if c.quote:
            lines.append(c.quote)
        if c.attribution:
            lines.append(f"@attribution {c.attribution}")
        if c.footer:
            lines.append(f"@footer {c.footer}")
        return lines

    def to_notes(self) -> str:
        blocks: list[str] = []
        for index, (tag, body) in enumerate(self.sections):
            extractor = SlideExtractor(tag)
            extractor.feed(body)
            lines = self._slide_notes(extractor, index)
            if lines:
                blocks.append("\n".join(line for line in lines if line))
        return "\n\n".join(blocks) + "\n"


def mime_of(data: bytes) -> str:
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith((b"GIF87a", b"GIF89a")):
        return "image/gif"
    if data.startswith(b"RIFF") and data[8:12] == b"WEBP":
        return "image/webp"
    return ""


def build_project(notes: str, assets: list[str], deck_dir: Path, title: str, lecture_id: str, palette: str) -> dict:
    project_assets = []
    seen = set()
    for relative in assets:
        if relative in seen:
            continue
        seen.add(relative)
        source = deck_dir / relative.replace("/", os.sep)
        if not source.exists():
            continue
        data = source.read_bytes()
        mime = mime_of(data)
        if not mime or len(data) > 20 * 1024 * 1024:
            continue
        project_assets.append({"lectureId": lecture_id, "path": relative, "mime": mime, "data": base64.b64encode(data).decode("ascii")})
    return {
        "format": "chartroom-studio",
        "version": 1,
        "course": {"title": title, "code": "", "palette": palette},
        "lectures": [{"id": lecture_id, "title": title, "notes": notes, "available": True}],
        "assets": project_assets,
    }


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Convert an old chartroom HTML deck into Studio annotated notes.")
    parser.add_argument("deck", help="Path to the deck HTML file.")
    parser.add_argument("--out", help="Output notes file (.md). Defaults next to the deck.")
    parser.add_argument("--project", help="Also write a ready-to-open .chartroom.json project with images embedded.")
    parser.add_argument("--palette", default="classic", choices=["classic", "buster", "agnar", "atlantic", "field-notes", "aubergine", "night-seminar"])
    parser.add_argument("--id", help="Lecture identifier; default derived from the deck filename.")
    args = parser.parse_args(argv)
    deck = Path(args.deck)
    if not deck.is_file():
        print(f"error: deck not found: {deck}", file=sys.stderr)
        return 2
    converter = DeckToNotes(deck.read_text(encoding="utf-8", errors="replace"))
    notes = converter.to_notes()
    out = Path(args.out) if args.out else deck.with_name(deck.stem + " - notes.md")
    out.write_text(notes, encoding="utf-8")
    report = {"slides": converter.slide_count, "notes": str(out), "assets": converter.assets}
    if args.project:
        lecture_id = args.id or slugify(deck.stem)
        first_heading = notes.splitlines()[0].lstrip("# ").strip() if notes.splitlines() else ""
        title = converter.document_title or first_heading or deck.stem
        project = build_project(notes, converter.assets, deck.parent, title, lecture_id, args.palette)
        project_out = Path(args.project)
        project_out.write_text(json.dumps(project, indent=2), encoding="utf-8")
        missing = [a for a in converter.assets if not (deck.parent / a.replace("/", os.sep)).exists()]
        report["project"] = str(project_out)
        report["palette"] = args.palette
        report["lectureId"] = lecture_id
        report["images"] = len(project["assets"])
        if missing:
            report["missingImages"] = missing
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))