import pytest
import numpy as np
from unittest.mock import MagicMock, patch


def test_mediapipe_detects_hand_from_image():
    mock_image = np.zeros((480, 640, 3), dtype=np.uint8)

    mock_landmarks = []
    for _ in range(21):
        lm = MagicMock()
        lm.x = 0.1
        lm.y = 0.2
        lm.z = 0.0
        mock_landmarks.append(lm)

    mock_result = MagicMock()
    mock_result.hand_landmarks = [mock_landmarks]

    with patch(
        "app.services.mediapipe_service.mp.tasks.vision.HandLandmarker"
    ) as mock_detector_class:
        mock_detector = MagicMock()
        mock_detector.detect = MagicMock(return_value=mock_result)
        mock_detector_class.create_from_options = MagicMock(
            return_value=mock_detector
        )

        from app.services.mediapipe_service import MediaPipeService

        service = MediaPipeService()
        result = service.detect_hand(mock_image)

        assert result is not None
        assert len(result) == 21
        assert result[0].x == 0.1


def test_mediapipe_returns_none_when_no_hand():
    mock_image = np.zeros((480, 640, 3), dtype=np.uint8)

    mock_result = MagicMock()
    mock_result.hand_landmarks = []

    with patch(
        "app.services.mediapipe_service.mp.tasks.vision.HandLandmarker"
    ) as mock_detector_class:
        mock_detector = MagicMock()
        mock_detector.detect = MagicMock(return_value=mock_result)
        mock_detector_class.create_from_options = MagicMock(
            return_value=mock_detector
        )

        from app.services.mediapipe_service import MediaPipeService

        service = MediaPipeService()
        result = service.detect_hand(mock_image)

        assert result is None


def test_extract_landmarks_returns_list_of_coordinates():
    mock_image = np.zeros((480, 640, 3), dtype=np.uint8)

    mock_landmarks = []
    for i in range(21):
        lm = MagicMock()
        lm.x = float(i) * 0.05
        lm.y = float(i) * 0.1
        lm.z = float(i) * 0.01
        mock_landmarks.append(lm)

    mock_result = MagicMock()
    mock_result.hand_landmarks = [mock_landmarks]

    with patch(
        "app.services.mediapipe_service.mp.tasks.vision.HandLandmarker"
    ) as mock_detector_class:
        mock_detector = MagicMock()
        mock_detector.detect = MagicMock(return_value=mock_result)
        mock_detector_class.create_from_options = MagicMock(
            return_value=mock_detector
        )

        from app.services.mediapipe_service import MediaPipeService

        service = MediaPipeService()
        result = service.extract_landmarks(mock_image)

        assert result is not None
        assert len(result) == 21
        assert result[0] == [0.0, 0.0, 0.0]
        assert result[20] == [1.0, 2.0, 0.2]


def test_extract_landmarks_returns_none_when_no_hand():
    mock_image = np.zeros((480, 640, 3), dtype=np.uint8)

    mock_result = MagicMock()
    mock_result.hand_landmarks = []

    with patch(
        "app.services.mediapipe_service.mp.tasks.vision.HandLandmarker"
    ) as mock_detector_class:
        mock_detector = MagicMock()
        mock_detector.detect = MagicMock(return_value=mock_result)
        mock_detector_class.create_from_options = MagicMock(
            return_value=mock_detector
        )

        from app.services.mediapipe_service import MediaPipeService

        service = MediaPipeService()
        result = service.extract_landmarks(mock_image)

        assert result is None


def test_close_calls_detector_close():
    with patch(
        "app.services.mediapipe_service.mp.tasks.vision.HandLandmarker"
    ) as mock_detector_class:
        mock_detector = MagicMock()
        mock_detector_class.create_from_options = MagicMock(
            return_value=mock_detector
        )

        from app.services.mediapipe_service import MediaPipeService

        service = MediaPipeService()
        service.close()

        mock_detector.close.assert_called_once()