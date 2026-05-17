from pathlib import Path

import pymupdf


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "docs" / "demo-assets"

TEXT_CONTENT = """INF101 | Programación I | 4 | 1
INF102 | Programación II | 4 | 2
INF201 | Estructuras de Datos | 4 | 3
INF202 | Bases de Datos | 4 | 4
INF301 | Ingeniería de Software | 4 | 5
INF101 -> INF102 -> INF201 -> INF202 -> INF301
"""


def create_text_pdf(path: Path) -> None:
    document = pymupdf.open()
    page = document.new_page()
    page.insert_textbox(
        pymupdf.Rect(72, 72, 520, 400),
        TEXT_CONTENT,
        fontsize=12,
        fontname="helv",
    )
    document.save(path)
    document.close()


def create_blank_pdf(path: Path) -> None:
    document = pymupdf.open()
    document.new_page()
    document.save(path)
    document.close()


def create_scanned_pdf(path: Path) -> None:
    source = pymupdf.open()
    source_page = source.new_page()
    source_page.insert_textbox(
        pymupdf.Rect(72, 72, 520, 400),
        TEXT_CONTENT,
        fontsize=12,
        fontname="helv",
    )
    pixmap = source_page.get_pixmap(
        matrix=pymupdf.Matrix(1.5, 1.5),
        colorspace=pymupdf.csGRAY,
        alpha=False,
    )

    scanned = pymupdf.open()
    scanned_page = scanned.new_page(width=source_page.rect.width, height=source_page.rect.height)
    scanned_page.insert_image(scanned_page.rect, pixmap=pixmap)
    scanned.save(path)

    scanned.close()
    source.close()


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    create_text_pdf(OUTPUT_DIR / "malla_sistemas_texto_demo.pdf")
    create_blank_pdf(OUTPUT_DIR / "malla_vacia_demo.pdf")
    create_scanned_pdf(OUTPUT_DIR / "malla_sistemas_escaneada_demo.pdf")
    print(f"PDFs de demo generados en {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
