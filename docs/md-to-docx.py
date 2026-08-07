#!/usr/bin/env python3
"""
Convert a manual Markdown file to .docx for Google Docs upload.

    python3 docs/md-to-docx.py docs/caller-manual.md

Writes <name>.docx next to the source. No third-party dependencies — it
emits the OOXML package directly.

Why not textutil: its docx writer silently drops tables (verified — RTF
keeps them, docx does not), and these manuals are table-heavy.

Deliberately narrow: it handles exactly the Markdown our manuals use —
ATX headings, pipe tables, -/1. lists, blockquotes, hr, and inline
bold/italic/code/links. Not a general CommonMark implementation.
"""
import re
import sys
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
CONTENT_WIDTH = 10080  # twips: US Letter (12240) less 1080 margins each side

# ---------------------------------------------------------------- parsing

TABLE_ROW = re.compile(r"^\s*\|(.+)\|\s*$")
TABLE_SEP = re.compile(r"^\s*\|[\s:|-]+\|\s*$")
LIST_ITEM = re.compile(r"^(\s*)([-*]|\d+\.)\s+(.*)$")
HEADING = re.compile(r"^(#{1,6})\s+(.*)$")


def runs(text):
    """Inline markup -> [(text, style)] where style is a set of flags."""
    # Code spans first so their contents are never re-parsed.
    parts, last = [], 0
    for m in re.finditer(r"`([^`]+)`", text):
        parts.append((text[last:m.start()], False))
        parts.append((m.group(1), True))
        last = m.end()
    parts.append((text[last:], False))

    out = []
    for chunk, is_code in parts:
        if is_code:
            out.append((chunk, {"mono"}))
            continue
        chunk = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", chunk)  # links -> text
        pos = 0
        for m in re.finditer(r"\*\*(.+?)\*\*|(?<![\w*])\*([^*\n]+?)\*(?![\w*])", chunk):
            if m.start() > pos:
                out.append((chunk[pos:m.start()], set()))
            if m.group(1) is not None:
                out.append((m.group(1), {"bold"}))
            else:
                out.append((m.group(2), {"italic"}))
            pos = m.end()
        if pos < len(chunk):
            out.append((chunk[pos:], set()))
    return [(t, s) for t, s in out if t]


def cells(line):
    return [c.strip() for c in TABLE_ROW.match(line).group(1).split("|")]


def parse(md):
    lines = md.split("\n")
    blocks, i = [], 0
    while i < len(lines):
        raw, line = lines[i], lines[i].strip()
        if not line:
            i += 1
            continue

        if re.fullmatch(r"-{3,}", line):
            blocks.append({"t": "hr"})
            i += 1
            continue

        m = HEADING.match(line)
        if m:
            blocks.append({"t": "h", "lvl": len(m.group(1)), "runs": runs(m.group(2))})
            i += 1
            continue

        if TABLE_ROW.match(raw) and i + 1 < len(lines) and TABLE_SEP.match(lines[i + 1]):
            head = cells(raw)
            i += 2
            rows = []
            while i < len(lines) and TABLE_ROW.match(lines[i]) and not TABLE_SEP.match(lines[i]):
                rows.append(cells(lines[i]))
                i += 1
            blocks.append({"t": "table", "head": head, "rows": rows})
            continue

        if line.startswith(">"):
            buf = []
            while i < len(lines) and lines[i].strip().startswith(">"):
                buf.append(re.sub(r"^\s*>\s?", "", lines[i]))
                i += 1
            blocks.append({"t": "quote", "runs": runs(" ".join(buf).strip())})
            continue

        m = LIST_ITEM.match(raw)
        if m:
            ordered = bool(re.match(r"\d+\.", m.group(2)))
            items = []
            while i < len(lines):
                mm = LIST_ITEM.match(lines[i])
                if mm and bool(re.match(r"\d+\.", mm.group(2))) == ordered:
                    items.append(mm.group(3))
                    i += 1
                    while (
                        i < len(lines)
                        and lines[i].strip()
                        and re.match(r"^\s{2,}\S", lines[i])
                        and not LIST_ITEM.match(lines[i])
                        and not TABLE_ROW.match(lines[i])
                    ):
                        items[-1] += " " + lines[i].strip()
                        i += 1
                elif not lines[i].strip() and i + 1 < len(lines) and LIST_ITEM.match(lines[i + 1]):
                    i += 1
                else:
                    break
            blocks.append({"t": "list", "ordered": ordered,
                           "items": [runs(x) for x in items]})
            continue

        buf = []
        while i < len(lines) and lines[i].strip():
            s = lines[i].strip()
            if (HEADING.match(s) or re.fullmatch(r"-{3,}", s) or s.startswith(">")
                    or LIST_ITEM.match(lines[i]) or TABLE_ROW.match(lines[i])):
                break
            buf.append(s)
            i += 1
        if buf:
            blocks.append({"t": "p", "runs": runs(" ".join(buf))})
    return blocks


# ---------------------------------------------------------------- emitting

def xml_runs(rs):
    out = []
    for text, style in rs:
        props = ""
        if "bold" in style:
            props += "<w:b/>"
        if "italic" in style:
            props += "<w:i/>"
        if "mono" in style:
            props += '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="19"/>'
        rpr = "<w:rPr>%s</w:rPr>" % props if props else ""
        out.append('<w:r>%s<w:t xml:space="preserve">%s</w:t></w:r>'
                   % (rpr, escape(text)))
    return "".join(out) or "<w:r><w:t/></w:r>"


def para(rs, style=None, extra=""):
    ppr = ""
    if style:
        ppr += '<w:pStyle w:val="%s"/>' % style
    ppr += extra
    return "<w:p>%s%s</w:p>" % ("<w:pPr>%s</w:pPr>" % ppr if ppr else "", xml_runs(rs))


def widths(head, rows):
    """Proportional column widths from content length, floored so no column
    collapses and the header stays readable."""
    n = len(head)
    weight = []
    for c in range(n):
        lens = [len(head[c])] + [len(r[c]) for r in rows if c < len(r)]
        weight.append(max(sum(lens) / max(len(lens), 1), len(head[c]) * 0.8))
    floor = 0.10 * sum(weight) if sum(weight) else 1
    weight = [max(w, floor) for w in weight]
    total = sum(weight)
    cols = [int(CONTENT_WIDTH * w / total) for w in weight]
    cols[-1] += CONTENT_WIDTH - sum(cols)  # absorb rounding
    return cols


def table_xml(head, rows):
    cols = widths(head, rows)
    edge = ('<w:tblBorders>' + "".join(
        '<w:%s w:val="single" w:sz="4" w:space="0" w:color="9AA0A6"/>' % s
        for s in ("top", "left", "bottom", "right", "insideH", "insideV")
    ) + '</w:tblBorders>')
    out = ['<w:tbl><w:tblPr><w:tblW w:w="%d" w:type="dxa"/>%s'
           '<w:tblLayout w:type="fixed"/></w:tblPr>' % (CONTENT_WIDTH, edge)]
    out.append("<w:tblGrid>%s</w:tblGrid>"
               % "".join('<w:gridCol w:w="%d"/>' % c for c in cols))

    def cell(text, w, header):
        shd = '<w:shd w:val="clear" w:color="auto" w:fill="E8EAF0"/>' if header else ""
        rs = runs(text)
        if header:
            rs = [(t, s | {"bold"}) for t, s in rs] or [("", {"bold"})]
        body = para(rs, "TableText")
        return ('<w:tc><w:tcPr><w:tcW w:w="%d" w:type="dxa"/>%s'
                '<w:vAlign w:val="top"/></w:tcPr>%s</w:tc>' % (w, shd, body))

    out.append('<w:tr><w:trPr><w:tblHeader/></w:trPr>%s</w:tr>'
               % "".join(cell(h, cols[i], True) for i, h in enumerate(head)))
    for r in rows:
        padded = (r + [""] * len(cols))[:len(cols)]
        out.append("<w:tr>%s</w:tr>"
                   % "".join(cell(c, cols[i], False) for i, c in enumerate(padded)))
    out.append("</w:tbl>")
    out.append(para([], extra='<w:spacing w:after="0"/>'))  # tables need a trailing p
    return "".join(out)


def body_xml(blocks):
    out = []
    for b in blocks:
        if b["t"] == "h":
            lvl = b["lvl"]
            out.append(para(b["runs"], "Title" if lvl == 1 else "Heading%d" % min(lvl - 1, 4)))
        elif b["t"] == "p":
            out.append(para(b["runs"]))
        elif b["t"] == "quote":
            out.append(para(b["runs"], "Quote"))
        elif b["t"] == "hr":
            out.append('<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" '
                       'w:space="1" w:color="D0D0D0"/></w:pBdr>'
                       '<w:spacing w:before="120" w:after="120"/></w:pPr></w:p>')
        elif b["t"] == "list":
            num = 2 if b["ordered"] else 1
            for it in b["items"]:
                out.append(para(it, "ListParagraph",
                                '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="%d"/></w:numPr>' % num))
        elif b["t"] == "table":
            out.append(table_xml(b["head"], b["rows"]))
    return "".join(out)


STYLES = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles %s>
<w:docDefaults><w:rPrDefault><w:rPr>
<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/>
</w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="140" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault>
</w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/>
<w:pPr><w:spacing w:before="0" w:after="200"/></w:pPr>
<w:rPr><w:b/><w:sz w:val="44"/><w:color w:val="1A1A1A"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/>
<w:pPr><w:outlineLvl w:val="0"/><w:spacing w:before="400" w:after="120"/>
<w:pBdr><w:bottom w:val="single" w:sz="4" w:space="4" w:color="C8CDD4"/></w:pBdr></w:pPr>
<w:rPr><w:b/><w:sz w:val="30"/><w:color w:val="1F3864"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/>
<w:pPr><w:outlineLvl w:val="1"/><w:spacing w:before="320" w:after="100"/></w:pPr>
<w:rPr><w:b/><w:sz w:val="26"/><w:color w:val="1F3864"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/>
<w:pPr><w:outlineLvl w:val="2"/><w:spacing w:before="240" w:after="80"/></w:pPr>
<w:rPr><w:b/><w:sz w:val="23"/><w:color w:val="2E4E7E"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading4"><w:name w:val="heading 4"/><w:basedOn w:val="Normal"/>
<w:pPr><w:outlineLvl w:val="3"/><w:spacing w:before="200" w:after="60"/></w:pPr>
<w:rPr><w:b/><w:sz w:val="22"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/>
<w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="60"/><w:ind w:left="360"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="TableText"><w:name w:val="Table Text"/><w:basedOn w:val="Normal"/>
<w:pPr><w:spacing w:before="40" w:after="40" w:line="240" w:lineRule="auto"/></w:pPr>
<w:rPr><w:sz w:val="19"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/>
<w:pPr><w:ind w:left="360"/><w:spacing w:before="120" w:after="120"/>
<w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="1F3864"/></w:pBdr></w:pPr></w:style>
</w:styles>''' % W

NUMBERING = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering %s>
<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="singleLevel"/>
<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="&#8226;"/>
<w:lvlJc w:val="left"/><w:pPr><w:ind w:left="480" w:hanging="240"/></w:pPr>
<w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:hint="default"/></w:rPr></w:lvl></w:abstractNum>
<w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="singleLevel"/>
<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%%1."/>
<w:lvlJc w:val="left"/><w:pPr><w:ind w:left="480" w:hanging="300"/></w:pPr></w:lvl></w:abstractNum>
<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
<w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>
</w:numbering>''' % W

CONTENT_TYPES = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>'''

RELS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>'''

DOC_RELS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
</Relationships>'''


def main():
    src = Path(sys.argv[1] if len(sys.argv) > 1 else "docs/caller-manual.md")
    md = src.read_text(encoding="utf-8")
    m = re.search(r"^#\s+(.*)$", md, re.M)
    title = re.sub(r"[*`]", "", m.group(1)) if m else src.stem

    document = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        '<w:document %s><w:body>%s'
        '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/>'
        '<w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080" '
        'w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>'
        '</w:body></w:document>' % (W, body_xml(parse(md)))
    )
    core = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '
        'xmlns:dc="http://purl.org/dc/elements/1.1/">'
        '<dc:title>%s</dc:title></cp:coreProperties>' % escape(title)
    )

    out = src.with_suffix(".docx")
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", CONTENT_TYPES)
        z.writestr("_rels/.rels", RELS)
        z.writestr("word/_rels/document.xml.rels", DOC_RELS)
        z.writestr("word/document.xml", document)
        z.writestr("word/styles.xml", STYLES)
        z.writestr("word/numbering.xml", NUMBERING)
        z.writestr("docProps/core.xml", core)
    print("wrote %s (%.1f KB)" % (out, out.stat().st_size / 1024))


if __name__ == "__main__":
    main()
