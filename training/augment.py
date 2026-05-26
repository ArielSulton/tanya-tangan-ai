#!/usr/bin/env python3
"""
Synthetic augmentation for SIBI training CSVs.

Reads:
  keypoint_csv/sibi.csv          (static, 84 features: 2 slots × 21 lm × xy)
  point_history_csv/dynamic.csv  (dynamic, 64 features: 32 timesteps × xy)

Writes (default):
  keypoint_csv/sibi_aug.csv
  point_history_csv/dynamic_aug.csv

Each output contains the originals + augmented variants. Under-represented
classes get more variants so output is class-balanced. Augmentation composes
2-4 of: noise, rotation, scale, translation, time-warp (dynamic only).

Usage:
    python3 augment.py                              # default multipliers
    python3 augment.py --target 500 --seed 0        # balance every class to N
    python3 augment.py --static-only --target 400
"""

import argparse
import csv
import math
import random
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Callable

import numpy as np

# Static layout: matches frontend/src/lib/gesture/feature-extractor.ts.
STATIC_FEATURES = 84
STATIC_HANDS = 2
STATIC_LM_PER_HAND = 21

# Dynamic layout: matches frontend/src/lib/gesture/recording/types.ts.
DYNAMIC_FEATURES = 64
DYNAMIC_TIMESTEPS = 32


def _rotate2d(pts: np.ndarray, angle_rad: float, center: np.ndarray) -> np.ndarray:
    c, s = math.cos(angle_rad), math.sin(angle_rad)
    R = np.array([[c, -s], [s, c]])
    return (pts - center) @ R.T + center


def _scale2d(pts: np.ndarray, factor: float, center: np.ndarray) -> np.ndarray:
    return (pts - center) * factor + center


def augment_static(features: np.ndarray) -> np.ndarray:
    """Augment one 84-float static sample. Returns shape (84,)."""
    out = features.reshape(STATIC_HANDS, STATIC_LM_PER_HAND, 2).copy()
    for h in range(STATIC_HANDS):
        if np.allclose(out[h], 0.0):
            continue  # absent slot — keep zero-filled
        center = out[h].mean(axis=0)
        # Small rotation (±10°) — safe for all SIBI letters which are
        # tolerant to slight hand tilt.
        if random.random() < 0.7:
            out[h] = _rotate2d(out[h], random.uniform(-0.17, 0.17), center)
        # Small scale (0.9-1.1×) — simulates different hand sizes / camera
        # distances.
        if random.random() < 0.7:
            out[h] = _scale2d(out[h], random.uniform(0.92, 1.08), center)
        # Per-landmark Gaussian noise — simulates MediaPipe detector jitter.
        if random.random() < 0.9:
            out[h] = out[h] + np.random.randn(*out[h].shape) * 0.008
    return out.reshape(-1)


def augment_dynamic(features: np.ndarray) -> np.ndarray:
    """Augment one 64-float dynamic sample. Returns shape (64,) in [0,1]."""
    pts = features.reshape(DYNAMIC_TIMESTEPS, 2).copy()

    # Time-warp: non-uniform resampling so the gesture happens faster/slower
    # at different points in the sequence. Heavy regularizer for LSTM.
    if random.random() < 0.5:
        warp = np.cumsum(np.random.uniform(0.7, 1.3, DYNAMIC_TIMESTEPS))
        warp = warp / warp[-1] * (DYNAMIC_TIMESTEPS - 1)
        idx = np.clip(np.round(warp).astype(int), 0, DYNAMIC_TIMESTEPS - 1)
        pts = pts[idx]

    center = pts.mean(axis=0)

    # Rotate ±15° around trajectory centroid.
    if random.random() < 0.6:
        pts = _rotate2d(pts, random.uniform(-0.26, 0.26), center)
    # Scale 0.85-1.15× around centroid.
    if random.random() < 0.6:
        pts = _scale2d(pts, random.uniform(0.88, 1.12), center)
    # Translate ±0.08 in either axis (data is normalized to [0,1]).
    if random.random() < 0.5:
        pts[:, 0] += random.uniform(-0.08, 0.08)
        pts[:, 1] += random.uniform(-0.08, 0.08)
    # Per-timestep jitter.
    if random.random() < 0.9:
        pts = pts + np.random.randn(*pts.shape) * 0.012

    # Clamp to [0,1] — model was trained on normalized wrist coords.
    return np.clip(pts, 0.0, 1.0).reshape(-1)


def _read_csv(src: Path, n_features: int) -> tuple[list[str], list[tuple[str, np.ndarray]]]:
    """Returns (header, rows). header includes 'label' column."""
    with src.open() as f:
        reader = csv.reader(f)
        header = next(reader)
        rows: list[tuple[str, np.ndarray]] = []
        for row in reader:
            if not row or len(row) != n_features + 1:
                continue
            label = row[0]
            try:
                feats = np.array([float(x) for x in row[1:]], dtype=np.float64)
            except ValueError:
                continue
            rows.append((label, feats))
    return header, rows


def _write_csv(dst: Path, header: list[str], rows: list[tuple[str, np.ndarray]]) -> None:
    with dst.open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(header)
        for label, feats in rows:
            w.writerow([label] + [f"{v:.6f}" for v in feats])


def process(
    src: Path,
    dst: Path,
    n_features: int,
    augment_fn: Callable[[np.ndarray], np.ndarray],
    target_per_class: int,
) -> None:
    if not src.exists():
        print(f"SKIP: {src} not found", file=sys.stderr)
        return

    header, rows = _read_csv(src, n_features)
    if not rows:
        print(f"SKIP: {src} has no usable rows", file=sys.stderr)
        return

    # Group originals by class.
    by_label: dict[str, list[np.ndarray]] = defaultdict(list)
    for label, feats in rows:
        by_label[label].append(feats)

    out_rows: list[tuple[str, np.ndarray]] = []
    aug_per_class: dict[str, int] = {}
    for label, samples in by_label.items():
        # Keep all originals.
        for s in samples:
            out_rows.append((label, s))
        # Generate (target_per_class - len(samples)) augmented samples,
        # cycling through originals as seeds. If a class already has more
        # than target, do not downsample — just emit zero augs.
        need = max(0, target_per_class - len(samples))
        for i in range(need):
            seed = samples[i % len(samples)]
            out_rows.append((label, augment_fn(seed)))
        aug_per_class[label] = need

    n_orig = sum(len(s) for s in by_label.values())
    n_aug = sum(aug_per_class.values())
    print(f"  {src.name}: {len(by_label)} classes, {n_orig} originals + {n_aug} augmented = {n_orig + n_aug} rows")
    # Show top 5 classes by augmentation count for visibility.
    top = sorted(aug_per_class.items(), key=lambda kv: -kv[1])[:5]
    if top and top[0][1] > 0:
        details = ", ".join(f"{k}:+{v}" for k, v in top if v > 0)
        print(f"    most-augmented: {details}")
    _write_csv(dst, header, out_rows)
    print(f"    → {dst.name}")


def main() -> int:
    p = argparse.ArgumentParser(description="Synthetic augmentation for SIBI CSVs.")
    p.add_argument("--target", type=int, default=500,
                   help="Balance every class to this many samples (default 500).")
    p.add_argument("--static-target", type=int, default=None,
                   help="Override --target for static only.")
    p.add_argument("--dynamic-target", type=int, default=None,
                   help="Override --target for dynamic only.")
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--static-only", action="store_true")
    p.add_argument("--dynamic-only", action="store_true")
    p.add_argument("--root", type=Path, default=Path(__file__).parent,
                   help="training/ directory (default: this script's dir).")
    p.add_argument("--in-place", action="store_true",
                   help="Overwrite sibi.csv / dynamic.csv. Default writes *_aug.csv.")
    args = p.parse_args()

    random.seed(args.seed)
    np.random.seed(args.seed)

    s_target = args.static_target or args.target
    d_target = args.dynamic_target or args.target

    print(f"Augmenting from {args.root}/ (seed={args.seed})")
    if not args.dynamic_only:
        src = args.root / "keypoint_csv" / "sibi.csv"
        dst = src if args.in_place else src.with_name("sibi_aug.csv")
        print(f"\n[static] target={s_target} per class")
        process(src, dst, STATIC_FEATURES, augment_static, s_target)
    if not args.static_only:
        src = args.root / "point_history_csv" / "dynamic.csv"
        dst = src if args.in_place else src.with_name("dynamic_aug.csv")
        print(f"\n[dynamic] target={d_target} per class")
        process(src, dst, DYNAMIC_FEATURES, augment_dynamic, d_target)
    print("\nDone. Point the notebook DATA_PATH at the *_aug.csv file to train on the larger set.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
