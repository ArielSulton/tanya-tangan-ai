import cv2
import numpy as np
from typing import Optional, List, Dict, Tuple

import mediapipe as mp


class MediaPipeService:
    """Hand landmark detection using MediaPipe Hands (mp.solutions API, mediapipe==0.10.9)."""

    def __init__(self, num_hands: int = 1, min_detection_confidence: float = 0.7):
        self._hands = mp.solutions.hands.Hands(
            static_image_mode=True,
            max_num_hands=num_hands,
            min_detection_confidence=min_detection_confidence,
        )

    def detect_hand(self, image: np.ndarray) -> Optional[List]:
        """Detect hand landmarks in a BGR image.

        Returns the first hand's landmark list, or None if no hand found.
        """
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = self._hands.process(rgb_image)

        if not results.multi_hand_landmarks:
            return None

        return results.multi_hand_landmarks[0].landmark

    def extract_landmarks(self, image: np.ndarray) -> Optional[List[List[float]]]:
        """Extract landmarks as list of [x, y, z] coordinates (normalized 0-1).

        Returns None if no hand detected.
        """
        landmarks = self.detect_hand(image)
        if landmarks is None:
            return None

        return [[lm.x, lm.y, lm.z] for lm in landmarks]

    def extract_landmarks_with_bbox(
        self, image: np.ndarray
    ) -> Optional[Dict]:
        """Extract landmarks and bounding box from hand.

        Returns dict with:
        - landmarks: list of [x, y, z] normalized (21 points)
        - bbox: { x1, y1, x2, y2 } normalized (0-1), or pixel coords if image_h/image_w provided

        Returns None if no hand detected.
        """
        landmarks = self.detect_hand(image)
        if landmarks is None:
            return None

        # Calculate bounding box from landmarks
        x_coords = [lm.x for lm in landmarks]
        y_coords = [lm.y for lm in landmarks]

        x1 = min(x_coords)
        y1 = min(y_coords)
        x2 = max(x_coords)
        y2 = max(y_coords)

        # Add small padding (5%)
        padding = 0.05
        x1 = max(0, x1 - padding)
        y1 = max(0, y1 - padding)
        x2 = min(1, x2 + padding)
        y2 = min(1, y2 + padding)

        return {
            "landmarks": [[lm.x, lm.y, lm.z] for lm in landmarks],
            "bbox": {
                "x1": float(x1),
                "y1": float(y1),
                "x2": float(x2),
                "y2": float(y2),
            },
        }

    def close(self):
        """Release MediaPipe resources."""
        self._hands.close()