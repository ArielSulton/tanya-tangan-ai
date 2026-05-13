#!/usr/bin/env bash
# Convert trained TFLite models to TFJS graph models and deploy to public/.
# Run after train_static.ipynb / train_dynamic.ipynb produce the .tflite files.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PUBLIC_MODELS="${SCRIPT_DIR}/../frontend/public/models"

STATIC_TFLITE="${SCRIPT_DIR}/keypoint_classifier.tflite"
DYNAMIC_TFLITE="${SCRIPT_DIR}/point_history_classifier.tflite"
STATIC_LABELS="${SCRIPT_DIR}/keypoint_csv/sibi_label.csv"
DYNAMIC_LABELS="${SCRIPT_DIR}/point_history_csv/dynamic_label.csv"

if ! command -v tensorflowjs_converter >/dev/null 2>&1; then
  echo "ERROR: tensorflowjs_converter not installed. Run: pip install tensorflowjs" >&2
  exit 1
fi

convert_one() {
  local tflite_path="$1"
  local out_dir="$2"
  local labels_csv="$3"
  if [[ ! -f "$tflite_path" ]]; then
    echo "SKIP: $tflite_path not found (run the notebook first)" >&2
    return 0
  fi
  mkdir -p "$out_dir"
  tensorflowjs_converter \
    --input_format=tf_lite \
    --output_format=tfjs_graph_model \
    "$tflite_path" "$out_dir"
  # Convert label CSV → JSON array (TS-friendly)
  python3 -c "
import csv, json, sys
labels = [row[0].strip() for row in csv.reader(open('$labels_csv')) if row and row[0].strip()]
json.dump(labels, open('$out_dir/labels.json', 'w'))
print(f'Wrote {len(labels)} labels to $out_dir/labels.json')
"
  echo "Done: $out_dir"
}

convert_one "$STATIC_TFLITE" "${PUBLIC_MODELS}/static" "$STATIC_LABELS"
convert_one "$DYNAMIC_TFLITE" "${PUBLIC_MODELS}/dynamic" "$DYNAMIC_LABELS"

echo ""
echo "All done. Reload the frontend (browser hard refresh) to pick up new models."
