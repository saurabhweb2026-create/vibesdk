"""Turn a green-screen character render into a transparent full-body webp plus a square face crop.

Usage: python scripts/cutout-character.py <input.png> <name> [outfit]
Writes public/troop/<name>-<outfit>-wave.webp and <name>-<outfit>-face.webp
"""
import sys
import numpy as np
from PIL import Image

src, name = sys.argv[1], sys.argv[2]
outfit = sys.argv[3] if len(sys.argv) > 3 else 'ethnic'

im = Image.open(src).convert('RGB')
a = np.asarray(im).astype(np.float32)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
h, w = g.shape

# Green-ness: how far green leads the other two channels. Soft edge keeps hair and fabric clean.
lead = g - np.maximum(r, b)
alpha = np.clip(1.0 - (lead - 40.0) / 80.0, 0.0, 1.0)

# Remove the generator watermark in the bottom-right corner.
alpha[int(h * 0.88):, int(w * 0.78):] = 0.0

# Despill: pull leaked green back to the neighbouring channels.
spill = np.clip(g - np.maximum(r, b), 0, None) * (alpha > 0)
a[..., 1] = g - spill * 0.9
out = np.dstack([np.clip(a, 0, 255), alpha * 255]).astype(np.uint8)
rgba = Image.fromarray(out, 'RGBA')

box = rgba.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox()
rgba = rgba.crop(box)
scale = 1100 / rgba.height
full = rgba.resize((round(rgba.width * scale), 1100), Image.LANCZOS)
full.save(f'public/troop/{name}-{outfit}-wave.webp', quality=88, method=6)

# Face: square around the head, composited on the same dark tone as the other faces.
alpha_arr = np.asarray(full.getchannel('A'))
top_rows = alpha_arr[: int(full.height * 0.07)]
cols = np.where(top_rows.max(axis=0) > 40)[0]
cx = int(cols.mean())
side = int(full.height * 0.175)
left = max(0, min(full.width - side, cx - side // 2))
face = full.crop((left, 0, left + side, side))
bg = Image.new('RGB', face.size, (18, 12, 10))
bg.paste(face, mask=face.getchannel('A'))
bg.resize((160, 160), Image.LANCZOS).save(f'public/troop/{name}-{outfit}-face.webp', quality=88)
print(name, full.size, 'face from x', left)
