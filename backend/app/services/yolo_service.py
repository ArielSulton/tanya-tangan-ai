"""YOLOv8 service for gesture classification - supports local and Ultralytics HUB cloud inference."""
from typing import Optional, Dict, List
import numpy as np
import os


CLASS_TO_LETTER = {
    0: "A", 1: "B",
    2: "Besar",
    3: "C", 4: "D", 5: "E", 6: "F", 7: "G", 8: "H", 9: "I", 10: "J",
    11: "K",
    12: "Kecil",
    13: "L", 14: "M", 15: "N", 16: "O", 17: "P", 18: "Q",
    19: "R", 20: "S", 21: "T", 22: "U", 23: "V", 24: "W", 25: "X",
    26: "Y",
    27: "Yang",
    28: "Z"
}


class YOLOService:
    def __init__(self, model_path: str, use_gpu: bool = False, imgsz: int = 416):
        self._imgsz = imgsz
        self._hub_url = os.environ.get("YOLO_HUB_URL", "")
        self._hub_api_key = os.environ.get("ULTRALYTICS_HUB_API_KEY", "")
        self._use_hub = bool(self._hub_url and self._hub_api_key)

        if self._use_hub:
            return

        from ultralytics import YOLO
        self._model = YOLO(model_path)
        self._device = "cuda:0" if use_gpu else "cpu"

    @property
    def use_cloud(self) -> bool:
        """Whether this service is using HUB cloud inference."""
        return self._use_hub

    def predict_letter(self, image: np.ndarray, conf_threshold: float = 0.5) -> Optional[Dict]:
        if self._use_hub:
            return self._predict_hub(image, conf_threshold)

        results = self._model.predict(image, conf=conf_threshold, verbose=False, device=self._device, imgsz=self._imgsz)

        if not results or not results[0].boxes:
            return None

        box = results[0].boxes[0]
        class_id = int(box.cls.item())
        confidence = float(box.conf.item())

        letter = CLASS_TO_LETTER.get(class_id, f"UNKNOWN_{class_id}")

        xyxy = box.xyxy[0].cpu().numpy()
        x1, y1, x2, y2 = xyxy
        img_h, img_w = image.shape[:2]
        bbox = {
            "x1": float(x1 / img_w),
            "y1": float(y1 / img_h),
            "x2": float(x2 / img_w),
            "y2": float(y2 / img_h),
        }

        return {
            "letter": letter,
            "confidence": confidence,
            "class_id": class_id,
            "bbox": bbox,
        }

    def predict_top_n(self, image: np.ndarray, n: int = 3, conf_threshold: float = 0.5) -> List[Dict]:
        if self._use_hub:
            return self._predict_hub_top_n(image, n, conf_threshold)

        results = self._model.predict(image, conf=conf_threshold, verbose=False, device=self._device, imgsz=self._imgsz)

        if not results or not results[0].boxes:
            return []

        predictions = []
        boxes = results[0].boxes
        img_h, img_w = image.shape[:2]

        for i in range(min(n, len(boxes))):
            box = boxes[i]
            class_id = int(box.cls.item())
            confidence = float(box.conf.item())
            letter = CLASS_TO_LETTER.get(class_id, f"UNKNOWN_{class_id}")

            xyxy = box.xyxy[0].cpu().numpy()
            x1, y1, x2, y2 = xyxy
            bbox = {
                "x1": float(x1 / img_w),
                "y1": float(y1 / img_h),
                "x2": float(x2 / img_w),
                "y2": float(y2 / img_h),
            }

            predictions.append({
                "letter": letter,
                "confidence": confidence,
                "class_id": class_id,
                "bbox": bbox,
            })

        return predictions

    def _predict_hub(self, image: np.ndarray, conf_threshold: float = 0.5) -> Optional[Dict]:
        import cv2
        import requests
        from io import BytesIO

        _, img_encoded = cv2.imencode('.jpg', image)
        files = {'file': ('image.jpg', BytesIO(img_encoded.tobytes()), 'image/jpeg')}
        data = {
            'conf': conf_threshold,
            'iou': 0.5,
            'imgsz': self._imgsz,
        }
        headers = {"Authorization": f"Bearer {self._hub_api_key}"} if self._hub_api_key else {}

        response = requests.post(self._hub_url, headers=headers, data=data, files=files, timeout=30)
        response.raise_for_status()
        result = response.json()

        # Ultralytics HUB returns results in images[0].results
        images = result.get('images', [])
        if not images or not images[0].get('results'):
            return None

        pred = images[0]['results'][0]
        class_id = int(pred['class'])
        confidence = float(pred['confidence'])
        # HUB API returns 'name' with actual letter — use it directly, fallback to CLASS_TO_LETTER mapping
        letter = pred.get('name', CLASS_TO_LETTER.get(class_id, f"UNKNOWN_{class_id}"))

        bbox = pred.get('box', {})
        img_h, img_w = image.shape[:2]
        bbox_normalized = {
            "x1": float(bbox.get('x1', 0) / img_w),
            "y1": float(bbox.get('y1', 0) / img_h),
            "x2": float(bbox.get('x2', img_w) / img_w),
            "y2": float(bbox.get('y2', img_h) / img_h),
        }

        return {
            "letter": letter,
            "confidence": confidence,
            "class_id": class_id,
            "bbox": bbox_normalized,
        }

    def _predict_hub_top_n(self, image: np.ndarray, n: int = 3, conf_threshold: float = 0.5) -> List[Dict]:
        import cv2
        import requests
        from io import BytesIO

        _, img_encoded = cv2.imencode('.jpg', image)
        files = {'file': ('image.jpg', BytesIO(img_encoded.tobytes()), 'image/jpeg')}
        data = {
            'conf': conf_threshold,
            'iou': 0.5,
            'imgsz': self._imgsz,
            'max_results': n,
        }
        headers = {"Authorization": f"Bearer {self._hub_api_key}"} if self._hub_api_key else {}

        response = requests.post(self._hub_url, headers=headers, data=data, files=files, timeout=30)
        response.raise_for_status()
        result = response.json()

        images = result.get('images', [])
        if not images or not images[0].get('results'):
            return []

        predictions = []
        img_h, img_w = image.shape[:2]

        for pred in images[0]['results'][:n]:
            class_id = int(pred['class'])
            confidence = float(pred['confidence'])
            letter = CLASS_TO_LETTER.get(class_id, f"UNKNOWN_{class_id}")

            bbox = pred.get('box', {})
            bbox_normalized = {
                "x1": float(bbox.get('x1', 0) / img_w),
                "y1": float(bbox.get('y1', 0) / img_h),
                "x2": float(bbox.get('x2', img_w) / img_w),
                "y2": float(bbox.get('y2', img_h) / img_h),
            }

            predictions.append({
                "letter": letter,
                "confidence": confidence,
                "class_id": class_id,
                "bbox": bbox_normalized,
            })

        return predictions
