# Copied verbatim from the "Kode Dynamic Kata" reference project's
# src/features/landmark_features.py. Do not hand-edit — if the algorithm
# needs to change, change it in dual-hand-features.ts's TS port too (Task 2)
# to keep training/inference parity.

from itertools import combinations
from typing import Optional

import numpy as np


NUM_LANDMARKS = 21
LANDMARK_COLS = [f"{coord}{i}" for i in range(NUM_LANDMARKS) for coord in ("x", "y", "z")]
FINGERTIP_IDS = [4, 8, 12, 16, 20]
ANGLE_TRIPLETS = [
    (1, 2, 4),    # thumb
    (5, 6, 8),    # index
    (9, 10, 12),  # middle
    (13, 14, 16), # ring
    (17, 18, 20), # pinky
]

TIP_TO_WRIST_FEATURES = [f"dist_tip{i}_to_wrist" for i in FINGERTIP_IDS]
TIP_PAIR_FEATURES = [
    f"dist_tip{start}_tip{end}" for start, end in combinations(FINGERTIP_IDS, 2)
]
FINGER_ANGLE_FEATURES = [
    f"angle_{name}" for name in ("thumb", "index", "middle", "ring", "pinky")
]
HANDEDNESS_FEATURES = ["hand_left", "hand_right"]

ENGINEERED_FEATURE_COLS = (
    TIP_TO_WRIST_FEATURES + TIP_PAIR_FEATURES + FINGER_ANGLE_FEATURES + HANDEDNESS_FEATURES
)
FEATURE_COLS = LANDMARK_COLS + ENGINEERED_FEATURE_COLS

# New 127-dimensional sequence contract helpers
WRIST_ID = 0
INDEX_MCP_ID = 5
MIDDLE_MCP_ID = 9
RING_MCP_ID = 13
PINKY_MCP_ID = 17
NORMALIZATION_EPSILON = 1e-6


def sanitize_landmark_array(coords: np.ndarray) -> np.ndarray:
    """Convert raw landmark coordinates into a (21, 3) float32 array."""
    arr = np.asarray(coords, dtype=np.float32)
    if arr.shape == (NUM_LANDMARKS * 3,):
        arr = arr.reshape(NUM_LANDMARKS, 3)
    elif arr.shape == (NUM_LANDMARKS, 3):
        arr = arr.copy()
    else:
        raise ValueError(
            f"Expected landmark array shape (63,) or (21,3); got {arr.shape}"
        )
    return arr


def hand_block_is_valid(raw_coords: Optional[np.ndarray]) -> bool:
    """Determine whether the input can produce a valid right/left hand block."""
    if raw_coords is None:
        return False
    try:
        arr = sanitize_landmark_array(raw_coords)
    except ValueError:
        return False
    return np.isfinite(arr).all()


def compute_hand_size(normalized_coords: np.ndarray) -> float:
    """Compute a scale factor from wrist-to-knuckle distances."""
    wrist = normalized_coords[WRIST_ID]
    knuckle_ids = [INDEX_MCP_ID, MIDDLE_MCP_ID, RING_MCP_ID, PINKY_MCP_ID]
    distances = [
        np.linalg.norm(normalized_coords[idx] - wrist).astype(np.float32)
        for idx in knuckle_ids
    ]
    distances = np.asarray(distances, dtype=np.float32)
    if not np.isfinite(distances).all():
        return 0.0
    return float(np.mean(distances))


def normalize_hand_landmarks(raw_coords: np.ndarray) -> np.ndarray:
    """Normalize one hand's raw landmarks to wrist-relative, size-invariant coordinates."""
    arr = sanitize_landmark_array(raw_coords)
    wrist = arr[WRIST_ID:WRIST_ID + 1, :]
    translated = arr - wrist
    hand_size = compute_hand_size(translated)

    if hand_size <= NORMALIZATION_EPSILON or not np.isfinite(hand_size):
        return np.zeros_like(arr, dtype=np.float32)

    return (translated / hand_size).astype(np.float32)


def build_zero_hand_block() -> np.ndarray:
    """Return a zero-filled 63-dimensional hand block."""
    return np.zeros(NUM_LANDMARKS * 3, dtype=np.float32)


def build_hand_block(raw_coords: Optional[np.ndarray]) -> np.ndarray:
    """Build a 63-dimensional per-hand block for the new sequence contract."""
    if not hand_block_is_valid(raw_coords):
        return build_zero_hand_block()
    normalized = normalize_hand_landmarks(raw_coords)
    return normalized.reshape(-1).astype(np.float32)


def encode_num_hands(right_present: bool, left_present: bool) -> float:
    """Encode the frame's detected hand count as a single scalar."""
    return float(int(right_present) + int(left_present))


def build_frame_feature_vector(
    right_hand_coords: Optional[np.ndarray],
    left_hand_coords: Optional[np.ndarray],
) -> np.ndarray:
    """Build the 127-dimensional `<num_hands,right,left>` frame input vector."""
    right_present = hand_block_is_valid(right_hand_coords)
    left_present = hand_block_is_valid(left_hand_coords)
    num_hands = encode_num_hands(right_present, left_present)
    right_block = build_hand_block(right_hand_coords)
    left_block = build_hand_block(left_hand_coords)
    return np.concatenate(
        [np.array([num_hands], dtype=np.float32), right_block, left_block],
        axis=0,
    )


def normalize_landmarks(coords: np.ndarray) -> np.ndarray:
    """Apply wrist-relative and size normalization to a single hand sample."""
    coords = coords.reshape(NUM_LANDMARKS, 3).astype(np.float32)
    wrist = coords[0:1, :]
    coords = coords - wrist

    pairwise = np.linalg.norm(coords[:, None, :] - coords[None, :, :], axis=-1)
    max_dist = np.max(pairwise)
    if max_dist <= 0 or np.isnan(max_dist):
        return coords.flatten()

    return (coords / max_dist).flatten()


def encode_handedness(hand_label: str) -> np.ndarray:
    """Encode handedness as two binary features."""
    hand = str(hand_label or "").strip().lower()
    if hand == "left":
        return np.array([1.0, 0.0], dtype=np.float32)
    if hand == "right":
        return np.array([0.0, 1.0], dtype=np.float32)
    return np.array([0.0, 0.0], dtype=np.float32)


def _euclidean_distance(coords: np.ndarray, start: int, end: int) -> float:
    return float(np.linalg.norm(coords[start] - coords[end]))


def _joint_angle(coords: np.ndarray, start: int, mid: int, end: int) -> float:
    v1 = coords[start] - coords[mid]
    v2 = coords[end] - coords[mid]
    norm_product = np.linalg.norm(v1) * np.linalg.norm(v2)
    if norm_product <= 1e-8:
        return 0.0

    cosine = np.dot(v1, v2) / norm_product
    cosine = np.clip(cosine, -1.0, 1.0)
    return float(np.arccos(cosine) / np.pi)


def extract_engineered_features(normalized_coords: np.ndarray) -> np.ndarray:
    """Create distance and angle features that help separate similar letters."""
    coords = normalized_coords.reshape(NUM_LANDMARKS, 3).astype(np.float32)
    features = []

    for fingertip_id in FINGERTIP_IDS:
        features.append(_euclidean_distance(coords, 0, fingertip_id))

    for start, end in combinations(FINGERTIP_IDS, 2):
        features.append(_euclidean_distance(coords, start, end))

    for start, mid, end in ANGLE_TRIPLETS:
        features.append(_joint_angle(coords, start, mid, end))

    return np.asarray(features, dtype=np.float32)


def build_feature_vector(raw_coords: np.ndarray, hand_label: str = "unknown") -> np.ndarray:
    """Build the full feature vector used by training and inference."""
    normalized = normalize_landmarks(raw_coords)
    engineered = extract_engineered_features(normalized)
    handedness = encode_handedness(hand_label)
    return np.concatenate([normalized, engineered, handedness]).astype(np.float32)

## ini catatan
"""
ini gawe feature engineering.
Menyiapkan fitur landmark agar preprocessing training sama dengan inference.

    python -m src.preprocessing.normalize
    
Input: data/processed/landmarks_clean.csv
Output: data/processed/landmarks_normalized.csv
"""