"""Generate the PWA icons and favicon. Run: python3 scripts/make-icons.py"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "public"
(OUT / "icons").mkdir(parents=True, exist_ok=True)

TEAL = (15, 118, 110, 255)
CREAM = (250, 247, 242, 255)
INK = (28, 25, 23, 255)


def icon(size: int, maskable: bool = False) -> Image.Image:
    img = Image.new("RGBA", (size, size), INK)
    d = ImageDraw.Draw(img)
    # Book: open pages with a spine.
    pad = size * (0.24 if maskable else 0.2)
    w = size - 2 * pad
    h = w * 0.78
    top = (size - h) / 2 + size * 0.02
    left = pad
    right = size - pad
    mid = size / 2

    # two page shapes
    d.rounded_rectangle([left, top, mid + w * 0.02, top + h], radius=size * 0.03, fill=CREAM)
    d.rounded_rectangle([mid - w * 0.02, top, right, top + h], radius=size * 0.03, fill=CREAM)
    # spine
    d.rectangle([mid - size * 0.012, top, mid + size * 0.012, top + h], fill=TEAL)
    # text lines
    line = max(2, int(size * 0.018))
    for i in range(4):
        y = top + h * (0.22 + i * 0.15)
        d.rounded_rectangle(
            [left + w * 0.12, y, mid - w * 0.12, y + line], radius=line / 2, fill=TEAL
        )
        d.rounded_rectangle(
            [mid + w * 0.12, y, right - w * 0.12, y + line], radius=line / 2, fill=TEAL
        )
    return img


for name, size, maskable in [
    ("icon-192.png", 192, False),
    ("icon-512.png", 512, False),
    ("icon-512-maskable.png", 512, True),
    ("apple-touch-icon.png", 180, False),
]:
    icon(size, maskable).save(OUT / "icons" / name)

(OUT / "favicon.svg").write_text(
    """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<rect width="64" height="64" rx="14" fill="#1c1917"/>
<rect x="14" y="17" width="18" height="30" rx="3" fill="#faf7f2"/>
<rect x="32" y="17" width="18" height="30" rx="3" fill="#faf7f2"/>
<rect x="31" y="17" width="2" height="30" fill="#0f766e"/>
<rect x="18" y="24" width="10" height="2.4" rx="1.2" fill="#0f766e"/>
<rect x="18" y="30" width="10" height="2.4" rx="1.2" fill="#0f766e"/>
<rect x="36" y="24" width="10" height="2.4" rx="1.2" fill="#0f766e"/>
<rect x="36" y="30" width="10" height="2.4" rx="1.2" fill="#0f766e"/>
</svg>
""",
    encoding="utf-8",
)
print("icons written to", OUT)
