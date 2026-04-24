"""Gesture recognition orchestration service combining MediaPipe + YOLO."""

import time
import threading
from collections import deque
from typing import Dict, Optional, Tuple

import numpy as np

from app.services.mediapipe_service import MediaPipeService
from app.services.yolo_service import YOLOService


# Local Server Inference Configuration
MIN_STABLE_FRAMES = 4
CONFIDENCE_THRESHOLD = 0.4
MAX_CONFIDENCE_VARIATION = 0.40
TEMPORAL_VALIDATION_WINDOW = 3000
SESSION_STALE_TIMEOUT = 10


# Cloud API Inference Configuration
# MIN_STABLE_FRAMES = 3                 # Reduced for faster validation with slow cloud inference
# CONFIDENCE_THRESHOLD = 0.25           # Match YOLO threshold
# MAX_CONFIDENCE_VARIATION = 0.50       # Allow more variation
# TEMPORAL_VALIDATION_WINDOW = 10000    # 10 seconds window for slow cloud inference
# SESSION_STALE_TIMEOUT = 10


class TemporalValidationService:
    """Maintains per-session prediction buffers for temporal validation."""

    def __init__(self):
        self._sessions: Dict[str, deque] = {}
        self._last_validated_letter: Dict[str, str] = {}
        self._lock = threading.Lock()

    def _get_or_create_buffer(self, session_id: str) -> deque:
        if session_id not in self._sessions:
            self._sessions[session_id] = deque(maxlen=MIN_STABLE_FRAMES)
        return self._sessions[session_id]

    def add_prediction(self, session_id: str, letter: str, confidence: float) -> bool:
        """Add a prediction to the session buffer.

        Args:
            session_id: Session identifier
            letter: Predicted letter
            confidence: Prediction confidence (0-1)

        Returns:
            True if validation just passed (buffer meets all criteria)
        """
        import logging
        logger = logging.getLogger(__name__)

        if session_id is None:
            return False

        with self._lock:
            buffer = self._get_or_create_buffer(session_id)
            buffer.append(
                {
                    "letter": letter,
                    "confidence": confidence,
                    "timestamp": time.time(),
                }
            )
            # Check if validation just passed
            is_valid, _, _ = self._validate_buffer(buffer, session_id)
            logger.warning("[TEMPORAL] session=%s buffer_size=%d letter=%s confidence=%.3f validated=%s",
                         session_id, len(buffer), letter, confidence, is_valid)
            return is_valid

    def validate_session(self, session_id: str) -> Tuple[bool, Optional[str], float]:
        """Check if the session buffer meets temporal validation criteria.

        Returns:
            Tuple of (is_valid, letter, avg_confidence)
        """
        if session_id is None:
            return False, None, 0.0

        with self._lock:
            buffer = self._sessions.get(session_id)
            if buffer is None:
                return False, None, 0.0
            return self._validate_buffer(buffer, session_id)

    def _validate_buffer(
        self, buffer: deque, session_id: str
    ) -> Tuple[bool, Optional[str], float]:
        import logging
        logger = logging.getLogger(__name__)

        if len(buffer) < MIN_STABLE_FRAMES:
            logger.debug("[VALIDATE FAIL] buffer_size=%d < MIN_STABLE_FRAMES=%d", len(buffer), MIN_STABLE_FRAMES)
            return False, None, 0.0

        letters = [p["letter"] for p in buffer]
        if len(set(letters)) != 1:
            logger.debug("[VALIDATE FAIL] letters not consistent: %s", letters)
            return False, None, 0.0

        letter = letters[0]

        timestamps = [p["timestamp"] for p in buffer]
        time_span_ms = (timestamps[-1] - timestamps[0]) * 1000
        if time_span_ms > TEMPORAL_VALIDATION_WINDOW:
            logger.debug("[VALIDATE FAIL] time_span_ms=%.0f > WINDOW=%d", time_span_ms, TEMPORAL_VALIDATION_WINDOW)
            return False, None, 0.0

        confidences = [p["confidence"] for p in buffer]
        avg_conf = sum(confidences) / len(confidences)
        if avg_conf < CONFIDENCE_THRESHOLD:
            logger.debug("[VALIDATE FAIL] avg_conf=%.3f < THRESHOLD=%.3f", avg_conf, CONFIDENCE_THRESHOLD)
            return False, None, 0.0

        conf_range = max(confidences) - min(confidences)
        if conf_range > MAX_CONFIDENCE_VARIATION:
            logger.debug("[VALIDATE FAIL] conf_range=%.3f > MAX_VARIATION=%.3f", conf_range, MAX_CONFIDENCE_VARIATION)
            return False, None, 0.0

        last_validated = self._last_validated_letter.get(session_id)
        if last_validated == letter:
            logger.debug("[VALIDATE FAIL] letter=%s already validated for session", letter)
            return False, None, 0.0

        logger.warning("[VALIDATE] PASSED session=%s letter=%s avg_conf=%.3f", session_id, letter, avg_conf)
        self._last_validated_letter[session_id] = letter
        return True, letter, avg_conf

    def clear_session(self, session_id: str):
        if session_id is None:
            return
        with self._lock:
            self._sessions.pop(session_id, None)
            self._last_validated_letter.pop(session_id, None)

    def cleanup_stale_sessions(self):
        """Remove sessions with no activity > SESSION_STALE_TIMEOUT seconds."""
        current_time = time.time()
        with self._lock:
            stale = [
                sid
                for sid, buf in self._sessions.items()
                if buf and current_time - buf[-1]["timestamp"] > SESSION_STALE_TIMEOUT
            ]
            for sid in stale:
                self._sessions.pop(sid, None)
                self._last_validated_letter.pop(sid, None)


# Singleton instance
_temporal_validation_service: Optional[TemporalValidationService] = None


def get_temporal_validation_service() -> TemporalValidationService:
    global _temporal_validation_service
    if _temporal_validation_service is None:
        _temporal_validation_service = TemporalValidationService()
    return _temporal_validation_service


class GestureRecognitionService:
    """Orchestrates MediaPipe (hand detection) + YOLO (gesture classification)."""

    def __init__(
        self,
        mediapipe_model_path: str = "",
        yolo_model_path: str = "app/models/sibi_yolo.pt",
        use_gpu: bool = False,
        imgsz: int = 416,
    ):
        self._mediapipe = MediaPipeService()
        self._yolo = YOLOService(yolo_model_path, use_gpu=use_gpu, imgsz=imgsz)
        self._temporal = get_temporal_validation_service()

    def recognize(self, image: np.ndarray, session_id: Optional[str] = None) -> Dict:
        """Recognize gesture from image.

        Args:
            image: BGR image as numpy array
            session_id: Optional session identifier for temporal validation

        Returns:
            Dict with letter, confidence, alternatives, processing_time_ms,
            landmarks, yolo_bbox, validated
        """
        start_time = time.time()

        # MediaPipe hand detection — COMMENTED OUT for now, YOLO runs standalone
        # landmarks_result = self._mediapipe.extract_landmarks_with_bbox(image)
        # if landmarks_result is None:
        #     raise ValueError("NO_HAND")
        # landmarks = landmarks_result["landmarks"]
        # mediapipe_bbox = landmarks_result["bbox"]
        landmarks = None
        mediapipe_bbox = None

        prediction = self._yolo.predict_letter(image, conf_threshold=0.25)

        if prediction is None:
            raise ValueError("NO_GESTURE")

        alternatives = self._yolo.predict_top_n(image, n=3, conf_threshold=0.2)
        alternatives = [
            alt for alt in alternatives if alt["letter"] != prediction["letter"]
        ]

        processing_time_ms = int((time.time() - start_time) * 1000)

        is_validated = False
        if session_id is not None:
            is_validated = self._temporal.add_prediction(
                session_id,
                prediction["letter"],
                prediction["confidence"],
            )

        return {
            "letter": prediction["letter"],
            "confidence": prediction["confidence"],
            "alternatives": alternatives[:2],
            "processing_time_ms": processing_time_ms,
            "landmarks": landmarks,
            "mediapipe_bbox": mediapipe_bbox,
            "yolo_bbox": prediction.get("bbox"),
            "validated": is_validated,
        }

    def close(self):
        """Clean up resources."""
        self._mediapipe.close()
