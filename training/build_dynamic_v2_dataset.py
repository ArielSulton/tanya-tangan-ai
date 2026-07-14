"""Build gesture_sequences_v2.npz from the gesture-recorder's raw wide-schema CSV.

Ports the reference project's ACTUALLY-USED preprocessing path (confirmed by
reading src/preprocessing/normalize.py's main(), which is what
sequence_pipeline/preprocess.sh invokes): build_sequence_dataset ->
load_sequence_file -> build_frame_feature_vector (127-dim normalization) ->
pad_or_truncate_sequence (hard-truncate to the first 30 frames if longer,
pad-with-last-frame if shorter). The reference reads one CSV file per
sample; ours is one combined CSV with a `sample_id` column grouping frames
that belong to the same take (see csv-export.ts's dynamicV2SamplesToCsv) —
pandas groupby preserves each group's original row order, which is what
guarantees frames stay in capture order without a separate frame-index
column, matching the reference's implicit "row order = frame order"
convention.

Usage:
    source training/.venv/bin/activate
    python3 training/build_dynamic_v2_dataset.py --input training/data/sequences_raw.csv
"""

import argparse
from pathlib import Path

import numpy as np
import pandas as pd

from landmark_features import NUM_LANDMARKS, build_frame_feature_vector

SEQUENCE_LENGTH = 30
DEFAULT_INPUT = Path("data/sequences_raw.csv")
DEFAULT_OUTPUT = Path("data/gesture_sequences_v2.npz")


def _to_bool(value) -> bool:
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "y", "t", "on"}
    return bool(value)


def _extract_landmark_array(row: pd.Series, prefix: str) -> np.ndarray | None:
    try:
        xs = np.array([row[f"{prefix}_x{i}"] for i in range(NUM_LANDMARKS)], dtype=np.float32)
        ys = np.array([row[f"{prefix}_y{i}"] for i in range(NUM_LANDMARKS)], dtype=np.float32)
        zs = np.array([row[f"{prefix}_z{i}"] for i in range(NUM_LANDMARKS)], dtype=np.float32)
        return np.stack([xs, ys, zs], axis=1)
    except (KeyError, TypeError, ValueError):
        return None


def build_sample_features(sample_df: pd.DataFrame) -> np.ndarray:
    """Turn one take's raw frame rows (in original capture order) into a
    (numFrames, 127) normalized feature array."""
    feature_rows = []
    for _, row in sample_df.iterrows():
        left_present = _to_bool(row.get("left_present", False))
        right_present = _to_bool(row.get("right_present", False))
        left_coords = _extract_landmark_array(row, "left") if left_present else None
        right_coords = _extract_landmark_array(row, "right") if right_present else None
        feature_rows.append(build_frame_feature_vector(right_coords, left_coords))
    return np.vstack(feature_rows).astype(np.float32)


def pad_or_truncate_sequence(features: np.ndarray, timesteps: int = SEQUENCE_LENGTH) -> np.ndarray:
    if features.shape[0] >= timesteps:
        return features[:timesteps]
    padding = np.repeat(features[-1:], timesteps - features.shape[0], axis=0)
    return np.vstack([features, padding])


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    print(f"Loading raw sequences from {args.input}")
    df = pd.read_csv(args.input)
    if df.empty:
        raise SystemExit(f"No rows found in {args.input}")

    X = []
    y = []
    for sample_id, sample_df in df.groupby("sample_id", sort=False):
        label = str(sample_df["label"].iloc[0])
        features = build_sample_features(sample_df)
        sequence = pad_or_truncate_sequence(features, SEQUENCE_LENGTH)
        X.append(sequence)
        y.append(label)
        print(f"  {sample_id}: label={label} raw_frames={len(sample_df)} -> {sequence.shape}")

    if not X:
        raise SystemExit("No valid sequences found — is the CSV empty or malformed?")

    classes = sorted(set(y))
    mapping = {label: idx for idx, label in enumerate(classes)}
    y_idx = np.array([mapping[label] for label in y], dtype=np.int32)
    X_arr = np.stack(X).astype(np.float32)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    np.savez(args.output, X=X_arr, y=y_idx, classes=np.array(classes, dtype=object))

    print(f"\nSaved {args.output}")
    print(f"  Sequences: {len(X_arr)}")
    print(f"  Shape: {X_arr.shape}")
    print(f"  Classes: {classes}")
    counts = {c: int((y_idx == i).sum()) for i, c in enumerate(classes)}
    print(f"  Per-class counts: {counts}")


if __name__ == "__main__":
    main()
