"""YOLOv8 service for gesture classification."""
from typing import Optional, Dict, List
import numpy as np


CLASS_TO_LETTER = {
    0: "A", 1: "B", 2: "C", 3: "D", 4: "E", 5: "F", 6: "G", 7: "H",
    8: "I", 9: "Y",
    10: "K", 11: "L", 12: "M", 13: "N", 14: "O", 15: "P", 16: "Q",
    17: "R", 18: "S", 19: "T", 20: "U", 21: "V", 22: "W", 23: "X", 24: "Z"
}


class YOLOService:
    def __init__(self, model_path: str):
        from ultralytics import YOLO
        self._model = YOLO(model_path)

    def predict_letter(self, image: np.ndarray, conf_threshold: float = 0.5) -> Optional[Dict]:
        results = self._model.predict(image, conf=conf_threshold, verbose=False)

        if not results or not results[0].boxes:
            return None

        box = results[0].boxes[0]
        class_id = int(box.cls.item())
        confidence = float(box.conf.item())

        letter = CLASS_TO_LETTER.get(class_id, f"UNKNOWN_{class_id}")

        return {
            "letter": letter,
            "confidence": confidence,
            "class_id": class_id,
        }

    def predict_top_n(self, image: np.ndarray, n: int = 3, conf_threshold: float = 0.5) -> List[Dict]:
        results = self._model.predict(image, conf=conf_threshold, verbose=False)

        if not results or not results[0].boxes:
            return []

        predictions = []
        boxes = results[0].boxes

        for i in range(min(n, len(boxes))):
            box = boxes[i]
            class_id = int(box.cls.item())
            confidence = float(box.conf.item())
            letter = CLASS_TO_LETTER.get(class_id, f"UNKNOWN_{class_id}")

            predictions.append({
                "letter": letter,
                "confidence": confidence,
                "class_id": class_id,
            })

        return predictions
