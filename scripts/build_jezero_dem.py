"""Derive a compact, conservative browsing grid from the official USGS TIFF.

Usage: python3 scripts/build_jezero_dem.py /path/to/M20_JezeroCrater_CTXDEM_20m.tif
Requires Pillow. The original TIFF stays outside the repository.
"""
import hashlib
import json
import math
import struct
import sys
from pathlib import Path

from PIL import Image

URL = "https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/ScienceInvestigationMaps_JPL/M20_JezeroCrater_CTXDEM_20m.tif"
SHA256 = "ba7f706ea1b5d63a562f28a7dcf7a7f3c79bce7f048e6974b57e8a33c30d1ba2"
RADIUS = 3396190.0  # Projection radius from the PDS4 label, NOT the routing distance sphere.
STANDARD_PARALLEL = math.radians(18.4663)
ULX, ULY = 4329000.0, 1143420.0
PIXEL = 20.0
FACTOR = 4  # 80 m cell; preserve worst local slope over underlying 20 m pixels.
NODATA = -3.4028234663852886e38
ROI = (77.20, 18.00, 78.12, 18.82)
DEST = Path(__file__).resolve().parents[1] / "public/data"


def column(lon):
    return (RADIUS * math.cos(STANDARD_PARALLEL) * math.radians(lon) - ULX) / PIXEL - 0.5


def row(lat):
    return (ULY - RADIUS * math.radians(lat)) / PIXEL - 0.5


def longitude(col):
    return math.degrees((ULX + (col + 0.5) * PIXEL) / (RADIUS * math.cos(STANDARD_PARALLEL)))


def latitude(line):
    return math.degrees((ULY - (line + 0.5) * PIXEL) / RADIUS)


def valid(value):
    return math.isfinite(value) and value != NODATA and value > -1e30


def build(path):
    with path.open("rb") as source:
        digest = hashlib.file_digest(source, "sha256").hexdigest()
    if digest != SHA256:
        raise ValueError(f"USGS SHA-256 mismatch: {digest}")
    image = Image.open(path)
    if image.mode != "F" or image.size != (4456, 5067):
        raise ValueError("Unexpected DEM format or dimensions")
    if (tuple(image.tag_v2[33550])[:2] != (PIXEL, PIXEL)
            or abs(image.tag_v2[33922][3] - ULX) > 0.01
            or abs(image.tag_v2[33922][4] - ULY) > 0.01
            or not math.isclose(float(image.tag_v2[42113]), NODATA, rel_tol=1e-12)
            or abs(image.tag_v2[34736][2] - math.degrees(STANDARD_PARALLEL)) > 1e-7
            or abs(image.tag_v2[34736][5] - RADIUS) > 0.01
            or "Mars_2000_Sphere" not in image.tag_v2[34737]):
        raise ValueError("Unexpected GeoTIFF pixel size, origin or NoData")
    # Align to the original 20 m centres; no resampling or invented elevations.
    left = math.ceil(column(ROI[0]))
    top = math.ceil(row(ROI[3]))
    right = min(image.width, math.floor(column(ROI[2])) + 1)
    bottom = min(image.height, math.floor(row(ROI[1])) + 1)
    width = (right - left) // FACTOR
    height = (bottom - top) // FACTOR
    if width < 2 or height < 2:
        raise ValueError("No usable ROI")
    data = image.crop((left, top, left + width * FACTOR, top + height * FACTOR))
    pixels = data.load()
    DEST.mkdir(parents=True, exist_ok=True)
    valid_cells = 0
    low = math.inf
    high = -math.inf
    output = DEST / "jezero-dem-80m.bin"
    with output.open("wb") as file:
        for y in range(height):
            for x in range(width):
                samples = [pixels[x * FACTOR + dx, y * FACTOR + dy]
                           for dy in range(FACTOR) for dx in range(FACTOR)]
                if not all(valid(z) for z in samples):
                    file.write(struct.pack("<ff", math.nan, math.nan))
                    continue
                # Worst adjacent 20 m difference within the source block.
                # This is a conservative *proxy*, not an obstacle detector.
                maximum = 0.0
                for dy in range(FACTOR):
                    for dx in range(FACTOR):
                        z = samples[dy * FACTOR + dx]
                        if dx + 1 < FACTOR:
                            maximum = max(maximum, abs(z - samples[dy * FACTOR + dx + 1]))
                        elif x + 1 < width:
                            adjacent = pixels[(x + 1) * FACTOR, y * FACTOR + dy]
                            if valid(adjacent):
                                maximum = max(maximum, abs(z - adjacent))
                        if dy + 1 < FACTOR:
                            maximum = max(maximum, abs(z - samples[(dy + 1) * FACTOR + dx]))
                        elif y + 1 < height:
                            adjacent = pixels[x * FACTOR + dx, (y + 1) * FACTOR]
                            if valid(adjacent):
                                maximum = max(maximum, abs(z - adjacent))
                elevation = sum(samples) / len(samples)
                file.write(struct.pack("<ff", elevation, math.degrees(math.atan2(maximum, PIXEL))))
                valid_cells += 1
                low, high = min(low, elevation), max(high, elevation)
    bounds = [longitude(left + (FACTOR - 1) / 2), latitude(top + (height - 1) * FACTOR + (FACTOR - 1) / 2),
              longitude(left + (width - 1) * FACTOR + (FACTOR - 1) / 2), latitude(top + (FACTOR - 1) / 2)]
    metadata = {
        "width": width, "height": height, "bounds": bounds,
        "source": URL, "sha256": SHA256, "nominalSourceResolutionMeters": PIXEL,
        "gridStepMeters": PIXEL * FACTOR, "validCells": valid_cells,
        "minSourceValueMeters": low, "maxSourceValueMeters": high,
        "horizontalReference": "Mars 2000 Sphere; planetocentric, east-positive; equirectangular R=3396190m standard parallel 18.4663°",
        "verticalReference": "USGS: metres; some mosaic components vertically localized to MOLA; exact unified datum/error unknown",
        "noData": "NaN in both float32 little-endian fields when any source sample is invalid",
        "encoding": "row-major interleaved little-endian float32 elevation and max 20m neighbour slope proxy",
    }
    (DEST / "jezero-dem-80m.json").write_text(json.dumps(metadata, indent=2) + "\n")
    print(json.dumps({**metadata, "assetBytes": output.stat().st_size}, indent=2))


if __name__ == "__main__":
    build(Path(sys.argv[1]))
