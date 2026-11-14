"""Auditoría offline de cuadrículas WMTS y comparación visual opcional de Jezero.

Requiere red. Para --image hace falta Pillow (solo pipeline offline).
No comprueba exactitud geodésica de píxeles ni sustituye puntos de control.
"""

import argparse
import io
import xml.etree.ElementTree as ET
from urllib.request import urlopen

ROOT = "https://trek.nasa.gov/tiles/Mars/EQ/"
LAYERS = [
    ("CTX", "JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0", 11, "png"),
    ("THEMIS", "THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018", 9, "png"),
    ("MOLA", "Mars_MGS_MOLA_ClrShade_merge_global_463m", 7, "jpg"),
]
ROI = (77.3, 18.29, 77.55, 18.52)  # Comparación visual, no ROI de ruta.
NS = {"w": "http://www.opengis.net/wmts/1.0", "o": "http://www.opengis.net/ows/1.1"}


def read_capabilities(label):
    url = f"{ROOT}{label}/1.0.0/WMTSCapabilities.xml"
    with urlopen(url, timeout=30) as response:
        root = ET.fromstring(response.read())
    matrices = next(
        item for item in root.findall(".//w:TileMatrixSet", NS)
        if item.find("w:TileMatrix", NS) is not None
    )
    grid = [
        (
            matrix.findtext("o:Identifier", namespaces=NS),
            tuple(map(float, matrix.findtext("w:TopLeftCorner", namespaces=NS).split())),
            float(matrix.findtext("w:ScaleDenominator", namespaces=NS)),
            int(float(matrix.findtext("w:TileWidth", namespaces=NS))),
            int(float(matrix.findtext("w:TileHeight", namespaces=NS))),
            int(float(matrix.findtext("w:MatrixWidth", namespaces=NS))),
            int(float(matrix.findtext("w:MatrixHeight", namespaces=NS))),
        )
        for matrix in matrices.findall("w:TileMatrix", NS)
    ]
    bbox = root.find(".//w:Layer/o:WGS84BoundingBox", NS)
    lower = tuple(map(float, bbox.findtext("o:LowerCorner", namespaces=NS).split()))
    upper = tuple(map(float, bbox.findtext("o:UpperCorner", namespaces=NS).split()))
    crs = matrices.findtext("o:SupportedCRS", namespaces=NS)
    return grid, (lower, upper), crs


def image_comparison(path):
    from PIL import Image, ImageDraw

    result = Image.new("RGB", (1800, 580), "white")
    west, south, east, north = ROI
    for index, (title, label, zoom, extension) in enumerate(LAYERS):
        step = 180 / 2**zoom
        col0, col1 = int((west + 180) / step), int((east + 180) / step)
        row0, row1 = int((90 - north) / step), int((90 - south) / step)
        mosaic = Image.new("RGBA", ((col1 - col0 + 1) * 256, (row1 - row0 + 1) * 256))
        for col in range(col0, col1 + 1):
            for row in range(row0, row1 + 1):
                url = f"{ROOT}{label}/1.0.0//default/default028mm/{zoom}/{row}/{col}.{extension}"
                with urlopen(url, timeout=30) as response:
                    tile = Image.open(io.BytesIO(response.read())).convert("RGBA")
                mosaic.paste(tile, ((col - col0) * 256, (row - row0) * 256))
        left = (west - (-180 + col0 * step)) * 256 / step
        top = (90 - row0 * step - north) * 256 / step
        right = (east - (-180 + col0 * step)) * 256 / step
        bottom = (90 - row0 * step - south) * 256 / step
        panel = mosaic.crop((left, top, right, bottom)).resize((600, 540)).convert("RGB")
        draw = ImageDraw.Draw(panel)
        draw.rectangle((0, 0, 599, 24), fill="#212d34")
        draw.text((10, 5), f"{title} z{zoom} / mismos limites angulares", fill="white")
        result.paste(panel, (index * 600, 0))
    result.save(path, quality=82, optimize=True)
    print(f"Comparación visual: {path}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--image", help="Escribir comparación JPEG (requiere Pillow)")
    args = parser.parse_args()
    reference = None
    for name, label, _, _ in LAYERS:
        grid, bbox, crs = read_capabilities(label)
        covers = bbox[0][0] <= ROI[0] and bbox[0][1] <= ROI[1] and bbox[1][0] >= ROI[2] and bbox[1][1] >= ROI[3]
        same = reference is None or grid[:8] == reference[:8]
        print(f"{name}: CRS={crs}; niveles={len(grid)}; bbox={bbox}; ROI dentro={covers}; z0-z7 iguales={same}")
        if crs != "urn:ogc:def:crs:EPSG::104905" or not covers or not same:
            raise SystemExit(f"Cuadrícula o cobertura incompatible: {name}")
        if reference is None:
            reference = grid
    if args.image:
        image_comparison(args.image)


if __name__ == "__main__":
    main()
