#!/usr/bin/env python3
"""Merge contributor-exported gesture-recorder CSVs into the training files.

Standalone usage:
    python3 training/merge_csvs.py contributions/

The recorder produces two filename patterns:
    sibi_static_<id>.csv   — 85 cols (label + f0..f83)
    sibi_dynamic_<id>.csv  — 1 + 2 * DYNAMIC_HISTORY_SIZE cols (label + x0,y0,...)

Files are routed by filename pattern; on ambiguity, the column count picks
the bucket. Mismatched files are skipped with a warning so a broken file from
one contributor doesn't poison the dataset.

Output:
    training/keypoint_csv/sibi.csv             (static)
    training/point_history_csv/dynamic.csv     (dynamic)

Existing output files are overwritten — re-run after collecting new batches.
"""

from __future__ import annotations

import argparse
import csv
import sys
from collections import Counter
from pathlib import Path

# Must match frontend/src/lib/gesture/recording/types.ts and the standalone
# recorder.html. Update both sides in lockstep if you change the buffer size.
STATIC_FEATURE_LENGTH = 84
DYNAMIC_HISTORY_SIZE = 32

STATIC_COLS = 1 + STATIC_FEATURE_LENGTH                       # 85
DYNAMIC_COLS = 1 + DYNAMIC_HISTORY_SIZE * 2                   # 65

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_STATIC_OUT = REPO_ROOT / "training" / "keypoint_csv" / "sibi.csv"
DEFAULT_DYNAMIC_OUT = REPO_ROOT / "training" / "point_history_csv" / "dynamic.csv"


def classify_file(path: Path) -> str | None:
    """Return 'static' or 'dynamic' for a CSV, or None if it doesn't look like
    a recorder export. Filename hint first, column-count check second."""
    name = path.name.lower()
    if name.startswith("sibi_static"):
        hinted = "static"
    elif name.startswith("sibi_dynamic"):
        hinted = "dynamic"
    elif name.endswith(".csv"):
        hinted = None
    else:
        return None

    try:
        with path.open(newline="") as f:
            reader = csv.reader(f)
            header = next(reader, None)
    except (OSError, StopIteration):
        return None
    if header is None:
        return None

    n = len(header)
    if n == STATIC_COLS and header[0] == "label":
        observed = "static"
    elif n == DYNAMIC_COLS and header[0] == "label":
        observed = "dynamic"
    else:
        return None

    if hinted is not None and hinted != observed:
        print(
            f"  ⚠️  {path.name}: filename suggests {hinted!r} but columns match {observed!r}; using observed",
            file=sys.stderr,
        )
    return observed


def merge_one_bucket(files: list[Path], expected_cols: int, out_path: Path) -> dict:
    """Merge a list of CSVs (all same shape) into out_path. Returns stats."""
    rows: list[list[str]] = []
    label_counts: Counter[str] = Counter()
    canonical_header: list[str] | None = None
    skipped_rows = 0

    for fp in files:
        with fp.open(newline="") as f:
            reader = csv.reader(f)
            header = next(reader, None)
            if header is None:
                continue
            if canonical_header is None:
                canonical_header = header
            elif header != canonical_header:
                # Same shape but different column names — odd but tolerate it.
                print(f"  ⚠️  {fp.name}: header differs from prior files; rows still appended.", file=sys.stderr)
            for row in reader:
                if len(row) != expected_cols:
                    skipped_rows += 1
                    continue
                rows.append(row)
                label_counts[row[0]] += 1

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", newline="") as f:
        writer = csv.writer(f)
        if canonical_header is not None:
            writer.writerow(canonical_header)
        writer.writerows(rows)

    return {
        "files": len(files),
        "rows": len(rows),
        "skipped_rows": skipped_rows,
        "labels": dict(label_counts),
    }


def display_path(p: Path) -> str:
    """Pretty-print a path: repo-relative if under REPO_ROOT, else absolute."""
    try:
        return str(p.relative_to(REPO_ROOT))
    except ValueError:
        return str(p)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("input_dir", type=Path, help="Folder containing the contributor CSVs to merge")
    parser.add_argument(
        "--static-out", type=Path, default=DEFAULT_STATIC_OUT,
        help=f"Output path for merged static CSV (default: {DEFAULT_STATIC_OUT.relative_to(REPO_ROOT)!s})",
    )
    parser.add_argument(
        "--dynamic-out", type=Path, default=DEFAULT_DYNAMIC_OUT,
        help=f"Output path for merged dynamic CSV (default: {DEFAULT_DYNAMIC_OUT.relative_to(REPO_ROOT)!s})",
    )
    args = parser.parse_args()

    if not args.input_dir.is_dir():
        print(f"Error: {args.input_dir} is not a directory", file=sys.stderr)
        return 1

    csv_files = sorted(p for p in args.input_dir.rglob("*.csv") if p.is_file())
    if not csv_files:
        print(f"No CSV files found under {args.input_dir}", file=sys.stderr)
        return 1

    print(f"Scanning {len(csv_files)} CSV file(s) in {args.input_dir}...")
    static_files: list[Path] = []
    dynamic_files: list[Path] = []
    unknown_files: list[Path] = []
    for fp in csv_files:
        kind = classify_file(fp)
        if kind == "static":
            static_files.append(fp)
        elif kind == "dynamic":
            dynamic_files.append(fp)
        else:
            unknown_files.append(fp)

    if unknown_files:
        print(f"\n⚠️  {len(unknown_files)} file(s) skipped (not recognizable recorder exports):", file=sys.stderr)
        for fp in unknown_files:
            print(f"    {fp}", file=sys.stderr)

    print(f"\nStatic: {len(static_files)} file(s)")
    print(f"Dynamic: {len(dynamic_files)} file(s)")

    if static_files:
        stats = merge_one_bucket(static_files, STATIC_COLS, args.static_out)
        print(f"\n✅ Static → {display_path(args.static_out)}")
        print(f"   Files merged: {stats['files']}")
        print(f"   Rows written: {stats['rows']}")
        if stats["skipped_rows"]:
            print(f"   ⚠️  Skipped malformed rows: {stats['skipped_rows']}")
        print(f"   Samples per class:")
        for cls in sorted(stats["labels"]):
            print(f"     {cls}: {stats['labels'][cls]}")

    if dynamic_files:
        stats = merge_one_bucket(dynamic_files, DYNAMIC_COLS, args.dynamic_out)
        print(f"\n✅ Dynamic → {display_path(args.dynamic_out)}")
        print(f"   Files merged: {stats['files']}")
        print(f"   Rows written: {stats['rows']}")
        if stats["skipped_rows"]:
            print(f"   ⚠️  Skipped malformed rows: {stats['skipped_rows']}")
        print(f"   Samples per class:")
        for cls in sorted(stats["labels"]):
            print(f"     {cls}: {stats['labels'][cls]}")

    if not static_files and not dynamic_files:
        print("\nNothing to merge.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
