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

def section_cover(doc):
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from styles import add_image, set_run
    from docx.shared import Pt
    add_image(doc, str(ASSETS / "cover_pens_logo.png"), width_cm=8)
    for _ in range(2):
        doc.add_paragraph()
    for line in ["PRODUK INOVATIF",
                 "PEMILIHAN MAHASISWA BERPRESTASI 2026",
                 "PROGRAM DIPLOMA"]:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(line)
        set_run(r, size=Pt(14), bold=True)
    doc.add_paragraph()
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("PENSyarat AI: Platform Pemahaman Kosakata Abstrak Berbasis "
                  "Sistem Isyarat Bahasa Indonesia dan Kecerdasan Buatan untuk "
                  "Siswa SDLB-B Tingkat Pemula")
    set_run(r, size=Pt(12), bold=True)
    for _ in range(4):
        doc.add_paragraph()
    for line in ["OLEH:", "MOCHAMMAD ARIEL SULTON", "3323600054"]:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(line)
        set_run(r, bold=True)
    for _ in range(4):
        doc.add_paragraph()
    for line in ["POLITEKNIK ELEKTRONIKA NEGERI SURABAYA", "SURABAYA", "2026"]:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(line)
        set_run(r, bold=True)

def section_pengesahan(doc):
    from styles import set_run
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.shared import Pt
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("LEMBAR PENGESAHAN")
    set_run(r, size=Pt(14), bold=True)
    # Page intentionally minimal — physical signature page

def section_pengantar(doc):
    from styles import add_body_paragraph, set_run, add_numbered_list
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.shared import Pt
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("KATA PENGANTAR")
    set_run(r, size=Pt(14), bold=True)
    doc.add_paragraph()
    add_body_paragraph(doc,
        "Puji syukur penulis haturkan kepada Tuhan Yang Maha Esa atas segala "
        "rahmat dan karunia-Nya sehingga penulis dapat menyelesaikan Naskah "
        "Produk Inovatif yang berjudul \"PENSyarat AI: Platform Pemahaman "
        "Kosakata Abstrak Berbasis Sistem Isyarat Bahasa Indonesia dan "
        "Kecerdasan Buatan untuk Siswa SDLB-B Tingkat Pemula\". Penyusunan "
        "naskah ini merupakan bagian dari rangkaian keikutsertaan dalam "
        "Pemilihan Mahasiswa Berprestasi (Pilmapres) Program Diploma Tahun "
        "2026. Naskah ini telah direvisi berdasarkan masukan dari tim "
        "pendamping LLDIKTI, Ibu Ida, dan Bapak Adam guna memperkuat "
        "rumusan masalah, uji efektivitas pembelajaran, kerincian dataset "
        "gestur, aksesibilitas antarmuka, mitigasi risiko, perlindungan "
        "data siswa, model keberlanjutan, dan tabel outcome before–after."
    )
    add_body_paragraph(doc, "Pada kesempatan ini, penulis menyampaikan terima kasih sebesar-besarnya kepada:")
    add_numbered_list(doc, [
        "Bapak Dr. Ir. Arif Irwansyah, S.T., M.Eng selaku Direktur Politeknik "
        "Elektronika Negeri Surabaya, atas bimbingan dan dukungannya yang "
        "telah memberikan kami motivasi dan arah dalam mengejar inovasi.",
        "Bapak Kholid Fathoni, S.Kom, M.T. selaku Wakil Direktur Bidang "
        "Kemahasiswaan dan Alumni Politeknik Elektronika Negeri Surabaya yang "
        "selalu memacu dan mendukung kami, untuk selalu berpartisipasi.",
        "Bapak/Ibu Dosen Pembina Mawapres Politeknik Elektronika Negeri "
        "Surabaya yang senantiasa memberikan bimbingan dan arahan dalam "
        "penyelesaian Produk Inovatif ini.",
        "Tim pendamping LLDIKTI, Ibu Ida, dan Bapak Adam atas masukan revisi "
        "yang memperkuat kualitas naskah dan produk PENSyarat AI.",
        "Serta, teman-teman yang telah bekerja sama dalam penyelesaian "
        "Produk Inovatif ini, yang tidak dapat penulis sebutkan satu persatu.",
    ])
    add_body_paragraph(doc,
        "Penulis menyadari bahwa naskah ini masih jauh dari kesempurnaan. "
        "Oleh karena itu, penulis mengharapkan kritik dan saran yang "
        "membangun demi penyempurnaan karya ini. Semoga platform PENSyarat "
        "AI dapat memberikan manfaat nyata bagi peningkatan kualitas "
        "pendidikan siswa tunarungu di Indonesia."
    )
    for _ in range(3):
        doc.add_paragraph()
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    r = p.add_run("Surabaya, 25 Mei 2026\n\n\nPenulis")
    set_run(r)

def section_daftar_isi(doc):
    """Static daftar isi reflecting the post-revision structure.
    NOTE: page numbers below are placeholders — re-verify after final build."""
    from styles import set_run
    from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_TAB_ALIGNMENT
    from docx.shared import Pt, Cm
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("DAFTAR ISI")
    set_run(r, size=Pt(14), bold=True)
    doc.add_paragraph()
    entries = [
        ("LEMBAR PENGESAHAN", "i"),
        ("KATA PENGANTAR", "ii"),
        ("DAFTAR ISI", "iii"),
        ("DAFTAR GAMBAR", "iv"),
        ("DAFTAR TABEL", "iv"),
        ("1. LINGKUP PEMBAHASAN", "1"),
        ("   1.1 Lingkungan Penerima Manfaat dan Kerangka Analisis", "1"),
        ("   1.2 Pihak Terdampak sebagai Penerima Manfaat", "3"),
        ("   1.3 Pernyataan Teori Utama", "3"),
        ("2. IDENTIFIKASI POTENSI DAN KEBUTUHAN LINGKUNGAN", "3"),
        ("   2.1 Potensi Lingkungan", "3"),
        ("   2.2 Situasi dan Kebutuhan Lingkungan", "4"),
        ("   2.3 Rumusan Masalah", "5"),
        ("3. RUMUSAN TARGET PEMBANGUNAN", "5"),
        ("   3.1 Tujuan Pembangunan dan Target SMART", "5"),
        ("   3.2 Manfaat Solusi", "7"),
        ("4. ANALISIS CARA PENCAPAIAN TARGET", "7"),
        ("   4.1 Alternatif Solusi", "7"),
        ("   4.2 Pemilihan Solusi Terbaik", "8"),
        ("   4.3 Kelayakan Teknis PENSyarat AI", "8"),
        ("       4.3.1 Pengujian Akurasi Pengenalan Gestur SIBI", "8"),
        ("       4.3.2 Pengujian Fungsionalitas Sistem", "10"),
        ("       4.3.3 Rencana Uji Efektivitas Pembelajaran (Pre-test/Post-test)", "10"),
        ("       4.3.4 Pengujian Aksesibilitas Antarmuka", "11"),
        ("   4.4 Proyeksi Outcome: Perbandingan Sebelum dan Sesudah PENSyarat AI", "12"),
        ("5. PENJABARAN RENCANA KERJA", "13"),
        ("   5.1 Tahapan Utama (Pendekatan Strategis)", "13"),
        ("   5.2 Tahap dan Langkah Kegiatan", "13"),
        ("   5.3 Penjadwalan", "14"),
        ("   5.4 Mitigasi Risiko Implementasi", "14"),
        ("6. PENJABARAN INFORMASI TAMBAHAN", "15"),
        ("   6.1 Analisis Keunikan dan Orisinalitas Produk", "15"),
        ("   6.2 Struktur Organisasi Pelaksana", "16"),
        ("   6.3 Rencana Anggaran dan Sumber Pendanaan", "17"),
        ("   6.4 Proyeksi Jangka Panjang dan Mitra Pemangku Kepentingan", "17"),
        ("   6.5 Kesimpulan Dampak Inovasi", "18"),
        ("   6.6 Perlindungan Data Siswa", "18"),
        ("   6.7 Manfaat Jangka Panjang", "19"),
        ("7. VISUALISASI SOLUSI", "20"),
        ("   7.1 Desain Visualisasi Gagasan (SaHaBaT)", "20"),
        ("DAFTAR PUSTAKA", "21"),
        ("LAMPIRAN", "23"),
    ]
    for title, page in entries:
        p = doc.add_paragraph()
        p.paragraph_format.tab_stops.add_tab_stop(Cm(16), alignment=WD_TAB_ALIGNMENT.RIGHT)
        r1 = p.add_run(title)
        set_run(r1)
        r2 = p.add_run(f"\t{page}")
        set_run(r2)
    # Daftar Gambar & Tabel — short tables on a fresh page
    doc.add_page_break()
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("DAFTAR GAMBAR")
    set_run(r, size=Pt(14), bold=True)
    for txt, pg in [("Gambar 1. Alur Kerja Sistem PENSyarat AI", "9"),
                    ("Gambar 2. Visualisasi Roadmap dari PENSyarat AI", "18"),
                    ("Gambar 3. Desain Visualisasi Gagasan (SaHaBaT)", "20")]:
        p = doc.add_paragraph()
        p.paragraph_format.tab_stops.add_tab_stop(Cm(16), alignment=WD_TAB_ALIGNMENT.RIGHT)
        r = p.add_run(f"{txt}\t{pg}")
        set_run(r)
    doc.add_paragraph()
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("DAFTAR TABEL")
    set_run(r, size=Pt(14), bold=True)
    tabel_list = [
        ("Tabel 1. Analisis Solusi", "4"),
        ("Tabel 2. Affinity Diagram PENSyarat AI", "6"),
        ("Tabel 3. Target Pembangunan dengan Indikator SMART", "6"),
        ("Tabel 4. Hasil Pengujian Akurasi Pengenalan Gestur SIBI", "9"),
        ("Tabel 5. Hasil Pengujian Fungsionalitas Sistem", "10"),
        ("Tabel 6. Rancangan Pengujian Efektivitas Pre-test dan Post-test", "11"),
        ("Tabel 7. Penerapan Prinsip Aksesibilitas", "12"),
        ("Tabel 8. Proyeksi Outcome Sebelum vs Sesudah PENSyarat AI", "12"),
        ("Tabel 9. Identifikasi Risiko dan Strategi Mitigasi", "14"),
        ("Tabel 10. Skema Keberlanjutan dan Kemitraan", "17"),
        ("Tabel 11. Key Difference Matrix", "15"),
    ]
    for txt, pg in tabel_list:
        p = doc.add_paragraph()
        p.paragraph_format.tab_stops.add_tab_stop(Cm(16), alignment=WD_TAB_ALIGNMENT.RIGHT)
        r = p.add_run(f"{txt}\t{pg}")
        set_run(r)
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
