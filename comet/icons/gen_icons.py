"""Generate simple app icons for the Sungrazer Hunter PWA (no external assets)."""
from PIL import Image, ImageDraw
import math

def make_icon(size, maskable=False, path="icon.png"):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    bg = (9, 13, 28, 255)         # deep space navy
    ring = (255, 176, 59, 255)    # coronagraph occulter ring, amber
    disk = (13, 18, 38, 255)      # occulter disk
    star = (255, 255, 255, 255)
    comet_head = (255, 221, 130, 255)
    comet_tail = (255, 221, 130, 90)

    pad = int(size * 0.06) if maskable else 0
    box = [pad, pad, size - pad, size - pad]

    # background square (rounded) - maskable icons need full-bleed bg
    radius = int(size * (0.5 if not maskable else 0.0))
    d.rounded_rectangle(box, radius=radius, fill=bg)

    cx, cy = size / 2, size / 2
    r_outer = size * 0.30
    r_inner = size * 0.16

    # subtle starfield
    for sx, sy, sr in [(0.22,0.24,0.010),(0.78,0.20,0.008),(0.16,0.72,0.009),
                        (0.83,0.66,0.007),(0.30,0.84,0.007),(0.70,0.86,0.006)]:
        px, py = sx * size, sy * size
        d.ellipse([px-sr*size, py-sr*size, px+sr*size, py+sr*size], fill=star)

    # coronagraph occulting disk + ring (represents LASCO C2/C3 imagery)
    d.ellipse([cx-r_outer, cy-r_outer, cx+r_outer, cy+r_outer], outline=ring, width=max(2, int(size*0.018)))
    d.ellipse([cx-r_inner, cy-r_inner, cx+r_inner, cy+r_inner], fill=disk)

    # comet: head + tail streaking toward the sun (lower-left to center, common sungrazer path)
    head_x, head_y = cx + r_outer * 0.92, cy + r_outer * 0.92
    tail_x, tail_y = cx + r_outer * 1.55, cy + r_outer * 1.55
    d.line([tail_x, tail_y, head_x, head_y], fill=comet_tail, width=max(3, int(size*0.05)))
    hr = size * 0.028
    d.ellipse([head_x-hr, head_y-hr, head_x+hr, head_y+hr], fill=comet_head)

    img.save(path)

make_icon(192, maskable=False, path="icon-192.png")
make_icon(512, maskable=False, path="icon-512.png")
make_icon(512, maskable=True, path="icon-maskable-512.png")
make_icon(180, maskable=False, path="apple-touch-icon.png")
print("done")
