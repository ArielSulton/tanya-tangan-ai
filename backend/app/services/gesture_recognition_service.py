"""Gesture recognition orchestration service combining MediaPipe + YOLO."""
import time
from typing import Dict, Optional
import numpy as np

from app.services.mediapipe_service import MediaPipeService
from app.services.yolo_service import YOLOService


class GestureRecognitionService:
    """Orchestrates MediaPipe (hand detection) + YOLO (gesture classification)."""

    def __init__(
        self,
        mediapipe_model_path: str = "",
        yolo_model_path: str = "app/models/sibi_yolo.pt",
    ):
        """Initialize services.

        Args:
            mediapipe_model_path: Path to MediaPipe model (optional for Hands)
            yolo_model_path: Path to YOLOv8 model
        """
        self._mediapipe = MediaPipeService()
        self._yolo = YOLOService(yolo_model_path)

    def recognize(self, image: np.ndarray) -> Dict:
        """Recognize gesture from image.

        Args:
            image: BGR image as numpy array

        Returns:
            Dict with letter, confidence, alternatives, processing_time_ms

        Raises:
            ValueError: If no hand detected in image
        """
        start_time = time.time()

        landmarks = self._mediapipe.extract_landmarks(image)
        if landmarks is None:
            raise ValueError("No hand detected in the image")

        prediction = self._yolo.predict_letter(image, conf_threshold=0.5)

        if prediction is None:
            raise ValueError("No gesture recognized")

        alternatives = self._yolo.predict_top_n(image, n=3, conf_threshold=0.3)
        alternatives = [alt for alt in alternatives if alt["letter"] != prediction["letter"]]

        processing_time_ms = int((time.time() - start_time) * 1000)

        return {
            "letter": prediction["letter"],
            "confidence": prediction["confidence"],
            "alternatives": alternatives[:2],
            "processing_time_ms": processing_time_ms,
        }

    def close(self):
        """Clean up resources."""
        self._mediapipe.close()