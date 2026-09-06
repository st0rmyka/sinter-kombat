#!/usr/bin/env python3
"""Chroma-key Hoffer gens onto the 520x780 fighter canvas without eating navy plaid."""
from __future__ import annotations

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

CANVAS_W, CANVAS_H = 520, 780
FOOT_Y = 749
TARGET_H = 640
MAX_H = 732
KEY = np.array([230.0, 33.0, 165.0])


def flood_bg(rgb: np.ndarray) -> np.ndarray:
    h, w = rgb.shape[:2]
    vis = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()
    seeds = [(0, 0), (0, w - 1), (h - 1, 0), (h - 1, w - 1), (0, w // 2), (h - 1, w // 2)]
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
            dist = float(np.linalg.norm(p - c))
            r, g, b = p
            mag = (r > 160 and g < 130 and b > 90 and r > g + 30) or (r > 200 and b > 180 and g < 80)
            near = dist < 38
            if mag or near:
                vis[ny, nx] = True
                q.append((ny, nx))
    return vis


def chroma(im: Image.Image) -> np.ndarray:
    rgb = np.array(im.convert("RGB"), dtype=np.float32)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    dist = np.linalg.norm(rgb - KEY, axis=2)
    hot = (r > 165) & (g < 120) & (b > 100) & (r > g + 40)
    ff = (r > 210) & (g < 50) & (b > 200)
    mag = dist < 78
    # protect navy/brown plaid, denim, skin, hair — never key dark blues/browns
    protect = ((r < 110) & (g < 110) & (b < 140)) | ((r > 80) & (g > 45) & (b > 25) & (r > b) & (r - g < 80) & (g > 40))
    bg = flood_bg(rgb)
    a = np.where((mag | hot | ff | bg) & ~protect, 0, 255).astype(np.uint8)
    spill = (r > 170) & (g < 90) & (b > 110) & ((r - g) > 60)
    a[spill & ~protect] = 0
    # 1px contract only on magenta-adjacent, not protected
    padded = np.pad(a, 1, mode="edge")
    eroded = np.minimum.reduce(
        [
            padded[1:-1, 1:-1],
            padded[:-2, 1:-1],
            padded[2:, 1:-1],
            padded[1:-1, :-2],
            padded[1:-1, 2:],
        ]
    )
    mag_adj = mag | hot | ff
    a = np.where(mag_adj & ~protect, np.minimum(a, eroded), a)
    # drop tiny components
    a = keep_largest(a)
    return np.dstack([rgb.astype(np.uint8), a])


def keep_largest(alpha: np.ndarray) -> np.ndarray:
    vis = alpha > 12
    h, w = vis.shape
    labels = np.zeros((h, w), dtype=np.int32)
    lab = 0
    sizes: dict[int, int] = {}
    for y in range(h):
        for x in range(w):
            if not vis[y, x] or labels[y, x]:
                continue
            lab += 1
            q = deque([(y, x)])
            labels[y, x] = lab
            n = 0
            while q:
                cy, cx = q.popleft()
                n += 1
                for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < h and 0 <= nx < w and vis[ny, nx] and labels[ny, nx] == 0:
                        labels[ny, nx] = lab
                        q.append((ny, nx))
            sizes[lab] = n
    if not sizes:
        return alpha
    keep = max(sizes, key=sizes.get)
    out = alpha.copy()
    out[labels != keep] = 0
    return out


def bbox(arr: np.ndarray, thr: int = 12):
    ys, xs = np.where(arr[:, :, 3] > thr)
    if len(xs) == 0:
        raise SystemExit("no opaque pixels")
    return int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())


def place(arr: np.ndarray, target_h: int) -> Image.Image:
    x0, y0, x1, y1 = bbox(arr)
    crop = arr[y0 : y1 + 1, x0 : x1 + 1]
    h = crop.shape[0]
    scale = target_h / h
    if h * scale > MAX_H:
        scale = MAX_H / h
    nh = max(1, int(round(h * scale)))
    nw = max(1, int(round(crop.shape[1] * scale)))
    im = Image.fromarray(crop, "RGBA").resize((nw, nh), Image.Resampling.LANCZOS)
    pad = 28
    canvas_w = max(CANVAS_W, nw + pad * 2)
    canvas = Image.new("RGBA", (canvas_w, CANVAS_H), (0, 0, 0, 0))
    px = np.array(im)
    ys, xs = np.where(px[:, :, 3] > 12)
    foot_local = int(ys.max())
    cx = (int(xs.min()) + int(xs.max())) / 2
    dx = int(round(canvas_w / 2 - cx))
    dx = max(0, min(dx, canvas_w - nw))
    dy = FOOT_Y - foot_local
    canvas.alpha_composite(im, (dx, dy))
    return canvas


def process(src: Path, dst: Path, target_h: int = TARGET_H) -> None:
    raw = Image.open(src)
    arr = chroma(raw)
    out = place(arr, target_h)
    dst.parent.mkdir(parents=True, exist_ok=True)
    out.save(dst)
    a = np.array(out)
    ys, xs = np.where(a[:, :, 3] > 12)
    print(
        f"{dst.name} opaque={int((a[:,:,3]>12).sum())} bbox=({xs.min()},{ys.min()},{xs.max()},{ys.max()}) "
        f"h={ys.max()-ys.min()} foot={ys.max()} canvas={out.size}"
    )


if __name__ == "__main__":
    import sys

    process(Path(sys.argv[1]), Path(sys.argv[2]), int(sys.argv[3]) if len(sys.argv) > 3 else TARGET_H)
