# YOLO + MediaPipe Python Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add YOLO + MediaPipe (Python) gesture recognition to backend FastAPI, migrate frontend to send frames to backend instead of local TFJS+MediaPipe processing. Legacy JS code kept on disk but not run at runtime.

**Architecture:** FastAPI backend with MediaPipe Hands for landmark extraction and YOLOv8 for gesture classification. Frontend becomes thin client - captures camera and sends frames to backend, receives letter predictions.

**Tech Stack:** Python 3.11+, FastAPI, MediaPipe Python, Ultralytics YOLOv8, OpenCV, Next.js 15

---

## File Structure

### Backend (New Files)

```
backend/app/services/
├── mediapipe_service.py         # NEW: MediaPipe Hands wrapper
├── yolo_service.py              # NEW: YOLOv8 model loading + inference
└── gesture_recognition_service.py  # NEW: orchestrates MediaPipe + YOLO

backend/app/models/
└── sibi_yolo.pt                # NEW: YOLOv8 model (gitignored, loaded from volume)

backend/app/api/v1/endpoints/
└── gesture.py                   # MODIFY: add /recognize endpoint

backend/requirements.txt         # MODIFY: add dependencies
```

### Frontend (Modify)

```
frontend/src/components/gesture/gesture-recognition.tsx  # MODIFY: send frames to backend
frontend/src/hooks/use-gesture-recognition.ts            # MODIFY: use backend API
```

### Unchanged (Legacy - on disk but not run)

```
frontend/src/lib/ai/services/gesture-recognition.ts      # LEGACY: untouched
frontend/src/lib/ai/services/handpose-service.ts           # LEGACY: untouched
frontend/src/lib/ai/config/sibi-config.ts                 # LEGACY: untouched
frontend/src/components/handsigns/                         # LEGACY: untouched
```

---

## Tasks

### Task 1: Backend Dependencies

**Files:**
- Modify: `backend/requirements.txt`

- [ ] **Step 1: Add Python dependencies**

Add to `backend/requirements.txt`:
```
ultralytics>=8.0.0
mediapipe>=0.10.0
opencv-python>=4.8.0
```

- [ ] **Step 2: Commit**

```bash
cd backend && source .venv/bin/activate && pip install -r requirements.txt
git add requirements.txt
git commit -m "feat: add YOLO and MediaPipe dependencies"
```

---

### Task 2: MediaPipe Service

**Files:**
- Create: `backend/app/services/mediapipe_service.py`
- Test: `backend/tests/test_mediapipe_service.py`

- [ ] **Step 1: Write failing test**

```python
# backend/tests/test_mediapipe_service.py
import pytest
import numpy as np
from unittest.mock import MagicMock, patch


def test_mediapipe_detects_hand_from_image():
    """Test that MediaPipe can process an image and detect hand landmarks."""
    # Create mock image (640x480 RGB)
    mock_image = np.zeros((480, 640, 3), dtype=np.uint8)

    # Mock MediaPipe Hands
    mock_results = MagicMock()
    mock_results.multi_hand_landmarks = [
        MagicMock(landmark=[
            MagicMock(x=0.1, y=0.2, z=0.0) for _ in range(21)
        ])
    ]

    with patch('mediapipe_service.mp') as mock_mp:
        mock_mp.solutions.hands.Hands.return_value.__enter__ = MagicMock(
            return_value=MagicMock(process=MagicMock(return_value=mock_results)
        ))
        mock_mp.solutions.hands.Hands.return_value.__exit__ = MagicMock()

        from app.services.mediapipe_service import MediaPipeService
        service = MediaPipeService()
        result = service.detect_hand(mock_image)

        assert result is not None
        assert len(result.landmark) == 21


def test_mediapipe_returns_none_when_no_hand():
    """Test that MediaPipe returns None when no hand detected."""
    mock_image = np.zeros((480, 640, 3), dtype=np.uint8)

    mock_results = MagicMock()
    mock_results.multi_hand_landmarks = []

    with patch('mediapipe_service.mp') as mock_mp:
        mock_mp.solutions.hands.Hands.return_value.__enter__ = MagicMock(
            return_value=MagicMock(process=MagicMock(return_value=mock_results)
        ))
        mock_mp.solutions.hands.Hands.return_value.__exit__ = MagicMock()

        from app.services.mediapipe_service import MediaPipeService
        service = MediaPipeService()
        result = service.detect_hand(mock_image)

        assert result is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && source .venv/bin/activate && pytest tests/test_mediapipe_service.py -v`
Expected: FAIL - module 'app.services.mediapipe_service' not found

- [ ] **Step 3: Write minimal implementation**

```python
# backend/app/services/mediapipe_service.py
"""MediaPipe Hands service for hand landmark extraction."""
import cv2
import numpy as np
from typing import Optional, List
import mediapipe as mp
from mediapipe.tasks.python.components import containers
from mediapipe.tasks.python.vision import HandLandmarker


class MediaPipeService:
    """Service for hand landmark detection using MediaPipe."""

    def __init__(self, num_hands: int = 1, min_detection_confidence: float = 0.7):
        """Initialize MediaPipe Hands.

        Args:
            num_hands: Maximum number of hands to detect
            min_detection_confidence: Minimum detection confidence threshold
        """
        base_options = mp.tasks.BaseOptions(model_asset_path="")
        options = mp.tasks.vision.HandLandmarkerOptions(
            base_options=base_options,
            num_hands=num_hands,
            min_hand_detection_confidence=min_detection_confidence,
        )
        self._detector = mp.tasks.vision.HandLandmarker.create_from_options(options)

    def detect_hand(self, image: np.ndarray) -> Optional[containers.NormalizedLandmarkList]:
        """Detect hand landmarks in an image.

        Args:
            image: BGR image as numpy array (HxWxC)

        Returns:
            NormalizedLandmarkList or None if no hand detected
        """
        # Convert BGR to RGB
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)

        result = self._detector.detect(mp_image)

        if not result.hand_landmarks:
            return None

        return result.hand_landmarks[0]

    def extract_landmarks(self, image: np.ndarray) -> Optional[List[List[float]]]:
        """Extract 21 hand landmarks as list of [x, y, z].

        Args:
            image: BGR image as numpy array

        Returns:
            List of 21 landmarks, each as [x, y, z], or None if no hand
        """
        landmarks = self.detect_hand(image)
        if landmarks is None:
            return None

        return [[lm.x, lm.y, lm.z] for lm in landmarks]

    def close(self):
        """Clean up MediaPipe resources."""
        self._detector.close()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && source .venv/bin/activate && pytest tests/test_mediapipe_service.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/mediapipe_service.py backend/tests/test_mediapipe_service.py
git commit -m "feat: add MediaPipe service for hand landmark extraction"
```

---

### Task 3: YOLO Service

**Files:**
- Create: `backend/app/services/yolo_service.py`
- Create: `backend/app/models/sibi_yolo.pt` (placeholder - gitignored)
- Test: `backend/tests/test_yolo_service.py`

- [ ] **Step 1: Write failing test**

```python
# backend/tests/test_yolo_service.py
import pytest
from unittest.mock import MagicMock, patch
import numpy as np


def test_yolo_predict_returns_letter():
    """Test that YOLO model returns letter prediction."""
    mock_image = np.zeros((480, 640, 3), dtype=np.uint8)

    mock_result = MagicMock()
    mock_result.boxes = [MagicMock(
        cls=MagicMock(item=MagicMock(return_value=0)),  # class 0 = 'A'
        conf=MagicMock(item=MagicMock(return_value=0.92)),
    )]

    with patch('app.services.yolo_service.YOLO') as mock_yolo:
        mock_model = MagicMock()
        mock_model.predict.return_value = [mock_result]
        mock_yolo.return_value = mock_model

        from app.services.yolo_service import YOLOService
        service = YOLOService(model_path="dummy.pt")
        result = service.predict_letter(mock_image)

        assert result["letter"] == "A"
        assert result["confidence"] == 0.92


def test_yolo_returns_none_when_no_detection():
    """Test that YOLO returns None when no hand detected."""
    mock_image = np.zeros((480, 640, 3), dtype=np.uint8)

    with patch('app.services.yolo_service.YOLO') as mock_yolo:
        mock_model = MagicMock()
        mock_model.predict.return_value = [MagicMock(boxes=[])]
        mock_yolo.return_value = mock_model

        from app.services.yolo_service import YOLOService
        service = YOLOService(model_path="dummy.pt")
        result = service.predict_letter(mock_image)

        assert result is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && source .venv/bin/activate && pytest tests/test_yolo_service.py -v`
Expected: FAIL - module 'app.services.yolo_service' not found

- [ ] **Step 3: Write minimal implementation**

```python
# backend/app/services/yolo_service.py
"""YOLOv8 service for gesture classification."""
from typing import Optional, Dict, List
import numpy as np
from ultralytics import YOLO


# Class index to letter mapping (A-Z, J->Y mapping included)
CLASS_TO_LETTER = {
    0: "A", 1: "B", 2: "C", 3: "D", 4: "E", 5: "F", 6: "G", 7: "H",
    8: "I", 9: "Y",  # J->Y in SIBI
    10: "K", 11: "L", 12: "M", 13: "N", 14: "O", 15: "P", 16: "Q",
    17: "R", 18: "S", 19: "T", 20: "U", 21: "V", 22: "W", 23: "X", 24: "Z"
}


class YOLOService:
    """Service for gesture classification using YOLOv8."""

    def __init__(self, model_path: str):
        """Initialize YOLOv8 model.

        Args:
            model_path: Path to YOLOv8 model (.pt file)
        """
        self._model = YOLO(model_path)

    def predict_letter(self, image: np.ndarray, conf_threshold: float = 0.5) -> Optional[Dict]:
        """Predict letter from hand gesture image.

        Args:
            image: BGR image as numpy array
            conf_threshold: Minimum confidence threshold

        Returns:
            Dict with letter, confidence, or None if no detection
        """
        results = self._model.predict(image, conf=conf_threshold, verbose=False)

        if not results or not results[0].boxes:
            return None

        # Get top prediction
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
        """Get top N predictions.

        Args:
            image: BGR image as numpy array
            n: Number of top predictions to return
            conf_threshold: Minimum confidence threshold

        Returns:
            List of dicts with letter, confidence
        """
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && source .venv/bin/activate && pytest tests/test_yolo_service.py -v`
Expected: PASS

- [ ] **Step 5: Create placeholder model file for development**

```bash
# Create placeholder .pt file (will be replaced with real trained model)
touch backend/app/models/sibi_yolo.pt
echo "sibi_yolo.pt" >> backend/.gitignore
git add backend/app/models/sibi_yolo.pt
git commit -m "feat: add placeholder for YOLO model (gitignored)"
```

---

### Task 4: Gesture Recognition Orchestration Service

**Files:**
- Create: `backend/app/services/gesture_recognition_service.py`
- Test: `backend/tests/test_gesture_recognition_service.py`

- [ ] **Step 1: Write failing test**

```python
# backend/tests/test_gesture_recognition_service.py
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && source .venv/bin/activate && pytest tests/test_gesture_recognition_service.py -v`
Expected: FAIL - module not found

- [ ] **Step 3: Write minimal implementation**

```python
# backend/app/services/gesture_recognition_service.py
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

        # Step 1: MediaPipe - extract hand landmarks
        landmarks = self._mediapipe.extract_landmarks(image)
        if landmarks is None:
            raise ValueError("No hand detected in the image")

        # Step 2: YOLO - classify gesture
        # Note: For YOLO, we pass the full image (it handles hand detection internally)
        # Alternative: could pass cropped hand region based on landmarks
        prediction = self._yolo.predict_letter(image, conf_threshold=0.5)

        if prediction is None:
            raise ValueError("No gesture recognized")

        # Get top 3 alternatives
        alternatives = self._yolo.predict_top_n(image, n=3, conf_threshold=0.3)
        alternatives = [alt for alt in alternatives if alt["letter"] != prediction["letter"]]

        processing_time_ms = int((time.time() - start_time) * 1000)

        return {
            "letter": prediction["letter"],
            "confidence": prediction["confidence"],
            "alternatives": alternatives[:2],  # Max 2 alternatives
            "processing_time_ms": processing_time_ms,
        }

    def close(self):
        """Clean up resources."""
        self._mediapipe.close()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && source .venv/bin/activate && pytest tests/test_gesture_recognition_service.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/gesture_recognition_service.py backend/tests/test_gesture_recognition_service.py
git commit -m "feat: add gesture recognition orchestration service"
```

---

### Task 5: Backend API Endpoint

**Files:**
- Modify: `backend/app/api/v1/endpoints/gesture.py`
- Test: `backend/tests/test_gesture_endpoint.py`

- [ ] **Step 1: Write failing test**

```python
# backend/tests/test_gesture_endpoint.py
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
import base64
import numpy as np


def test_recognize_endpoint_returns_letter():
    """Test POST /api/v1/gesture/recognize returns letter."""
    # Create small test image
    test_image = np.zeros((100, 100, 3), dtype=np.uint8)
    _, buffer = cv2.imencode('.jpg', test_image)
    image_base64 = base64.b64encode(buffer).decode()

    mock_result = {
        "letter": "A",
        "confidence": 0.92,
        "alternatives": [{"letter": "D", "confidence": 0.11}],
        "processing_time_ms": 45,
    }

    with patch('app.api.v1.endpoints.gesture.get_gesture_service') as mock_get:
        mock_service = MagicMock()
        mock_service.recognize.return_value = mock_result
        mock_get.return_value = mock_service

        client = TestClient(app)
        response = client.post(
            "/api/v1/gesture/recognize",
            json={"frame": f"data:image/jpeg;base64,{image_base64}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["letter"] == "A"
        assert data["confidence"] == 0.92


def test_recognize_endpoint_422_when_no_hand():
    """Test POST returns 422 when no hand detected."""
    test_image = np.zeros((100, 100, 3), dtype=np.uint8)
    _, buffer = cv2.imencode('.jpg', test_image)
    image_base64 = base64.b64encode(buffer).decode()

    with patch('app.api.v1.endpoints.gesture.get_gesture_service') as mock_get:
        mock_service = MagicMock()
        mock_service.recognize.side_effect = ValueError("No hand detected")
        mock_get.return_value = mock_service

        client = TestClient(app)
        response = client.post(
            "/api/v1/gesture/recognize",
            json={"frame": f"data:image/jpeg;base64,{image_base64}"}
        )

        assert response.status_code == 422


def test_recognize_endpoint_400_invalid_image():
    """Test POST returns 400 for invalid image."""
    client = TestClient(app)
    response = client.post(
        "/api/v1/gesture/recognize",
        json={"frame": "not-a-valid-base64-image"}
    )

    assert response.status_code == 400
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && source .venv/bin/activate && pytest tests/test_gesture_endpoint.py -v`
Expected: FAIL - route not defined

- [ ] **Step 3: Write minimal implementation**

Read existing `backend/app/api/v1/endpoints/gesture.py` first to understand current structure, then add:

```python
# backend/app/api/v1/endpoints/gesture.py (add new code)

from typing import Optional
from pydantic import BaseModel
import base64
import cv2
import numpy as np

from fastapi import APIRouter, HTTPException, Depends
from app.services.gesture_recognition_service import GestureRecognitionService

router = APIRouter()

# Singleton service instance
_gesture_service: Optional[GestureRecognitionService] = None


def get_gesture_service() -> GestureRecognitionService:
    """Get or create singleton GestureRecognitionService instance."""
    global _gesture_service
    if _gesture_service is None:
        yolo_model_path = os.getenv("YOLO_MODEL_PATH", "app/models/sibi_yolo.pt")
        _gesture_service = GestureRecognitionService(yolo_model_path=yolo_model_path)
    return _gesture_service


class GestureRecognizeRequest(BaseModel):
    frame: str  # base64 encoded image
    session_id: Optional[str] = None


class GestureRecognizeResponse(BaseModel):
    letter: str
    confidence: float
    alternatives: list[dict]
    processing_time_ms: int


@router.post("/recognize", response_model=GestureRecognizeResponse)
async def recognize_gesture(
    request: GestureRecognizeRequest,
    service: GestureRecognitionService = Depends(get_gesture_service),
):
    """Recognize gesture from camera frame.

    Receives base64-encoded image from frontend camera,
    processes with MediaPipe + YOLO, returns predicted letter.
    """
    try:
        # Decode base64 image
        if request.frame.startswith("data:"):
            # Remove "data:image/jpeg;base64," prefix if present
            base64_data = request.frame.split(",")[1]
        else:
            base64_data = request.frame

        image_bytes = base64.b64decode(base64_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image data")

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to decode image: {str(e)}")

    try:
        result = service.recognize(image)
        return GestureRecognizeResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recognition failed: {str(e)}")
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && source .venv/bin/activate && pytest tests/test_gesture_endpoint.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/v1/endpoints/gesture.py
git commit -m "feat: add /recognize endpoint for YOLO+MediaPipe gesture recognition"
```

---

### Task 6: Frontend Camera Client

**Files:**
- Modify: `frontend/src/components/gesture/gesture-recognition.tsx`
- Modify: `frontend/src/hooks/use-gesture-recognition.ts`

- [ ] **Step 1: Read current implementation**

Read `frontend/src/components/gesture/gesture-recognition.tsx` to understand current camera flow.

- [ ] **Step 2: Modify use-gesture-recognition.ts**

Change to call backend API instead of using TFJS/MediaPipe locally:

```typescript
// frontend/src/hooks/use-gesture-recognition.ts
// CHANGE: use backend API instead of local TFJS/MediaPipe

import { useState, useCallback, useRef } from 'react'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

interface GestureResult {
  letter: string
  confidence: number
  alternatives?: { letter: string; confidence: number }[]
  processing_time_ms?: number
}

export function useGestureRecognition() {
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [currentLetter, setCurrentLetter] = useState<string | null>(null)
  const [confidence, setConfidence] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const captureAndRecognize = useCallback(async (videoElement: HTMLVideoElement) => {
    setIsRecognizing(true)
    setError(null)

    try {
      // Capture frame to canvas
      const canvas = canvasRef.current || document.createElement('canvas')
      canvas.width = videoElement.videoWidth
      canvas.height = videoElement.videoHeight
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(videoElement, 0, 0)

      // Convert to base64
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
      const base64Data = dataUrl.replace('data:image/jpeg;base64,', '')

      // Send to backend
      const response = await fetch(`${BACKEND_URL}/api/v1/gesture/recognize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frame: dataUrl }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Recognition failed')
      }

      const result: GestureResult = await response.json()

      setCurrentLetter(result.letter)
      setConfidence(result.confidence)

      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      return null
    } finally {
      setIsRecognizing(false)
    }
  }, [])

  const stopRecognition = useCallback(() => {
    setCurrentLetter(null)
    setConfidence(0)
  }, [])

  return {
    isRecognizing,
    currentLetter,
    confidence,
    error,
    captureAndRecognize,
    stopRecognition,
    canvasRef,
  }
}
```

- [ ] **Step 3: Modify gesture-recognition.tsx**

Update the component to use the new hook (send to backend instead of local TFJS):

The component will now:
1. Keep camera setup (getUserMedia)
2. Keep temporal validation (debouncing, stable frames)
3. But call `captureAndRecognize()` instead of local TFJS processing

- [ ] **Step 4: Type check**

Run: `cd frontend && bun run tsc`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/use-gesture-recognition.ts frontend/src/components/gesture/gesture-recognition.tsx
git commit -m "feat: migrate frontend to use backend YOLO+MediaPipe for gesture recognition"
```

---

### Task 7: Docker Integration

**Files:**
- Modify: `compose.dev.yaml`
- Modify: `compose.prod.yaml`

- [ ] **Step 1: Add volume mount for model**

```yaml
# compose.dev.yaml - add under backend service
services:
  backend:
    volumes:
      - ./backend/app/models:/app/models:ro
    environment:
      - YOLO_MODEL_PATH=/app/models/sibi_yolo.pt
```

- [ ] **Step 2: Update requirements installation**

Ensure Docker build installs the new dependencies.

- [ ] **Step 3: Commit**

```bash
git add compose.dev.yaml compose.prod.yaml
git commit -m "feat: mount YOLO model volume in Docker compose"
```

---

### Task 8: Integration Testing

**Files:**
- Test: Manual end-to-end test

- [ ] **Step 1: Test camera to backend flow**

1. Start backend: `cd backend && source .venv/bin/activate && uvicorn app.main:app --reload`
2. Open frontend: `cd frontend && bun run dev`
3. Open browser camera
4. Make a hand sign
5. Verify letter returned from backend appears in UI

- [ ] **Step 2: Commit test result**

No code to commit, but document any issues found.

---

## Self-Review Checklist

### Spec Coverage
- [x] Backend service layer (MediaPipe + YOLO)
- [x] Backend endpoint `/recognize`
- [x] Frontend camera client modified
- [x] Legacy code NOT deleted (TFJS/MediaPipe JS files preserved)
- [x] Docker integration for model loading
- [x] Dependencies added to requirements.txt

### Placeholder Scan
- [ ] All steps have actual code (no TBD/TODO)
- [ ] All file paths are exact
- [ ] All commands are shown with expected output

### Type Consistency
- [ ] `GestureRecognizeResponse` field names match frontend `GestureResult`
- [ ] `yolo_service.py` CLASS_TO_LETTER has 26 entries (A-Z, J->Y)
- [ ] Error codes match spec (400, 422, 500)

---

## Execution Options

**Plan complete and saved to `docs/superpowers/plans/2026-04-23-yolo-mediapipe-backend-plan.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**