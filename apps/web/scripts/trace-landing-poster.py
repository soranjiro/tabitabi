#!/usr/bin/env python3
"""Authoring-time tracer for the landing poster. Requires Pillow, numpy, opencv-python-headless, scour."""
from pathlib import Path
import subprocess
import tempfile
import cv2
import numpy as np
from PIL import Image

WEB = Path(__file__).resolve().parents[1]
ART = WEB / "static" / "illustrations"
SOURCE = ART / "tabitabi-feature-poster.webp"
THRESHOLDS = [246, 234, 218, 197, 170, 140, 110, 82, 58, 40, 25]
INK = ["#e1dfdc", "#c9c8c6", "#b6b4b2", "#9d9b99", "#898786", "#706e6d",
       "#5a5857", "#484646", "#393737", "#302e2e", "#272525"]
PAPER = "#fefcf9"

def trace_shapes(image):
    gray = cv2.cvtColor(np.asarray(image.convert("RGB")), cv2.COLOR_RGB2GRAY)
    smooth = cv2.GaussianBlur(
        cv2.resize(gray, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC),
        (3, 3), 0.55,
    )
    layers = []
    for threshold, color in zip(THRESHOLDS, INK, strict=True):
        binary = (smooth < threshold).astype(np.uint8) * 255
        contours, _ = cv2.findContours(binary, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
        segments = []
        for contour in contours:
            if cv2.contourArea(contour) < 0.35:
                continue
            points = cv2.approxPolyDP(contour, 0.5, True).reshape(-1, 2)
            if len(points) < 3:
                continue
            segments.append("M" + "L".join(f"{int(x)},{int(y)}" for x, y in points) + "Z")
        layers.append(f'<path fill="{color}" fill-rule="evenodd" d="{"".join(segments)}"/>')
    return '<g transform="scale(0.5)">' + "".join(layers) + '</g>'

def optimize(svg, path):
    with tempfile.TemporaryDirectory() as temp:
        source = Path(temp) / "source.svg"
        source.write_text(svg, encoding="utf-8")
        subprocess.run([
            "scour", "-i", str(source), "-o", str(path), "--enable-viewboxing",
            "--enable-id-stripping", "--shorten-ids", "--remove-metadata",
            "--strip-xml-prolog", "--indent=none",
        ], check=True)

def desktop_svg(art, width, height):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title desc">
<title id="title">tabitabi 機能紹介</title>
<desc id="desc">しおり作成、多彩なデザイン、SNS共有、お金・持ち物の管理、シークレットモード、スマホやPCでの利用。</desc>
<rect width="{width}" height="{height}" fill="{PAPER}"/>{art}</svg>'''

def mobile_svg(art):
    # Crop the original *vector paths*: glyph shapes and drawings are identical.
    scenes = [(47, 36, 0, 452, 406, 421),
              (47, 597, 403, 452, 400, 421),
              (47, 1158, 802, 452, 406, 421)]
    connectors = [
        "M453 291 C480 296 493 331 490 382 C485 430 462 456 424 487 C344 551 99 500 58 576 C22 641 14 792 47 852",
        "M447 879 C484 886 494 921 491 951 C486 1014 455 1038 419 1067 C330 1132 104 1092 55 1152 C14 1214 18 1380 47 1440",
    ]
    parts = ['<defs><g id="original-line-art">', art, '</g>']
    for idx, (x, y, _, _, cw, ch) in enumerate(scenes):
        parts.append(f'<clipPath id="panel{idx}"><rect x="{x}" y="{y}" width="{cw}" height="{ch}"/></clipPath>')
    parts.append("</defs>")
    for idx, (x, y, from_x, from_y, _, _) in enumerate(scenes):
        parts.append(
            f'<g clip-path="url(#panel{idx})"><g transform="translate({x-from_x} {y-from_y})">'
            '<use xlink:href="#original-line-art"/></g></g>'
        )
        if idx < len(connectors):
            parts.append(
                f'<path d="{connectors[idx]}" fill="none" stroke="#282826" '
                'stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>'
            )
    return f'''<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
width="500" height="1620" viewBox="0 0 500 1620" role="img" aria-labelledby="mobile-title mobile-desc">
<title id="mobile-title">tabitabi の機能紹介</title>
<desc id="mobile-desc">多彩なデザイン、SNSで共有、お金と持ち物の管理を滑らかな線でつないだ線画。</desc>
<rect width="500" height="1620" fill="{PAPER}"/>{''.join(parts)}</svg>'''

def main():
    image = Image.open(SOURCE).convert("RGB")
    if image.size != (1208, 1302):
        raise ValueError(f"Unexpected source dimensions: {image.size}")
    art = trace_shapes(image)
    optimize(desktop_svg(art, *image.size), ART / "tabitabi-feature-poster.svg")
    optimize(mobile_svg(art), ART / "tabitabi-feature-poster-mobile.svg")
    print("Generated two path-only SVG files.")

if __name__ == "__main__":
    main()
