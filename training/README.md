# Training Pipeline for Phase 2D / 2F Classifiers

This directory holds the Python training pipeline for the SIBI gesture
recognition models — separate from the runtime browser code under `frontend/`.

## What's here

- `train_static.ipynb` — static keypoint classifier (SIBI alphabet, 25 classes)
- `train_dynamic.ipynb` — dynamic point-history classifier (word-level, 5 classes)
- `keypoint_csv/` — recorded static samples (CSV, gitignored)
- `point_history_csv/` — recorded dynamic samples (CSV, gitignored)
- `convert_to_tfjs.sh` — convert trained TFLite models to TFJS for the browser

## Workflow

1. **Record samples** using the dev tool at `/dev/gesture-recorder`.
   Export CSVs from the tool's "Export CSV" button. Move them to:
   - `keypoint.csv` → `training/keypoint_csv/sibi.csv`
   - `point_history.csv` → `training/point_history_csv/dynamic.csv`

2. **Set up Python environment**:
   ```bash
   cd training
   python3.11 -m venv .venv
   source .venv/bin/activate
   pip install tensorflow==2.15 scikit-learn matplotlib jupyter tensorflowjs
   ```

3. **Train the static classifier**:
   ```bash
   jupyter notebook train_static.ipynb
   # Run all cells. Outputs:
   # - keypoint_classifier.hdf5
   # - keypoint_classifier.tflite
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

### Static (25 classes — A-Z minus J)
See `frontend/src/lib/gesture/recording/types.ts` `STATIC_CLASSES`.

### Dynamic (5 classes)
See `frontend/src/lib/gesture/recording/types.ts` `DYNAMIC_CLASSES`:
jeruk, kucing, besar, kecil, sangat.

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
