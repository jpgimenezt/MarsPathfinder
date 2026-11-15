"""Crea un derivado web de la miniatura oficial Viking MDIM 2.1.

Requiere Pillow en el entorno offline; producción solo sirve el WebP resultante.
"""

from io import BytesIO
from pathlib import Path
from urllib.request import Request, urlopen

from PIL import Image

SOURCE = (
    "https://astrogeology.usgs.gov/ckan/dataset/"
    "7131d503-cdc9-45a5-8f83-5126c0fd397e/resource/"
    "6afad901-1caa-48a7-8b62-3911da0004c2/download/"
    "mars_viking_mdim21_clrmosaic_global_1024.jpg"
)
OUTPUT = Path(__file__).resolve().parents[1] / "public/data/mars-viking-global-1024.webp"


def main() -> None:
    # El servidor USGS rechaza el User-Agent predeterminado de urllib (403).
    request = Request(SOURCE, headers={"User-Agent": "Mozilla/5.0 (AresRoute educational prototype)"})
    with urlopen(request, timeout=30) as response:
        if response.headers.get_content_type() != "image/jpeg":
            raise ValueError("La fuente no devolvió JPEG")
        data = response.read(1_000_001)
        if len(data) > 1_000_000:
            raise ValueError("La miniatura excede el límite de descarga")

    with Image.open(BytesIO(data)) as image:
        if image.size != (1024, 512):
            raise ValueError(f"Dimensiones inesperadas: {image.size}")
        image.convert("RGB").save(OUTPUT, "WEBP", quality=85, method=6)
    print(f"{OUTPUT}: {OUTPUT.stat().st_size} bytes (USGS Viking MDIM 2.1)")


if __name__ == "__main__":
    main()
