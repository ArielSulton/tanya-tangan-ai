"""Build PENSyarat AI revised naskah (.docx)."""
import sys
from pathlib import Path
from docx import Document
from docx.shared import Cm, Pt

ROOT = Path(__file__).resolve().parent.parent  # docs/reference/revisi/
ASSETS = ROOT / "assets"
OUTPUT = ROOT / "output" / "naskah_revisi.docx"

sys.path.insert(0, str(Path(__file__).resolve().parent))
from styles import (  # noqa: E402
    add_body_paragraph, add_heading1, add_heading2, add_caption,
    add_table, add_numbered_list, add_bulleted_list, add_page_break,
    add_image,
)

def section_cover(doc):       add_body_paragraph(doc, "[TODO cover]")
def section_pengesahan(doc):  add_body_paragraph(doc, "[TODO pengesahan]")
def section_pengantar(doc):   add_body_paragraph(doc, "[TODO kata pengantar]")
def section_daftar_isi(doc):  add_body_paragraph(doc, "[TODO daftar isi]")
def section_bab1(doc):        add_body_paragraph(doc, "[TODO bab1]")
def section_bab2(doc):        add_body_paragraph(doc, "[TODO bab2]")
def section_bab3(doc):        add_body_paragraph(doc, "[TODO bab3]")
def section_bab4(doc):        add_body_paragraph(doc, "[TODO bab4]")
def section_bab5(doc):        add_body_paragraph(doc, "[TODO bab5]")
def section_bab6(doc):        add_body_paragraph(doc, "[TODO bab6]")
def section_bab7(doc):        add_body_paragraph(doc, "[TODO bab7]")
def section_pustaka(doc):     add_body_paragraph(doc, "[TODO pustaka]")
def section_lampiran(doc):    add_body_paragraph(doc, "[TODO lampiran]")

SECTIONS = [
    section_cover, section_pengesahan, section_pengantar, section_daftar_isi,
    section_bab1, section_bab2, section_bab3, section_bab4,
    section_bab5, section_bab6, section_bab7,
    section_pustaka, section_lampiran,
]

def build():
    doc = Document()
    # Page setup A4 + COMPACT 2.0cm margins (Page Budget Constraints)
    for s in doc.sections:
        s.page_height = Cm(29.7)
        s.page_width = Cm(21.0)
        s.top_margin = s.bottom_margin = Cm(2.0)
        s.left_margin = s.right_margin = Cm(2.0)
    normal = doc.styles["Normal"]
    normal.font.name = "Times New Roman"
    normal.font.size = Pt(11)
    normal.paragraph_format.space_after = Pt(0)
    normal.paragraph_format.space_before = Pt(0)
    for i, fn in enumerate(SECTIONS):
        fn(doc)
        if i < len(SECTIONS) - 1:
            add_page_break(doc)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc.save(OUTPUT)
    print(f"Wrote {OUTPUT} ({OUTPUT.stat().st_size:,} bytes)")

if __name__ == "__main__":
    build()
