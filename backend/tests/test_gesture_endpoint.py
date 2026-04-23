"""
Tests for POST /api/v1/gesture/recognize endpoint.
"""
import cv2
import base64
import numpy as np

from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch


class TestRecognizeEndpoint:
    """Test suite for gesture recognize endpoint."""

    def test_recognize_endpoint_returns_letter(self):
        """Test POST /api/v1/gesture/recognize returns letter."""
        test_image = np.zeros((100, 100, 3), dtype=np.uint8)
        _, buffer = cv2.imencode('.jpg', test_image)
        image_base64 = base64.b64encode(buffer).decode()

        mock_result = {
            "letter": "A",
            "confidence": 0.92,
            "alternatives": [{"letter": "D", "confidence": 0.11}],
            "processing_time_ms": 45,
        }

        with patch(
            'app.services.gesture_recognition_service.GestureRecognitionService.recognize',
            return_value=mock_result
        ):
            from app.main import app
            client = TestClient(app)
            response = client.post(
                "/api/v1/gesture/recognize",
                json={"frame": f"data:image/jpeg;base64,{image_base64}"}
            )

            assert response.status_code == 200
            data = response.json()
            assert data["letter"] == "A"
            assert data["confidence"] == 0.92

    def test_recognize_endpoint_422_when_no_hand(self):
        """Test POST returns 422 when no hand detected."""
        test_image = np.zeros((100, 100, 3), dtype=np.uint8)
        _, buffer = cv2.imencode('.jpg', test_image)
        image_base64 = base64.b64encode(buffer).decode()

        with patch(
            'app.services.gesture_recognition_service.GestureRecognitionService.recognize',
            side_effect=ValueError("No hand detected")
        ):
            from app.main import app
            client = TestClient(app)
            response = client.post(
                "/api/v1/gesture/recognize",
                json={"frame": f"data:image/jpeg;base64,{image_base64}"}
            )

            assert response.status_code == 422

    def test_recognize_endpoint_400_invalid_image(self):
        """Test POST returns 400 for invalid image."""
        from app.main import app
        client = TestClient(app)
        response = client.post(
            "/api/v1/gesture/recognize",
            json={"frame": "not-a-valid-base64-image"}
        )

        assert response.status_code == 400

    def test_recognize_endpoint_accepts_plain_base64(self):
        """Test POST accepts base64 without data URI prefix."""
        test_image = np.zeros((100, 100, 3), dtype=np.uint8)
        _, buffer = cv2.imencode('.jpg', test_image)
        image_base64 = base64.b64encode(buffer).decode()

        mock_result = {
            "letter": "B",
            "confidence": 0.85,
            "alternatives": [],
            "processing_time_ms": 30,
        }

        with patch(
            'app.services.gesture_recognition_service.GestureRecognitionService.recognize',
            return_value=mock_result
        ):
            from app.main import app
            client = TestClient(app)
            response = client.post(
                "/api/v1/gesture/recognize",
                json={"frame": image_base64}
            )

            assert response.status_code == 200
            data = response.json()
            assert data["letter"] == "B"