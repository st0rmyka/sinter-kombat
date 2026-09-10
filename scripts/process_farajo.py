#!/usr/bin/env python3
"""Re-chroma Farajo sprites, match idle scale, process music-note FX."""
from __future__ import annotations

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ART = Path("/workspace/artifacts/imagine_images")
OUT = Path("/workspace/public/sprites/farajo")
FX = Path("/workspace/public/fx")
ATT = Path("/workspace/attachments")
OUT.mkdir(parents=True, exist_ok=True)
FX.mkdir(parents=True, exist_ok=True)

W, H = 520, 780
FOOT_Y = 749
TARGET_H = 620


def is_magenta(p: np.ndarray) -> bool:
    r, g, b = float(p[0]), float(p[1]), float(p[2])
    if g > 110 and abs(r - b) < 55:
        return False
    if r > 140 and g < 95 and b > 70 and r > g + 35:
        return True
    if r > 190 and b > 160 and g < 80:
        return True
    dist = ((r - 230) ** 2 + (g - 30) ** 2 + (b - 160) ** 2) ** 0.5
    return dist < 95


def flood_bg(rgb: np.ndarray) -> np.ndarray:
    h, w = rgb.shape[:2]
    vis = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()
    seeds = [(0, 0), (0, w - 1), (h - 1, 0), (h - 1, w - 1), (0, w // 2), (h - 1, w // 2), (h // 2, 0), (h // 2, w - 1)]
    for y, x in seeds:
        q.append((y, x))
        vis[y, x] = True
    while q:
        y, x = q.popleft()
        c = rgb[y, x]
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            ny, nx = y + dy, x + dx
            if ny < 0 or nx < 0 or ny >= h or nx >= w or vis[ny, nx]:
                continue
            p = rgb[ny, nx]
            if is_magenta(p) or float(np.linalg.norm(p - c)) < 36:
                if is_magenta(p) or is_magenta(c):
                    vis[ny, nx] = True
                    q.append((ny, nx))
    return vis


def chroma(im: Image.Image) -> Image.Image:
    rgb = np.array(im.convert("RGB"), dtype=np.float32)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    mag = (r > 140) & (g < 100) & (b > 70) & (r > g + 30)
    hot = (r > 190) & (b > 140) & (g < 90)
    whiteish = (g > 115) & (np.abs(r - b) < 60) & (r > 140)
    bg = flood_bg(rgb)
    a = np.where((mag | hot | bg) & ~whiteish, 0, 255).astype(np.uint8)
    padded = np.pad(a, 1, mode="edge")
    eroded = np.minimum.reduce(
        [padded[1:-1, 1:-1], padded[:-2, 1:-1], padded[2:, 1:-1], padded[1:-1, :-2], padded[1:-1, 2:]]
    )
    a = np.where(mag | hot, np.minimum(a, eroded), a)
    return Image.fromarray(np.dstack([rgb.astype(np.uint8), a]))


def crop_alpha(im: Image.Image) -> Image.Image:
    a = np.array(im)
    ys, xs = np.where(a[:, :, 3] > 20)
    if len(xs) < 30:
        return Image.new("RGBA", (1, 1), (0, 0, 0, 0))
    return im.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))


def place(crop: Image.Image, scale: float) -> Image.Image:
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    if crop.size[0] < 4:
        return canvas
    nw = max(1, int(crop.size[0] * scale))
    nh = max(1, int(crop.size[1] * scale))
    nw = min(nw, W - 8)
    nh = min(nh, H - 20)
    spr = crop.resize((nw, nh), Image.Resampling.LANCZOS)
    x = (W - nw) // 2
    y = FOOT_Y - nh
    if y < 4:
        y = 4
    canvas.paste(spr, (x, y), spr)
    return canvas


def split_grid(path: Path, rows: int, cols: int):
    im = Image.open(path)
    w, h = im.size
    cw, ch = w // cols, h // rows
    frames = []
    for r in range(rows):
        for c in range(cols):
            frames.append(im.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch)))
    return frames


SINGLES = {
    "6604f708-07a3-413c-b097-205e99a5885d.jpg": "idle.png",
    "7de7548b-5a89-45c5-9001-f7ffd619ad04.jpg": "crouch.png",
    "447d580e-aa03-444b-a00d-9717b9bb173b.jpg": "jump.png",
    "79bd1dd7-ee36-400f-9c40-a86dca03f4e7.jpg": "block.png",
    "0f20f76f-4e0f-43ac-9958-46efb34bab37.jpg": "dash.png",
    "d2dbc50c-17d0-47c8-87fc-2e53b2a47661.jpg": "hurt.png",
    "c73900b3-2466-4cbd-8344-5983ec7d0d27.jpg": "jumpPunchL.png",
    "b6007be8-cba6-4775-bbb1-a14f9d76d673.jpg": "jumpPunchR.png",
    "841d0b2c-943a-4751-8515-4258df07c0ed.jpg": "jumpKickL.png",
    "1d0e19f8-a22e-4436-9a0c-697014848671.jpg": "jumpKickR.png",
    "6bf6ef2b-a548-4b3d-bfc8-d33858ab3455.jpg": "lowPunchL.png",
    "0c021444-e22e-48ca-8f7b-2b422a798d8e.jpg": "lowPunchR.png",
    "f1a5ba44-78fb-46a8-b105-b706a6c729b3.jpg": "lowKickL.png",
    "5e6f02f6-1f83-4612-980f-cc14e9e1403c.jpg": "lowKickR.png",
    "65ce2996-67c8-49aa-b889-c92e64628545.jpg": "special.png",
    "ca46ac66-5ab1-46ba-b8da-12e73aaa0060.jpg": "spec2.png",
}

idle_crop = crop_alpha(chroma(Image.open(ART / "6604f708-07a3-413c-b097-205e99a5885d.jpg")))
IDLE_H = max(1, idle_crop.size[1])
SCALE = TARGET_H / IDLE_H
print("idle crop", idle_crop.size, "scale", round(SCALE, 3))

for src, name in SINGLES.items():
    crop = crop_alpha(chroma(Image.open(ART / src)))
    place(crop, SCALE).save(OUT / name)
    print("wrote", name, crop.size)

GRIDS = {
    "c52de0eb-1a7d-4b56-9f31-fa8b0f20d45e.jpg": ("walk", 2, 2),
    "512bd1ac-c0a9-4dc1-9fbb-b3c540cb6e0e.jpg": ("punchL", 2, 2),
    "8b626436-7680-40a4-b76f-3285730405d8.jpg": ("punchR", 2, 2),
    "0861f610-13d7-4565-89e5-e75ac1dab9e6.jpg": ("kickL", 2, 2),
    "7a04946f-872d-4aa1-8f85-dfe431be35a2.jpg": ("kickR", 2, 2),
    "4e122b6f-9f20-42b4-8189-4ae0b48abe7b.jpg": ("special", 2, 2),
}
for src, (prefix, rows, cols) in GRIDS.items():
    frames = split_grid(ART / src, rows, cols)
    for i, fr in enumerate(frames):
        crop = crop_alpha(chroma(fr))
        sc = SCALE
        # grid cells often have a smaller full-body figure — match idle height if complete-ish
        if crop.size[1] > 40:
            ratio = crop.size[1] / IDLE_H
            if 0.35 < ratio < 0.92:
                sc = TARGET_H / crop.size[1]
        name = f"walk{i}.png" if prefix == "walk" else f"{prefix}{i}.png"
        place(crop, sc).save(OUT / name)
        print("wrote", name, crop.size, "sc", round(sc, 3))

frames = split_grid(ART / "17c5fda0-dc6f-46d9-b847-73ddefdce496.jpg", 2, 3)
for i, fr in enumerate(frames):
    crop = crop_alpha(chroma(fr))
    sc = SCALE
    if crop.size[1] > 40:
        ratio = crop.size[1] / IDLE_H
        if 0.35 < ratio < 0.92:
            sc = TARGET_H / crop.size[1]
    place(crop, sc).save(OUT / f"special2{i}.png")
    print("wrote special2", i, crop.size)

# Trumpet frames that aren't full-body → use full-body special.png
spec = Image.open(OUT / "special.png")
for i in range(4):
    p = OUT / f"special{i}.png"
    a = np.array(Image.open(p))
    ys, xs = np.where(a[:, :, 3] > 20)
    hgt = int(ys.max() - ys.min()) if len(ys) else 0
    if hgt < TARGET_H * 0.72:
        spec.save(p)
        print("trumpet frame", i, "replaced with full-body special, was", hgt)

for a, b in [
    ("punchL2.png", "punchL.png"),
    ("punchR2.png", "punchR.png"),
    ("kickL2.png", "kickL.png"),
    ("kickR2.png", "kickR.png"),
]:
    Image.open(OUT / a).save(OUT / b)
Image.open(OUT / "punchL.png").save(OUT / "punch.png")
Image.open(OUT / "kickL.png").save(OUT / "kick.png")

# music notes: black → transparent, small
notes = sorted(ATT.glob("ChatGPT Image 2026. szept. 9. 20_31*.png"))
print("note src", [p.name for p in notes])
for i, p in enumerate(notes[:4]):
    im = Image.open(p).convert("RGBA")
    a = np.array(im)
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    dark = (r.astype(np.int16) + g.astype(np.int16) + b.astype(np.int16)) < 70
    a[:, :, 3] = np.where(dark, 0, 255)
    im = Image.fromarray(a)
    ys, xs = np.where(a[:, :, 3] > 20)
    crop = im.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))
    crop.thumbnail((56, 56), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (56, 56), (0, 0, 0, 0))
    canvas.paste(crop, ((56 - crop.size[0]) // 2, (56 - crop.size[1]) // 2), crop)
    canvas.save(FX / f"note{i}.png")
    print("note", i, canvas.size)
Image.open(FX / "note0.png").save(FX / "note.png")

# report bboxes
print("\n--- bboxes ---")
for name in ["idle.png", "walk0.png", "crouch.png", "special.png", "special0.png", "spec2.png", "punchL0.png"]:
    a = np.array(Image.open(OUT / name))
    ys, xs = np.where(a[:, :, 3] > 20)
    if len(xs) == 0:
        print(name, "EMPTY")
        continue
    print(name, "w", xs.max() - xs.min(), "h", ys.max() - ys.min(), "y0", ys.min(), "y1", ys.max())
