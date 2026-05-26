# Training Pipeline for Phase 2D / 2F Classifiers

This directory holds the Python training pipeline for the SIBI gesture
recognition models — separate from the runtime browser code under `frontend/`.

## What's here

- `train_static.ipynb` — static keypoint classifier (SIBI alphabet, data-driven class count)
- `train_dynamic.ipynb` — dynamic point-history classifier (LSTM, data-driven class count)
- `keypoint_csv/` — recorded static samples (CSV, gitignored)
- `point_history_csv/` — recorded dynamic samples (CSV, gitignored)
- `convert_to_tfjs.sh` — convert trained TFLite models to TFJS for the browser
- `merge_csvs.py` — aggregate CSV exports from multiple contributors
- `requirements.txt` — pinned Python dependencies known to work without crashes

## Workflow

1. **Record samples** using the dev tool at `/dev/gesture-recorder` or share
   `frontend/public/recorder.html` (standalone) to contributors. Export CSVs
   and place them at:
   - `keypoint.csv` → `training/keypoint_csv/sibi.csv`
   - `point_history.csv` → `training/point_history_csv/dynamic.csv`

   If you have CSVs from multiple contributors, run `merge_csvs.py` first:
   ```bash
   python3 merge_csvs.py contributions/
   ```

2. **Set up Python environment** (one-time):
   ```bash
   cd training
   python3 -m venv .venv
   source .venv/bin/activate
   pip install --upgrade pip
   pip install -r requirements.txt

   # Verify TensorFlow imports cleanly (no kernel-crash precursor)
   python -c "import tensorflow as tf; print('TF', tf.__version__)"
   ```

   Re-enter the venv every shell session before running notebooks:
   ```bash
   source training/.venv/bin/activate
   ```

   In VS Code's Jupyter UI, pick this `.venv` as the kernel (top-right of
   the notebook view). If the kernel still crashes inside VS Code but works
   from terminal `jupyter notebook`, restart the VS Code window to refresh
   the kernel discovery.

3. **Train the static classifier**:
   ```bash
   jupyter notebook train_static.ipynb
   # Run all cells. Outputs:
   # - keypoint_classifier.keras    (Keras 3 native checkpoint)
   # - keypoint_classifier.tflite   (quantized, fed to convert_to_tfjs.sh)
   # - confusion matrix plot
   ```
   Iterate if any class has <80% accuracy — usually means more samples needed.

4. **Train the dynamic classifier**:
   ```bash
   jupyter notebook train_dynamic.ipynb
   # Same outputs for point_history_classifier.*
   ```

5. **Convert to TFJS**:
   ```bash
   ./convert_to_tfjs.sh
   # Produces:
   # - ../frontend/public/models/static/{model.json,group1-shard*.bin,labels.json}
   # - ../frontend/public/models/dynamic/{model.json,group1-shard*.bin,labels.json}
   ```

6. **The frontend will pick up the models automatically** on next reload.

## Class definitions

Class lists are **data-driven** — the notebooks derive `NUM_CLASSES` and the
label order from `df['label'].unique()` at runtime, and write the result back
to `<x>_label.csv` so `convert_to_tfjs.sh` emits a matching `labels.json`.

For UI suggestion chips, see `frontend/src/lib/gesture/recording/types.ts`:
- `STATIC_CLASSES` — alphabet pickers shown in the static recorder
- `DYNAMIC_CLASS_SUGGESTIONS` — quick-pick chips in the dynamic recorder
  (but you can type any custom label too)

## Reference

These notebooks are adapted from the Kazuhito Takahashi reference at
`reference/hand-gesture-recognition-mediapipe/`. Key differences:
- Our static input is 84 floats (2 hands × 21 landmarks × 2 coords) vs theirs 42 (1 hand)
- Our dynamic input is 24×2 floats (single wrist over 24 frames) vs theirs 16×2 (single fingertip over 16 frames)
- Our class sets are SIBI-specific, not generic "Open/Close/Pointer/OK"

## Production status

- **Static classifier**: built and trained but **NOT wired into production**.
  Fingerpose (rule-based) remains the active alphabet path. The trained
  static model is available at `frontend/public/models/static/` for future
  evaluation and potential swap-in.
- **Dynamic classifier**: wired into production via `MotionDetector`
  arbitrator in `frontend/src/lib/gesture/engine.ts`. On `motion_end`,
  the engine runs the trained classifier and emits the recognized word.
