"""Audita píxeles opacos del sector editable en el WMTS CTX Jezero.

Requiere red y Pillow: python3 scripts/check_ctx_route_coverage.py
La transparencia demuestra ausencia de imagen, NO transitabilidad del terreno.
"""

from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
from math import ceil, floor
import sys
from urllib.request import Request, urlopen

from PIL import Image

# La auditoría no debe crear artefactos Python dentro del repositorio.
sys.dont_write_bytecode = True
from check_wmts_alignment import read_capabilities

PRODUCT = "JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0"
ROOT = f"https://trek.nasa.gov/tiles/Mars/EQ/{PRODUCT}/1.0.0//default/default028mm"
REGION = (77.164, 18.215, 77.695, 18.717)  # oeste, sur, este, norte


def audit_level(zoom: int) -> None:
    west, south, east, north = REGION
    span = 180 / 2**zoom
    columns = range(floor((west + 180) / span), floor((east + 180) / span) + 1)
    rows = range(floor((90 - north) / span), floor((90 - south) / span) + 1)

    def check(index: tuple[int, int]) -> tuple[int, int]:
        col, row = index
        request = Request(
            f"{ROOT}/{zoom}/{row}/{col}.png",
            headers={"User-Agent": "Mozilla/5.0 (AresRoute coverage audit)"},
        )
        with urlopen(request, timeout=35) as response:
            if response.headers.get_content_type() != "image/png":
                raise ValueError(f"Tesela inesperada: {zoom}/{row}/{col}")
            data = response.read(1_000_001)
        with Image.open(BytesIO(data)) as image:
            if image.size != (256, 256) or len(data) > 1_000_000:
                raise ValueError(f"Tamaño inesperado: {zoom}/{row}/{col}")
            alpha = image.convert("RGBA").getchannel("A")
            x0 = max(0, ceil(((west + 180) / span - col) * 256))
            x1 = min(256, floor(((east + 180) / span - col) * 256) + 1)
            y0 = max(0, ceil(((90 - north) / span - row) * 256))
            y1 = min(256, floor(((90 - south) / span - row) * 256) + 1)
            if x0 >= x1 or y0 >= y1:
                return 0, 0
            histogram = alpha.crop((x0, y0, x1, y1)).histogram()
            return (x1 - x0) * (y1 - y0), sum(histogram[:255])

    indices = [(col, row) for col in columns for row in rows]
    with ThreadPoolExecutor(max_workers=12) as executor:
        results = list(executor.map(check, indices))
    tested = sum(total for total, _ in results)
    missing = sum(transparent for _, transparent in results)
    print(f"z{zoom}: {len(indices)} teselas, {tested} píxeles, {missing} no opacos")
    if not tested or missing:
        raise SystemExit("NO-GO: huecos CTX en el sector propuesto")


def audit_high_zoom_samples() -> None:
    """Muestra z13: NO equivale a auditoría exhaustiva de este nivel."""
    west, south, east, north = REGION
    zoom = 13
    span = 180 / 2**zoom
    coordinates = [
        (west + (east - west) * x / 4, south + (north - south) * y / 4)
        for x in range(5) for y in range(5)
    ]

    def sample(point: tuple[float, float]) -> int:
        lon, lat = point
        col = floor((lon + 180) / span)
        row = floor((90 - lat) / span)
        request = Request(
            f"{ROOT}/{zoom}/{row}/{col}.png",
            headers={"User-Agent": "Mozilla/5.0 (AresRoute coverage audit)"},
        )
        with urlopen(request, timeout=35) as response:
            if response.headers.get_content_type() != "image/png":
                raise ValueError(f"Tesela inesperada: {zoom}/{row}/{col}")
            with Image.open(BytesIO(response.read(1_000_001))) as image:
                pixel_x = floor(((lon + 180) / span - col) * 256)
                pixel_y = floor(((90 - lat) / span - row) * 256)
                return image.convert("RGBA").getpixel((pixel_x, pixel_y))[3]

    with ThreadPoolExecutor(max_workers=12) as executor:
        alpha = list(executor.map(sample, coordinates))
    print(f"z13: 25 puntos (esquinas + grilla 5×5), {sum(value < 255 for value in alpha)} no opacos")
    if any(value < 255 for value in alpha):
        raise SystemExit("NO-GO: muestra transparente en zoom máximo CTX")


def main() -> None:
    grid, bbox, crs = read_capabilities(PRODUCT)
    if crs != "urn:ogc:def:crs:EPSG::104905":
        raise SystemExit("NO-GO: proyección inesperada")
    if any(abs(grid[z][1][i] - (-180, 90)[i]) > 1e-8 for z in (10, 11, 12) for i in range(2)):
        raise SystemExit("NO-GO: origen de teselas inesperado")
    if not (bbox[0][0] < REGION[0] < REGION[2] < bbox[1][0] and
            bbox[0][1] < REGION[1] < REGION[3] < bbox[1][1]):
        raise SystemExit("NO-GO: región fuera de la huella publicada")
    for zoom in (10, 11, 12):
        audit_level(zoom)
    audit_high_zoom_samples()
    print("Cobertura CTX verificada z10/z11/z12; z13 muestreado. NO evalúa seguridad ni elevación.")


if __name__ == "__main__":
    main()
