#!/usr/bin/env bash
# docs/reference/revisi/build/verify.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PDF="$ROOT/output/naskah_revisi.pdf"
[ -f "$PDF" ] || { echo "FAIL: $PDF not found"; exit 1; }

TXT="$(mktemp)"
PER_PAGE="$(mktemp -d)"
trap 'rm -f "$TXT"; rm -rf "$PER_PAGE"' EXIT

pdftotext -layout "$PDF" "$TXT"

check() {
  local label="$1"; shift
  if grep -qF "$1" "$TXT"; then
    echo "PASS [$label]: $1"
  else
    echo "FAIL [$label]: $1 not found"
    exit 1
  fi
}

check "bu-ida"       "kata abstrak"
check "bu-ida"       "kata benda konkret"
check "lldikti-1"    "Rumusan Masalah"
check "lldikti-2"    "Pre-test"
check "lldikti-2"    "Post-test"
check "lldikti-2"    "4.3.3"
check "lldikti-3"    "1.300 frame gestur"
check "lldikti-4"    "Penerapan Prinsip Aksesibilitas"
check "lldikti-4"    "WCAG"
check "lldikti-5"    "Mitigasi Risiko Implementasi"
check "lldikti-5"    "Identifikasi Risiko"
check "lldikti-6"    "Perlindungan Data Siswa"
check "lldikti-6"    "UU Perlindungan Data Pribadi"
check "lldikti-7"    "Skema Keberlanjutan dan Kemitraan"
check "pak-adam"     "Proyeksi Outcome"
check "pak-adam"     "Sebelum"
check "pak-adam"     "Sesudah"
check "long-term"    "Manfaat Jangka Panjang"

# ===== PAGE BUDGET ENFORCEMENT (HARD LIMIT) =====
BODY_MAX=15
LAMPIRAN_MAX=5

TOTAL=$(pdfinfo "$PDF" | awk '/^Pages:/ {print $2}')
pdftotext -layout "$PDF" - | awk -v dir="$PER_PAGE" '
  BEGIN{p=1; out=dir"/p001.txt"}
  {
    if (length($0)==1 && $0=="\f") { p++; out=sprintf("%s/p%03d.txt", dir, p); next }
    gsub("\f","",$0); print >> out
  }'
BODY_START=$(grep -lF "1. LINGKUP PEMBAHASAN" "$PER_PAGE"/p*.txt | head -1 | sed -E 's#.*/p0*([0-9]+)\.txt#\1#')
LAMPIRAN_START=$(grep -lF "Lampiran 1." "$PER_PAGE"/p*.txt | head -1 | sed -E 's#.*/p0*([0-9]+)\.txt#\1#')

if [ -z "$BODY_START" ] || [ -z "$LAMPIRAN_START" ]; then
  echo "FAIL [page-budget]: could not locate body start or lampiran start in PDF"
  exit 1
fi

BODY_PAGES=$((LAMPIRAN_START - BODY_START))
LAMPIRAN_PAGES=$((TOTAL - LAMPIRAN_START + 1))
echo ""
echo "PAGE BUDGET REPORT"
echo "  Total pages         : $TOTAL"
echo "  Front matter pages  : $((BODY_START - 1))"
echo "  Body pages (1→DP)   : $BODY_PAGES  (limit $BODY_MAX)"
echo "  Lampiran pages      : $LAMPIRAN_PAGES (limit $LAMPIRAN_MAX)"

OVER=0
if [ "$BODY_PAGES" -gt "$BODY_MAX" ]; then
  echo "FAIL [page-budget]: body $BODY_PAGES > $BODY_MAX. Apply Task 14 Recipe A/B/C."
  OVER=1
fi
if [ "$LAMPIRAN_PAGES" -gt "$LAMPIRAN_MAX" ]; then
  echo "FAIL [page-budget]: lampiran $LAMPIRAN_PAGES > $LAMPIRAN_MAX. Apply Task 14 Recipe D."
  OVER=1
fi
[ "$OVER" -eq 1 ] && exit 1

echo ""
echo "ALL VERIFICATION CHECKS PASSED (content + page budget)"
