"""Turns the AI team outfit PNGs into web-sized wardrobe art and face icons.

Usage: python3 scripts/outfit-art.py <folder with {person}-{style}.png> <out folder>
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

PEOPLE = ['jack', 'john', 'maria']
STYLES = ['beach', 'casual', 'cowboy', 'formal', 'party']
PAD = 14
HEIGHT = 1100
FACE_SIZE = 160


def main(src: Path, out: Path) -> None:
    for person in PEOPLE:
        images = {s: Image.open(src / f'{person}-{s}.png').convert('RGBA') for s in STYLES}
        alphas = {s: np.array(im)[:, :, 3] > 24 for s, im in images.items()}
        boxes = [np.argwhere(a) for a in alphas.values()]
        top = min(b.min(0)[0] for b in boxes) - PAD
        left = min(b.min(0)[1] for b in boxes) - PAD
        bottom = max(b.max(0)[0] for b in boxes) + PAD
        right = max(b.max(0)[1] for b in boxes) + PAD
        for style, im in images.items():
            crop = im.crop((left, top, right, bottom))
            scale = HEIGHT / crop.height
            crop.resize((round(crop.width * scale), HEIGHT), Image.LANCZOS).save(out / f'{person}-{style}-wave.webp', quality=88, method=6)

            mask = alphas[style]
            rows = np.argwhere(mask)[:, 0]
            head_top = rows.min()
            band = mask[head_top : head_top + 140]
            cols = np.argwhere(band)[:, 1]
            cx = int(np.median(cols))
            side = 215
            x0 = max(0, cx - side // 2)
            face = im.crop((x0, head_top - 8, x0 + side, head_top - 8 + side)).resize((FACE_SIZE, FACE_SIZE), Image.LANCZOS)
            face.save(out / f'{person}-{style}-face.webp', quality=88, method=6)


if __name__ == '__main__':
    main(Path(sys.argv[1]), Path(sys.argv[2]))
