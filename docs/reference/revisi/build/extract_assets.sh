#!/usr/bin/env bash
# docs/reference/revisi/build/extract_assets.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PDF="$ROOT/naskah.pdf"
OUT="$ROOT/assets"
mkdir -p "$OUT"
# Dump all embedded images. -all preserves original format; -p prefixes page number.
pdfimages -all -p "$PDF" "$OUT/raw"
echo "--- Extracted files ---"
ls -1 "$OUT" | head -40
echo "Review images and rename per the naming convention in the plan."
