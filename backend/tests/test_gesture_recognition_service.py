import pytest
from unittest.mock import MagicMock, patch
import numpy as np


def test_recognize_returns_combined_result():
    """Test that service combines MediaPipe + YOLO results."""
    mock_image = np.zeros((480, 640, 3), dtype=np.uint8)

    mock_mediapipe = MagicMock()
    mock_mediapipe.extract_landmarks.return_value = [[0.1, 0.2, 0.0] * 21]

    mock_yolo = MagicMock()
    mock_yolo.predict_letter.return_value = {
        "letter": "A",
        "confidence": 0.92,
        "class_id": 0,
    }

    with patch('app.services.gesture_recognition_service.MediaPipeService') as mp_cls:
        mp_cls.return_value = mock_mediapipe
        with patch('app.services.gesture_recognition_service.YOLOService') as yolo_cls:
            yolo_cls.return_value = mock_yolo

            from app.services.gesture_recognition_service import GestureRecognitionService
            service = GestureRecognitionService(
                mediapipe_model_path="mp_model",
                yolo_model_path="yolo_model"
            )

            result = service.recognize(mock_image)

            assert result["letter"] == "A"
            assert result["confidence"] == 0.92
            assert "processing_time_ms" in result


def test_recognize_returns_422_when_no_hand():
    """Test that service raises exception when no hand detected."""
    mock_image = np.zeros((480, 640, 3), dtype=np.uint8)

    mock_mediapipe = MagicMock()
    mock_mediapipe.extract_landmarks.return_value = None

    mock_yolo = MagicMock()

    with patch('app.services.gesture_recognition_service.MediaPipeService') as mp_cls:
        mp_cls.return_value = mock_mediapipe
        with patch('app.services.gesture_recognition_service.YOLOService') as yolo_cls:
            yolo_cls.return_value = mock_yolo

            from app.services.gesture_recognition_service import GestureRecognitionService
            service = GestureRecognitionService(
                mediapipe_model_path="mp_model",
                yolo_model_path="yolo_model"
            )

            with pytest.raises(Exception) as exc_info:
                service.recognize(mock_image)

            assert "No hand detected" in str(exc_info.value)