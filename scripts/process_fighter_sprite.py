#!/usr/bin/env python3
"""Chroma-key a magenta JPEG and place feet on the 520x780 fighter canvas."""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image

CANVAS_W, CANVAS_H = 520, 780
FOOT_Y = 749
TARGET_H = 640
MAX_H = 732
KEY = np.array([230.0, 33.0, 165.0])


def chroma(im: Image.Image) -> np.ndarray:
    rgb = np.array(im.convert("RGB"), dtype=np.float32)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    dist = np.linalg.norm(rgb - KEY, axis=2)
    hot = (r > 165) & (g < 120) & (b > 100) & (r > g + 40)
    ff = (r > 210) & (g < 50) & (b > 200)
    mag = dist < 72
    a = np.where(mag | hot | ff, 0, 255).astype(np.uint8)
    spill = (r > 155) & (g < 95) & (b > 95) & ((r - g) > 55)
    a[spill] = 0
    # 1px contract to kill JPEG fringe
    padded = np.pad(a, 1, mode="edge")
    eroded = np.minimum.reduce([
        padded[1:-1, 1:-1],
        padded[:-2, 1:-1],
        padded[2:, 1:-1],
        padded[1:-1, :-2],
        padded[1:-1, 2:],
    ])
    a = np.minimum(a, eroded)
    out = np.dstack([rgb.astype(np.uint8), a])
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


def main():
    src = Path(sys.argv[1])
    dst = Path(sys.argv[2])
    target_h = int(sys.argv[3]) if len(sys.argv) > 3 else TARGET_H
    raw = Image.open(src)
    arr = chroma(raw)
    out = place(arr, target_h)
    dst.parent.mkdir(parents=True, exist_ok=True)
    out.save(dst)
    a = np.array(out)
    ys, xs = np.where(a[:, :, 3] > 12)
    print(f"{dst.name} opaque={int((a[:,:,3]>12).sum())} bbox=({xs.min()},{ys.min()},{xs.max()},{ys.max()}) h={ys.max()-ys.min()} foot={ys.max()} canvas={out.size}")


if __name__ == "__main__":
    main()
