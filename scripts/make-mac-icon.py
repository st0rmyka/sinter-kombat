#!/usr/bin/env python3
from pathlib import Path
import struct
import sys
from PIL import Image, ImageDraw


def paint(size: int) -> bytes:
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    s = size / 32.0

    def box(x0, y0, x1, y1):
        return [x0 * s, y0 * s, x1 * s, y1 * s]

    d.rounded_rectangle(box(0, 0, 32, 32), radius=6 * s, fill=(26, 14, 12, 255))
    d.ellipse(box(14 - 9, 16 - 9, 14 + 9, 16 + 9), fill=(196, 165, 116, 255))
    d.ellipse(box(14 - 5.5, 16 - 5.5, 14 + 5.5, 16 + 5.5), fill=(26, 14, 12, 255))
    d.rounded_rectangle(box(22.5, 14, 30, 18), radius=1.5 * s, fill=(196, 165, 116, 255))
    d.ellipse(box(14 - 3.2, 16 - 3.2, 14 + 3.2, 16 + 3.2), fill=(138, 12, 28, 255))
    from io import BytesIO

    buf = BytesIO()
    im.save(buf, format="PNG")
    return buf.getvalue()


def write_icns(dest: Path) -> None:
    chunks = [(b"ic09", paint(512)), (b"ic10", paint(1024))]
    parts = []
    body = 0
    for typ, data in chunks:
        size = 8 + len(data)
        parts.append(typ + struct.pack(">I", size) + data)
        body += size
    dest.write_bytes(b"icns" + struct.pack(">I", 8 + body) + b"".join(parts))


if __name__ == "__main__":
    write_icns(Path(sys.argv[1]))
