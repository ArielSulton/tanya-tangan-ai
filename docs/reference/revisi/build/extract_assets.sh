#!/usr/bin/env bash
# docs/reference/revisi/build/extract_assets.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PDF="$ROOT/naskah.pdf"
OUT="$ROOT/assets"
[ -f "$PDF" ] || { echo "ERROR: PDF not found at $PDF"; exit 1; }
mkdir -p "$OUT"
# Not idempotent — re-running overwrites raw-* output. Safe for one-shot use.
# Dump all embedded images. -all preserves original format; -p prefixes page number.
pdfimages -all -p "$PDF" "$OUT/raw"
echo "--- Extracted raw files (rename per plan) ---"
ls -1 "$OUT"/raw-* 2>/dev/null || echo "(no raw-* files emitted)"
echo "Review images and rename per the naming convention in the plan."
