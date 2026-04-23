# YOLO + MediaPipe Python Backend for Gesture Recognition

**Date**: 2026-04-23
**Status**: Approved

## Overview

Menambahkan gesture recognition berbasis YOLOv8 (Ultralytics) + MediaPipe Python di backend FastAPI. Frontend TFJS+MediaPipe JS di-keep sebagai legacy code (tidak dihapus, tidak dipakai di runtime).

## Goal

Migrasi gesture recognition dari client-side (TFJS + MediaPipe JS di browser) ke server-side (YOLO + MediaPipe Python di backend FastAPI).

## Architecture

### High-Level Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│ FRONTEND (Next.js)                                          │
│ ├── Camera capture (navigator.mediaDevices.getUserMedia)    │
│ ├── Kirim frame ke backend via HTTP POST                    │
│ ├── Tampilkan hasil letter dari backend                     │
│ └── Legacy TFJS+MediaPipe code: DIKEEP, TIDAK DI-RUN        │
└──────────────────────────────────────────────────────────────┘
                              ↕ (base64 frame)
┌──────────────────────────────────────────────────────────────┐
│ BACKEND (FastAPI Python)                                    │
│                                                              │
│ POST /api/v1/gesture/recognize                               │
│ ├── MediaPipe Hands (Python) → extract 21 hand landmarks   │
│ ├── YOLOv8 (Ultralytics) → classify gesture ke letter      │
│ └── Return: { letter, confidence, alternatives }            │
│                                                              │
│ [Model: sibi_yolo.pt di backend/app/models/]                │
└──────────────────────────────────────────────────────────────┘
```

### Legacy Code Policy

Kode TFJS + MediaPipe JS di frontend:
- **DIKEEP** di file system (tidak dihapus)
- **TIDAK DI-RUN** di runtime (dormant/inactive)
- Tidak ada modifikasi kecuali untuk mengubah camera capture flow

## Backend Design

### Endpoint

```
POST /api/v1/gesture/recognize
Content-Type: application/json

Request:
{
  "frame": "data:image/jpeg;base64,<base64_string>",
  "session_id": "uuid-string"  // optional, for tracking
}

Response:
{
  "letter": "A",
  "confidence": 0.92,
  "alternatives": [
    {"letter": "D", "confidence": 0.11},
    {"letter": "G", "confidence": 0.05}
  ],
  "processing_time_ms": 45
}
```

### Error Responses

- `400`: Invalid frame / unable to decode image
- `422`: No hand detected in frame
- `500`: Internal server error (YOLO/MediaPipe failure)

### Service Layer

```
backend/app/services/
├── mediapipe_service.py    # MediaPipe Hands landmark extraction
├── yolo_service.py         # YOLOv8 model loading + inference
└── gesture_recognition_service.py  # Orchestrates MediaPipe + YOLO
```

### YOLO Model Requirements

- Model: Ultralytics YOLOv8
- Format: `.pt` (PyTorch) atau `.onnx` (ONNX Runtime)
- Training: Custom trained on SIBI hand signs (26 classes, A-Z)
- Location: `backend/app/models/sibi_yolo.pt`
- Gitignored: Ya (model terlalu besar untuk git)

## Frontend Changes

### What Changes

Camera capture component dimodifikasi untuk:
1. Capture frame dari video stream
2. Convert ke base64
3. POST ke `/api/v1/gesture/recognize`
4. Tampilkan response letter + confidence

### What Doesn't Change

- Semua kode di `frontend/src/lib/ai/services/gesture-recognition.ts`
- Semua kode di `frontend/src/lib/ai/services/handpose-service.ts`
- Semua kode di `frontend/src/components/gesture/`
- Semua kode di `frontend/src/components/handsigns/`
- Semua TFJS + MediaPipe JS code: **tetap ada, tidak disentuh**

## Docker Integration

Model file di-load dari volume mount:
```yaml
# compose.prod.yaml / compose.dev.yaml
volumes:
  - ./backend/app/models:/app/models:ro
```

Model juga bisa di-download saat container start via init script.

## Implementation Order

1. **Backend service layer**: mediapipe_service.py + yolo_service.py
2. **Backend endpoint**: POST /api/v1/gesture/recognize
3. **Docker setup**: volume mount untuk model + Python dependencies
4. **Frontend camera client**: ubah camera capture untuk kirim frame ke backend
5. **Integration testing**: end-to-end dari camera sampai display

## Dependencies (Backend)

```txt
# backend/requirements.txt - add:
ultralytics>=8.0.0
mediapipe>=0.10.0
opencv-python>=4.8.0
```

## Open Questions

1. **YOLO training**: Dataset SIBI hand signs belum ada - perlu dibuat/dicari pretrained
2. **Real-time latency**: HTTP POST per frame mungkin ada delay - perlu monitoring
3. **Alternative**: WebSocket untuk streaming kalau HTTP latency tidak acceptable