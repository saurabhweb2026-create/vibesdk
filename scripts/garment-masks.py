"""Builds the garment region masks used by the wardrobe recolouring.

For each teammate it writes public/troop/masks/<person>-<region>.webp, a white image whose alpha marks the
top, the trousers or the shoes. The wardrobe tints those regions with CSS blend modes, so the folds and
lighting of the original photo stay.
"""
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / 'public' / 'troop'
OUT = ROOT / 'masks'

# Boxes (x0, y0, x1, y1) in the 1100px tall artwork that must never be tinted: hands, neck and chest skin.
SKIN_BOXES = {
    'jack': [(0, 70, 118, 226), (0, 226, 70, 272), (355, 482, 404, 670), (185, 140, 270, 205)],
    'john': [(40, 85, 160, 228), (335, 566, 398, 670), (195, 140, 255, 196)],
    'maria': [(0, 110, 90, 300), (270, 520, 320, 650), (150, 200, 198, 262)],
}
# Row where the top ends and the trousers begin, and where the shoes begin.
WAIST = {'jack': 545, 'john': 548, 'maria': 566}
HEM = {'jack': 1010, 'john': 1008, 'maria': 1018}
TOP_START = {'jack': 168, 'john': 168, 'maria': 196}


def warm(rgb: np.ndarray) -> np.ndarray:
    r, g, b = (rgb[..., i].astype(int) for i in range(3))
    return (r - b > 28) & (r >= g)


def cool_or_dark(rgb: np.ndarray) -> np.ndarray:
    return ~warm(rgb)


def boxes_mask(shape, boxes):
    m = np.zeros(shape, bool)
    for x0, y0, x1, y1 in boxes:
        m[y0:y1, x0:x1] = True
    return m


def regions(person: str, im: np.ndarray):
    rgb, alpha = im[..., :3], im[..., 3] > 128
    h, w = alpha.shape
    ys = np.arange(h)[:, None] * np.ones((1, w), int)
    skin = boxes_mask((h, w), SKIN_BOXES[person])
    body = alpha & ~skin
    top = body & (ys >= TOP_START[person]) & (ys < WAIST[person] + 60)
    bottom = body & (ys >= WAIST[person]) & (ys < HEM[person])
    shoes = alpha & (ys >= HEM[person])
    if person == 'jack':
        top &= cool_or_dark(rgb) | (ys < WAIST[person] - 5)
        top &= ~(bottom & warm(rgb) & (ys >= WAIST[person]))
        bottom &= warm(rgb)
        top &= ~bottom
    elif person == 'john':
        blue = rgb[..., 2].astype(int) > rgb[..., 0].astype(int) - 4
        bottom &= blue
        top &= ~bottom
        top &= ys < WAIST[person] + 14
    else:
        dark = rgb.max(axis=2) < 70
        bottom &= dark
        top &= ~bottom
        top &= ~(warm(rgb) & (rgb.max(axis=2) > 90) & (ys < 420) & (np.arange(w)[None, :] < 140))
        top &= ys < WAIST[person] + 6
        high_waist = alpha & dark & (ys >= 425) & (ys < WAIST[person]) & (np.arange(w)[None, :] >= 150) & (np.arange(w)[None, :] < 248)
        bottom |= high_waist
        top &= ~high_waist
    return {'top': top, 'bottom': bottom, 'shoes': shoes}


def clean(mask: np.ndarray) -> np.ndarray:
    m = mask.astype(np.uint8) * 255
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    return cv2.GaussianBlur(m, (0, 0), 1.2)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for person in ('jack', 'john', 'maria'):
        im = np.array(Image.open(ROOT / f'{person}-wave.webp').convert('RGBA'))
        for name, mask in regions(person, im).items():
            alpha = clean(mask)
            rgba = np.dstack([np.full(alpha.shape + (3,), 255, np.uint8), alpha])
            Image.fromarray(rgba, 'RGBA').save(OUT / f'{person}-{name}.webp', quality=80, method=6)
            print(person, name, int((alpha > 128).sum()))


if __name__ == '__main__':
    sys.exit(main())
