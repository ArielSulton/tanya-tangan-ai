#!/usr/bin/env bash
# Convert trained models to TFJS formats and deploy to frontend/public/models/.
#
#   - Static  (MLP, simple Dense stack) → tfjs_graph_model from SavedModel.
#     loadGraphModel + predict() works fine for static ops.
#
#   - Dynamic (LSTM) → tfjs_layers_model from .keras file. The graph format
#     wraps LSTM as a `tf.while_loop` with dynamic 'Exit' ops, which the
#     TFJS graph executor cannot reach from the input placeholder
#     ("Cannot compute the outputs [Identity] from the provided inputs ..."
#     even when the input name matches signature). tfjs_layers_model
#     reconstructs the Keras Sequential natively and supports predict().
#
# We skip TFLite for both because tf.lite.TFLiteConverter crashes the
# kernel on LSTM in some TF 2.16+ envs.
#
# Path-with-spaces workaround: tensorflowjs_converter's argparse entry point
# misparses argv when paths contain spaces. We `cd` into the training dir
# first so all paths passed to the converter are RELATIVE (no spaces),
# regardless of where the project lives on disk.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

STATIC_SAVED="keypoint_classifier_saved_model"
DYNAMIC_KERAS="point_history_classifier.keras"
STATIC_OUT="../frontend/public/models/static"
DYNAMIC_OUT="../frontend/public/models/dynamic"
STATIC_LABELS="keypoint_csv/sibi_label.csv"
DYNAMIC_LABELS="point_history_csv/dynamic_label.csv"

if ! command -v tensorflowjs_converter >/dev/null 2>&1; then
  echo "ERROR: tensorflowjs_converter not installed. Activate the venv first:" >&2
  echo "  source training/.venv/bin/activate" >&2
  echo "  pip install -r training/requirements.txt" >&2
  exit 1
fi

write_labels() {
  local labels_csv="$1"
  local out_dir="$2"
  python3 -c "
import csv, json
labels = [row[0].strip() for row in csv.reader(open('$labels_csv')) if row and row[0].strip()]
json.dump(labels, open('$out_dir/labels.json', 'w'))
print(f'Wrote {len(labels)} labels to $out_dir/labels.json')
"
}

convert_graph() {  # static: SavedModel → tfjs_graph_model
  local src="$1"
  local out_dir="$2"
  local labels_csv="$3"
  if [[ ! -d "$src" ]]; then
    echo "SKIP: $src not found (run train_static.ipynb first)" >&2
    return 0
  fi
  mkdir -p "$out_dir"
  tensorflowjs_converter \
    --input_format=tf_saved_model \
    --output_format=tfjs_graph_model \
    "$src" "$out_dir"
  write_labels "$labels_csv" "$out_dir"
  echo "Done: $out_dir (graph)"
}

convert_layers() {  # dynamic: .keras → tfjs_layers_model
  local src="$1"
  local out_dir="$2"
  local labels_csv="$3"
  if [[ ! -f "$src" ]]; then
    echo "SKIP: $src not found (run train_dynamic.ipynb first)" >&2
    return 0
  fi
  # tfjs converter needs Keras H5 (.h5) for layers-model format. .keras is
  # a zip and not directly accepted, so we re-save as .h5 in a tempfile.
  local h5_tmp
  h5_tmp="$(mktemp -u --suffix=.h5)"
  python3 - "$src" "$h5_tmp" <<'PY'
import sys, tensorflow as tf
src, dst = sys.argv[1], sys.argv[2]
m = tf.keras.models.load_model(src)
m.save(dst)
print(f'Re-saved {src} → {dst}')
PY
  mkdir -p "$out_dir"
  # Clear stale files from previous graph-format conversion.
  rm -f "$out_dir"/group*.bin "$out_dir"/model.json
  tensorflowjs_converter \
    --input_format=keras \
    --output_format=tfjs_layers_model \
    "$h5_tmp" "$out_dir"
  rm -f "$h5_tmp"
  # Keras 3 → TFJS layers compat patch. Keras 3.x serializes:
  #   - InputLayer.batch_shape    → TFJS expects batchInputShape
  #   - dtype: {DTypePolicy obj}  → TFJS expects bare string ('float32')
  # Without this, tf.loadLayersModel throws "InputLayer should be passed
  # either a batchInputShape or an inputShape" and dtype-object parse errors.
  python3 - "$out_dir/model.json" <<'PY'
import sys, json
p = sys.argv[1]
m = json.load(open(p))
def fix_dtype(d):
    if isinstance(d, dict) and d.get('class_name') == 'DTypePolicy':
        return d.get('config', {}).get('name', 'float32')
    return d
def walk(node):
    if isinstance(node, dict):
        if 'batch_shape' in node:
            node['batchInputShape'] = node.pop('batch_shape')
        if 'dtype' in node:
            node['dtype'] = fix_dtype(node['dtype'])
        for v in node.values(): walk(v)
    elif isinstance(node, list):
        for v in node: walk(v)
walk(m)
json.dump(m, open(p, 'w'))
print(f'Patched {p} for TFJS layers compat (batch_shape→batchInputShape, DTypePolicy→string)')
PY
  write_labels "$labels_csv" "$out_dir"
  echo "Done: $out_dir (layers)"
}

convert_graph  "$STATIC_SAVED"  "$STATIC_OUT"  "$STATIC_LABELS"
convert_layers "$DYNAMIC_KERAS" "$DYNAMIC_OUT" "$DYNAMIC_LABELS"

echo ""
echo "All done. Reload the frontend (browser hard refresh) to pick up new models."
