"""Slice a claymation trinket grid sheet into individual icon PNGs.

The LLM generates 12 icons per theme as one 4x3 grid image. This crops
that sheet into 12 separate files, backgrounds intact.

Usage:
    python slice_trinkets.py <source_image> <theme> [cols] [rows]

Examples:
    python slice_trinkets.py superheroes.png superheroes
    python slice_trinkets.py grid.png vehicles 4 3

Output: trinketart/<theme>_01.png .. <theme>_NN.png
"""
import os
import sys
from PIL import Image

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "trinketart")


def slice_sheet(src, theme, cols=4, rows=3):
    os.makedirs(OUT, exist_ok=True)
    im = Image.open(src)
    W, H = im.size
    n = 1
    for r in range(rows):
        for c in range(cols):
            l = round(W * c / cols)
            rt = round(W * (c + 1) / cols)
            t = round(H * r / rows)
            b = round(H * (r + 1) / rows)
            im.crop((l, t, rt, b)).save(os.path.join(OUT, f"{theme}_{n:02d}.png"))
            n += 1
    print(f"wrote {n - 1} tiles to {OUT}")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    src = sys.argv[1]
    theme = sys.argv[2]
    cols = int(sys.argv[3]) if len(sys.argv) > 3 else 4
    rows = int(sys.argv[4]) if len(sys.argv) > 4 else 3
    slice_sheet(src, theme, cols, rows)
