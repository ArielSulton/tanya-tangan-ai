import pytest
from unittest.mock import MagicMock, patch
import numpy as np
import importlib


def test_yolo_predict_returns_letter():
    mock_image = np.zeros((480, 640, 3), dtype=np.uint8)

    mock_result = MagicMock()
    mock_result.boxes = [MagicMock(
        cls=MagicMock(item=MagicMock(return_value=0)),
        conf=MagicMock(item=MagicMock(return_value=0.92)),
    )]

    mock_yolo_class = MagicMock()
    mock_model = MagicMock()
    mock_model.predict.return_value = [mock_result]
    mock_yolo_class.return_value = mock_model

    mock_ultralytics = MagicMock()
    mock_ultralytics.YOLO = mock_yolo_class

    with patch.dict('sys.modules', {'ultralytics': mock_ultralytics}):
        import app.services.yolo_service
        importlib.reload(app.services.yolo_service)
        from app.services.yolo_service import YOLOService
        service = YOLOService(model_path="dummy.pt")
        result = service.predict_letter(mock_image)

        assert result["letter"] == "A"
        assert result["confidence"] == 0.92


def test_yolo_returns_none_when_no_detection():
    mock_image = np.zeros((480, 640, 3), dtype=np.uint8)

    mock_yolo_class = MagicMock()
    mock_model = MagicMock()
    mock_model.predict.return_value = [MagicMock(boxes=[])]
    mock_yolo_class.return_value = mock_model

    mock_ultralytics = MagicMock()
    mock_ultralytics.YOLO = mock_yolo_class

    with patch.dict('sys.modules', {'ultralytics': mock_ultralytics}):
        import app.services.yolo_service
        importlib.reload(app.services.yolo_service)
        from app.services.yolo_service import YOLOService
        service = YOLOService(model_path="dummy.pt")
        result = service.predict_letter(mock_image)

        assert result is None
