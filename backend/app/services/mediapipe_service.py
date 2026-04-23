import cv2
import numpy as np
from typing import Optional, List
import mediapipe as mp
from mediapipe.tasks.python.components.containers.landmark import NormalizedLandmark


class MediaPipeService:
    def __init__(self, num_hands: int = 1, min_detection_confidence: float = 0.7):
        base_options = mp.tasks.BaseOptions(model_asset_path="")
        options = mp.tasks.vision.HandLandmarkerOptions(
            base_options=base_options,
            num_hands=num_hands,
            min_hand_detection_confidence=min_detection_confidence,
        )
        self._detector = mp.tasks.vision.HandLandmarker.create_from_options(options)

    def detect_hand(self, image: np.ndarray) -> Optional[List[NormalizedLandmark]]:
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)

        result = self._detector.detect(mp_image)

        if not result.hand_landmarks:
            return None

        return result.hand_landmarks[0]

    def extract_landmarks(self, image: np.ndarray) -> Optional[List[List[float]]]:
        landmarks = self.detect_hand(image)
        if landmarks is None:
            return None

        return [[lm.x, lm.y, lm.z] for lm in landmarks]

    def close(self):
        self._detector.close()